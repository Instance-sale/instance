import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processSendMessageJob } from './message-worker';
import { prisma } from '@instance/db';
import { instagramApiService } from '../services/instagram-api.service';

vi.mock('@instance/db', () => ({
  prisma: {
    instagramAccount: {
      findUnique: vi.fn(),
    },
    message: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    executionStep: {
      create: vi.fn(),
    },
    automationExecution: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    backgroundJob: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    instagramAccountHealth: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('../services/instagram-api.service', () => ({
  instagramApiService: {
    sendMessage: vi.fn(),
    logApiError: vi.fn(),
  },
}));

vi.mock('../services/dm-rate-limiter', () => ({
  checkDmRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  RateLimitRescheduleError: class extends Error {},
}));

describe('processSendMessageJob idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.backgroundJob.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.instagramAccountHealth.upsert).mockResolvedValue({} as any);
  });

  it('skips calling instagramApiService.sendMessage when sentMessageId is already in job payload', async () => {
    vi.mocked(prisma.instagramAccount.findUnique).mockResolvedValueOnce({
      id: 'acc-1',
      accessToken: 'token',
      isActive: true,
      health: { isPaused: false },
    } as any);

    const fakeJob = {
      id: 'job-123',
      data: {
        instagramAccountId: 'acc-1',
        recipientId: 'user-456',
        message: 'Hello!',
        sentMessageId: 'meta-msg-already-sent',
      },
    } as any;

    await processSendMessageJob(fakeJob);

    // Assert Meta API was NOT called again
    expect(instagramApiService.sendMessage).not.toHaveBeenCalled();
  });

  it('routes to private reply when commentId is present in job payload', async () => {
    vi.mocked(prisma.instagramAccount.findUnique).mockResolvedValueOnce({
      id: 'acc-1',
      username: 'testbrand',
      accessToken: 'token',
      isActive: true,
      health: { isPaused: false },
    } as any);

    vi.mocked(instagramApiService.sendMessage).mockResolvedValueOnce({
      success: true,
      messageId: 'mid-comment-reply-123',
    });

    const fakeJob = {
      id: 'job-comment-dm',
      data: {
        instagramAccountId: 'acc-1',
        recipientId: 'commenter-789',
        commentId: 'comment-111',
        isPrivateReply: true,
        message: 'Thanks for commenting!',
      },
    } as any;

    await processSendMessageJob(fakeJob);

    expect(instagramApiService.sendMessage).toHaveBeenCalledWith(
      'token',
      'commenter-789',
      'Thanks for commenting!',
      undefined,
      'TEXT',
      undefined,
      undefined,
      undefined,
      { commentId: 'comment-111' },
    );
  });
});
