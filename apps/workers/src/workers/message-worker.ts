import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, SendMessageJobData } from '@instance/types';
import { prisma } from '@instance/db';
import { createRedisConnection } from '../config/redis';
import { instagramApiService } from '../services/instagram-api.service';
import { checkDmRateLimit, RateLimitRescheduleError } from '../services/dm-rate-limiter';

/**
 * Worker Processor: Instagram Direct Messages (`SEND_DM` / `instagram-send-message`)
 *
 * Responsibilities:
 * - Dispatches outbound DMs (text, media links, quick replies, buttons, and carousels).
 * - Enforces account safety: checks account health (isPaused) and token-bucket rate limits before dispatch.
 * - Idempotency Guarantee: Checks and checkpoints `sentMessageId` to prevent duplicate messaging
 *   to users if job execution is retried after a transient network drop.
 * - Auto-detects Meta Graph API rate-limit errors (codes 4, 17, 32, 613, 429) and initiates
 *   non-blocking backoff via RateLimitRescheduleError.
 * - Advances visual automation execution steps and updates account telemetry counters.
 */
export async function processSendMessageJob(job: Job<SendMessageJobData>): Promise<any> {
  const {
    instagramAccountId,
    recipientId,
    message,
    messageType = 'TEXT',
    mediaUrl,
    buttons,
    buttonStyle,
    carouselCards = (job.data as any).carouselCards,
    executionId,
    automationId,
  } = job.data;

  console.log(`[MessageWorker] Dispatching message for recipient ${recipientId} on account ${instagramAccountId}`);

  // 1. Fetch Instagram account and health
  const account = await prisma.instagramAccount.findUnique({
    where: { id: instagramAccountId },
    include: { health: true },
  });

  if (!account || !account.isActive) {
    const errorMsg = `Account ${instagramAccountId} not found or inactive`;
    console.warn(`[MessageWorker] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // 2. Dispatch or recover existing messageId (Idempotent execution check)
  const existingMessageId = (job.data as any).sentMessageId;
  let sendRes: { success: boolean; messageId?: string; error?: string };

  if (existingMessageId) {
    console.log(`[MessageWorker] Message already dispatched to Meta on earlier attempt (${existingMessageId}). Skipping duplicate dispatch.`);
    sendRes = { success: true, messageId: existingMessageId };
  } else {
    // Health & Token-bucket rate limit checks
    if (account.health?.isPaused) {
      const errorMsg = `Account ${instagramAccountId} is paused: ${account.health.pausedReason || 'Unknown reason'}`;
      console.warn(`[MessageWorker] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const accountHandle = account.username || account.instagramUserId || account.id;
    const isPrivateReply = Boolean((job.data as any).commentId || (job.data as any).isPrivateReply);
    const commentId = (job.data as any).commentId;
    const isMedia = messageType === 'IMAGE' || messageType === 'VIDEO';

    const rateLimitCheck = await checkDmRateLimit(accountHandle, {
      isPrivateReply,
      isMedia,
      recipientId,
    });
    if (!rateLimitCheck.allowed) {
      console.log(
        `[MessageWorker] Rate limit active for ${accountHandle} (${rateLimitCheck.reason}). Rescheduling in ${rateLimitCheck.retryAfterSeconds}s`,
      );
      throw new RateLimitRescheduleError(
        rateLimitCheck.retryAfterSeconds,
        rateLimitCheck.reason,
        accountHandle,
      );
    }

    // 3. Dispatch message via Graph API
    sendRes = await instagramApiService.sendMessage(
      account.accessToken,
      recipientId,
      message,
      mediaUrl,
      messageType,
      buttons,
      buttonStyle,
      carouselCards,
      { commentId },
    );

    // Checkpoint sentMessageId to job payload immediately upon successful dispatch
    if (sendRes.success && sendRes.messageId && job.id) {
      (job.data as any).sentMessageId = sendRes.messageId;
      await prisma.backgroundJob.updateMany({
        where: { id: String(job.id) },
        data: {
          payload: {
            ...(job.data as any),
            sentMessageId: sendRes.messageId,
          },
        },
      }).catch((checkpointErr: any) => {
        console.warn(`[MessageWorker] Failed to checkpoint sentMessageId to BackgroundJob: ${checkpointErr.message}`);
      });
    }
  }

  if (!sendRes.success) {
    const errorMsg = sendRes.error || 'Failed to dispatch Instagram message';
    const isRateLimit = /rate.?limit|too many requests|request limit reached|throttled|#4\b|#17\b|#32\b|#613\b|\b429\b/i.test(errorMsg);
    const isTransient = /transient|temporarily unavailable|temporary issue|please retry/i.test(errorMsg);

    const match = errorMsg.match(/\(#?(\d+)\)/) || errorMsg.match(/HTTP\s+(\d+)/i);
    const metaCode = match ? match[1] : undefined;
    const errorCode = isRateLimit ? (metaCode === '4' ? '4' : '429') : (metaCode || (isTransient ? 'TRANSIENT' : 'UNKNOWN'));

    await instagramApiService.logApiError(
      instagramAccountId,
      '/me/messages',
      { code: errorCode, message: errorMsg },
      { automationId, userId: recipientId },
    );

    if (isRateLimit) {
      console.warn(
        `[MessageWorker] Meta Graph API rate limit encountered for account ${instagramAccountId} (${account.username || account.id}): ${errorMsg}. Rescheduling...`,
      );
      throw new RateLimitRescheduleError(
        60,
        'RATE_LIMIT',
        account.username || account.instagramUserId || account.id,
      );
    }

    if (isTransient) {
      console.warn(
        `[MessageWorker] Transient Meta Graph API error for recipient ${recipientId} on account ${instagramAccountId}: ${errorMsg}. Preserving execution state for retry.`,
      );
    }

    const attempts = (job as any)?.attempts ?? (job as any)?.attemptsMade ?? (job.data as any)?.attempts ?? 0;
    const maxAttempts = (job as any)?.maxAttempts ?? (job as any)?.opts?.attempts ?? (job.data as any)?.maxAttempts ?? 3;
    const isExhausted = attempts + 1 >= maxAttempts;

    if (executionId) {
      try {
        await prisma.executionStep.create({
          data: {
            executionId,
            nodeId: (job.data as any).nodeId || 'ACTION_SEND_DM',
            status: 'FAILED',
            errorMessage: errorMsg,
            executedAt: new Date(),
          },
        });

        // Only update automationExecution status to FAILED once job retry attempts are exhausted
        if (isExhausted) {
          await prisma.automationExecution.update({
            where: { id: executionId },
            data: {
              status: 'FAILED',
              errorMessage: errorMsg,
              completedAt: new Date(),
            },
          });
        } else {
          console.log(`[MessageWorker] Step failed on retryable attempt ${attempts + 1}/${maxAttempts}. Preserving execution state.`);
        }
      } catch (err: any) {
        console.warn(`[MessageWorker] Failed to record execution error:`, err.message);
      }
    }

    throw new Error(errorMsg);
  }



  // 6. Record ExecutionStep and update execution status if part of visual automation
  if (executionId) {
    try {
      await prisma.executionStep.create({
        data: {
          executionId,
          nodeId: (job.data as any).nodeId || 'ACTION_SEND_DM',
          status: 'SUCCESS',
          output: { messageId: sendRes.messageId, recipientId },
          executedAt: new Date(),
        },
      });

      const currentExec = await prisma.automationExecution.findUnique({
        where: { id: executionId },
        include: {
          automation: {
            include: {
              nodes: true,
            },
          },
        },
      });

      if (currentExec && currentExec.status !== 'WAITING') {
        const currentNode = currentExec.automation?.nodes?.find(
          (n) => n.nodeId === ((job.data as any).nodeId || currentExec.currentNodeId),
        );
        const hasNextNodes = Array.isArray(currentNode?.nextNodeIds) && currentNode.nextNodeIds.some((id: string) => id && id !== '__EMPTY__');
        const isExplicitTerminal = (job.data as any).isTerminalStep === true;
        const isExplicitNonTerminal = (job.data as any).isTerminalStep === false || (job.data as any).hasNextNodes === true;

        if (!isExplicitNonTerminal && (!hasNextNodes || isExplicitTerminal)) {
          await prisma.automationExecution.update({
            where: { id: executionId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
        } else {
          console.log(`[MessageWorker] AutomationExecution ${executionId} has downstream steps. Preserving active execution state.`);
        }
      }
    } catch (stepErr: any) {
      console.warn(`[MessageWorker] ExecutionStep recording warning:`, stepErr.message);
    }
  }

  // 7. Increment health metrics
  await prisma.instagramAccountHealth.upsert({
    where: { instagramAccountId },
    update: {
      messagesThisHour: { increment: 1 },
      messagesToday: { increment: 1 },
      apiCallsThisHour: { increment: 1 },
      apiCallsToday: { increment: 1 },
      lastApiCallAt: new Date(),
    },
    create: {
      instagramAccountId,
      messagesThisHour: 1,
      messagesToday: 1,
      apiCallsThisHour: 1,
      apiCallsToday: 1,
      lastApiCallAt: new Date(),
    },
  });

  console.log(`[MessageWorker] Message successfully sent to ${recipientId} (ID: ${sendRes.messageId})`);
  return {
    success: true,
    messageId: sendRes.messageId,
    recipientId,
  };
}

/**
 * Instantiate and start the Message Worker
 */
export function createMessageWorker(): Worker<SendMessageJobData> {
  const connection = createRedisConnection();

  const worker = new Worker<SendMessageJobData>(
    QUEUE_NAMES.SEND_MESSAGE,
    processSendMessageJob,
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[MessageWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[MessageWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
