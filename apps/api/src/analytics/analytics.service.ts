import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@instance/db';
import { PrismaService } from '../prisma/prisma.service';
import { TimeRangeDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTimeRange(timeRange: TimeRangeDto) {
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    return {
      period: timeRange.period || 'month',
      start,
      end,
    };
  }

  private async getAccountIds(companyId: string): Promise<string[]> {
    if (!companyId) return [];
    const accounts = await this.prisma.instagramAccount.findMany({
      where: { companyId },
      select: { id: true },
    });
    return accounts.map((a) => a.id);
  }

  async getOverview(companyId: string, timeRangeDto: TimeRangeDto) {
    if (!companyId) throw new ForbiddenException('User has no company assigned');
    const { start, end } = this.parseTimeRange(timeRangeDto);
    const accountIds = await this.getAccountIds(companyId);

    const duration = Math.max(end.getTime() - start.getTime(), 1000 * 60 * 60 * 24);
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime());

    const [
      totalConversations,
      outboundMessages,
      inboundMessages,
      conversationsWithReply,
      newFollowers,
      totalLeads,
      qualifiedLeads,
      prevTotalLeads,
      prevQualifiedLeads,
      conversations,
      prevConversations,
    ] = await Promise.all([
      this.prisma.instagramUserProfile.count({
        where: {
          instagramAccountId: { in: accountIds },
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.executionStep.count({
        where: {
          executedAt: { gte: start, lte: end },
          execution: {
            automation: {
              folder: { instagramAccountId: { in: accountIds } },
            },
          },
        },
      }),
      Promise.resolve(0),
      Promise.resolve(0),
      this.prisma.instagramUserProfile.count({
        where: {
          instagramAccountId: { in: accountIds },
          isFollowingBusiness: true,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.instagramUserProfile.count({
        where: {
          instagramAccountId: { in: accountIds },
          createdAt: { gte: start, lte: end },
        },
      }),
      Promise.resolve(0),
      this.prisma.instagramUserProfile.count({
        where: {
          instagramAccountId: { in: accountIds },
          createdAt: { gte: prevStart, lte: prevEnd },
        },
      }),
      Promise.resolve(0),
      Promise.resolve([]),
      Promise.resolve([]),
    ]);

    const totalMessages = outboundMessages + inboundMessages;

    let dealsClosedCount = 0;
    let totalRevenue = 0;

    for (const conv of conversations) {
      const summary = (conv.engagementSummary as any) || {};
      const dealVal = Number(summary.dealValue) || 0;
      const stageLower = (conv.currentFunnelStage || '').toLowerCase();
      const isClosedWon = stageLower.includes('closed won') || stageLower === 'won' || dealVal > 0;

      if (isClosedWon) {
        dealsClosedCount++;
        totalRevenue += dealVal;
      }
    }

    // Previous period revenue & deals
    let prevDealsCount = 0;
    let prevRevenue = 0;
    for (const conv of prevConversations) {
      const summary = (conv.engagementSummary as any) || {};
      const dealVal = Number(summary.dealValue) || 0;
      const stageLower = (conv.currentFunnelStage || '').toLowerCase();
      const isClosedWon = stageLower.includes('closed won') || stageLower === 'won' || dealVal > 0;
      if (isClosedWon) {
        prevDealsCount++;
        prevRevenue += dealVal;
      }
    }

    const qualificationRate =
      totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
    const averageDealSize =
      dealsClosedCount > 0 ? Math.round(totalRevenue / dealsClosedCount) : 0;

    // Real deltas
    const leadsChange =
      prevTotalLeads > 0
        ? Number((((totalLeads - prevTotalLeads) / prevTotalLeads) * 100).toFixed(1))
        : totalLeads > 0 ? 100 : 0;
    const qualifiedChange =
      prevQualifiedLeads > 0
        ? Number((((qualifiedLeads - prevQualifiedLeads) / prevQualifiedLeads) * 100).toFixed(1))
        : qualifiedLeads > 0 ? 100 : 0;
    const revenueChange =
      prevRevenue > 0
        ? Number((((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
        : totalRevenue > 0 ? 100 : 0;
    const dealsChange =
      prevDealsCount > 0
        ? Number((((dealsClosedCount - prevDealsCount) / prevDealsCount) * 100).toFixed(1))
        : dealsClosedCount > 0 ? 100 : 0;

    const replyRate = totalConversations > 0
      ? Number(((conversationsWithReply / totalConversations) * 100).toFixed(1))
      : 0;

    return {
      totalConversations,
      totalMessages,
      outboundMessages,
      inboundMessages,
      totalLeads,
      qualifiedLeads,
      qualificationRate: Number(qualificationRate.toFixed(1)),
      dmsSent: outboundMessages,
      replyRate,
      followersGained: newFollowers,
      dealsClosedCount,
      totalRevenue,
      averageDealSize,
      leadsChange,
      qualifiedChange,
      revenueChange,
      dealsChange,
      period: timeRangeDto.period,
      start,
      end,
    };
  }

  async getDailyTrends(companyId: string, timeRangeDto: TimeRangeDto) {
    const { start, end } = this.parseTimeRange(timeRangeDto);
    const accountIds = await this.getAccountIds(companyId);

    const startTime = start.getTime();
    const endTime = end.getTime();
    const duration = endTime - startTime;

    let numBuckets = 12;
    if (timeRangeDto.period === 'day') numBuckets = 12;
    else if (timeRangeDto.period === 'week') numBuckets = 7;
    else if (timeRangeDto.period === 'month') numBuckets = 15;
    else if (timeRangeDto.period === 'quarter') numBuckets = 12;
    else if (timeRangeDto.period === 'year') numBuckets = 12;

    const bucketDuration = duration / numBuckets;
    const dates: string[] = [];
    const leads: number[] = [];
    const qualifiedLeads: number[] = [];
    const revenue: number[] = [];
    const deals: number[] = [];

    const [allProfiles, allMessages, allConvs] = await Promise.all([
      this.prisma.instagramUserProfile.findMany({
        where: {
          instagramAccountId: { in: accountIds },
          createdAt: { gte: start, lte: end },
        },
        select: { createdAt: true },
      }),
      Promise.resolve([]),
      Promise.resolve([]),
    ]);

    for (let i = 0; i < numBuckets; i++) {
      const bStart = new Date(startTime + i * bucketDuration);
      const bEnd = new Date(startTime + (i + 1) * bucketDuration);

      const label =
        timeRangeDto.period === 'day'
          ? bStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : bStart.toLocaleDateString([], { month: 'short', day: 'numeric' });

      dates.push(label);

      const bLeads = allProfiles.filter(
        (p) => p.createdAt >= bStart && p.createdAt < bEnd
      ).length;
      const bQualified = allProfiles.filter(
        () => false
      ).length;
      const bMessages = allMessages.filter(
        (m) => m.sentAt >= bStart && m.sentAt < bEnd
      ).length;

      let bDeals = 0;
      let bRev = 0;
      for (const c of allConvs) {
        if (c.updatedAt >= bStart && c.updatedAt < bEnd) {
          const val = Number((c.engagementSummary as any)?.dealValue) || 0;
          if (val > 0) {
            bDeals++;
            bRev += val;
          }
        }
      }

      leads.push(bLeads);
      qualifiedLeads.push(bQualified);
      deals.push(bDeals);
      revenue.push(bRev);
    }

    return {
      dates,
      leads,
      qualifiedLeads,
      revenue,
      deals,
    };
  }

  async getPipelineStagesAnalytics(companyId: string) {
    const accountIds = await this.getAccountIds(companyId);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { customStatuses: true },
    });

    const defaultStatuses = ['New', 'Engaged', 'Qualified', 'Closed Won'];
    const customStatuses =
      company?.customStatuses !== null &&
      company?.customStatuses !== undefined &&
      Array.isArray(company.customStatuses) &&
      (company.customStatuses as string[]).length > 0
        ? (company.customStatuses as string[])
        : defaultStatuses;

    const profiles = await this.prisma.instagramUserProfile.findMany({
      where: { instagramAccountId: { in: accountIds } },
      select: { id: true, status: true, tags: true },
    });

    const totalLeads = profiles.length;
    const stageColors = ['#3b82f6', '#0ea5e9', '#6366f1', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6'];
    const stages = customStatuses.map((st, idx) => {
      const count = profiles.filter((p) => {
        if (p.status) {
          return p.status.trim().toLowerCase() === st.trim().toLowerCase();
        }
        if (idx === 0) return true;
        return false;
      }).length;

      const percentage = totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0;
      return {
        id: `custom-stage-${idx}`,
        name: st,
        count,
        percentage,
        color: stageColors[idx % stageColors.length],
      };
    });

    const followupCount = profiles.filter((p) =>
      p.status?.toLowerCase() === 'follow-up due' || p.status?.toLowerCase() === 'follow up due'
    ).length;

    stages.push({
      id: 'follow-up-due',
      name: 'Follow-up Due',
      count: followupCount,
      percentage: totalLeads > 0 ? Number(((followupCount / totalLeads) * 100).toFixed(1)) : 0,
      color: '#f43f5e',
    });

    return {
      stages,
      totalLeads,
    };
  }

  async getTagDistributionAnalytics(companyId: string) {
    const accountIds = await this.getAccountIds(companyId);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { customTags: true },
    });

    const defaultTags = ['VIP', 'Hot Lead', 'High Budget', 'Warm'];
    const configuredTags =
      company?.customTags !== null &&
      company?.customTags !== undefined &&
      Array.isArray(company.customTags)
        ? (company.customTags as string[])
        : defaultTags;

    const profiles = await this.prisma.instagramUserProfile.findMany({
      where: { instagramAccountId: { in: accountIds } },
      select: { id: true, tags: true },
    });

    const totalLeads = profiles.length;
    const tagCountMap = new Map<string, number>();

    // Pre-populate with configured tags
    for (const tag of configuredTags) {
      tagCountMap.set(tag, 0);
    }

    // Count tag occurrences across all profiles
    let totalTaggedProfiles = 0;
    for (const profile of profiles) {
      if (Array.isArray(profile.tags) && (profile.tags as string[]).length > 0) {
        totalTaggedProfiles++;
        for (const t of profile.tags as string[]) {
          if (typeof t === 'string' && t.trim()) {
            const cleanTag = t.trim();
            tagCountMap.set(cleanTag, (tagCountMap.get(cleanTag) || 0) + 1);
          }
        }
      }
    }

    const tags = Array.from(tagCountMap.entries()).map(([name, count]) => ({
      name,
      count,
      percentage: totalLeads > 0 ? Number(((count / totalLeads) * 100).toFixed(1)) : 0,
      isConfigured: configuredTags.includes(name),
    })).sort((a, b) => b.count - a.count);

    return {
      tags,
      totalLeads,
      totalTaggedProfiles,
    };
  }

  async getFunnel(companyId: string, timeRangeDto: TimeRangeDto) {
    const pipelineData = await this.getPipelineStagesAnalytics(companyId);
    const stagesObj: Record<string, any> = {};
    const maxCount = Math.max(...pipelineData.stages.map((s) => s.count), 1);
    const { start, end } = this.parseTimeRange(timeRangeDto);
    const accountIds = await this.getAccountIds(companyId);

    const convsWithHistory: any[] = [];

    pipelineData.stages.forEach((st, idx) => {
      let totalHours = 0;
      let matchedCount = 0;

      for (const conv of convsWithHistory) {
        if (
          conv.currentFunnelStage &&
          conv.currentFunnelStage.toLowerCase().trim() === st.name.toLowerCase().trim()
        ) {
          const hours = Math.max(0, (conv.updatedAt.getTime() - conv.createdAt.getTime()) / (1000 * 60 * 60));
          totalHours += hours;
          matchedCount++;
        }
      }

      const averageTimeInStage = matchedCount > 0 ? Number((totalHours / matchedCount).toFixed(1)) : 0;

      stagesObj[st.name] = {
        count: st.count,
        percentage: st.percentage,
        conversionRate: idx === 0 ? (st.count > 0 ? 100 : 0) : Math.min(100, Math.round((st.count / maxCount) * 100)),
        averageTimeInStage,
      };
    });

    const dropOffPoints = pipelineData.stages.slice(0, -1).map((st, i) => {
      const nextSt = pipelineData.stages[i + 1];
      const diff = st.count - nextSt.count;
      const rate = st.count > 0 ? Math.round((diff / st.count) * 100) : 0;
      return {
        fromStage: st.name,
        toStage: nextSt.name,
        dropOffRate: rate,
        count: diff,
      };
    });

    return {
      stages: stagesObj,
      dropOffPoints,
      pipelineStages: pipelineData.stages,
    };
  }

  async getEngagement(companyId: string, timeRangeDto: TimeRangeDto) {
    const overview = await this.getOverview(companyId, timeRangeDto);
    const { start, end } = this.parseTimeRange(timeRangeDto);
    const accountIds = await this.getAccountIds(companyId);

    let totalResponseMinutes = 0;
    let responsePairsCount = 0;

    const recentConversations: any[] = [];

    for (const conv of recentConversations) {
      const msgs = conv.messages;
      for (let i = 0; i < msgs.length - 1; i++) {
        if (msgs[i].direction === 'INBOUND' && msgs[i + 1].direction === 'OUTBOUND') {
          const diffMs = msgs[i + 1].sentAt.getTime() - msgs[i].sentAt.getTime();
          if (diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000) {
            totalResponseMinutes += diffMs / (1000 * 60);
            responsePairsCount++;
          }
        }
      }
    }

    const averageResponseTime = responsePairsCount > 0
      ? Number((totalResponseMinutes / responsePairsCount).toFixed(1))
      : 0;

    return {
      messagesSent: (overview as any).outboundMessages ?? overview.totalMessages,
      messagesReceived: (overview as any).inboundMessages ?? 0,
      averageResponseTime,
      conversationStarters: overview.totalConversations,
      activeConversations: overview.totalConversations,
    };
  }

  async getConversion(companyId: string, timeRangeDto: TimeRangeDto) {
    const overview = await this.getOverview(companyId, timeRangeDto);
    const { start, end } = this.parseTimeRange(timeRangeDto);
    const accountIds = await this.getAccountIds(companyId);

    const closedConvs: any[] = [];

    let totalCycleDays = 0;
    let closedCount = 0;
    for (const c of closedConvs) {
      const summary = (c.engagementSummary as any) || {};
      const dealVal = Number(summary.dealValue) || 0;
      const stageLower = (c.currentFunnelStage || '').toLowerCase();
      const isWon = stageLower.includes('closed won') || stageLower === 'won' || dealVal > 0;
      if (isWon) {
        const days = Math.max(0, (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        totalCycleDays += days;
        closedCount++;
      }
    }

    const averageSalesCycleLength = closedCount > 0
      ? Number((totalCycleDays / closedCount).toFixed(1))
      : 0;

    const pipelineData = await this.getPipelineStagesAnalytics(companyId);
    const stages = pipelineData.stages || [];
    const leadCount = stages[0]?.count || overview.totalLeads;
    const qualifiedCount = overview.qualifiedLeads;

    const leadToQualified = leadCount > 0
      ? Number(((qualifiedCount / leadCount) * 100).toFixed(1))
      : 0;

    const overallConversionRate = overview.totalLeads > 0
      ? Number(((overview.dealsClosedCount / overview.totalLeads) * 100).toFixed(1))
      : 0;

    return {
      leadToQualified,
      overallConversionRate,
      averageSalesCycleLength,
    };
  }

  async getAutomation(companyId: string, timeRangeDto: TimeRangeDto) {
    const { start, end } = this.parseTimeRange(timeRangeDto);
    const accountIds = await this.getAccountIds(companyId);

    const [executions, automationsList] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where: {
          automation: {
            folder: {
              instagramAccountId: { in: accountIds },
            },
          },
          startedAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          status: true,
          automationId: true,
          startedAt: true,
          completedAt: true,
          automation: {
            select: { id: true, name: true, triggerType: true },
          },
        },
      }),
      this.prisma.automation.findMany({
        where: {
          folder: {
            instagramAccountId: { in: accountIds },
          },
        },
        select: { id: true, name: true, triggerType: true },
      }),
    ]);

    const totalExecutions = executions.length;
    const completedExecutions = executions.filter((e) => e.status === 'COMPLETED').length;
    const failedExecutions = executions.filter((e) => e.status === 'FAILED').length;

    let totalExecTimeSec = 0;
    let timedCount = 0;
    for (const exec of executions) {
      if (exec.completedAt && exec.startedAt) {
        const dur = (exec.completedAt.getTime() - exec.startedAt.getTime()) / 1000;
        if (dur >= 0 && dur < 86400) {
          totalExecTimeSec += dur;
          timedCount++;
        }
      }
    }
    const averageExecutionTime = timedCount > 0
      ? Number((totalExecTimeSec / (timedCount * 60)).toFixed(2))
      : 0;

    // Trigger breakdown
    const triggerBreakdown: Record<string, number> = {};
    for (const exec of executions) {
      const t = exec.automation?.triggerType || 'DM_RECEIVED';
      triggerBreakdown[t] = (triggerBreakdown[t] || 0) + 1;
    }

    // Top performing automations
    const autoMap = new Map<string, { name: string; runs: number; success: number }>();
    for (const auto of automationsList) {
      autoMap.set(auto.id, { name: auto.name, runs: 0, success: 0 });
    }
    for (const exec of executions) {
      const entry = autoMap.get(exec.automationId) || {
        name: exec.automation?.name || 'Automation Flow',
        runs: 0,
        success: 0,
      };
      entry.runs++;
      if (exec.status === 'COMPLETED') entry.success++;
      autoMap.set(exec.automationId, entry);
    }

    const topPerformingAutomations = Array.from(autoMap.values())
      .map((item) => ({
        name: item.name,
        executions: item.runs,
        successRate: item.runs > 0 ? Number(((item.success) / item.runs * 100).toFixed(1)) : 100,
      }))
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 5);

    return {
      totalExecutions,
      completedExecutions,
      failedExecutions,
      averageExecutionTime,
      topPerformingAutomations,
      triggerBreakdown,
    };
  }

  async getOriginAttributionAnalytics(companyId: string) {
    const accountIds = await this.getAccountIds(companyId);

    const [executions, profiles, conversations] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where: {
          automation: {
            folder: {
              instagramAccountId: { in: accountIds },
            },
          },
        },
        include: {
          automation: {
            select: {
              id: true,
              name: true,
              folder: { select: { name: true, color: true } },
            },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.instagramUserProfile.findMany({
        where: { instagramAccountId: { in: accountIds } },
        select: { instagramUserId: true },
      }),
      Promise.resolve([]),
    ]);

    const qualifiedSet = new Set(
      []
    );

    const revenueMap = new Map<string, number>();
    for (const conv of conversations) {
      const val = Number((conv.engagementSummary as any)?.dealValue) || 0;
      if (val > 0) {
        revenueMap.set(conv.participantId, val);
      }
    }

    const autoSummaryMap = new Map<
      string,
      {
        name: string;
        folderName: string | null;
        folderColor: string | null;
        leads: Set<string>;
        revenue: number;
      }
    >();

    for (const exec of executions) {
      if (!exec.automation) continue;
      const autoId = exec.automation.id;
      const existing = autoSummaryMap.get(autoId) || {
        name: exec.automation.name,
        folderName: exec.automation.folder?.name ?? null,
        folderColor: exec.automation.folder?.color ?? null,
        leads: new Set<string>(),
        revenue: 0,
      };

      if (exec.instagramUserId) {
        existing.leads.add(exec.instagramUserId);
        if (revenueMap.has(exec.instagramUserId)) {
          existing.revenue += revenueMap.get(exec.instagramUserId) || 0;
        }
      }

      autoSummaryMap.set(autoId, existing);
    }

    const result = Array.from(autoSummaryMap.entries()).map(([id, item]) => {
      const leadsCount = item.leads.size;
      let qualifiedCount = 0;
      for (const uid of item.leads) {
        if (qualifiedSet.has(uid)) qualifiedCount++;
      }
      return {
        automationId: id,
        name: item.name,
        folderName: item.folderName,
        folderColor: item.folderColor,
        leadsCount,
        qualifiedCount,
        revenue: item.revenue,
        qualificationRate:
          leadsCount > 0 ? Number(((qualifiedCount / leadsCount) * 100).toFixed(1)) : 0,
      };
    });

    return result.sort((a, b) => b.leadsCount - a.leadsCount).slice(0, 6);
  }
  async getAllData(companyId: string, timeRangeDto: TimeRangeDto) {
    const [
      overview,
      funnel,
      engagement,
      conversion,
      automation,
      pipelineStages,
      tagDistribution,
      dailyTrends,
      originAttribution,
    ] = await Promise.all([
      this.getOverview(companyId, timeRangeDto),
      this.getFunnel(companyId, timeRangeDto),
      this.getEngagement(companyId, timeRangeDto),
      this.getConversion(companyId, timeRangeDto),
      this.getAutomation(companyId, timeRangeDto),
      this.getPipelineStagesAnalytics(companyId),
      this.getTagDistributionAnalytics(companyId),
      this.getDailyTrends(companyId, timeRangeDto),
      this.getOriginAttributionAnalytics(companyId),
    ]);

    return {
      overview,
      funnel,
      engagement,
      conversion,
      automation,
      pipelineStages,
      tagDistribution,
      dailyTrends,
      originAttribution,
    };
  }
}
