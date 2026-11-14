import { prisma } from '@instance/db';
import { processProfileFetchJob } from '../workers/profile-worker';
import { processSendMessageJob } from '../workers/message-worker';
import { processReplyCommentJob } from '../workers/comment-worker';

/**
 * Real-time job types: Fast lane for instant Instagram interactions (DMs & Comments).
 * Polled frequently to maintain sub-second response times for incoming user engagements.
 */
export const REALTIME_JOB_TYPES = [
  'SEND_DM',
  'instagram-send-message',
  'REPLY_COMMENT',
  'instagram-reply-comment',
];

/**
 * Heavy / media job types: Isolated lane for background ingestion and external sync.
 * Kept separate so large payloads and slower Graph API calls do not block real-time messages.
 */
export const MEDIA_JOB_TYPES = [
  'FETCH_PROFILE',
  'instagram-profile-fetch',
  'SEND_EMAIL',
  'email-dispatch',
];

export interface DbJobPollerOptions {
  realtimeIntervalMs?: number;
  mediaIntervalMs?: number;
  realtimeBatchSize?: number;
  mediaBatchSize?: number;
}

/**
 * Dual-Pipeline Database Job Poller
 *
 * Provides a resilient PostgreSQL-backed background worker queue (`BackgroundJob` model).
 * For self-hosters and open-source deployments, this allows running background tasks
 * reliably without requiring an external Redis broker.
 *
 * Architecture Highlights:
 * - Lane 1 (Real-Time): Polled every 500ms with higher concurrency for DMs and comment replies.
 * - Lane 2 (Media & Heavy Tasks): Polled every 2000ms with lower batch size to prevent starvation.
 * - Distributed Locking: Uses atomic database claims (`UPDATE ... WHERE status = 'PENDING'`)
 *   to ensure safe concurrency across multiple worker replicas or containers.
 * - Non-blocking Rate-Limit Deferral: Reschedules rate-limited jobs to run later without
 *   burning retry attempts.
 * - Orphan Recovery: Automatically releases jobs stuck in 'PROCESSING' after 10 minutes.
 */
export class DbJobPoller {
  private isRunning = false;
  private isRealtimePolling = false;
  private isMediaPolling = false;
  private readonly inFlightJobs = new Set<Promise<any>>();
  private realtimeTimer: NodeJS.Timeout | null = null;
  private mediaTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly workerId = `worker-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;

  private realtimeIntervalMs = 500;
  private mediaIntervalMs = 2000;
  private realtimeBatchSize = 20;
  private mediaBatchSize = 5;

  start(optionsOrInterval?: number | DbJobPollerOptions): void {
    if (this.isRunning) return;
    this.isRunning = true;

    if (typeof optionsOrInterval === 'number') {
      this.mediaIntervalMs = optionsOrInterval;
      this.realtimeIntervalMs = Math.min(500, optionsOrInterval);
    } else if (optionsOrInterval) {
      if (optionsOrInterval.realtimeIntervalMs) this.realtimeIntervalMs = optionsOrInterval.realtimeIntervalMs;
      if (optionsOrInterval.mediaIntervalMs) this.mediaIntervalMs = optionsOrInterval.mediaIntervalMs;
      if (optionsOrInterval.realtimeBatchSize) this.realtimeBatchSize = optionsOrInterval.realtimeBatchSize;
      if (optionsOrInterval.mediaBatchSize) this.mediaBatchSize = optionsOrInterval.mediaBatchSize;
    }

    console.log(
      `[DbJobPoller] Started Dual-Pipeline DB background job poller (Worker ID: ${this.workerId})\n` +
      `  - Lane 1 (Real-Time Messaging: DMs & Comments): every ${this.realtimeIntervalMs}ms, concurrency batch: ${this.realtimeBatchSize}\n` +
      `  - Lane 2 (Media & Heavy Background: Posts & Profiles): every ${this.mediaIntervalMs}ms, concurrency batch: ${this.mediaBatchSize}`,
    );

    // Lane 1: Fast Real-Time Polling Loop (DMs & Comments)
    this.realtimeTimer = setInterval(async () => {
      try {
        await this.pollRealtimeQueue();
      } catch (err: any) {
        console.warn('[DbJobPoller] Real-time queue polling error:', err.message);
      }
    }, this.realtimeIntervalMs);

    // Lane 2: Isolated Media & Background Polling Loop (Posts, Video Transcoding, Profiles)
    this.mediaTimer = setInterval(async () => {
      try {
        await this.pollMediaQueue();
      } catch (err: any) {
        console.warn('[DbJobPoller] Media queue polling error:', err.message);
      }
    }, this.mediaIntervalMs);

    // Stale lock cleanup every 60s
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupStaleLocks();
      } catch (err: any) {
        console.warn('[DbJobPoller] Stale lock cleanup error:', err.message);
      }
    }, 60000);
  }

  async stop(gracePeriodMs = 15000): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.realtimeTimer) clearInterval(this.realtimeTimer);
    if (this.mediaTimer) clearInterval(this.mediaTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);

    if (this.inFlightJobs.size > 0) {
      console.log(`[DbJobPoller] Waiting for ${this.inFlightJobs.size} in-flight job(s) to drain (grace period: ${gracePeriodMs}ms)...`);
      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, gracePeriodMs);
      });
      await Promise.race([
        Promise.allSettled(Array.from(this.inFlightJobs)),
        timeoutPromise,
      ]);
      clearTimeout(timer!);
    }

    console.log('[DbJobPoller] Stopped DB background job poller');
  }

  private runJob(candidate: any, now: Date, lane: string): Promise<void> {
    const jobPromise = this.claimAndExecute(candidate, now, lane);
    this.inFlightJobs.add(jobPromise);
    jobPromise.finally(() => this.inFlightJobs.delete(jobPromise));
    return jobPromise;
  }

  private async pollRealtimeQueue(): Promise<void> {
    if (this.isRealtimePolling) return;
    this.isRealtimePolling = true;

    try {
      const now = new Date();
      const candidates = await prisma.backgroundJob.findMany({
        where: {
          status: 'PENDING',
          runAfter: { lte: now },
          jobType: { in: REALTIME_JOB_TYPES },
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'asc' },
        ],
        take: this.realtimeBatchSize,
      });

      if (!candidates || candidates.length === 0) return;

      await Promise.allSettled(
        candidates.map((candidate) => this.runJob(candidate, now, 'REALTIME')),
      );
    } finally {
      this.isRealtimePolling = false;
    }
  }

  private async pollMediaQueue(): Promise<void> {
    if (this.isMediaPolling) return;
    this.isMediaPolling = true;

    try {
      const now = new Date();
      const candidates = await prisma.backgroundJob.findMany({
        where: {
          status: 'PENDING',
          runAfter: { lte: now },
          jobType: { notIn: REALTIME_JOB_TYPES },
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'asc' },
        ],
        take: this.mediaBatchSize,
      });

      if (!candidates || candidates.length === 0) return;

      await Promise.allSettled(
        candidates.map((candidate) => this.runJob(candidate, now, 'MEDIA')),
      );
    } finally {
      this.isMediaPolling = false;
    }
  }

  private async claimAndExecute(candidate: any, now: Date, lane: string): Promise<void> {
    // 1. Atomically claim candidate
    const claim = await prisma.backgroundJob.updateMany({
      where: {
        id: candidate.id,
        status: 'PENDING',
      },
      data: {
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: this.workerId,
        startedAt: now,
        attempts: { increment: 1 },
      },
    });

    if (claim.count === 0) return; // Claimed by another worker instance or thread

    console.log(`[DbJobPoller:${lane}] Claimed BackgroundJob ${candidate.id} (type: ${candidate.jobType}, priority: ${candidate.priority})`);

    // 2. Process the claimed job
    try {
      const payload = candidate.payload as any;
      const fakeJob = {
        id: candidate.id,
        attempts: candidate.attempts,
        attemptsMade: candidate.attempts,
        maxAttempts: candidate.maxAttempts,
        data: {
          ...payload,
          attempts: candidate.attempts,
          maxAttempts: candidate.maxAttempts,
        },
      } as any;

      switch (candidate.jobType) {
        case 'FETCH_PROFILE':
        case 'instagram-profile-fetch':
          await processProfileFetchJob(fakeJob);
          break;

        case 'SEND_DM':
        case 'instagram-send-message':
          await processSendMessageJob(fakeJob);
          break;

        case 'REPLY_COMMENT':
        case 'instagram-reply-comment':
          await processReplyCommentJob(fakeJob);
          break;

        case 'SEND_EMAIL':
        case 'email-dispatch':
          console.log(`[DbJobPoller] Dispatched email background job for ${fakeJob.data?.to || 'recipient'}`);
          break;

        default:
          throw new Error(`Unhandled jobType: ${candidate.jobType}`);
      }

      // 3. Mark job as COMPLETED
      await prisma.backgroundJob.updateMany({
        where: { id: candidate.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      console.log(`[DbJobPoller:${lane}] BackgroundJob ${candidate.id} completed successfully`);
    } catch (err: any) {
      // Check for unhandled job types: immediately mark FAILED without retry
      if (err?.message?.startsWith('Unhandled jobType:')) {
        console.error(`[DbJobPoller:${lane}] BackgroundJob ${candidate.id} fatal error: ${err.message}`);
        await prisma.backgroundJob.updateMany({
          where: { id: candidate.id },
          data: {
            status: 'FAILED',
            lastError: err.message,
            lockedAt: null,
            lockedBy: null,
          },
        });
        return;
      }

      // Non-blocking reschedule (rate limits, pacing)
      if (err?.isRateLimit || err?.name === 'RateLimitRescheduleError') {
        const retrySeconds = Math.max(1, err.retryAfterSeconds || 10);
        // Add 0.5s - 2.5s jitter to smoothly stagger burst jobs and prevent lockstep thundering herds
        const jitterSeconds = Math.random() * 2 + 0.5;
        const nextRun = new Date(Date.now() + (retrySeconds + jitterSeconds) * 1000);
        console.log(
          `[DbJobPoller:${lane}] BackgroundJob ${candidate.id} deferred (${err.reason || err.name || 'reschedule'}). ` +
          `Rescheduling for ${nextRun.toISOString()} (attempts preserved at ${candidate.attempts}).`,
        );

        await prisma.backgroundJob.updateMany({
          where: { id: candidate.id },
          data: {
            status: 'PENDING',
            attempts: candidate.attempts, // Revert increment to preserve retry quota
            runAfter: nextRun,
            lastError: `Deferred: ${err.message}`,
            lockedAt: null,
            lockedBy: null,
            ...(err.updatedPayload ? { payload: err.updatedPayload } : {}),
          },
        });
        return;
      }

      console.error(`[DbJobPoller:${lane}] BackgroundJob ${candidate.id} failed:`, err.message);

      const isExhausted = candidate.attempts + 1 >= candidate.maxAttempts;
      const baseBackoffSeconds = Math.min(Math.pow(2, candidate.attempts + 1) * 5, 300);
      const backoffJitter = Math.random() * 2;
      const backoffSeconds = baseBackoffSeconds + backoffJitter;

      await prisma.backgroundJob.updateMany({
        where: { id: candidate.id },
        data: {
          status: isExhausted ? 'FAILED' : 'PENDING',
          lastError: err.message,
          runAfter: isExhausted ? undefined : new Date(Date.now() + backoffSeconds * 1000),
          lockedAt: null,
          lockedBy: null,
        },
      });
    }
  }

  /**
   * Recovers jobs that were locked by a worker process that died or was terminated unexpectedly.
   * Resets jobs stuck in 'PROCESSING' for over 10 minutes back to 'PENDING'.
   */
  private async cleanupStaleLocks(): Promise<void> {
    // Fast-path recovery: realtime messaging jobs (DMs & comments) shouldn't hang for more than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    // Media / heavy background jobs are granted a 10-minute window
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const result = await prisma.backgroundJob.updateMany({
      where: {
        status: 'PROCESSING',
        OR: [
          {
            jobType: { in: REALTIME_JOB_TYPES },
            lockedAt: { lt: twoMinutesAgo },
          },
          {
            jobType: { notIn: REALTIME_JOB_TYPES },
            lockedAt: { lt: tenMinutesAgo },
          },
        ],
      },
      data: {
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null,
      },
    });

    if (result.count > 0) {
      console.log(`[DbJobPoller] Unlocked ${result.count} stale background jobs`);
    }
  }
}

export const dbJobPoller = new DbJobPoller();
