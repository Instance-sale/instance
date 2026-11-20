export interface OverviewMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  dmsSent: number;
  replyRate: number;
  followersGained: number;
  dealsClosedCount: number;
  totalRevenue: number;
  averageDealSize: number;
  // Extended dynamic metrics
  activeAutomations?: number;
  activeAutomationsChange?: number;
  totalExecutions?: number;
  executionsChange?: number;
  pipelineLeads?: number;
  pipelineLeadsChange?: number;
  qualificationRate?: number;
  leadsChange?: number;
  qualifiedChange?: number;
  revenueChange?: number;
  dealsChange?: number;
  sparklineHistory?: {
    leads?: number[];
    qualified?: number[];
    revenue?: number[];
    deals?: number[];
    executions?: number[];
    qualifiedLeads?: number[];
  };
}

export interface MetricSubBadge {
  icon?: "bot" | "user" | "target" | "briefcase" | "dollar" | "zap" | "activity" | "kanban";
  label: string;
}

export interface AnalyticsMetric {
  label: string;
  value: number | string;
  change: number;
  unit?: string;
  subValue?: string;
  subBadges?: MetricSubBadge[];
  sparklineData?: number[];
}

export interface FunnelMetrics {
  stages: {
    [key: string]: {
      count: number;
      percentage: number;
      conversionRate: number;
      averageTimeInStage: number; // in hours
    };
  };
  dropOffPoints: {
    fromStage: string;
    toStage: string;
    dropOffRate: number;
    count: number;
  }[];
}

export interface EngagementMetrics {
  messagesSent: number;
  messagesReceived: number;
  averageResponseTime: number; // in minutes
  conversationStarters: number;
  activeConversations: number;
}

export interface ConversionMetrics {
  leadToQualified: number;
  overallConversionRate: number;
  averageSalesCycleLength: number; // in days
}

export interface AutomationMetrics {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number; // in minutes
  topPerformingAutomations: {
    name: string;
    executions: number;
    successRate: number;
  }[];
  triggerBreakdown: {
    [triggerType: string]: number;
  };
}


export interface TimeRange {
  start: Date;
  end: Date;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
  }[];
}

export interface AnalyticsFilter {
  timeRange: TimeRange;
  funnelStages?: string[];
  qualificationStatus?: 'all' | 'qualified' | 'unqualified';
}

export interface OriginAttributionItem {
  automationId: string;
  name: string;
  folderName: string | null;
  folderColor: string | null;
  leadsCount: number;
  qualifiedCount: number;
  revenue: number;
  qualificationRate: number;
  executionsCount?: number;
}


export interface AnalyticsData {
  overview: OverviewMetrics;
  funnel: FunnelMetrics;
  engagement: EngagementMetrics;
  conversion: ConversionMetrics;
  automation: AutomationMetrics;
  timeRange: TimeRange;
  pipelineStages?: {
    stages: Array<{
      id: string;
      name: string;
      count: number;
      percentage: number;
      color: string;
    }>;
    totalLeads: number;
  };
  tagDistribution?: {
    tags: Array<{
      name: string;
      count: number;
      percentage: number;
      isConfigured: boolean;
    }>;
    totalLeads: number;
    totalTaggedProfiles: number;
  };
  dailyTrends: {
    dates: string[];
    leads: number[];
    revenue?: number[];
    deals?: number[];
  };
  originAttribution?: OriginAttributionItem[];
}