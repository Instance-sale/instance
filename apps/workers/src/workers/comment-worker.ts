import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, ReplyCommentJobData } from '@instance/types';
import { prisma } from '@instance/db';
import { createRedisConnection } from '../config/redis';
import { instagramApiService } from '../services/instagram-api.service';
import { checkCommentRateLimit, RateLimitRescheduleError } from '../services/dm-rate-limiter';

/**
 * Worker Processor: Instagram Comment Replies (`REPLY_COMMENT` / `instagram-reply-comment`)
 *
 * Responsibilities:
 * - Dispatches public replies to user comments on posts and reels.
 * - Enforces comment rate limits (default: 60/hr) via RateLimitRescheduleError.
 * - Idempotency Check: Recovers previously dispatched `sentCommentId` to prevent duplicate replies.
 * - Post-processing: Automatically likes or hides comments if configured in automation actions.
 * - Tracks execution steps and account health telemetry.
 */
export async function processReplyCommentJob(job: Job<ReplyCommentJobData>): Promise<any> {
  const { instagramAccountId, commentId, message, executionId, automationId } = job.data;

  console.log(`[CommentWorker] Replying to comment ${commentId} on account ${instagramAccountId}`);

  // 1. Fetch Instagram account
  const account = await prisma.instagramAccount.findUnique({
    where: { id: instagramAccountId },
  });

  if (!account || !account.isActive) {
    const errorMsg = `Account ${instagramAccountId} not found or inactive`;
    console.warn(`[CommentWorker] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // 1b. Dispatch or recover existing commentId (Idempotent execution check)
  const existingCommentId = (job.data as any).sentCommentId;
  let replyRes: { success: boolean; commentId?: string; error?: string };

  if (existingCommentId) {
    console.log(`[CommentWorker] Comment reply already dispatched to Meta on earlier attempt (${existingCommentId}). Skipping duplicate dispatch.`);
    replyRes = { success: true, commentId: existingCommentId };
  } else {
    // Rate limit & pacing check to protect account against Meta spam blocks
    const accountHandle = account.username || account.instagramUserId || account.id;
    const rateLimitCheck = await checkCommentRateLimit(accountHandle);
    if (!rateLimitCheck.allowed) {
      console.log(
        `[CommentWorker] Rate limit active for ${accountHandle} (${rateLimitCheck.reason}). Rescheduling in ${rateLimitCheck.retryAfterSeconds}s`,
      );
      throw new RateLimitRescheduleError(
        rateLimitCheck.retryAfterSeconds,
        rateLimitCheck.reason,
        accountHandle,
      );
    }

    // 2. Dispatch reply via Graph API
    replyRes = await instagramApiService.replyToComment(
      account.accessToken,
      commentId,
      message,
    );

    // 2b. Auto-like the user's comment if requested
    if ((job.data as any).autoLikeComment || (job.data as any).autoLike) {
      try {
        const likeRes = await instagramApiService.likeComment(
          account.accessToken,
          commentId,
          account.webhookUserId || account.instagramUserId,
        );
        if (likeRes.success) {
          console.log(`[CommentWorker] Auto-liked comment ${commentId}`);
        } else {
          console.warn(`[CommentWorker] Auto-like warning for ${commentId}:`, likeRes.error);
        }
      } catch (likeErr: any) {
        console.warn(`[CommentWorker] Auto-like error for ${commentId}:`, likeErr.message);
      }
    }

    // 2c. Auto-hide the user's comment if flagged for negative sentiment/spam
    if ((job.data as any).autoHideComment || (job.data as any).autoHide) {
      try {
        const hideRes = await instagramApiService.hideComment(account.accessToken, commentId);
        if (hideRes.success) {
          console.log(`[CommentWorker] Auto-hid comment ${commentId}`);
        } else {
          console.warn(`[CommentWorker] Auto-hide warning for ${commentId}:`, hideRes.error);
        }
      } catch (hideErr: any) {
        console.warn(`[CommentWorker] Auto-hide error for ${commentId}:`, hideErr.message);
      }
    }

    // Checkpoint sentCommentId to job payload immediately upon successful dispatch
    if (replyRes.success && replyRes.commentId && job.id) {
      (job.data as any).sentCommentId = replyRes.commentId;
      await prisma.backgroundJob.updateMany({
        where: { id: String(job.id) },
        data: {
          payload: {
            ...(job.data as any),
            sentCommentId: replyRes.commentId,
          },
        },
      }).catch((checkpointErr: any) => {
        console.warn(`[CommentWorker] Failed to checkpoint sentCommentId to BackgroundJob: ${checkpointErr.message}`);
      });
    }
  }

  if (!replyRes.success) {
    await instagramApiService.logApiError(
      instagramAccountId,
      `/${commentId}/replies`,
      { message: replyRes.error },
      { automationId },
    );

    const attempts = (job as any)?.attempts ?? (job as any)?.attemptsMade ?? (job.data as any)?.attempts ?? 0;
    const maxAttempts = (job as any)?.maxAttempts ?? (job as any)?.opts?.attempts ?? (job.data as any)?.maxAttempts ?? 3;
    const isExhausted = attempts + 1 >= maxAttempts;

    if (executionId) {
      try {
        await prisma.executionStep.create({
          data: {
            executionId,
            nodeId: (job.data as any).nodeId || 'ACTION_REPLY_COMMENT',
            status: 'FAILED',
            errorMessage: replyRes.error,
            executedAt: new Date(),
          },
        });

        // Only mark execution as FAILED when retry attempts are exhausted
        if (isExhausted) {
          await prisma.automationExecution.update({
            where: { id: executionId },
            data: {
              status: 'FAILED',
              errorMessage: replyRes.error,
              completedAt: new Date(),
            },
          });
        } else {
          console.log(`[CommentWorker] Transient comment step error on attempt ${attempts + 1}/${maxAttempts}. Preserving execution state for retry.`);
        }
      } catch (err: any) {
        console.warn(`[CommentWorker] Failed to record execution error:`, err.message);
      }
    }

    throw new Error(replyRes.error || 'Failed to reply to comment');
  }

  // 3. Record ExecutionStep and update execution status if part of visual automation
  if (executionId) {
    try {
      await prisma.executionStep.create({
        data: {
          executionId,
          nodeId: (job.data as any).nodeId || 'ACTION_REPLY_COMMENT',
          status: 'SUCCESS',
          output: { commentId: replyRes.commentId },
          executedAt: new Date(),
        },
      });

      const currentExec = await prisma.automationExecution.findUnique({
        where: { id: executionId },
        select: { status: true },
      });

      if (currentExec && currentExec.status !== 'WAITING' && (job.data as any).isTerminalStep !== false) {
        await prisma.automationExecution.update({
          where: { id: executionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }
    } catch (stepErr: any) {
      console.warn(`[CommentWorker] ExecutionStep recording warning:`, stepErr.message);
    }
  }

  // 4. Increment health metrics
  await prisma.instagramAccountHealth.upsert({
    where: { instagramAccountId },
    update: {
      apiCallsThisHour: { increment: 1 },
      apiCallsToday: { increment: 1 },
      lastApiCallAt: new Date(),
    },
    create: {
      instagramAccountId,
      apiCallsThisHour: 1,
      apiCallsToday: 1,
      lastApiCallAt: new Date(),
    },
  });

  console.log(`[CommentWorker] Successfully replied to comment ${commentId} (Reply ID: ${replyRes.commentId})`);
  return {
    success: true,
    commentId: replyRes.commentId,
  };
}

/**
 * Instantiate and start the Comment Worker
 */
export function createCommentWorker(): Worker<ReplyCommentJobData> {
  const connection = createRedisConnection();

  const worker = new Worker<ReplyCommentJobData>(
    QUEUE_NAMES.REPLY_COMMENT,
    processReplyCommentJob,
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[CommentWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[CommentWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
