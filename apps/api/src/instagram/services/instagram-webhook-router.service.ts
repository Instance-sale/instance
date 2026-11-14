import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import crypto from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { InstagramCommentsService } from './instagram-comments.service';
import { InstagramAutomationRunnerService } from './instagram-automation-runner.service';

function getGraphApiBase(token: string): string {
  if (token && (token.startsWith('IGAA') || token.startsWith('IGQ') || token.startsWith('AQ'))) {
    return 'https://graph.instagram.com/v24.0';
  }
  return 'https://graph.facebook.com/v24.0';
}

@Injectable()
export class InstagramWebhookRouterService {
  private readonly logger = new Logger(InstagramWebhookRouterService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly commentsService?: InstagramCommentsService,
    @Optional() @Inject(forwardRef(() => InstagramAutomationRunnerService)) private readonly runnerService?: InstagramAutomationRunnerService,
  ) { }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    const candidateSecrets = [
      process.env.INSTAGRAM_APP_SECRET,
      process.env.META_APP_SECRET,
    ].filter(Boolean) as string[];

    if (candidateSecrets.length === 0 || !signature) return false;

    const expectedSignature = signature.replace('sha256=', '');

    for (const secret of candidateSecrets) {
      try {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(rawBody);
        const calculatedSignature = hmac.digest('hex');

        if (
          crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(calculatedSignature, 'hex'),
          )
        ) {
          return true;
        }
      } catch {
        // Continue checking next candidate secret
      }
    }

    return false;
  }

  async processWebhookEvent(body: any) {
    if (body.object !== 'instagram' || !Array.isArray(body.entry)) {
      return;
    }

    for (const entry of body.entry) {
      // 1. Direct Messaging events
      if (entry.messaging) {
        for (const messagingEvent of entry.messaging) {
          await this.processMessagingEvent(messagingEvent);
        }
      }

      // 2. Comments & Post changes
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'comments' && change.value) {
            if (this.commentsService) await this.commentsService.processCommentEvent(entry.id, change.value);
          }
        }
      }
    }
  }

  async processMessagingEvent(messagingEvent: any) {
    const senderId = messagingEvent.sender?.id;
    const recipientId = messagingEvent.recipient?.id;
    const message = messagingEvent.message;
    const postback = messagingEvent.postback;

    const isStoryMention = Array.isArray(message?.attachments) &&
      message.attachments.some((att: any) => att.type === 'story_mention');
    const isStoryReply = Boolean(message?.reply_to?.story);

    if (message?.is_echo) return;

    const messageContent = message?.text || message?.quick_reply?.payload || postback?.title || postback?.payload || (isStoryMention ? '[Story Mention]' : '');
    const messageMid =
      message?.mid ||
      postback?.mid ||
      (postback
        ? `pb_${senderId}_${messagingEvent.timestamp || ''}_${postback.payload || postback.title || ''}`
        : `msg_${senderId}_${messagingEvent.timestamp || ''}_${(messageContent || '').substring(0, 32)}`);

    if (!messageContent && !isStoryMention) {
      return;
    }

    // Webhook Deduplication Guard (Redis Idempotency)
    if (this.redisService) {
      const isReserved = await this.redisService.reserveWebhookEvent(`msg:${messageMid}`);
      if (!isReserved) {
        this.logger.log(`[WebhookDeduplicationGuard] Dropping duplicate messaging webhook event ${messageMid}`);
        return;
      }
    }

    const instagramAccount = await this.prisma.instagramAccount.findFirst({
      where: {
        OR: [
          { instagramUserId: recipientId },
          { webhookUserId: recipientId },
        ],
      },
    });

    if (!instagramAccount) return;

    const now = new Date();

    // Immediately ensure an InstagramUserProfile exists so the lead appears in CRM with status "New"
    try {
      const profile = await this.prisma.instagramUserProfile.upsert({
        where: {
          instagramAccountId_instagramUserId: {
            instagramAccountId: instagramAccount.id,
            instagramUserId: senderId,
          },
        },
        create: {
          instagramAccountId: instagramAccount.id,
          instagramUserId: senderId,
          username: messagingEvent.sender?.username || null,
          status: 'New',
          firstInteractionType: (isStoryMention || isStoryReply) ? 'STORY' : 'DM',
          firstInteractionAt: now,
          lastProfileFetchAt: now,
        },
        update: {
          lastProfileFetchAt: now,
        },
      });

      // Enqueue background enrichment if basic info is missing
      if (!profile.fullName && !profile.profilePictureUrl) {
        await this.prisma.backgroundJob.create({
          data: {
            jobType: 'FETCH_PROFILE',
            instagramAccountId: instagramAccount.id,
            payload: {
              instagramAccountId: instagramAccount.id,
              userId: senderId,
              interactionType: (isStoryMention || isStoryReply) ? 'STORY' : 'DM',
            },
            status: 'PENDING',
            priority: 10,
          },
        });
      }
    } catch (profileErr: any) {
      this.logger.warn(`Failed to upsert InstagramUserProfile for ${senderId}: ${profileErr.message}`);
    }

    let storyMediaUrl: string | undefined = undefined;
    if (isStoryMention && Array.isArray(message?.attachments)) {
      const mentionAttachment = message.attachments.find((att: any) => att.type === 'story_mention');
      storyMediaUrl = mentionAttachment?.payload?.url;
    }

    if (isStoryMention) {
      try {
        await this.prisma.storyMention.create({
          data: {
            instagramAccountId: instagramAccount.id,
            instagramUserId: senderId,
            username: messagingEvent.sender?.username || null,
            followerCount: null,
            mediaUrl: storyMediaUrl || null,
            storyExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            repostStatus: 'PENDING',
          },
        });
        this.logger.log(`[UGC] Recorded new Story Mention from user ${senderId} on account ${instagramAccount.id}`);
      } catch (smErr: any) {
        this.logger.warn(`Failed to record StoryMention: ${smErr.message}`);
      }
    }



    // 1. Check if user is in an active automation waiting for a reply/button tap
    const wasResumed = this.runnerService
      ? await this.runnerService.resumeWaitingExecution(
        instagramAccount,
        senderId,
        null,
        messageContent,
      )
      : false;

    if (wasResumed) {
      return;
    }

    // Check if inbound event originates from a configured Icebreaker button
    let targetIcebreakerAutomationId: string | undefined = undefined;
    if (Array.isArray(instagramAccount.icebreakers)) {
      const targetText = messageContent.trim().toLowerCase();
      const postbackPayload = (postback?.payload || '').trim().toLowerCase();
      const matchedIcebreaker = (instagramAccount.icebreakers as any[]).find((ib) => {
        const q = (ib.question || '').trim().toLowerCase();
        const p = (ib.payload || '').trim().toLowerCase();
        return (p && (targetText === p || postbackPayload === p)) || (q && targetText === q);
      });
      if (matchedIcebreaker?.automationId) {
        targetIcebreakerAutomationId = matchedIcebreaker.automationId;
      }
    }

    // 3. Otherwise trigger matching automations for new inbound DM, Story Mention, or Story Reply
    if (this.runnerService) await this.runnerService.triggerMatchingAutomations(
      instagramAccount,
      senderId,
      senderId,
      messageContent,
      {
        isStoryMention,
        isStoryReply,
        replyStoryId: message?.reply_to?.story?.id,
        storyMediaUrl,
        targetAutomationId: targetIcebreakerAutomationId,
      },
    );
  }

  async getWebhookDebug(companyId: string, limit: number = 50) {
    const executions = await this.prisma.automationExecution.findMany({
      where: {
        automation: {
          folder: {
            instagramAccount: {
              companyId,
            },
          },
        },
      },
      include: {
        automation: {
          select: {
            id: true,
            name: true,
            triggerType: true,
          },
        },
        steps: {
          orderBy: {
            executedAt: 'desc',
          },
          take: 10,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });

    const recentSteps = await this.prisma.executionStep.findMany({
      where: {
        execution: {
          automation: {
            folder: {
              instagramAccount: {
                companyId,
              },
            },
          },
        },
      },
      include: {
        execution: {
          include: {
            automation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        executedAt: 'desc',
      },
      take: 100,
    });

    const recentErrors = await this.prisma.automationExecution.findMany({
      where: {
        status: 'FAILED',
        automation: {
          folder: {
            instagramAccount: {
              companyId,
            },
          },
        },
      },
      include: {
        automation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 20,
    });

    return {
      summary: {
        totalExecutions: executions.length,
        recentSteps: recentSteps.length,
        recentErrors: recentErrors.length,
      },
      executions: executions.map((e) => ({
        id: e.id,
        automationId: e.automationId,
        automationName: e.automation?.name,
        triggerType: e.automation?.triggerType,
        status: e.status,
        instagramUserId: e.instagramUserId,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        errorMessage: e.errorMessage,
        stepCount: e.steps.length,
        lastSteps: e.steps.slice(0, 5),
      })),
      recentSteps: recentSteps.slice(0, 30).map((s) => ({
        id: s.id,
        executionId: s.executionId,
        automationName: s.execution?.automation?.name,
        nodeId: s.nodeId,
        status: s.status,
        executedAt: s.executedAt,
        errorMessage: s.errorMessage,
      })),
      recentErrors: recentErrors.map((e) => ({
        id: e.id,
        automationName: e.automation?.name,
        status: e.status,
        errorMessage: e.errorMessage,
        completedAt: e.completedAt,
      })),
    };
  }

  /**
   * Feature 7: Story Mentions (UGC) Query API
   */
}
