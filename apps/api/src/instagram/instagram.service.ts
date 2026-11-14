import {
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { InstagramAuthService } from './services/instagram-auth.service';
import { InstagramMediaService } from './services/instagram-media.service';
import { InstagramCommentsService } from './services/instagram-comments.service';
import { InstagramWebhookRouterService } from './services/instagram-webhook-router.service';
import { InstagramAutomationRunnerService } from './services/instagram-automation-runner.service';
import { InstagramIcebreakersService } from './services/instagram-icebreakers.service';
import { UpdateIcebreakersDto } from './dto/instagram.dto';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  private readonly authService: InstagramAuthService;
  private readonly mediaService: InstagramMediaService;
  private readonly commentsService: InstagramCommentsService;
  private readonly webhookRouterService: InstagramWebhookRouterService;
  private readonly runnerService: InstagramAutomationRunnerService;
  private readonly icebreakersService: InstagramIcebreakersService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() authService?: InstagramAuthService,
    @Optional() mediaService?: InstagramMediaService,
    @Optional() commentsService?: InstagramCommentsService,
    @Optional() webhookRouterService?: InstagramWebhookRouterService,
    @Optional() runnerService?: InstagramAutomationRunnerService,
    @Optional() icebreakersService?: InstagramIcebreakersService,
  ) {
    this.authService = authService ?? new InstagramAuthService(prisma);
    this.mediaService = mediaService ?? new InstagramMediaService(prisma);
    this.icebreakersService = icebreakersService ?? new InstagramIcebreakersService(prisma);
    this.runnerService = runnerService ?? new InstagramAutomationRunnerService(prisma, redisService);
    this.webhookRouterService = webhookRouterService ?? new InstagramWebhookRouterService(prisma, redisService, this.commentsService, this.runnerService);
  }

  // ==========================================
  // 1. Authentication & Accounts
  // ==========================================

  getOAuthUrl(userId: string, setupMode?: string, origin?: string): string {
    return this.authService.getOAuthUrl(userId, setupMode, origin);
  }

  async handleOAuthCallback(code: string, state: string, requestOrigin?: string): Promise<string> {
    return this.authService.handleOAuthCallback(
      code,
      state,
      requestOrigin,
    );
  }

  async getAccounts(userId: string) {
    return this.authService.getAccounts(userId);
  }

  async disconnectAccount() {
    return this.authService.disconnectAccount();
  }

  // ==========================================
  // 2. Media, Profiles & UGC Story Mentions
  // ==========================================

  async getMedia(
    userId: string,
    accountId: string,
    type: 'post' | 'reel' | 'story' | 'all' = 'all',
    limit: number = 25,
    after?: string,
  ) {
    return this.mediaService.getMedia(userId, accountId, type, limit, after);
  }

  async likeInstagramComment(
    accessTokenOrAccountId: string,
    instagramUserIdOrCommentId: string,
    commentId?: string,
  ): Promise<boolean> {
    if (commentId !== undefined) {
      return this.mediaService.likeInstagramComment(
        accessTokenOrAccountId,
        instagramUserIdOrCommentId,
        commentId,
      );
    }
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: accessTokenOrAccountId },
      select: { accessToken: true, instagramUserId: true, webhookUserId: true },
    });
    if (!account?.accessToken) return false;
    return this.mediaService.likeInstagramComment(
      account.accessToken,
      account.webhookUserId || account.instagramUserId,
      instagramUserIdOrCommentId,
    );
  }

  async getProfiles(
    companyId: string,
    accountId: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    return this.mediaService.getProfiles(companyId, accountId, limit, offset);
  }

  async getStoryMentions(
    companyId: string,
    accountId?: string,
    status?: string,
    limit: number = 50,
  ) {
    return this.mediaService.getStoryMentions(companyId, accountId, status, limit);
  }

  async updateStoryMentionStatus(
    companyId: string,
    mentionId: string,
    repostStatus: string,
  ) {
    return this.mediaService.updateStoryMentionStatus(companyId, mentionId, repostStatus);
  }

  // ==========================================
  // 3. Webhook Verification & Routing
  // ==========================================

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    return this.webhookRouterService.verifyWebhookSignature(rawBody, signature);
  }

  async processWebhookEvent(body: any) {
    return this.webhookRouterService.processWebhookEvent(body);
  }

  async processMessagingEvent(messagingEvent: any): Promise<void> {
    return this.webhookRouterService.processMessagingEvent(messagingEvent);
  }

  async processEchoMessagingEvent(messagingEvent: any): Promise<void> {
    return;
  }

  async getWebhookDebug(companyId: string, limit: number = 50) {
    return this.webhookRouterService.getWebhookDebug(companyId, limit);
  }

  // ==========================================
  // 4. Comments Processing
  // ==========================================

  async processCommentEvent(recipientAccountId: string, commentValue: any) {
    return this.commentsService.processCommentEvent(recipientAccountId, commentValue);
  }

  // ==========================================
  // 5. Automation Graph Execution
  // ==========================================

  async resumeWaitingExecution(
    instagramAccount: any,
    senderId: string,
    conversationId: string,
    messageText: string,
  ): Promise<boolean> {
    return this.runnerService.resumeWaitingExecution(
      instagramAccount,
      senderId,
      conversationId,
      messageText,
    );
  }

  async triggerMatchingAutomations(
    instagramAccount: any,
    senderId: string,
    conversationId: string,
    messageText: string,
    options?: any,
  ): Promise<void> {
    return this.runnerService.triggerMatchingAutomations(
      instagramAccount,
      senderId,
      conversationId,
      messageText,
      options,
    );
  }

  async resolveExecutableActionNodes(
    nodes: any[],
    startNodeIds: string[],
    context: any,
  ): Promise<any[]> {
    return this.runnerService.resolveExecutableActionNodes(nodes, startNodeIds, context);
  }

  // ==========================================
  // 7. Dead Letter Queue & Background Jobs
  // ==========================================

  async getFailedBackgroundJobs(companyId: string, limit = 50, offset = 0) {
    const accounts = await this.prisma.instagramAccount.findMany({
      where: { companyId },
      select: { id: true, username: true, isActive: true },
    });

    const accountIds = accounts.map((a) => a.id);
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    if (accountIds.length === 0) {
      return {
        count: 0,
        hasTokenExpiredError: false,
        jobs: [],
      };
    }

    const [totalCount, failedJobs, tokenExpiredJob] = await Promise.all([
      this.prisma.backgroundJob.count({
        where: {
          status: 'FAILED',
          instagramAccountId: { in: accountIds },
        },
      }),
      this.prisma.backgroundJob.findMany({
        where: {
          status: 'FAILED',
          instagramAccountId: { in: accountIds },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.backgroundJob.findFirst
        ? this.prisma.backgroundJob.findFirst({
          where: {
            status: 'FAILED',
            instagramAccountId: { in: accountIds },
            OR: [
              { lastError: { contains: '190', mode: 'insensitive' } },
              { lastError: { contains: 'oauth', mode: 'insensitive' } },
              { lastError: { contains: 'token', mode: 'insensitive' } },
              { lastError: { contains: 'expired', mode: 'insensitive' } },
              { lastError: { contains: 'invalidated', mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        })
        : null,
    ]);

    const hasTokenExpiredError =
      Boolean(tokenExpiredJob) ||
      failedJobs.some((job) =>
        /190|oauth|token|expired|session has been invalidated|password/i.test(job.lastError || ''),
      );

    return {
      count: totalCount,
      hasTokenExpiredError,
      jobs: failedJobs.map((job) => {
        const payload = (job.payload as any) || {};
        const account = job.instagramAccountId ? accountMap.get(job.instagramAccountId) : null;
        const isTokenExpired = /190|oauth|token|expired|session has been invalidated|password/i.test(job.lastError || '');

        return {
          id: job.id,
          jobType: job.jobType,
          status: job.status,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          lastError: job.lastError,
          createdAt: job.createdAt,
          runAfter: job.runAfter,
          instagramAccountId: job.instagramAccountId,
          accountUsername: account?.username || null,
          recipientId: payload.recipientId || null,
          messagePreview: payload.message ? String(payload.message).substring(0, 100) : null,
          isTokenExpired,
        };
      }),
    };
  }

  async retryFailedBackgroundJobs(companyId: string, jobIds?: string[]) {
    const accounts = await this.prisma.instagramAccount.findMany({
      where: { companyId },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length === 0) {
      return { success: true, retriedCount: 0 };
    }

    const whereClause: any = {
      status: 'FAILED',
      instagramAccountId: { in: accountIds },
    };

    if (Array.isArray(jobIds) && jobIds.length > 0) {
      whereClause.id = { in: jobIds };
    }

    const result = await this.prisma.backgroundJob.updateMany({
      where: whereClause,
      data: {
        status: 'PENDING',
        attempts: 0,
        runAfter: new Date(),
        lastError: null,
        lockedAt: null,
        lockedBy: null,
      },
    });

    this.logger.log(
      `[DeadLetterQueue] User triggered retry for company ${companyId}. Reset ${result.count} failed background jobs to PENDING.`,
    );

    return {
      success: true,
      retriedCount: result.count,
    };
  }

  // ==========================================
  // 12. Icebreakers (Conversation Starters)
  // ==========================================

  async getIcebreakers(companyId: string, accountId?: string) {
    return this.icebreakersService.getIcebreakers(companyId, accountId);
  }

  async updateIcebreakers(companyId: string, dto: UpdateIcebreakersDto) {
    return this.icebreakersService.updateIcebreakers(companyId, dto);
  }

  async deleteIcebreakers(companyId: string, accountId?: string) {
    return this.icebreakersService.deleteIcebreakers(companyId, accountId);
  }
}
