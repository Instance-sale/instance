import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DbJobPoller, REALTIME_JOB_TYPES, MEDIA_JOB_TYPES } from './db-job-poller';
import { prisma } from '@instance/db';

vi.mock('@instance/db', () => ({
  prisma: {
    backgroundJob: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../workers/profile-worker', () => ({
  processProfileFetchJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../workers/message-worker', () => ({
  processSendMessageJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../workers/comment-worker', () => ({
  processReplyCommentJob: vi.fn().mockResolvedValue(undefined),
}));

describe('DbJobPoller', () => {
  let poller: DbJobPoller;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    poller = new DbJobPoller();
  });

  afterEach(async () => {
    await poller.stop(0);
    vi.useRealTimers();
  });

  it('exports correct job type constants for dual pipelines', () => {
    expect(REALTIME_JOB_TYPES).toContain('SEND_DM');
    expect(REALTIME_JOB_TYPES).toContain('REPLY_COMMENT');
    expect(MEDIA_JOB_TYPES).toContain('FETCH_PROFILE');
  });

  it('starts polling timers on start and clears on stop', async () => {
    vi.mocked(prisma.backgroundJob.findMany).mockResolvedValue([]);

    poller.start({
      realtimeIntervalMs: 100,
      mediaIntervalMs: 500,
      realtimeBatchSize: 10,
      mediaBatchSize: 2,
    });

    // Advance timers
    await vi.advanceTimersByTimeAsync(150);

    expect(prisma.backgroundJob.findMany).toHaveBeenCalled();

    await poller.stop(0);
  });

  it('reschedules rate-limited jobs non-destructively with jitter and preserves attempts', async () => {
    const candidate = {
      id: 'job-rate-limited-1',
      jobType: 'SEND_DM',
      payload: { recipientId: 'user-1' },
      priority: 1,
      attempts: 0,
      maxAttempts: 3,
    };

    vi.mocked(prisma.backgroundJob.findMany).mockResolvedValueOnce([candidate as any]);
    vi.mocked(prisma.backgroundJob.updateMany).mockResolvedValue({ count: 1 });

    const { processSendMessageJob } = await import('../workers/message-worker');
    const rateLimitErr = new Error('Rate limit exceeded') as any;
    rateLimitErr.isRateLimit = true;
    rateLimitErr.retryAfterSeconds = 5;
    rateLimitErr.reason = 'RATE_LIMIT';
    vi.mocked(processSendMessageJob).mockRejectedValueOnce(rateLimitErr);

    poller.start({
      realtimeIntervalMs: 50,
      mediaIntervalMs: 1000,
      realtimeBatchSize: 1,
      mediaBatchSize: 1,
    });

    await vi.advanceTimersByTimeAsync(60);

    // Verify updateMany was called to reschedule job with status PENDING and preserved attempts
    expect(prisma.backgroundJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-rate-limited-1' },
        data: expect.objectContaining({
          status: 'PENDING',
          attempts: 0,
          lockedAt: null,
          lockedBy: null,
          runAfter: expect.any(Date),
        }),
      }),
    );

    await poller.stop(0);
  });
});
