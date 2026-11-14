import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ManageHealthDto } from './dto/manage-health.dto';

const RATE_LIMITS = {
  API_CALLS_PER_USER_PER_HOUR: 200,
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user?.company) {
      throw new NotFoundException('Company not found');
    }

    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Owner access required');
    }

    return user;
  }

  async getAccountHealth(userId: string, accountId?: string) {
    const user = await this.verifyAdmin(userId);

    if (accountId) {
      const account = await this.prisma.instagramAccount.findFirst({
        where: {
          id: accountId,
          companyId: user.company!.id,
        },
      });

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      const health = await this.getAccountHealthSummary(accountId);

      const [recentErrors, recentJobs] = await Promise.all([
        this.prisma.apiErrorLog.findMany({
          where: { instagramAccountId: accountId },
          orderBy: { occurredAt: 'desc' },
          take: 10,
        }),
        this.prisma.queueJob.findMany({
          where: { instagramAccountId: accountId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

      return {
        account: {
          id: account.id,
          username: account.username,
          isActive: account.isActive,
        },
        health,
        recentErrors,
        recentJobs,
      };
    }

    const accountsSummary = await this.getCompanyHealthSummary(user.company!.id);

    const yesterday = new Date(Date.now() - 86400000);
    const errorCounts = await this.prisma.apiErrorLog.groupBy({
      by: ['errorType'],
      where: {
        occurredAt: { gte: yesterday },
        instagramAccount: { companyId: user.company!.id },
      },
      _count: { id: true },
    });

    return {
      accounts: accountsSummary,
      queueStats: null,
      errorSummary: {
        last24Hours: errorCounts.reduce(
          (acc, e) => {
            acc[e.errorType] = e._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    };
  }

  async manageAccountHealth(userId: string, dto: ManageHealthDto) {
    const user = await this.verifyAdmin(userId);

    const account = await this.prisma.instagramAccount.findFirst({
      where: {
        id: dto.accountId,
        companyId: user.company!.id,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (dto.action === 'resume') {
      await this.resumeAccount(dto.accountId);
      return {
        success: true,
        message: `Account @${account.username} has been resumed`,
      };
    } else if (dto.action === 'pause') {
      const pauseHours = dto.pauseHours || 24;
      await this.pauseAccount(
        dto.accountId,
        'MANUAL',
        dto.reason || 'Manually paused by admin',
        pauseHours,
      );
      return {
        success: true,
        message: `Account @${account.username} has been paused for ${pauseHours} hours`,
      };
    } else {
      throw new BadRequestException('Invalid action. Use "resume" or "pause"');
    }
  }

  private async getAccountHealthSummary(instagramAccountId: string) {
    const health = await this.prisma.instagramAccountHealth.findUnique({
      where: { instagramAccountId },
    });

    if (!health) {
      return {
        status: 'HEALTHY',
        isPaused: false,
        apiUsage: {
          thisHour: 0,
          today: 0,
          limitPerHour: RATE_LIMITS.API_CALLS_PER_USER_PER_HOUR,
          percentUsed: 0,
        },
        messages: {
          thisHour: 0,
          today: 0,
        },
        errors: {
          consecutive: 0,
          lastCode: null,
          lastMessage: null,
        },
      };
    }

    const percentUsed = Math.round(
      (health.apiCallsThisHour / RATE_LIMITS.API_CALLS_PER_USER_PER_HOUR) * 100,
    );

    return {
      status: health.status,
      isPaused: health.isPaused,
      pausedReason: health.pausedReason,
      pausedAt: health.pausedAt,
      resumeAt: health.resumeAt,
      apiUsage: {
        thisHour: health.apiCallsThisHour,
        today: health.apiCallsToday,
        limitPerHour: RATE_LIMITS.API_CALLS_PER_USER_PER_HOUR,
        percentUsed,
      },
      messages: {
        thisHour: health.messagesThisHour,
        today: health.messagesToday,
      },
      errors: {
        consecutive: health.consecutiveErrors,
        lastCode: health.lastErrorCode,
        lastMessage: health.lastErrorMessage,
        restrictionCount: health.restrictionCount,
        lastRestrictionAt: health.lastRestrictionAt,
      },
    };
  }

  private async getCompanyHealthSummary(companyId: string) {
    const accounts = await this.prisma.instagramAccount.findMany({
      where: { companyId },
      include: { health: true },
    });

    return accounts.map((account) => {
      const health = account.health;
      return {
        id: account.id,
        username: account.username,
        isActive: account.isActive,
        health: health
          ? {
              status: health.status,
              isPaused: health.isPaused,
              pausedReason: health.pausedReason,
              resumeAt: health.resumeAt,
              apiCallsThisHour: health.apiCallsThisHour,
              apiCallsToday: health.apiCallsToday,
              messagesThisHour: health.messagesThisHour,
              messagesToday: health.messagesToday,
              consecutiveErrors: health.consecutiveErrors,
            }
          : {
              status: 'HEALTHY',
              isPaused: false,
              pausedReason: null,
              resumeAt: null,
              apiCallsThisHour: 0,
              apiCallsToday: 0,
              messagesThisHour: 0,
              messagesToday: 0,
              consecutiveErrors: 0,
            },
      };
    });
  }

  private async resumeAccount(instagramAccountId: string) {
    await this.prisma.instagramAccountHealth.upsert({
      where: { instagramAccountId },
      create: {
        instagramAccountId,
        status: 'HEALTHY',
        isPaused: false,
        pausedReason: null,
        pausedAt: null,
        resumeAt: null,
        consecutiveErrors: 0,
      },
      update: {
        status: 'HEALTHY',
        isPaused: false,
        pausedReason: null,
        pausedAt: null,
        resumeAt: null,
        consecutiveErrors: 0,
      },
    });
  }

  private async pauseAccount(
    instagramAccountId: string,
    errorCode: string,
    reason: string,
    pauseHours: number,
  ) {
    const resumeAt = new Date(Date.now() + pauseHours * 60 * 60 * 1000);

    await this.prisma.instagramAccountHealth.upsert({
      where: { instagramAccountId },
      create: {
        instagramAccountId,
        status: 'RESTRICTED',
        isPaused: true,
        pausedReason: reason,
        pausedAt: new Date(),
        resumeAt,
        lastErrorCode: errorCode,
        lastErrorMessage: reason,
        restrictionCount: 1,
        lastRestrictionAt: new Date(),
      },
      update: {
        status: 'RESTRICTED',
        isPaused: true,
        pausedReason: reason,
        pausedAt: new Date(),
        resumeAt,
        lastErrorCode: errorCode,
        lastErrorMessage: reason,
        restrictionCount: { increment: 1 },
        lastRestrictionAt: new Date(),
      },
    });
  }
}
