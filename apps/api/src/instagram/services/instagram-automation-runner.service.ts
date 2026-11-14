import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { isFuzzyKeywordMatch } from '../../common/fuzzy-match';

@Injectable()
export class InstagramAutomationRunnerService {
  private readonly logger = new Logger(InstagramAutomationRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
  ) { }

  async resumeWaitingExecution(
    instagramAccount: any,
    senderId: string,
    conversationId: string,
    messageText: string,
  ): Promise<boolean> {
    try {
      // Find the most recent WAITING execution for this user on this Instagram account
      const waitingExecution = await this.prisma.automationExecution.findFirst({
        where: {
          instagramUserId: senderId,
          status: 'WAITING',
          automation: {
            folder: {
              instagramAccountId: instagramAccount.id,
            },
            isActive: true,
          },
        },
        include: {
          automation: {
            include: {
              nodes: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      if (!waitingExecution) {
        return false;
      }

      // 24 hour timeout guard
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (waitingExecution.startedAt < twentyFourHoursAgo) {
        await this.prisma.automationExecution.update({
          where: { id: waitingExecution.id },
          data: { status: 'FAILED', errorMessage: 'Timed out waiting for reply' },
        });
        return false;
      }

      const currentNode = waitingExecution.automation.nodes.find(
        (n) => n.nodeId === waitingExecution.currentNodeId,
      );

      const hasConditionPaths = currentNode?.type === 'ACTION_CONDITION' && Boolean((currentNode.config as any)?.conditionPaths?.true);
      const hasButtonPaths = (currentNode?.type === 'ACTION_SEND_DM' || currentNode?.type === 'ACTION_REPLY_DM') && (
        Boolean((currentNode.config as any)?.defaultPath) ||
        Object.keys((currentNode.config as any)?.buttonPaths || {}).length > 0 ||
        (Array.isArray((currentNode.config as any)?.carouselCards) && (currentNode.config as any).carouselCards.length > 0)
      );
      const hasNextNodes = Array.isArray(currentNode?.nextNodeIds) && currentNode.nextNodeIds.some((id: string) => id && id !== '__EMPTY__');

      if (!currentNode || (!hasNextNodes && !hasConditionPaths && !hasButtonPaths)) {
        await this.prisma.automationExecution.update({
          where: { id: waitingExecution.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        return false;
      }

      const currentConfig = (currentNode.config as any) || {};

      // 1. Fetch user profile for variable enrichment & CRM capture
      const userProfile = await this.prisma.instagramUserProfile.findUnique({
        where: {
          instagramAccountId_instagramUserId: {
            instagramAccountId: instagramAccount.id,
            instagramUserId: senderId,
          },
        },
      });

      const profileUpdates: any = {};
      const executionVariables: Record<string, any> = {
        ...((waitingExecution.variables as any) || {}),
        lastUserReply: messageText,
        userReply: messageText,
      };

      // Capture email if enabled with validation and retry loop
      let emailCaptureFailed = false;
      if (currentConfig.captureEmail) {
        const emailMatch = messageText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
        if (emailMatch) {
          profileUpdates.email = emailMatch[0];
          executionVariables['email'] = emailMatch[0];
          delete executionVariables['_emailRetryCount'];
          this.logger.log(`Captured email ${emailMatch[0]} from user ${senderId}`);
        } else {
          emailCaptureFailed = true;
        }
      }

      // If email was expected but format was invalid, prompt for retry up to configured limit
      if (emailCaptureFailed) {
        const maxRetries = typeof currentConfig.emailMaxRetries === 'number' && currentConfig.emailMaxRetries > 0
          ? currentConfig.emailMaxRetries
          : 2;
        const currentRetries = Number(executionVariables['_emailRetryCount'] || 0);

        if (currentRetries < maxRetries) {
          executionVariables['_emailRetryCount'] = currentRetries + 1;
          let retryMessage = (currentConfig.emailRetryMessage && String(currentConfig.emailRetryMessage).trim())
            || "That doesn't look like a valid email address. Please reply with your email (e.g., name@example.com):";

          if (userProfile?.fullName) {
            retryMessage = retryMessage.replace(/\{name\}/gi, userProfile.fullName);
          } else if (userProfile?.username) {
            retryMessage = retryMessage.replace(/\{name\}/gi, `@${userProfile.username}`);
          } else {
            retryMessage = retryMessage.replace(/\{name\}/gi, 'there');
          }
          if (userProfile?.username) {
            retryMessage = retryMessage.replace(/\{username\}/gi, userProfile.username);
          }

          await this.prisma.automationExecution.update({
            where: { id: waitingExecution.id },
            data: {
              variables: executionVariables,
              status: 'WAITING',
            },
          });

          await this.prisma.backgroundJob.create({
            data: {
              jobType: 'SEND_DM',
              instagramAccountId: instagramAccount.id,
              payload: {
                instagramAccountId: instagramAccount.id,
                recipientId: senderId,
                message: retryMessage,
                delaySeconds: 0,
                executionId: waitingExecution.id,
                automationId: waitingExecution.automationId,
              },
              status: 'PENDING',
              priority: 1,
              runAfter: new Date(),
            },
          });

          this.logger.log(`[EmailValidation] Invalid email from user ${senderId}. Sent retry attempt #${currentRetries + 1}/${maxRetries}`);
          return true;
        } else {
          this.logger.log(`[EmailValidation] Max retries (${maxRetries}) reached for user ${senderId}. Continuing downstream flow.`);
          delete executionVariables['_emailRetryCount'];
        }
      }

      // Capture phone if enabled
      if (currentConfig.capturePhone) {
        const phoneMatch = messageText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (phoneMatch) {
          profileUpdates.phone = phoneMatch[0];
          executionVariables['phone'] = phoneMatch[0];
          this.logger.log(`Captured phone ${phoneMatch[0]} from user ${senderId}`);
        }
      }

      // Store in custom variable if configured
      if (currentConfig.storeReplyAsVariable && typeof currentConfig.storeReplyAsVariable === 'string') {
        const varName = currentConfig.storeReplyAsVariable.trim();
        if (varName) {
          executionVariables[varName] = messageText;
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        try {
          await this.prisma.instagramUserProfile.update({
            where: {
              instagramAccountId_instagramUserId: {
                instagramAccountId: instagramAccount.id,
                instagramUserId: senderId,
              },
            },
            data: profileUpdates,
          });
        } catch (err: any) {
          this.logger.warn(`Failed to update profile captured fields: ${err.message}`);
        }

        // Also persist captured contact info into ContactCapture so it appears in Email List
        if (profileUpdates.email || profileUpdates.phone) {
          try {
            const existingCapture = await this.prisma.contactCapture.findUnique({
              where: {
                instagramAccountId_instagramUserId: {
                  instagramAccountId: instagramAccount.id,
                  instagramUserId: senderId,
                },
              },
            });

            const existingEmails = Array.isArray(existingCapture?.emails)
              ? (existingCapture.emails as string[])
              : [];
            const updatedEmails = profileUpdates.email
              ? Array.from(new Set([...existingEmails, profileUpdates.email]))
              : existingEmails;

            const existingPhones = Array.isArray(existingCapture?.phoneNumbers)
              ? (existingCapture.phoneNumbers as string[])
              : [];
            const updatedPhones = profileUpdates.phone
              ? Array.from(new Set([...existingPhones, profileUpdates.phone]))
              : existingPhones;

            const captureRecord = await this.prisma.contactCapture.upsert({
              where: {
                instagramAccountId_instagramUserId: {
                  instagramAccountId: instagramAccount.id,
                  instagramUserId: senderId,
                },
              },
              create: {
                instagramAccountId: instagramAccount.id,
                instagramUserId: senderId,
                username: userProfile?.username || null,
                emails: updatedEmails,
                phoneNumbers: updatedPhones,
                targetAudienceListId: currentConfig?.targetAudienceListId || null,
              },
              update: {
                username: userProfile?.username || undefined,
                emails: updatedEmails,
                phoneNumbers: updatedPhones,
                ...(currentConfig?.targetAudienceListId && {
                  targetAudienceListId: currentConfig.targetAudienceListId,
                }),
              },
            });

            if (currentConfig?.targetAudienceListId && captureRecord?.id) {
              await (this.prisma as any).audienceListMember.upsert({
                where: {
                  audienceListId_contactCaptureId: {
                    audienceListId: currentConfig.targetAudienceListId,
                    contactCaptureId: captureRecord.id,
                  },
                },
                create: {
                  audienceListId: currentConfig.targetAudienceListId,
                  contactCaptureId: captureRecord.id,
                },
                update: {},
              }).catch(() => { });
            }

            this.logger.log(`Upserted ContactCapture for user ${senderId} (emails: ${updatedEmails.join(', ')})`);
          } catch (captureErr: any) {
            this.logger.warn(`Failed to upsert ContactCapture: ${captureErr.message}`);
          }
        }
      }

      // 2. Resolve next action nodes from currentNode (if condition node like Follower Gate, re-evaluate condition; otherwise step through button branches or nextNodeIds)
      let nodesToResolve: string[] = [];
      if (currentNode.type === 'ACTION_CONDITION') {
        nodesToResolve = [currentNode.nodeId];
      } else if (currentNode.type === 'ACTION_SEND_DM' || currentNode.type === 'ACTION_REPLY_DM') {
        const buttons = Array.isArray(currentConfig.buttons) ? currentConfig.buttons : [];
        const carouselCards = Array.isArray(currentConfig.carouselCards) ? currentConfig.carouselCards : [];
        const buttonPaths = currentConfig.buttonPaths || {};
        const normalizedInput = (messageText || '').trim().toLowerCase();

        let matchedBranchTarget: string | null = null;

        for (let i = 0; i < buttons.length; i++) {
          const btn = buttons[i];
          if (!btn) continue;
          const btnTitle = (btn.title || '').trim().toLowerCase();
          const btnPayload = ((btn as any).payload || '').trim().toLowerCase();
          if ((btnTitle && btnTitle === normalizedInput) || (btnPayload && btnPayload === normalizedInput)) {
            const pathTarget = buttonPaths[i] || buttonPaths[String(i)];
            if (btn.type !== 'link' && btn.enableBranch && pathTarget && pathTarget !== '__EMPTY__') {
              matchedBranchTarget = pathTarget;
            }
            break;
          }
        }

        if (!matchedBranchTarget && carouselCards.length > 0) {
          for (let cIdx = 0; cIdx < carouselCards.length; cIdx++) {
            const card = carouselCards[cIdx];
            const cardBtns = Array.isArray(card?.buttons) ? card.buttons : [];
            for (let bIdx = 0; bIdx < cardBtns.length; bIdx++) {
              const cBtn = cardBtns[bIdx];
              if (!cBtn) continue;
              const cBtnTitle = (cBtn.title || '').trim().toLowerCase();
              const cBtnPayload = ((cBtn as any).payload || '').trim().toLowerCase();
              if ((cBtnTitle && cBtnTitle === normalizedInput) || (cBtnPayload && cBtnPayload === normalizedInput)) {
                const branchKey = `card_${cIdx}_btn_${bIdx}`;
                const cardPathTarget = buttonPaths[branchKey] || buttonPaths[`${cIdx}_${bIdx}`];
                if (cBtn.type !== 'link' && cardPathTarget && cardPathTarget !== '__EMPTY__') {
                  matchedBranchTarget = cardPathTarget;
                }
                break;
              }
            }
            if (matchedBranchTarget) break;
          }
        }

        if (matchedBranchTarget) {
          nodesToResolve = [matchedBranchTarget];
        } else if (currentConfig.defaultPath && currentConfig.defaultPath !== '__EMPTY__') {
          nodesToResolve = [currentConfig.defaultPath];
        } else if (Array.isArray(currentNode.nextNodeIds) && currentNode.nextNodeIds.length > 0) {
          const fallbackTarget = currentNode.nextNodeIds.find((id: string) => id && id !== '__EMPTY__');
          nodesToResolve = fallbackTarget ? [fallbackTarget] : [];
        }
      } else {
        nodesToResolve = currentNode.nextNodeIds;
      }

      const nextActionNodes = await this.resolveExecutableActionNodes(
        waitingExecution.automation.nodes,
        nodesToResolve,
        {
          messageText,
          instagramUserId: senderId,
          instagramAccountId: instagramAccount.id,
          profile: { ...userProfile, ...profileUpdates },
          variables: executionVariables,
        },
      );

      if (nextActionNodes.length === 0) {
        if (currentNode.type === 'ACTION_CONDITION') {
          // Still waiting at condition gate; keep waiting for future user interactions
          return true;
        }
        await this.prisma.automationExecution.update({
          where: { id: waitingExecution.id },
          data: {
            status: 'COMPLETED',
            variables: executionVariables,
            completedAt: new Date(),
          },
        });
        return true;
      }

      for (const nextActionNode of nextActionNodes) {

        const nextConfig = (nextActionNode.config as any) || {};

        // Variations rotation for resumed execution
        const activeVariations = (Array.isArray(nextConfig.messageVariations)
          ? nextConfig.messageVariations.map((m: any) => (typeof m === 'string' ? m : m?.text))
          : []
        ).filter((m: any) => typeof m === 'string' && m.trim().length > 0);
        let candidateMessages = activeVariations.length > 0
          ? activeVariations
          : [nextConfig.message || nextConfig.text].filter(Boolean);
        let replyText = candidateMessages.length > 0
          ? candidateMessages[Math.floor(Math.random() * candidateMessages.length)]
          : (nextConfig.message || nextConfig.text || '');

        const hasCarouselCards = Array.isArray(nextConfig.carouselCards) && nextConfig.carouselCards.length > 0;

        if (!replyText && !hasCarouselCards) {
          continue;
        }

        const effectiveProfile = { ...userProfile, ...profileUpdates };
        if (effectiveProfile?.fullName) {
          replyText = replyText.replace(/\{name\}/gi, effectiveProfile.fullName);
        } else if (effectiveProfile?.username) {
          replyText = replyText.replace(/\{name\}/gi, `@${effectiveProfile.username}`);
        } else {
          replyText = replyText.replace(/\{name\}/gi, 'there');
        }
        if (effectiveProfile?.username) {
          replyText = replyText.replace(/\{username\}/gi, effectiveProfile.username);
        }
        replyText = replyText.replace(/\{comment\}/gi, messageText);

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

        const hasFurtherNodes = Array.isArray(nextActionNode.nextNodeIds) && nextActionNode.nextNodeIds.some((id: string) => id && id !== '__EMPTY__');
        const shouldWaitNext = hasFurtherNodes && nextConfig.waitForReplyAfterSend !== false;

        await this.prisma.automationExecution.update({
          where: { id: waitingExecution.id },
          data: {
            currentNodeId: nextActionNode.nodeId,
            status: shouldWaitNext ? 'WAITING' : 'COMPLETED',
            variables: executionVariables,
            completedAt: shouldWaitNext ? null : new Date(),
          },
        });

        const delaySec = nextConfig.delayEnabled && typeof nextConfig.delaySeconds === 'number' && nextConfig.delaySeconds > 0
          ? nextConfig.delaySeconds
          : 0;
        const runAfter = delaySec > 0 ? new Date(Date.now() + delaySec * 1000) : new Date();

        await this.prisma.backgroundJob.create({
          data: {
            jobType: 'SEND_DM',
            instagramAccountId: instagramAccount.id,
            payload: {
              instagramAccountId: instagramAccount.id,
              recipientId: senderId,
              message: replyText,
              mediaUrl: nextConfig.mediaUrl || null,
              messageType: nextConfig.mediaUrl ? (nextConfig.mediaType || 'IMAGE') : 'TEXT',
              buttons: Array.isArray(nextConfig.buttons) ? nextConfig.buttons : null,
              buttonStyle: nextConfig.buttonStyle || 'buttons',
              carouselCards: Array.isArray(nextConfig.carouselCards) && nextConfig.carouselCards.length > 0 ? nextConfig.carouselCards : undefined,
              delaySeconds: delaySec,
              executionId: waitingExecution.id,
              automationId: waitingExecution.automationId,
            },
            status: 'PENDING',
            priority: 1,
            runAfter,
          },
        });

        this.logger.log(
          `Resumed automation "${waitingExecution.automation.name}" for user ${senderId} -> dispatched node ${nextActionNode.nodeId}`,
        );
      }

      return true;
    } catch (err: any) {
      this.logger.error(`Error resuming waiting automation execution: ${err.message}`, err.stack);
      return false;
    }
  }

  async triggerMatchingAutomations(
    instagramAccount: any,
    senderId: string,
    conversationId: string,
    messageText: string,
    options?: {
      isStoryMention?: boolean;
      isStoryReply?: boolean;
      replyStoryId?: string;
      storyMediaUrl?: string;
      targetAutomationId?: string;
    },
  ) {
    try {

      const eligibleTriggerTypes: any[] = [];
      if (options?.isStoryMention) {
        eligibleTriggerTypes.push('STORY_MENTION');
      } else if (options?.isStoryReply) {
        eligibleTriggerTypes.push('STORY_REPLY');
      } else {
        eligibleTriggerTypes.push('DM_RECEIVED', 'DM_KEYWORD', 'NEW_FOLLOWER');
      }

      const automations = await this.prisma.automation.findMany({
        where: {
          folder: {
            instagramAccountId: instagramAccount.id,
          },
          isActive: true,
          triggerType: {
            in: eligibleTriggerTypes,
          },
        },
        include: {
          nodes: true,
        },
      });

      if (!automations || automations.length === 0) {
        return;
      }

      const normalizedText = messageText.trim().toLowerCase();

      // Check if targeted directly (e.g. Icebreaker)
      const attachedAutomationId: string | null = options?.targetAutomationId || null;

      for (const automation of automations) {
        if (attachedAutomationId) {
          if (automation.id !== attachedAutomationId) continue;
        } else if (automation.triggerType === 'STORY_REPLY' && automation.mediaId && options?.replyStoryId) {
          if (automation.mediaId !== options.replyStoryId) {
            continue;
          }
        }

        const triggerNode = automation.nodes.find(
          (n) => n.type === 'TRIGGER_DM' || n.type === 'TRIGGER_STORY' || n.type === 'TRIGGER_FOLLOWER',
        );
        const triggerConfig = (triggerNode?.config as any) || {};

        // Feature 2: First-Time vs Returning Customer Filter
        const audienceFilter = String(triggerConfig.audienceFilter || 'ALL').toUpperCase();
        if (audienceFilter === 'FIRST_TIME' || audienceFilter === 'RETURNING') {
          const priorExecutionCount = await this.prisma.automationExecution.count({
            where: {
              instagramUserId: senderId,
              automation: {
                folder: {
                  instagramAccountId: instagramAccount.id,
                },
              },
            },
          });
          const isFirstTime = priorExecutionCount === 0;

          if (audienceFilter === 'FIRST_TIME' && !isFirstTime) {
            this.logger.debug(
              `Skipping automation "${automation.name}" (${automation.id}): User ${senderId} is a returning contact`,
            );
            continue;
          }
          if (audienceFilter === 'RETURNING' && isFirstTime) {
            this.logger.debug(
              `Skipping automation "${automation.name}" (${automation.id}): User ${senderId} is a first-time lead`,
            );
            continue;
          }
        }

        const keywords = (automation.triggerKeywords || triggerConfig.keywords || [])
          .map((k: string) => k.trim().toLowerCase())
          .filter(Boolean);

        let isMatch = false;

        // Feature 3: Story Reaction Trigger Support
        if (options?.isStoryReply && triggerConfig.storyType === 'reaction') {
          const targetEmojis: string[] = Array.isArray(triggerConfig.storyEmojis)
            ? triggerConfig.storyEmojis.map((e: string) => e.trim()).filter(Boolean)
            : [];
          if (targetEmojis.length > 0) {
            isMatch = targetEmojis.some((emoji) => normalizedText.includes(emoji.toLowerCase()));
          } else {
            // Any reaction or emoji on story
            isMatch = true;
          }
        }

        // Feature 1: Universal Fuzzy / Typo-Tolerant Matching
        if (!isMatch) {
          if (attachedAutomationId && automation.id === attachedAutomationId) {
            isMatch = true;
          } else if (options?.isStoryMention && keywords.length === 0) {
            isMatch = true;
          } else if (keywords.length === 0) {
            isMatch = true;
          } else {
            const isFuzzy = triggerConfig.fuzzyMatch === true || automation.triggerMatchType === 'FUZZY';
            const sensitivity = triggerConfig.toleranceSensitivity || 'normal';

            if (isFuzzy) {
              const fuzzyResult = isFuzzyKeywordMatch(messageText, keywords, { sensitivity });
              isMatch = fuzzyResult.isMatch;
              if (isMatch) {
                this.logger.debug(
                  `Fuzzy keyword match in automation ${automation.id}: "${messageText}" matched "${fuzzyResult.matchedKeyword}" (${fuzzyResult.confidence}%)`,
                );
              }
            } else {
              const matchType = (automation.triggerMatchType || triggerConfig.matchType || 'CONTAINS').toUpperCase();
              if (matchType === 'EXACT') {
                isMatch = keywords.some((k) => normalizedText === k);
              } else if (matchType === 'STARTS_WITH') {
                isMatch = keywords.some((k) => normalizedText.startsWith(k));
              } else {
                isMatch = keywords.some((k) => normalizedText.includes(k));
              }
            }
          }
        }

        if (!isMatch) {
          continue;
        }

        // Prevent duplicate trigger bursts within 5 seconds for the same user and automation
        const recentExec = await this.prisma.automationExecution.findFirst({
          where: {
            automationId: automation.id,
            instagramUserId: senderId,
            startedAt: { gte: new Date(Date.now() - 5000) },
          },
        });

        if (recentExec) {
          this.logger.debug(
            `Debouncing automation ${automation.id} for user ${senderId}`,
          );
          continue;
        }

        // Fetch user profile for context and tag/variable evaluations
        const userProfile = await this.prisma.instagramUserProfile.findUnique({
          where: {
            instagramAccountId_instagramUserId: {
              instagramAccountId: instagramAccount.id,
              instagramUserId: senderId,
            },
          },
        });

        const executionVariables: Record<string, any> = {};

        // Feature 7: Dynamic Urgent Promo Code Generation on Story Mention
        if (options?.isStoryMention && triggerConfig.generatePromoCode) {
          const promoCode = 'STORY-' + Math.random().toString(36).substring(2, 6).toUpperCase();
          executionVariables.promo_code = promoCode;
          try {
            await this.prisma.storyMention.updateMany({
              where: {
                instagramAccountId: instagramAccount.id,
                instagramUserId: senderId,
              },
              data: { dynamicPromoCode: promoCode },
            });
          } catch (promoErr: any) {
            // Ignore if record not yet available
          }
        }

        let targetNextNodeIds = triggerNode?.nextNodeIds || [];

        // Feature 7: Follower Tier Segmentation on Story Mention
        if (options?.isStoryMention && triggerConfig.enableFollowerTier) {
          const threshold = Number(triggerConfig.followerThreshold) || 5000;
          const userFollowers = userProfile?.followersCount ?? 0;
          const isVip = userFollowers >= threshold;

          if (isVip && triggerConfig.vipNextNodeId) {
            targetNextNodeIds = [triggerConfig.vipNextNodeId];
            this.logger.log(`Story Mention from VIP (${userFollowers} followers >= ${threshold}) -> Routing to VIP branch`);
          } else if (!isVip && triggerConfig.normalNextNodeId) {
            targetNextNodeIds = [triggerConfig.normalNextNodeId];
            this.logger.log(`Story Mention from standard user (${userFollowers} followers < ${threshold}) -> Routing to standard branch`);
          }
        }

        const actionNodesToExecute = await this.resolveExecutableActionNodes(
          automation.nodes,
          targetNextNodeIds,
          {
            messageText,
            instagramUserId: senderId,
            instagramAccountId: instagramAccount.id,
            profile: userProfile,
            variables: executionVariables,
          },
        );

        // Fallback: if no action node was reached through graph, fallback to direct action node
        if (actionNodesToExecute.length === 0) {
          const directAction = automation.nodes.find(
            (n) => n.type === 'ACTION_SEND_DM' || n.type === 'ACTION_REPLY_DM',
          );
          if (directAction) actionNodesToExecute.push(directAction);
        }

        if (actionNodesToExecute.length === 0) {
          this.logger.warn(`No action node found or reached in automation ${automation.id}`);
          continue;
        }

        for (const actionNode of actionNodesToExecute) {

          const config = (actionNode.config as any) || {};

          // Feature 4: Multi-Variation Messages rotation
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

          if (!replyText && !hasCarouselCards) {
            this.logger.warn(
              `Action node ${actionNode.nodeId} in automation ${automation.id} has no message configured`,
            );
            continue;
          }

          // Dynamic placeholder replacements
          if (userProfile?.fullName) {
            replyText = replyText.replace(/\{name\}/gi, userProfile.fullName);
          } else if (userProfile?.username) {
            replyText = replyText.replace(/\{name\}/gi, `@${userProfile.username}`);
          } else {
            replyText = replyText.replace(/\{name\}/gi, 'there');
          }
          if (userProfile?.username) {
            replyText = replyText.replace(/\{username\}/gi, userProfile.username);
          }
          replyText = replyText.replace(/\{comment\}/gi, messageText);
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

          const hasFurtherNodes = Array.isArray(actionNode.nextNodeIds) && actionNode.nextNodeIds.some((id: string) => id && id !== '__EMPTY__');
          const shouldWait = hasFurtherNodes && config.waitForReplyAfterSend !== false;

          // 1. Create execution record
          const execution = await this.prisma.automationExecution.create({
            data: {
              automationId: automation.id,
              instagramUserId: senderId,
              status: shouldWait ? 'WAITING' : 'PENDING',
              currentNodeId: actionNode.nodeId,
              variables: executionVariables,
            },
          });

          const delaySec = config.delayEnabled && typeof config.delaySeconds === 'number' && config.delaySeconds > 0
            ? config.delaySeconds
            : 0;
          const runAfter = delaySec > 0 ? new Date(Date.now() + delaySec * 1000) : new Date();

          // 2. Enqueue SEND_DM background job for workers
          await this.prisma.backgroundJob.create({
            data: {
              jobType: 'SEND_DM',
              instagramAccountId: instagramAccount.id,
              payload: {
                instagramAccountId: instagramAccount.id,
                recipientId: senderId,
                message: replyText,
                mediaUrl: config.mediaUrl || null,
                messageType: config.mediaUrl ? (config.mediaType || 'IMAGE') : 'TEXT',
                buttons: Array.isArray(config.buttons) ? config.buttons : null,
                buttonStyle: config.buttonStyle || 'buttons',
                carouselCards: Array.isArray(config.carouselCards) && config.carouselCards.length > 0 ? config.carouselCards : undefined,
                delaySeconds: delaySec,
                executionId: execution.id,
                automationId: automation.id,
              },
              status: 'PENDING',
              priority: 1,
              runAfter,
            },
          });

          this.logger.log(
            `Triggered automation "${automation.name}" (${automation.id}) for user ${senderId}. Queued SEND_DM background job.`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`Error triggering automations: ${err.message}`, err.stack);
    }
  }

  async resolveExecutableActionNodes(
    allNodes: any[],
    currentNodeIds: string[],
    context: {
      messageText: string;
      instagramUserId: string;
      instagramAccountId: string;
      profile?: any;
      variables: Record<string, any>;
    },
    depth = 0,
  ): Promise<any[]> {
    if (depth > 12 || !currentNodeIds || currentNodeIds.length === 0) return [];

    const executableNodes: any[] = [];

    for (const nodeId of currentNodeIds) {
      if (!nodeId || nodeId === '__EMPTY__') continue;
      const node = allNodes.find((n) => n.nodeId === nodeId);
      if (!node) continue;

      if (node.type === 'ACTION_REPLY_COMMENT') {
        executableNodes.push(node);
        // Continue resolving downstream nodes (e.g. ACTION_SEND_DM, condition, split, randomizer, set_variable)
        if (node.nextNodeIds && node.nextNodeIds.length > 0) {
          const nexts = await this.resolveExecutableActionNodes(
            allNodes,
            node.nextNodeIds,
            context,
            depth + 1,
          );
          executableNodes.push(...nexts);
        }
      } else if (node.type === 'ACTION_SEND_DM' || node.type === 'ACTION_REPLY_DM') {
        executableNodes.push(node);
        const config = (node.config as any) || {};
        // If wait for reply is disabled on this DM, continue immediately to the next action nodes
        if (config.waitForReplyAfterSend === false && node.nextNodeIds && node.nextNodeIds.length > 0) {
          const nexts = await this.resolveExecutableActionNodes(
            allNodes,
            node.nextNodeIds,
            context,
            depth + 1,
          );
          executableNodes.push(...nexts);
        }
      } else if (node.type === 'ACTION_SET_VARIABLE') {
        const config = (node.config as any) || {};
        if (config.variableName) {
          let resolvedVal = config.value || '';
          if (resolvedVal.includes('{{messageText}}')) {
            resolvedVal = resolvedVal.replace(/\{\{messageText\}\}/g, context.messageText);
          }
          if (resolvedVal.includes('{{username}}') && context.profile?.username) {
            resolvedVal = resolvedVal.replace(/\{\{username\}\}/g, context.profile.username);
          }
          context.variables[config.variableName] = resolvedVal;
        }

        const tagsToAdd = Array.isArray(config.tags) && config.tags.length > 0
          ? config.tags
          : (config.addTag ? [config.addTag] : []);

        if (tagsToAdd.length > 0) {
          try {
            const profile = await this.prisma.instagramUserProfile.findUnique({
              where: {
                instagramAccountId_instagramUserId: {
                  instagramAccountId: context.instagramAccountId,
                  instagramUserId: context.instagramUserId,
                },
              },
            });
            if (profile) {
              const currentTags = Array.isArray(profile.tags) ? (profile.tags as string[]) : [];
              const merged = Array.from(new Set([...currentTags, ...tagsToAdd]));
              await this.prisma.instagramUserProfile.update({
                where: { id: profile.id },
                data: { tags: merged },
              });
            }
          } catch (err: any) {
            this.logger.warn(`Failed to apply tags in ACTION_SET_VARIABLE: ${err.message}`);
          }
        }

        if (node.nextNodeIds && node.nextNodeIds.length > 0) {
          const nexts = await this.resolveExecutableActionNodes(allNodes, node.nextNodeIds, context, depth + 1);
          executableNodes.push(...nexts);
        }
      } else if (node.type === 'ACTION_CONDITION') {
        const config = (node.config as any) || {};

        const evaluateSingleRule = async (rule: any): Promise<boolean> => {
          const fieldType = rule.fieldType || 'variable';
          const operator = rule.operator || 'equals';
          const compareVal = rule.value;

          if (fieldType === 'number') {
            const varVal = context.variables[rule.variable] ?? context.messageText;
            const numToTest = parseFloat(varVal) || 0;
            const targetNum = parseFloat(compareVal) || 0;
            switch (operator) {
              case 'greater_than': return numToTest > targetNum;
              case 'less_than': return numToTest < targetNum;
              case 'greater_equal': return numToTest >= targetNum;
              case 'less_equal': return numToTest <= targetNum;
              case 'not_equals': return numToTest !== targetNum;
              default: return numToTest === targetNum;
            }
          }

          if (fieldType === 'follower') {
            let isFollowing = Boolean(context.profile?.isFollowingBusiness);
            if (!isFollowing) {
              try {
                const account = await this.prisma.instagramAccount.findUnique({
                  where: { id: context.instagramAccountId },
                  select: { accessToken: true },
                });
                if (account?.accessToken) {
                  const token = account.accessToken;
                  const isInstagramToken = token.startsWith('IGAA') || token.startsWith('IGQ') || token.startsWith('AQ');
                  const apiBase = isInstagramToken ? 'https://graph.instagram.com/v21.0' : 'https://graph.facebook.com/v21.0';
                  const checkUrl = `${apiBase}/${context.instagramUserId}?fields=is_user_follow_business&access_token=${encodeURIComponent(token)}`;
                  const checkRes = await fetch(checkUrl);
                  if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData?.is_user_follow_business === true) {
                      isFollowing = true;
                      await this.prisma.instagramUserProfile.updateMany({
                        where: {
                          instagramAccountId: context.instagramAccountId,
                          instagramUserId: context.instagramUserId,
                        },
                        data: { isFollowingBusiness: true },
                      });
                      if (context.profile) {
                        context.profile.isFollowingBusiness = true;
                      }
                    }
                  } else {
                    const errData = await checkRes.json().catch(() => ({}));
                    this.logger.warn(`Live follower check returned HTTP ${checkRes.status} for ${context.instagramUserId}: ${JSON.stringify(errData)}`);
                  }
                }
              } catch (apiErr: any) {
                this.logger.warn(`Failed to verify live follower status for ${context.instagramUserId}: ${apiErr.message}`);
              }
            }
            return operator === 'not_following' ? !isFollowing : isFollowing;
          }

          if (fieldType === 'tag') {
            const profile = await this.prisma.instagramUserProfile.findUnique({
              where: {
                instagramAccountId_instagramUserId: {
                  instagramAccountId: context.instagramAccountId,
                  instagramUserId: context.instagramUserId,
                },
              },
              select: { tags: true },
            });
            const userTags: string[] = Array.isArray(profile?.tags) ? (profile.tags as string[]) : [];
            const targetTag = rule.tag || compareVal;
            const targetTags: string[] = Array.isArray(rule.tags) && rule.tags.length > 0
              ? rule.tags
              : (targetTag ? [targetTag] : []);

            if (operator === 'has_any') {
              return targetTags.some((t) => userTags.includes(t));
            }
            if (operator === 'has_all') {
              return targetTags.length > 0 && targetTags.every((t) => userTags.includes(t));
            }
            if (operator === 'not_has') {
              return targetTag ? !userTags.includes(targetTag) : true;
            }
            return targetTag ? userTags.includes(targetTag) : false;
          }

          if (fieldType === 'pipeline') {
            const profile = await this.prisma.instagramUserProfile.findUnique({
              where: {
                instagramAccountId_instagramUserId: {
                  instagramAccountId: context.instagramAccountId,
                  instagramUserId: context.instagramUserId,
                },
              },
              select: { status: true },
            });
            const currentStatus = String(profile?.status || '').trim().toLowerCase();
            const targetStatus = String(rule.status || compareVal || '').trim().toLowerCase();
            if (operator === 'is_not') {
              return currentStatus !== targetStatus;
            }
            return currentStatus === targetStatus;
          }

          if (fieldType === 'boolean') {
            const varVal = context.variables[rule.variable];
            const boolVal = varVal === true || varVal === 'true';
            return operator === 'equals' ? boolVal : !boolVal;
          }

          // Variable / Text
          const varVal = String(context.variables[rule.variable] ?? context.messageText ?? '').trim().toLowerCase();
          const targetText = String(compareVal || '').trim().toLowerCase();
          switch (operator) {
            case 'is_set': return varVal.length > 0;
            case 'is_not_set': return varVal.length === 0;
            case 'contains': return varVal.includes(targetText);
            case 'not_contains': return !varVal.includes(targetText);
            case 'startsWith': return varVal.startsWith(targetText);
            case 'endsWith': return varVal.endsWith(targetText);
            case 'not_equals': return varVal !== targetText;
            default: return varVal === targetText;
          }
        };

        // Follower gate mode check (if enabled and lead is not following, prompt with gate DM)
        const isFollowerGate = Boolean(config.isFollowerGate) || (!config.conditionGroups?.length && (config.condition?.fieldType === 'follower' || config.fieldType === 'follower') && Boolean(config.message || config.condition?.message));
        if (isFollowerGate) {
          const isFollowing = await evaluateSingleRule({ fieldType: 'follower', operator: 'is_following' });
          if (!isFollowing) {
            const promptMessage = config.message || config.condition?.message;
            if (promptMessage) {
              const gateButtons = Array.isArray(config.buttons) && config.buttons.length > 0
                ? config.buttons
                : [];
              const gateNode = {
                nodeId: node.nodeId,
                type: 'ACTION_SEND_DM',
                config: {
                  message: promptMessage,
                  buttons: gateButtons,
                  buttonStyle: config.buttonStyle || 'buttons',
                  waitForReplyAfterSend: true,
                },
                nextNodeIds: node.nextNodeIds,
              };
              executableNodes.push(gateNode);
              return executableNodes;
            }
          }
        }

        let isPassed = false;
        const conditionGroups = Array.isArray(config.conditionGroups) && config.conditionGroups.length > 0
          ? config.conditionGroups
          : null;

        if (conditionGroups) {
          const groupResults: boolean[] = [];
          for (const group of conditionGroups) {
            const rules = Array.isArray(group.rules) ? group.rules : [];
            if (rules.length === 0) continue;
            let groupPassed = true;
            if (group.logic === 'OR') {
              groupPassed = false;
              for (const r of rules) {
                const rPassed = await evaluateSingleRule(r);
                if (rPassed) {
                  groupPassed = true;
                  break;
                }
              }
            } else {
              // Default AND: all rules in group must pass
              for (const r of rules) {
                const rPassed = await evaluateSingleRule(r);
                if (!rPassed) {
                  groupPassed = false;
                  break;
                }
              }
            }
            groupResults.push(groupPassed);
          }

          const groupLogic = config.groupLogic || 'OR';
          isPassed = groupLogic === 'AND'
            ? groupResults.length > 0 && groupResults.every(Boolean)
            : groupResults.some(Boolean);
        } else {
          const singleCondition = config.condition || {};
          isPassed = await evaluateSingleRule(singleCondition);
        }

        const truePath = config.conditionPaths?.true ?? (node.nextNodeIds?.[0] !== '__EMPTY__' ? node.nextNodeIds?.[0] : null);
        const falsePath = config.conditionPaths?.false ?? (node.nextNodeIds?.[1] !== '__EMPTY__' ? node.nextNodeIds?.[1] : null);
        const nextTargetId = isPassed ? truePath : falsePath;

        if (nextTargetId) {
          const nexts = await this.resolveExecutableActionNodes(allNodes, [nextTargetId], context, depth + 1);
          executableNodes.push(...nexts);
        }
      } else if (node.type === 'FLOW_RANDOM') {
        const config = (node.config as any) || {};
        const pathCount = Math.max(2, Math.min(5, parseInt(config.pathCount, 10) || 2));
        const weightsStr = config.weights || '';
        const weightsArray = weightsStr
          ? weightsStr.split(',').map((w: string) => parseFloat(w.trim())).filter((w: number) => !isNaN(w))
          : Array(pathCount).fill(100 / pathCount);

        const totalWeight = weightsArray.reduce((acc: number, w: number) => acc + w, 0) || 100;
        const randomVal = Math.random() * totalWeight;
        let cumulative = 0;
        let chosenIdx = 0;
        for (let i = 0; i < weightsArray.length; i++) {
          cumulative += weightsArray[i];
          if (randomVal <= cumulative) {
            chosenIdx = i;
            break;
          }
        }

        const randomPaths = config.randomPaths;
        let targetId = null;
        if (Array.isArray(randomPaths)) {
          targetId = randomPaths.find((rp: any) => Number(rp.pathIndex) === chosenIdx)?.target;
        }
        if (!targetId && Array.isArray(node.nextNodeIds) && node.nextNodeIds.length > 0) {
          targetId = node.nextNodeIds[chosenIdx % node.nextNodeIds.length];
        }

        if (targetId && targetId !== '__EMPTY__') {
          const nexts = await this.resolveExecutableActionNodes(allNodes, [targetId], context, depth + 1);
          executableNodes.push(...nexts);
        }
      } else if (node.type === 'FLOW_SPLIT') {
        const targets = (node.nextNodeIds || []).filter((id: string) => id && id !== '__EMPTY__');
        if (targets.length > 0) {
          const nexts = await this.resolveExecutableActionNodes(allNodes, targets, context, depth + 1);
          executableNodes.push(...nexts);
        }
      } else if (node.nextNodeIds && node.nextNodeIds.length > 0) {
        const nexts = await this.resolveExecutableActionNodes(allNodes, node.nextNodeIds, context, depth + 1);
        executableNodes.push(...nexts);
      }
    }

    return executableNodes;
  }
}
