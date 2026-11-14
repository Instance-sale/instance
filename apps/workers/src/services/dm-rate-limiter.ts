import { getRedisConnection } from '../config/redis';

/**
 * Instagram Outbound Rate Limiter & Pacing Engine
 *
 * Implements a token-bucket rate limiter that enforces Meta Graph API rate limits
 * to protect connected Instagram accounts from throttling, shadow-bans, or account restrictions.
 *
 * Key Capabilities for Open-Source & Self-Hosted Deployments:
 * - Distributed Rate Limiting: When Redis is configured, uses atomic Lua scripts across replicas.
 * - In-Memory Fallback: Operates transparently with zero setup when Redis is offline or omitted.
 * - Pacing & Jitter: Prevents spam flags by ensuring minimum intervals between consecutive
 *   messages to the same recipient (thread pacing).
 * - Multi-tier Queues: Automatically applies specific rate limits based on message type
 *   (standard text, media attachments, private replies from comments, and comment replies).
 */

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  retryAfterSeconds: number;
  reason?: 'OK' | 'PACING' | 'RATE_LIMIT';
}

/**
 * Custom error thrown when a job hits a rate limit or pacing delay.
 * Caught by workers and DbJobPoller to defer jobs non-blockingly without burning retry quotas.
 */
export class RateLimitRescheduleError extends Error {
  readonly isRateLimit = true;
  constructor(
    public readonly retryAfterSeconds: number,
    public readonly reason: 'PACING' | 'RATE_LIMIT' | string = 'RATE_LIMIT',
    public readonly accountHandle?: string,
  ) {
    super(
      `Rate limit active for ${accountHandle || 'account'} (${reason}). Rescheduling in ${retryAfterSeconds}s`,
    );
    this.name = 'RateLimitRescheduleError';
  }
}

export interface RateLimiterOptions {
  capacity?: number;
  hourlyLimit?: number;
  perSecondLimit?: number;
  minIntervalSeconds?: number;
  cost?: number;
  isPrivateReply?: boolean;
  isMedia?: boolean;
  isLiveComment?: boolean;
  recipientId?: string;
  keyPrefix?: string;
}

function getEnvNumber(key: string, defaultVal: number): number {
  const val = process.env[key];
  if (val && !isNaN(Number(val))) {
    const num = Number(val);
    return num > 0 ? num : defaultVal;
  }
  return defaultVal;
}

/**
 * Meta Graph API Rate Limit Defaults (Configurable via environment variables)
 *
 * Open-source administrators can override these in .env based on their Meta App Tier:
 * - Standard Send API: 100 requests/sec (META_SEND_RATE_LIMIT_PER_SEC)
 * - Media attachments (audio/video): 10 requests/sec (META_MEDIA_RATE_LIMIT_PER_SEC)
 * - Private replies (comment to DM): 750 requests/rolling hour (META_PRIVATE_REPLY_RATE_LIMIT_PER_HOUR)
 * - Thread pacing: minimum 1.0s between messages to same user (META_THREAD_PACING_MIN_INTERVAL_SEC)
 * - Comment replies: 60 replies/hour safe ceiling (META_COMMENT_REPLY_RATE_LIMIT_PER_HOUR)
 */
export const DEFAULT_SEND_RATE_PER_SEC = getEnvNumber('META_SEND_RATE_LIMIT_PER_SEC', 100);
export const DEFAULT_MEDIA_RATE_PER_SEC = getEnvNumber('META_MEDIA_RATE_LIMIT_PER_SEC', 10);
export const DEFAULT_PRIVATE_REPLY_PER_HOUR = getEnvNumber('META_PRIVATE_REPLY_RATE_LIMIT_PER_HOUR', 750);
export const DEFAULT_LIVE_COMMENT_PER_SEC = getEnvNumber('META_LIVE_COMMENT_RATE_LIMIT_PER_SEC', 100);
export const DEFAULT_THREAD_PACING_MIN_INTERVAL = getEnvNumber('META_THREAD_PACING_MIN_INTERVAL_SEC', 1.0);
export const DEFAULT_COMMENT_REPLY_PER_HOUR = getEnvNumber('META_COMMENT_REPLY_RATE_LIMIT_PER_HOUR', 60);
export const DEFAULT_CONVERSATION_PER_SEC = getEnvNumber('META_CONVERSATION_RATE_LIMIT_PER_SEC', 2);

const REDIS_KEY_PREFIX = 'ratelimit:';
const TTL_SECONDS = 7200;

// Lua script for atomic token-bucket check, refill, pacing and consumption
const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])
local minInterval = tonumber(ARGV[6]) or 0

local data = redis.call('HMGET', key, 'tokens', 'last_updated', 'last_sent')
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])
local last_sent = tonumber(data[3])

if not tokens then
  tokens = capacity
  last_updated = now
  last_sent = 0
else
  local delta = math.max(0, now - last_updated)
  tokens = math.min(capacity, tokens + (delta * refillRate))
  last_updated = now
end

-- Pacing check: enforce minimum interval between consecutive messages on this key
local timeSinceLast = now - (last_sent or 0)
if minInterval > 0 and last_sent and last_sent > 0 and timeSinceLast < minInterval then
  local waitSec = math.ceil(minInterval - timeSinceLast)
  if waitSec < 1 then waitSec = 1 end
  redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last_updated)
  redis.call('EXPIRE', key, ttl)
  return { 0, tostring(math.floor(tokens)), tostring(waitSec), 'PACING' }
end

-- Token availability check
if tokens >= cost then
  tokens = tokens - cost
  last_sent = now
  redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last_updated, 'last_sent', last_sent)
  redis.call('EXPIRE', key, ttl)
  return { 1, tostring(math.floor(tokens)), '0', 'OK' }
else
  -- Calculate wait time until enough tokens are refilled
  local deficit = cost - tokens
  local waitSec = math.ceil(deficit / refillRate)
  if waitSec < 1 then waitSec = 1 end
  redis.call('HMSET', key, 'tokens', tokens, 'last_updated', last_updated)
  redis.call('EXPIRE', key, ttl)
  return { 0, tostring(math.floor(tokens)), tostring(waitSec), 'RATE_LIMIT' }
end
`;

// Thread-pacing Lua script to enforce interval on a specific recipient thread
const THREAD_PACING_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local minInterval = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

local lastSent = tonumber(redis.call('GET', key))

if lastSent and (now - lastSent) < minInterval then
  local waitSec = math.ceil(minInterval - (now - lastSent))
  if waitSec < 1 then waitSec = 1 end
  return { 0, tostring(waitSec) }
end

redis.call('SET', key, tostring(now), 'EX', ttl)
return { 1, '0' }
`;

// In-memory fallback structures when Redis is offline
interface MemoryBucket {
  tokens: number;
  lastUpdated: number;
  lastSent: number;
}
const memoryBuckets = new Map<string, MemoryBucket>();
const threadPacingMap = new Map<string, number>();
const MAX_MEMORY_BUCKETS = 10000;

function pruneStaleMemoryBuckets(now: number): void {
  for (const [key, bucket] of memoryBuckets.entries()) {
    if (now - bucket.lastUpdated > TTL_SECONDS) {
      memoryBuckets.delete(key);
    }
  }
  for (const [key, timestamp] of threadPacingMap.entries()) {
    if (now - timestamp > 60) {
      threadPacingMap.delete(key);
    }
  }
  if (memoryBuckets.size > MAX_MEMORY_BUCKETS) {
    const excess = memoryBuckets.size - MAX_MEMORY_BUCKETS;
    const keys = memoryBuckets.keys();
    for (let i = 0; i < excess; i++) {
      const nextKey = keys.next().value;
      if (nextKey) memoryBuckets.delete(nextKey);
    }
  }
}

if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    pruneStaleMemoryBuckets(Date.now() / 1000);
  }, 60000);
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

function consumeInMemory(
  key: string,
  capacity: number,
  refillRate: number,
  now: number,
  cost: number,
  minInterval: number,
): RateLimitResult {
  if (memoryBuckets.size > 1000) {
    pruneStaleMemoryBuckets(now);
  }
  let bucket = memoryBuckets.get(key);
  if (!bucket) {
    bucket = {
      tokens: capacity,
      lastUpdated: now,
      lastSent: 0,
    };
    memoryBuckets.set(key, bucket);
  } else {
    const delta = Math.max(0, now - bucket.lastUpdated);
    bucket.tokens = Math.min(capacity, bucket.tokens + delta * refillRate);
    bucket.lastUpdated = now;
  }

  // Pacing check on key
  const timeSinceLast = now - (bucket.lastSent || 0);
  if (minInterval > 0 && bucket.lastSent > 0 && timeSinceLast < minInterval) {
    const waitSec = Math.max(1, Math.ceil(minInterval - timeSinceLast));
    return {
      allowed: false,
      remainingTokens: Math.floor(bucket.tokens),
      retryAfterSeconds: waitSec,
      reason: 'PACING',
    };
  }

  // Token availability check
  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    bucket.lastSent = now;
    return {
      allowed: true,
      remainingTokens: Math.floor(bucket.tokens),
      retryAfterSeconds: 0,
      reason: 'OK',
    };
  }

  // Rate limit deficit
  const deficit = cost - bucket.tokens;
  const waitSec = Math.max(1, Math.ceil(deficit / refillRate));
  return {
    allowed: false,
    remainingTokens: Math.floor(bucket.tokens),
    retryAfterSeconds: waitSec,
    reason: 'RATE_LIMIT',
  };
}

function normalizeHandle(handleOrAccountId: string): string {
  return (handleOrAccountId || '').toLowerCase().trim().replace(/^@/, '');
}

/**
 * Checks per-recipient / single-thread pacing to ensure we never message the same
 * user too rapidly, avoiding Meta single-thread rate limit penalties.
 */
export async function checkThreadPacing(
  handleOrAccountId: string,
  recipientId: string,
  minIntervalSeconds = DEFAULT_THREAD_PACING_MIN_INTERVAL,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (!recipientId || minIntervalSeconds <= 0) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const normalizedAccount = normalizeHandle(handleOrAccountId);
  const normalizedRecipient = normalizeHandle(recipientId);
  const key = `${REDIS_KEY_PREFIX}thread:${normalizedAccount}:${normalizedRecipient}`;
  const now = Date.now() / 1000;
  const ttl = Math.max(60, Math.ceil(minIntervalSeconds * 5));

  try {
    const redis = getRedisConnection();
    if (redis && redis.status === 'ready') {
      const res = (await redis.eval(
        THREAD_PACING_LUA,
        1,
        key,
        now,
        minIntervalSeconds,
        ttl,
      )) as [number, string];

      const allowed = Number(res[0]) === 1;
      const retryAfter = Number(res[1]) || 0;
      return { allowed, retryAfterSeconds: retryAfter };
    }
  } catch (err: any) {
    console.warn(`[DmRateLimiter] Redis thread-pacing error (${err.message}), falling back in-memory.`);
  }

  // In-memory fallback
  const lastSent = threadPacingMap.get(key) || 0;
  if (lastSent > 0 && now - lastSent < minIntervalSeconds) {
    const waitSec = Math.max(1, Math.ceil(minIntervalSeconds - (now - lastSent)));
    return { allowed: false, retryAfterSeconds: waitSec };
  }
  threadPacingMap.set(key, now);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Checks token bucket rate limiter for Instagram Direct Messages (DMs).
 * Automatically selects the appropriate bucket tier based on message context:
 * - Private Reply (Comment to DM): 750 calls / rolling hour
 * - Audio/Video attachment: 10 calls / second
 * - Live Stream comment reply: 100 calls / second
 * - Standard Send API (text/links/stickers): 100-300 calls / second
 * - Single-thread pacing: checks per-recipient pacing if recipientId is provided
 */
export async function checkDmRateLimit(
  handleOrAccountId: string,
  options: RateLimiterOptions = {},
): Promise<RateLimitResult> {
  const normalized = normalizeHandle(handleOrAccountId);
  const now = Date.now() / 1000;
  const cost = options.cost ?? 1;

  // 1. Thread pacing check (if recipientId provided)
  if (options.recipientId) {
    const pacingInterval = options.minIntervalSeconds ?? DEFAULT_THREAD_PACING_MIN_INTERVAL;
    if (pacingInterval > 0) {
      const threadPacing = await checkThreadPacing(normalized, options.recipientId, pacingInterval);
      if (!threadPacing.allowed) {
        return {
          allowed: false,
          remainingTokens: 0,
          retryAfterSeconds: threadPacing.retryAfterSeconds,
          reason: 'PACING',
        };
      }
    }
  }

  // 2. Determine bucket parameters & key prefix
  let keyPrefix: string;
  let capacity: number;
  let refillRate: number; // tokens per second
  let minInterval: number;

  if (options.isPrivateReply) {
    // Meta Private Replies API (Comment to DM on Posts & Reels): 750 calls/hour
    keyPrefix = `${REDIS_KEY_PREFIX}private_reply:`;
    capacity = options.capacity ?? DEFAULT_PRIVATE_REPLY_PER_HOUR;
    const hourlyQuota = options.hourlyLimit ?? capacity;
    refillRate = hourlyQuota / 3600;
    minInterval = 0; // Pacing is handled per recipient thread, not globally across all comments
  } else if (options.isLiveComment) {
    // Meta Private Replies to Live comments: 100 calls/second
    keyPrefix = `${REDIS_KEY_PREFIX}live_comment:`;
    capacity = options.capacity ?? DEFAULT_LIVE_COMMENT_PER_SEC;
    refillRate = options.perSecondLimit ?? DEFAULT_LIVE_COMMENT_PER_SEC;
    minInterval = 0;
  } else if (options.isMedia) {
    // Meta Send API with Audio or Video: strictly capped at 10 calls/second
    keyPrefix = `${REDIS_KEY_PREFIX}media:`;
    capacity = options.capacity ?? DEFAULT_MEDIA_RATE_PER_SEC;
    refillRate = options.perSecondLimit ?? DEFAULT_MEDIA_RATE_PER_SEC;
    minInterval = 0;
  } else if (options.hourlyLimit && !options.perSecondLimit) {
    // Explicit legacy hourly limit (e.g. comment rate limit or custom test)
    keyPrefix = options.keyPrefix || `${REDIS_KEY_PREFIX}dm:`;
    capacity = options.capacity ?? options.hourlyLimit;
    refillRate = options.hourlyLimit / 3600;
    minInterval = options.minIntervalSeconds ?? 0;
  } else {
    // Meta Send API standard text / links / reactions / stickers: 100-300 calls/sec
    keyPrefix = options.keyPrefix || `${REDIS_KEY_PREFIX}send:`;
    const ratePerSec = options.perSecondLimit ?? DEFAULT_SEND_RATE_PER_SEC;
    capacity = options.capacity ?? ratePerSec;
    refillRate = ratePerSec;
    // If no recipientId was provided, preserve minIntervalSeconds if caller explicitly asked for it
    minInterval = options.recipientId ? 0 : (options.minIntervalSeconds ?? 0);
  }

  const key = `${keyPrefix}${normalized}`;

  try {
    const redis = getRedisConnection();
    if (redis && redis.status === 'ready') {
      const res = (await redis.eval(
        TOKEN_BUCKET_LUA,
        1,
        key,
        capacity,
        refillRate,
        now,
        cost,
        TTL_SECONDS,
        minInterval,
      )) as [number, string, string, string];

      const allowed = Number(res[0]) === 1;
      const remainingTokens = Number(res[1]);
      const retryAfterSeconds = Number(res[2]);
      const reason = res[3] as 'OK' | 'PACING' | 'RATE_LIMIT';

      return {
        allowed,
        remainingTokens,
        retryAfterSeconds,
        reason,
      };
    }
  } catch (err: any) {
    console.warn(`[DmRateLimiter] Redis error (${err.message}), falling back to in-memory rate limiter.`);
  }

  // In-memory fallback
  return consumeInMemory(
    key,
    capacity,
    refillRate,
    now,
    cost,
    minInterval,
  );
}

/**
 * Checks token bucket rate limiter for standard Send API DMs (100 to 300 calls/sec).
 */
export async function checkSendDmRateLimit(
  handleOrAccountId: string,
  options: RateLimiterOptions = {},
): Promise<RateLimitResult> {
  return checkDmRateLimit(handleOrAccountId, {
    isPrivateReply: false,
    ...options,
  });
}

/**
 * Checks token bucket rate limiter for Private Replies (Comment to DM) on Instagram (750 calls/hour).
 */
export async function checkPrivateReplyRateLimit(
  handleOrAccountId: string,
  options: RateLimiterOptions = {},
): Promise<RateLimitResult> {
  return checkDmRateLimit(handleOrAccountId, {
    isPrivateReply: true,
    ...options,
  });
}

/**
 * Checks token bucket rate limiter for Instagram public comments (replies, likes, hides).
 * Default safe limit: 60 comments/hour to prevent spam flags.
 */
export async function checkCommentRateLimit(
  handleOrAccountId: string,
  options: RateLimiterOptions = {},
): Promise<RateLimitResult> {
  const normalized = normalizeHandle(handleOrAccountId);
  return checkDmRateLimit(normalized, {
    keyPrefix: `${REDIS_KEY_PREFIX}comment:`,
    capacity: options.capacity ?? DEFAULT_COMMENT_REPLY_PER_HOUR,
    hourlyLimit: options.hourlyLimit ?? DEFAULT_COMMENT_REPLY_PER_HOUR,
    minIntervalSeconds: options.minIntervalSeconds ?? 0,
    cost: options.cost ?? 1,
    ...options,
  });
}

/**
 * Resets the rate limiter buckets for a given handle (useful in testing or manual unblocks).
 */
export async function resetDmRateLimit(handleOrAccountId: string): Promise<void> {
  const normalized = normalizeHandle(handleOrAccountId);
  const prefixes = [
    `${REDIS_KEY_PREFIX}send:`,
    `${REDIS_KEY_PREFIX}media:`,
    `${REDIS_KEY_PREFIX}private_reply:`,
    `${REDIS_KEY_PREFIX}live_comment:`,
    `${REDIS_KEY_PREFIX}comment:`,
    `${REDIS_KEY_PREFIX}dm:`,
  ];

  for (const prefix of prefixes) {
    const key = `${prefix}${normalized}`;
    memoryBuckets.delete(key);
  }

  try {
    const redis = getRedisConnection();
    if (redis && redis.status === 'ready') {
      const keysToDelete = prefixes.map((p) => `${p}${normalized}`);
      await redis.del(...keysToDelete);
    }
  } catch {
    // Non-fatal
  }
}
