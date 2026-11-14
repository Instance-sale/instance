import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkDmRateLimit,
  checkPrivateReplyRateLimit,
  checkThreadPacing,
  RateLimitRescheduleError,
} from './dm-rate-limiter';
import * as redisModule from '../config/redis';

vi.mock('../config/redis', () => ({
  getRedisConnection: vi.fn(),
}));

describe('dmRateLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RateLimitRescheduleError', () => {
    it('creates error instance with retryAfterSeconds and reason', () => {
      const err = new RateLimitRescheduleError(30, 'PACING', 'brand_account');
      expect(err.isRateLimit).toBe(true);
      expect(err.retryAfterSeconds).toBe(30);
      expect(err.reason).toBe('PACING');
      expect(err.name).toBe('RateLimitRescheduleError');
      expect(err.message).toContain('30s');
    });
  });

  describe('checkDmRateLimit with in-memory fallback', () => {
    it('allows initial message when Redis is offline', async () => {
      vi.mocked(redisModule.getRedisConnection).mockReturnValue(null as any);

      const uniqueHandle = `test_account_${Date.now()}`;
      const result = await checkDmRateLimit(uniqueHandle, { minIntervalSeconds: 0 });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('OK');
      expect(result.remainingTokens).toBeGreaterThanOrEqual(99);
    });

    it('enforces pacing interval between rapid consecutive messages when explicitly requested without recipientId', async () => {
      vi.mocked(redisModule.getRedisConnection).mockReturnValue(null as any);

      const pacingHandle = `pacing_acc_${Date.now()}`;
      const first = await checkDmRateLimit(pacingHandle, { minIntervalSeconds: 5 });
      expect(first.allowed).toBe(true);

      const second = await checkDmRateLimit(pacingHandle, { minIntervalSeconds: 5 });
      expect(second.allowed).toBe(false);
      expect(second.reason).toBe('PACING');
      expect(second.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('supports private reply bucket tier with 750 tokens', async () => {
      vi.mocked(redisModule.getRedisConnection).mockReturnValue(null as any);

      const prHandle = `pr_acc_${Date.now()}`;
      const res = await checkPrivateReplyRateLimit(prHandle);
      expect(res.allowed).toBe(true);
      expect(res.remainingTokens).toBeGreaterThanOrEqual(749);
    });

    it('enforces thread pacing per recipient without blocking different recipients', async () => {
      vi.mocked(redisModule.getRedisConnection).mockReturnValue(null as any);

      const account = `brand_${Date.now()}`;
      const recipientA = 'user_alice';
      const recipientB = 'user_bob';

      // Send to Alice: allowed
      const paceA1 = await checkThreadPacing(account, recipientA, 2.0);
      expect(paceA1.allowed).toBe(true);

      // Immediate second send to Alice: paced
      const paceA2 = await checkThreadPacing(account, recipientA, 2.0);
      expect(paceA2.allowed).toBe(false);
      expect(paceA2.retryAfterSeconds).toBeGreaterThan(0);

      // Immediate send to Bob: allowed (different thread!)
      const paceB = await checkThreadPacing(account, recipientB, 2.0);
      expect(paceB.allowed).toBe(true);
    });
  });
});
