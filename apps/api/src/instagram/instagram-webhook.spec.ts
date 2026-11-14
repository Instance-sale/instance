import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { InstagramWebhookRouterService } from './services/instagram-webhook-router.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InstagramWebhookRouterService', () => {
  let service: InstagramWebhookRouterService;
  let prisma: PrismaService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, INSTAGRAM_APP_SECRET: 'test-app-secret-123' };
    prisma = {
      instagramAccount: {
        findFirst: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new InstagramWebhookRouterService(prisma);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('verifyWebhookSignature', () => {
    it('returns false when signature is empty or secret not set', () => {
      delete process.env.INSTAGRAM_APP_SECRET;
      delete process.env.META_APP_SECRET;
      expect(service.verifyWebhookSignature('payload', 'sha256=abc')).toBe(false);
    });

    it('returns true when HMAC matches expected SHA-256 digest', () => {
      const payload = JSON.stringify({ object: 'instagram', entry: [] });
      const hmac = crypto.createHmac('sha256', 'test-app-secret-123');
      hmac.update(payload);
      const signature = `sha256=${hmac.digest('hex')}`;

      expect(service.verifyWebhookSignature(payload, signature)).toBe(true);
    });

    it('returns false for tampered payload', () => {
      const payload = JSON.stringify({ object: 'instagram', entry: [] });
      const badSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      expect(service.verifyWebhookSignature(payload, badSignature)).toBe(false);
    });
  });

  describe('processWebhookEvent', () => {
    it('ignores webhook events not intended for instagram object', async () => {
      const result = await service.processWebhookEvent({ object: 'page', entry: [] });
      expect(result).toBeUndefined();
    });
  });
});
