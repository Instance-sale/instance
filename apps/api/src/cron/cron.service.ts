import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Hourly reset for Instagram API call counters
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyCountersReset(): Promise<number> {
    this.logger.log('Executing scheduled hourly counters reset...');
    const result = await this.prisma.instagramAccountHealth.updateMany({
      where: {
        OR: [
          { hourlyResetAt: null },
          {
            hourlyResetAt: {
              lt: new Date(Date.now() - 60 * 60 * 1000),
            },
          },
        ],
      },
      data: {
        apiCallsThisHour: 0,
        messagesThisHour: 0,
        hourlyResetAt: new Date(),
      },
    });

    // Auto-unthrottle accounts that were throttled but not explicitly paused
    await this.prisma.instagramAccountHealth.updateMany({
      where: {
        status: 'THROTTLED',
        isPaused: false,
      },
      data: {
        status: 'HEALTHY',
      },
    });

    this.logger.log(`Hourly reset completed: ${result.count} accounts updated`);
    return result.count;
  }

  /**
   * Daily reset for 24-hour API call limits and daily counters
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCountersReset(): Promise<number> {
    this.logger.log('Executing scheduled daily counters reset...');
    const result = await this.prisma.instagramAccountHealth.updateMany({
      where: {
        OR: [
          { dailyResetAt: null },
          {
            dailyResetAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
      data: {
        apiCallsToday: 0,
        messagesToday: 0,
        dailyResetAt: new Date(),
      },
    });

    this.logger.log(`Daily reset completed: ${result.count} accounts updated`);
    return result.count;
  }

  /**
   * Auto-resume accounts that had temporary backoff pauses after timeout expires
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAutoResumeAccounts(): Promise<number> {
    const result = await this.prisma.instagramAccountHealth.updateMany({
      where: {
        isPaused: true,
        resumeAt: {
          lte: new Date(),
        },
        status: {
          not: 'BLOCKED',
        },
      },
      data: {
        isPaused: false,
        resumeAt: null,
        status: 'HEALTHY',
      },
    });

    return result.count;
  }

  /**
   * Nightly lead retention and stale execution log cleanup
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleLeadRetentionCleanup(): Promise<{ stepsDeleted: number; executionsDeleted: number }> {
    this.logger.log('Executing scheduled nightly lead retention cleanup...');
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Clean execution steps older than 90 days
      const deletedSteps = await this.prisma.executionStep.deleteMany({
        where: {
          executedAt: { lt: cutoffDate },
        },
      });

      // Clean executions older than 90 days
      const deletedExecutions = await this.prisma.automationExecution.deleteMany({
        where: {
          startedAt: { lt: cutoffDate },
        },
      });

      // Clean old completed background jobs older than 30 days
      const jobCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.prisma.backgroundJob.deleteMany({
        where: {
          status: 'COMPLETED',
          completedAt: { lt: jobCutoff },
        },
      });

      // Clean old api error logs older than 90 days
      await this.prisma.apiErrorLog.deleteMany({
        where: {
          occurredAt: { lt: cutoffDate },
        },
      });

      this.logger.log(
        `Nightly cleanup completed: ${deletedExecutions.count} executions and ${deletedSteps.count} step logs purged.`,
      );

      return {
        stepsDeleted: deletedSteps.count,
        executionsDeleted: deletedExecutions.count,
      };
    } catch (err: any) {
      this.logger.error(`Nightly lead retention cleanup failed: ${err.message}`);
      return { stepsDeleted: 0, executionsDeleted: 0 };
    }
  }
}
