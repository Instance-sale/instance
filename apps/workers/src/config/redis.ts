import { Redis, RedisOptions } from 'ioredis';

/**
 * Redis Connection Manager for Instance Background Workers
 *
 * Provides shared connection options and lifecycle management for Redis clients.
 * Redis is used for distributed token-bucket rate limiting and queue coordination.
 * When REDIS_URL is not provided, workers fall back to in-memory rate limiting.
 */

let redisInstance: Redis | null = null;
const allConnections: Set<Redis> = new Set();

/**
 * Builds Redis connection options compatible with BullMQ and managed cloud Redis.
 *
 * Open-source configuration:
 * - REDIS_URL: Connection string (e.g. redis://localhost:6379 or rediss://user:pass@host:port for TLS)
 * - REDIS_TLS_REJECT_UNAUTHORIZED: Set to 'false' if using self-signed TLS certificates
 */
export function getRedisOptions(): RedisOptions {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const isTls = redisUrl.startsWith('rediss://');

  return {
    // BullMQ requires maxRetriesPerRequest to be null so commands do not fail during reconnections
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      // Exponential backoff with max 10s delay to withstand Redis restarts
      const delay = Math.min(times * 200, 10000);
      return delay;
    },
    tls: isTls
      ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  };
}

/**
 * Creates a dedicated Redis client instance and tracks it for clean shutdown.
 */
export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(redisUrl, getRedisOptions());

  client.on('error', (err) => {
    console.warn('[Redis] Connection warning/error:', err.message);
  });

  allConnections.add(client);
  return client;
}

/**
 * Returns the singleton Redis connection used for general worker operations.
 */
export function getRedisConnection(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisConnection();

    redisInstance.on('connect', () => {
      console.log('[Redis] Connected successfully to Redis server');
    });

    redisInstance.on('ready', () => {
      console.log('[Redis] Redis client is ready to accept commands');
    });

    redisInstance.on('reconnecting', (time) => {
      console.log(`[Redis] Reconnecting in ${time}ms...`);
    });
  }

  return redisInstance;
}

/**
 * Gracefully closes all active Redis connections when the worker daemon stops.
 */
export async function closeRedisConnection(): Promise<void> {
  const closePromises = Array.from(allConnections).map(async (client) => {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  });

  await Promise.allSettled(closePromises);
  allConnections.clear();
  redisInstance = null;
  console.log('[Redis] All Redis connections cleanly closed');
}

