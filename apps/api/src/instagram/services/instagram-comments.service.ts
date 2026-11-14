import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { InstagramMediaService } from './instagram-media.service';
import { InstagramAutomationRunnerService } from './instagram-automation-runner.service';
import { analyzeCommentSentiment } from '../../common/sentiment-detector';
import { isFuzzyKeywordMatch } from '../../common/fuzzy-match';

@Injectable()
export class InstagramCommentsService {
  private readonly logger = new Logger(InstagramCommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly mediaService?: InstagramMediaService,
    @Optional() @Inject(forwardRef(() => InstagramAutomationRunnerService)) private readonly runnerService?: InstagramAutomationRunnerService,
  ) {}

  async processCommentEvent(recipientAccountId: string, commentValue: any) {
    try {
      const commentId = commentValue.id;
      const commentText = commentValue.text;
      const commenterId = commentValue.from?.id;
      const mediaId = commentValue.media?.id;

      if (!commentText || !commenterId) return;

      // Webhook Deduplication Guard (Redis Idempotency)
      if (commentId && this.redisService) {
        const isReserved = await this.redisService.reserveWebhookEvent(`comment:${commentId}`);
        if (!isReserved) {
          this.logger.log(`[WebhookDeduplicationGuard] Dropping duplicate comment webhook event ${commentId}`);
          return;
        }
      }

      const instagramAccount = await this.prisma.instagramAccount.findFirst({
        where: {
          OR: [
            { instagramUserId: recipientAccountId },
            { webhookUserId: recipientAccountId },
          ],
        },
      });

      if (!instagramAccount) return;
      if (commenterId === instagramAccount.instagramUserId) return;

      // Ensure commenter exists in CRM
      try {
        const commenterProfile = await this.prisma.instagramUserProfile.upsert({
          where: {
            instagramAccountId_instagramUserId: {
              instagramAccountId: instagramAccount.id,
              instagramUserId: commenterId,
            },
          },
          create: {
            instagramAccountId: instagramAccount.id,
            instagramUserId: commenterId,
            username: commentValue.from?.username || null,
            status: 'New',
            firstInteractionType: 'COMMENT',
            firstInteractionAt: new Date(),
            lastProfileFetchAt: new Date(),
          },
          update: {
            lastProfileFetchAt: new Date(),
          },
        });

        if (!commenterProfile.fullName && !commenterProfile.profilePictureUrl) {
          await this.prisma.backgroundJob.create({
            data: {
              jobType: 'FETCH_PROFILE',
              instagramAccountId: instagramAccount.id,
              payload: {
                instagramAccountId: instagramAccount.id,
                userId: commenterId,
                interactionType: 'COMMENT',
              },
              status: 'PENDING',
              priority: 10,
            },
          });
        }
      } catch (commenterErr: any) {
        this.logger.warn(`Failed to upsert commenter profile ${commenterId}: ${commenterErr.message}`);
      }

      const automations = await this.prisma.automation.findMany({
        where: {
          folder: {
            instagramAccountId: instagramAccount.id,
          },
          isActive: true,
          triggerType: {
            in: ['COMMENT_POST', 'COMMENT_REEL'],
          },
        },
        include: {
          nodes: true,
        },
      });

      const normalizedText = commentText.trim().toLowerCase();

      for (const automation of automations) {
        if (automation.mediaId && mediaId && automation.mediaId !== mediaId) {
          continue;
        }

        const triggerNode = automation.nodes.find((n) => n.type === 'TRIGGER_COMMENT');
        const triggerConfig = (triggerNode?.config as any) || {};

        // Feature 6: Negative Sentiment & Spam Shield (Auto-Hide)
        const isShieldActive =
          triggerConfig.autoHideNegative === true ||
          triggerConfig.autoHideSpam === true ||
          (Array.isArray(triggerConfig.customBlocklist) && triggerConfig.customBlocklist.length > 0);

        if (isShieldActive) {
          const sentimentResult = analyzeCommentSentiment(commentText, {
            customBlocklist: triggerConfig.customBlocklist,
            sensitivity: triggerConfig.sentimentSensitivity || 'moderate',
          });

          if (sentimentResult.isHarmful) {
            this.logger.warn(
              `[SentimentShield] Flagged harmful comment ${commentId} on account ${instagramAccount.id}: ${sentimentResult.reason} (Score: ${sentimentResult.score}). Triggering auto-hide.`,
            );

            // Execute comment auto-hide via Meta Graph API
            try {
              const baseUrl = instagramAccount.accessToken && instagramAccount.accessToken.startsWith('IGA')
                ? (process.env.INSTAGRAM_BASE_URL || 'https://graph.instagram.com/v21.0')
                : (process.env.INSTAGRAM_GRAPH_API_BASE || 'https://graph.facebook.com/v21.0');

              const hideUrl = `${baseUrl}/${commentId}?hide=true&access_token=${encodeURIComponent(instagramAccount.accessToken)}`;
              const hideRes = await fetch(hideUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hide: true }),
              });
              const hideData = await hideRes.json().catch(() => ({}));

              if (!hideRes.ok || hideData.error) {
                this.logger.warn(
                  `[SentimentShield] Failed to auto-hide comment ${commentId}: ${hideData.error?.message || hideRes.statusText}`,
                );
              } else {
                this.logger.log(`[SentimentShield] Successfully auto-hid harmful comment ${commentId}`);
              }
            } catch (hideErr: any) {
              this.logger.warn(`Failed to auto-hide comment ${commentId}: ${hideErr.message}`);
            }

            // If configured to skip promotional reply to toxic comments, abort flow
            if (triggerConfig.skipReplyOnHarmful !== false) {
              this.logger.debug(`Skipping automated reply for harmful comment ${commentId}`);
              continue;
            }
          }
        }

        // Feature 2: Audience Filter for Comments
        const audienceFilter = String(triggerConfig.audienceFilter || 'ALL').toUpperCase();
        if (audienceFilter === 'FIRST_TIME' || audienceFilter === 'RETURNING') {
          const priorProfile = await this.prisma.instagramUserProfile.findUnique({
            where: {
              instagramAccountId_instagramUserId: {
                instagramAccountId: instagramAccount.id,
                instagramUserId: commenterId,
              },
            },
          });
          const isFirstTime = !priorProfile || priorProfile.status === 'New';

          if (audienceFilter === 'FIRST_TIME' && !isFirstTime) {
            this.logger.debug(
              `Skipping comment automation "${automation.name}": Commenter ${commenterId} is not a first-time lead`,
            );
            continue;
          }
          if (audienceFilter === 'RETURNING' && isFirstTime) {
            this.logger.debug(
              `Skipping comment automation "${automation.name}": Commenter ${commenterId} is a first-time lead`,
            );
            continue;
          }
        }

        const keywords = (automation.triggerKeywords || triggerConfig.keywords || [])
          .map((k: string) => k.trim().toLowerCase())
          .filter(Boolean);

        let isMatch = false;

        // Feature 1: Universal Fuzzy Keyword Matching on Comments
        if (keywords.length === 0) {
          isMatch = true;
        } else {
          const isFuzzy = triggerConfig.fuzzyMatch === true || automation.triggerMatchType === 'FUZZY';
          const sensitivity = triggerConfig.toleranceSensitivity || 'normal';

          if (isFuzzy) {
            const fuzzyResult = isFuzzyKeywordMatch(commentText, keywords, { sensitivity });
            isMatch = fuzzyResult.isMatch;
            if (isMatch) {
              this.logger.debug(
                `Fuzzy comment match in automation ${automation.id}: "${commentText}" matched "${fuzzyResult.matchedKeyword}" (${fuzzyResult.confidence}%)`,
              );
            }
          } else {
            const matchType = (automation.triggerMatchType || triggerConfig.matchType || 'CONTAINS').toUpperCase();
            if (matchType === 'EXACT') {
              isMatch = keywords.some((k) => normalizedText === k);
            } else {
              isMatch = keywords.some((k) => normalizedText.includes(k));
            }
          }
        }

        if (!isMatch) continue;

        const recentExec = await this.prisma.automationExecution.findFirst({
          where: {
            automationId: automation.id,
            instagramUserId: commenterId,
            startedAt: { gte: new Date(Date.now() - 10000) },
          },
        });
        if (recentExec) continue;

        const commenterProfile = await this.prisma.instagramUserProfile.findUnique({
          where: {
            instagramAccountId_instagramUserId: {
              instagramAccountId: instagramAccount.id,
              instagramUserId: commenterId,
            },
          },
        });

        const executionVariables: Record<string, any> = {};

        let actionNodesToExecute = this.runnerService
          ? await this.runnerService.resolveExecutableActionNodes(
              automation.nodes,
              triggerNode?.nextNodeIds || [],
              {
                messageText: commentText,
                instagramUserId: commenterId,
                instagramAccountId: instagramAccount.id,
                profile: commenterProfile,
                variables: executionVariables,
              },
            )
          : [];

        if (actionNodesToExecute.length === 0) {
          const fallbackNode = automation.nodes.find(
            (n) => n.type === 'ACTION_REPLY_COMMENT' || n.type === 'ACTION_SEND_DM' || n.type === 'ACTION_REPLY_DM',
          );
          if (fallbackNode) actionNodesToExecute = [fallbackNode];
        }

        if (actionNodesToExecute.length === 0) continue;

        const commentReplyNodes = actionNodesToExecute.filter((n) => n.type === 'ACTION_REPLY_COMMENT');
        const dmNodes = actionNodesToExecute.filter((n) => n.type === 'ACTION_SEND_DM' || n.type === 'ACTION_REPLY_DM');

        if (commentReplyNodes.length === 0 && dmNodes.length === 0) continue;

        // Determine if there are DM nodes that should wait for a user reply
        const lastDmNode = dmNodes.length > 0 ? dmNodes[dmNodes.length - 1] : null;
        const lastDmConfig = (lastDmNode?.config as any) || {};
        const dmHasFurtherNodes = Array.isArray(lastDmNode?.nextNodeIds) && lastDmNode.nextNodeIds.some((id: string) => id && id !== '__EMPTY__');
        const shouldWait = Boolean(lastDmNode && dmHasFurtherNodes && lastDmConfig.waitForReplyAfterSend !== false);

        // Resume target: if DM nodes exist, resume from the DM node so subsequent inbound DMs step through its next nodes
        const primaryNodeId = dmNodes[0]?.nodeId || commentReplyNodes[0]?.nodeId || 'ACTION_REPLY_COMMENT';

        let conversationId: string | undefined = undefined;

        // Single execution record for the automation flow run
        const execution = await this.prisma.automationExecution.create({
          data: {
            automationId: automation.id,
            instagramUserId: commenterId,
            status: shouldWait ? 'WAITING' : 'PENDING',
            currentNodeId: primaryNodeId,
            variables: executionVariables,
          },
        });

        // Feature 5: Auto-Like Comment (runs for both trigger comment and reply nodes)
        const shouldAutoLike = Boolean(
          triggerConfig.autoLikeComment === true ||
          commentReplyNodes.some((node) => Boolean((node.config as any)?.autoLikeComment))
        );

        if (shouldAutoLike && commentReplyNodes.length === 0) {
          this.mediaService?.likeInstagramComment(
            instagramAccount.accessToken,
            instagramAccount.webhookUserId || instagramAccount.instagramUserId,
            commentId,
          ).catch((likeErr) => {
            this.logger.warn(`Failed to auto-like comment ${commentId}: ${likeErr.message}`);
          });
        }

        // 1. Dispatch comment replies
        for (const commentReplyNode of commentReplyNodes) {
          const config = (commentReplyNode.config as any) || {};

          // Feature 4: Message variations rotation
          const activeVariations = (Array.isArray(config.messageVariations)
            ? config.messageVariations.map((m: any) => (typeof m === 'string' ? m : m?.text))
            : []
          ).filter((m: any) => typeof m === 'string' && m.trim().length > 0);
          let candidateMessages = activeVariations.length > 0
            ? activeVariations
            : [config.message || config.text].filter(Boolean);
          let replyText = candidateMessages.length > 0
            ? candidateMessages[Math.floor(Math.random() * candidateMessages.length)]
            : '';
          if (!replyText) continue;

          // Placeholder replacement
          if (commenterProfile?.fullName) {
            replyText = replyText.replace(/\{name\}/gi, commenterProfile.fullName);
          } else if (commenterProfile?.username) {
            replyText = replyText.replace(/\{name\}/gi, `@${commenterProfile.username}`);
          } else {
            replyText = replyText.replace(/\{name\}/gi, 'there');
          }
          if (commenterProfile?.username) {
            replyText = replyText.replace(/\{username\}/gi, commenterProfile.username);
          }
          replyText = replyText.replace(/\{comment\}/gi, commentText);

          const promoVal = executionVariables.promo_code || executionVariables.promo;
          if (promoVal) {
            replyText = replyText.replace(/\{promo_code\}/gi, promoVal);
            replyText = replyText.replace(/\{\{promo_code\}\}/gi, promoVal);
            replyText = replyText.replace(/\{promo\}/gi, promoVal);
            replyText = replyText.replace(/\{\{promo\}\}/gi, promoVal);
          }

          for (const [varName, varVal] of Object.entries(executionVariables)) {
            replyText = replyText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'gi'), String(varVal));
            replyText = replyText.replace(new RegExp(`\\{${varName}\\}`, 'gi'), String(varVal));
          }

          // If there are DM nodes in this execution, comment reply is NOT the terminal step
          const isTerminalStep = dmNodes.length === 0;

          // Feature 5: Auto-Like Comment
          const autoLike = Boolean(config.autoLikeComment ?? triggerConfig.autoLikeComment);

          const commentDelaySec = config.delayEnabled && typeof config.delaySeconds === 'number' && config.delaySeconds > 0
            ? config.delaySeconds
            : 0;
          const commentRunAfter = commentDelaySec > 0 ? new Date(Date.now() + commentDelaySec * 1000) : new Date();

          await this.prisma.backgroundJob.create({
            data: {
              jobType: 'REPLY_COMMENT',
              instagramAccountId: instagramAccount.id,
              payload: {
                instagramAccountId: instagramAccount.id,
                commentId,
                message: replyText,
                autoLike,
                delaySeconds: commentDelaySec,
                executionId: execution.id,
                automationId: automation.id,
                nodeId: commentReplyNode.nodeId,
                isTerminalStep,
              },
              status: 'PENDING',
              priority: 1,
              runAfter: commentRunAfter,
            },
          });
        }

        // 2. Dispatch Direct Messages
        for (const dmNode of dmNodes) {
          const config = (dmNode.config as any) || {};

          // Feature 4: Message variations rotation for DMs
          const activeVariations = (Array.isArray(config.messageVariations)
            ? config.messageVariations.map((m: any) => (typeof m === 'string' ? m : m?.text))
            : []
          ).filter((m: any) => typeof m === 'string' && m.trim().length > 0);
          let candidateMessages = activeVariations.length > 0
            ? activeVariations
            : [config.message || config.text].filter(Boolean);
          let replyText = candidateMessages.length > 0
            ? candidateMessages[Math.floor(Math.random() * candidateMessages.length)]
            : '';
          const hasCarouselCards = Array.isArray(config.carouselCards) && config.carouselCards.length > 0;
          if (!replyText && !hasCarouselCards) continue;

          // Placeholder replacement
          if (commenterProfile?.fullName) {
            replyText = replyText.replace(/\{name\}/gi, commenterProfile.fullName);
          } else if (commenterProfile?.username) {
            replyText = replyText.replace(/\{name\}/gi, `@${commenterProfile.username}`);
          } else {
            replyText = replyText.replace(/\{name\}/gi, 'there');
          }
          if (commenterProfile?.username) {
            replyText = replyText.replace(/\{username\}/gi, commenterProfile.username);
          }
          replyText = replyText.replace(/\{comment\}/gi, commentText);

          const promoVal = executionVariables.promo_code || executionVariables.promo;
          if (promoVal) {
            replyText = replyText.replace(/\{promo_code\}/gi, promoVal);
            replyText = replyText.replace(/\{\{promo_code\}\}/gi, promoVal);
            replyText = replyText.replace(/\{promo\}/gi, promoVal);
            replyText = replyText.replace(/\{\{promo\}\}/gi, promoVal);
          }

          for (const [varName, varVal] of Object.entries(executionVariables)) {
            replyText = replyText.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'gi'), String(varVal));
            replyText = replyText.replace(new RegExp(`\\{${varName}\\}`, 'gi'), String(varVal));
          }

          const delaySec = config.delayEnabled && typeof config.delaySeconds === 'number' && config.delaySeconds > 0
            ? config.delaySeconds
            : 0;
          const runAfter = delaySec > 0 ? new Date(Date.now() + delaySec * 1000) : new Date();

          await this.prisma.backgroundJob.create({
            data: {
              jobType: 'SEND_DM',
              instagramAccountId: instagramAccount.id,
              payload: {
                instagramAccountId: instagramAccount.id,
                recipientId: commenterId,
                commentId,
                isPrivateReply: true,
                message: replyText,
                mediaUrl: config.mediaUrl || null,
                messageType: config.mediaUrl ? (config.mediaType || 'IMAGE') : 'TEXT',
                buttons: Array.isArray(config.buttons) ? config.buttons : null,
                buttonStyle: config.buttonStyle || 'buttons',
                carouselCards: Array.isArray(config.carouselCards) && config.carouselCards.length > 0 ? config.carouselCards : undefined,
                delaySeconds: delaySec,
                executionId: execution.id,
                automationId: automation.id,
                nodeId: dmNode.nodeId,
              },
              status: 'PENDING',
              priority: 1,
              runAfter,
            },
          });
        }

        this.logger.log(
          `Triggered comment automation "${automation.name}" for commenter ${commenterId}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Error processing comment event: ${err.message}`);
    }
  }

}
