import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@instance/db';

export interface GetNotificationsQuery {
  type?: string;
  isRead?: boolean;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get notifications and unread count for a company
   */
  async getNotifications(companyId: string, query: GetNotificationsQuery = {}) {
    if (!companyId) {
      return { notifications: [], unreadCount: 0 };
    }


    const where: any = { companyId };
    if (query.type) {
      where.type = query.type;
    }
    if (typeof query.isRead === 'boolean') {
      where.isRead = query.isRead;
    }

    const limit = Math.min(Math.max(query.limit || 30, 1), 100);

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { companyId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(companyId: string, id: string) {
    if (!companyId || !id) return { success: false, unreadCount: 0 };

    await this.prisma.notification.updateMany({
      where: { id, companyId },
      data: { isRead: true },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { companyId, isRead: false },
    });

    return { success: true, unreadCount };
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(companyId: string) {
    if (!companyId) return { success: false, unreadCount: 0 };

    await this.prisma.notification.updateMany({
      where: { companyId, isRead: false },
      data: { isRead: true },
    });

    return { success: true, unreadCount: 0 };
  }

  /**
   * Create an ad-hoc notification
   */
  async createNotification(data: {
    companyId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
    linkUrl?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        companyId: data.companyId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        linkUrl: data.linkUrl || null,
      },
    });
  }

  /**
   * Check and trigger celebratory milestones (e.g. 100/1k leads, 5k chats, 5k messages)
   */
  async checkAndTriggerMilestones(companyId: string) {
    // 1. Leads Milestones
    const leadCount = await this.prisma.instagramUserProfile.count({
      where: {
        instagramAccount: { companyId },
      },
    });
    const leadMilestones = [100, 500, 1000, 5000, 10000, 50000];

    for (const threshold of leadMilestones) {
      if (leadCount >= threshold) {
        const milestoneCode = `LEADS_${threshold}`;
        const existing = await this.prisma.notification.findFirst({
          where: {
            companyId,
            type: NotificationType.MILESTONE,
            metadata: { path: ['milestoneCode'], equals: milestoneCode },
          },
        });

        if (!existing) {
          await this.prisma.notification.create({
            data: {
              companyId,
              type: NotificationType.MILESTONE,
              title: `🎉 Milestone Reached: ${threshold.toLocaleString()} Leads!`,
              message: `Congratulations! Your workspace has captured and qualified over ${threshold.toLocaleString()} total leads.`,
              metadata: {
                milestoneCode,
                count: threshold,
                category: 'leads',
                currentCount: leadCount,
              },
              linkUrl: 'crm',
            },
          });
        }
      }
    }
  }
}
