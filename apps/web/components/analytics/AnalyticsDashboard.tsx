"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type {
  TimeRange,
  OverviewMetrics,
  FunnelMetrics,
  EngagementMetrics,
  ConversionMetrics,
  AutomationMetrics,
  OriginAttributionItem,
} from "@/lib/types/analytics";
import { logger } from "@/lib/logger";
import {
  RefreshCw,
  TrendingUp,
  Zap,
  Bot,
  UserCheck,
  Clock,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  AlertCircle,
  Kanban,
  Tag,
  FileSpreadsheet,
} from "lucide-react";
import ExportAnalyticsModal from "./ExportAnalyticsModal";

interface PipelineStageMetric {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface TagMetric {
  name: string;
  count: number;
  percentage: number;
  isConfigured: boolean;
}

// Dynamically import chart components for optimal bundle performance
const SparklineStats = dynamic(() => import("./SparklineStats"), {
  loading: () => <div className="h-32 bg-slate-100/60 rounded-2xl animate-pulse" />,
  ssr: false,
});

const BarChart = dynamic(() => import("./BarChart"), {
  loading: () => <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />,
  ssr: false,
});

const AudienceListsAnalyticsCard = dynamic(() => import("./AudienceListsAnalyticsCard"), {
  loading: () => <div className="h-48 bg-slate-100/60 rounded-2xl animate-pulse" />,
  ssr: false,
});

const HeroEngagementChart = dynamic(() => import("./HeroEngagementChart"), {
  loading: () => <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />,
  ssr: false,
});

const AreaChart = dynamic(() => import("./AreaChart"), {
  loading: () => <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />,
  ssr: false,
});

const LineChart = dynamic(() => import("./LineChart"), {
  loading: () => <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />,
  ssr: false,
});

const OriginAttributionBarChart = dynamic(() => import("./OriginAttributionBarChart"), {
  loading: () => <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />,
  ssr: false,
});

interface AnalyticsDashboardProps {
  companyId: string;
  initialData?: any;
  initialTimeRange?: TimeRange;
}

export default function AnalyticsDashboard({
  companyId,
  initialData,
  initialTimeRange,
}: AnalyticsDashboardProps) {
  const [overview, setOverview] = useState<OverviewMetrics | null>(
    initialData?.overview ?? null
  );
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(
    initialData?.funnel ?? null
  );
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(
    initialData?.engagement ?? null
  );
  const [conversion, setConversion] = useState<ConversionMetrics | null>(
    initialData?.conversion ?? null
  );
  const [automation, setAutomation] = useState<AutomationMetrics | null>(
    initialData?.automation ?? null
  ); const [pipelineStages, setPipelineStages] = useState<{
    stages: PipelineStageMetric[];
    totalLeads: number;
  } | null>(initialData?.pipelineStages ?? null);
  const [tagDistribution, setTagDistribution] = useState<{
    tags: TagMetric[];
    totalLeads: number;
    totalTaggedProfiles: number;
  } | null>(initialData?.tagDistribution ?? null);
  const [dailyTrends, setDailyTrends] = useState<{
    dates: string[];
    leads: number[];
    qualifiedLeads?: number[];
    revenue?: number[];
    deals?: number[];
  } | null>(initialData?.dailyTrends ?? null);
  const [originAttribution, setOriginAttribution] = useState<OriginAttributionItem[] | null>(
    initialData?.originAttribution ?? null
  );
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [loading, setLoading] = useState(!initialData);
  const [loadedSections, setLoadedSections] = useState({
    stats: !!initialData,
    charts: !!initialData,
    tables: !!initialData,
  });

  const initialHydrationRef = useRef(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialTimeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      period: "month",
    }
  );

  useEffect(() => {
    if (initialHydrationRef.current && initialData) {
      initialHydrationRef.current = false;
      setLoading(false);
      setLoadedSections({ stats: true, charts: true, tables: true });
      return;
    }
    initialHydrationRef.current = false;
    loadAnalyticsProgressively();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const requestIdRef = useRef(0);
  const loadAnalyticsProgressively = async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setLoadedSections({ stats: false, charts: false, tables: false });

    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeRange }),
      });

      if (!res.ok) throw new Error("Failed to load analytics");
      const data = await res.json();

      if (reqId !== requestIdRef.current) return;

      setOverview(data.overview ?? null);
      setFunnel(data.funnel ?? null);
      setEngagement(data.engagement ?? null);
      setConversion(data.conversion ?? null);
      setAutomation(data.automation ?? null);
      setPipelineStages(data.pipelineStages ?? null);
      setTagDistribution(data.tagDistribution ?? null);
      setDailyTrends({
        dates: data.dailyTrends?.dates ?? [],
        leads: data.dailyTrends?.leads ?? [],
        qualifiedLeads: data.dailyTrends?.qualifiedLeads ?? [],
        revenue: data.dailyTrends?.revenue ?? [],
        deals: data.dailyTrends?.deals ?? [],
      });
      setOriginAttribution(data.originAttribution ?? null);
      setLoadedSections({ stats: true, charts: true, tables: true });
    } catch (error) {
      logger.error("Error loading analytics:", error);
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };


  const handleTimeRangeChange = (
    period: "day" | "week" | "month" | "quarter" | "year"
  ) => {
    const now = new Date();
    let start: Date;

    switch (period) {
      case "day":
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    setTimeRange({ start, end: now, period });
  };

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-slate-500">
          Loading analytics telemetry...
        </p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Failed to load analytics data
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Could not retrieve metrics for the selected time range. Please check your connection or try again.
        </p>
        <button
          onClick={() => loadAnalyticsProgressively()}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          Retry Fetch
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-3 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Activity className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Performance Analytics
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time workflow execution, pipeline flow, and audience engagement metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segmented Range Control */}
          <div className="seg-track">
            {(
              [
                { id: "day", label: "24h" },
                { id: "week", label: "7 days" },
                { id: "month", label: "30 days" },
                { id: "quarter", label: "90 days" },
                { id: "year", label: "1 year" },
              ] as const
            ).map((item) => {
              const active = timeRange.period === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTimeRangeChange(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${active
                    ? "seg-pill-active"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                    }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadAnalyticsProgressively()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-blue-600 ${loading ? "animate-spin" : ""
                }`}
            />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Export Action */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            disabled={loading || !overview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Export analytics report to Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Sparkline Stat Cards */}
      {loadedSections.stats && overview && (
        <SparklineStats
          metrics={[
            {
              label: "Total Leads",
              value: overview.totalLeads,
              change: overview.leadsChange ?? 0,
              unit: "",
              subValue: `${overview.totalLeads} Total Prospects`,
              subBadges: [
                { icon: "user", label: `${overview.totalLeads} Prospects` },
              ],
              sparklineData: dailyTrends?.leads || [],
            },
            {
              label: "Active Workflows",
              value: overview.activeAutomations ?? 0,
              change: overview.activeAutomationsChange ?? 0,
              unit: "",
              subValue: `${overview.activeAutomations ?? 0} Live Workflows`,
              subBadges: [
                { icon: "zap", label: `${overview.activeAutomations ?? 0} Published` },
              ],
              sparklineData: (dailyTrends as any)?.executions || dailyTrends?.leads || [],
            },
            {
              label: "Workflow Executions",
              value: overview.totalExecutions ?? automation?.totalExecutions ?? 0,
              change: overview.executionsChange ?? 0,
              unit: "",
              subValue: `${overview.totalExecutions ?? automation?.totalExecutions ?? 0} Total Runs`,
              subBadges: [
                { icon: "activity", label: `${overview.totalExecutions ?? automation?.totalExecutions ?? 0} Runs` },
              ],
              sparklineData: (dailyTrends as any)?.executions || dailyTrends?.leads || [],
            },
            {
              label: "Pipeline in Flight",
              value: overview.pipelineLeads ?? pipelineStages?.totalLeads ?? 0,
              change: overview.pipelineLeadsChange ?? 0,
              unit: "",
              subValue: `${overview.pipelineLeads ?? pipelineStages?.totalLeads ?? 0} In Funnel`,
              subBadges: [
                { icon: "kanban", label: `${overview.pipelineLeads ?? pipelineStages?.totalLeads ?? 0} Active` },
              ],
              sparklineData: dailyTrends?.leads || [],
            },
          ]}
        />
      )}

      {/* Main Charts Grid */}
      {loadedSections.charts ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Sales Funnel Bar Chart */}
          {funnel ? (
            <BarChart
              title="Sales Funnel Distribution"
              description="Progression of active prospects through pipeline stages"
              data={Object.entries(funnel.stages).map(([stage, metrics]) => ({
                stage: stage
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()),
                count: metrics.count,
              }))}
              dataKey="count"
              categoryKey="stage"
              color="#2563eb"
            />
          ) : (
            <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />
          )}

          {/* Conversion Rates Area Chart */}
          {conversion ? (
            <AreaChart data={conversion} />
          ) : (
            <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />
          )}

          {/* Engagement Metrics Donut */}
          {engagement ? (
            <HeroEngagementChart data={engagement} />
          ) : (
            <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />
          )}

          {/* Growth Trends Line Chart */}
          {dailyTrends ? (
            <LineChart
              data={{
                dates: dailyTrends.dates || [],
                values: dailyTrends.leads || [],
              }}
              metric="leads"
            />
          ) : (
            <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />
          )}

          {/* Automation Performance Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md h-full flex flex-col justify-between">
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Automation Engine
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Active workflow execution rates and failure monitoring
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              {/* Three Stat Cards */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-center">
                  <p className="text-xl sm:text-2xl font-extrabold text-blue-700 font-mono">
                    {automation?.totalExecutions ?? 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-blue-900/60 font-bold uppercase tracking-wider mt-1">
                    Total
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center">
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono">
                    {automation?.completedExecutions ?? 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-900/60 font-bold uppercase tracking-wider mt-1">
                    Success
                  </p>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-center">
                  <p className="text-xl sm:text-2xl font-extrabold text-rose-700 font-mono">
                    {automation?.failedExecutions ?? 0}
                  </p>
                  <p className="text-[10px] sm:text-xs text-rose-900/60 font-bold uppercase tracking-wider mt-1">
                    Failed
                  </p>
                </div>
              </div>

              {/* Top Performing Automations */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Top Performing Automations
                </h4>
                {(automation?.topPerformingAutomations ?? []).slice(0, 3).map(
                  (autoItem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 bg-slate-50/60 border border-slate-100 rounded-xl text-xs"
                    >
                      <span className="font-semibold text-slate-800 truncate pr-2">
                        {autoItem.name}
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {autoItem.executions} runs
                        </span>
                        <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono text-[11px]">
                          {autoItem.successRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Automatic retries enabled</span>
              <span className="font-semibold text-blue-700 font-mono">
                {automation?.totalExecutions ? `${(((automation.completedExecutions || 0) / automation.totalExecutions) * 100).toFixed(1)}% success` : "Idle"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-2" />
          <p className="text-xs text-slate-500 font-medium">
            Generating visual charts...
          </p>
        </div>
      )}

      {/* Detailed Tables & Drop-off Analysis */}
      {loadedSections.tables ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Dynamic Pipeline Stages Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Kanban className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Pipeline Stage Progression
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Dynamic lead volume across configured company stages (Settings sync)
                  </p>
                </div>
                {pipelineStages && (
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full tnum font-mono">
                    {pipelineStages.totalLeads} total leads
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-4">
                {pipelineStages?.stages && pipelineStages.stages.length > 0 ? (
                  pipelineStages.stages.map((st, index) => (
                    <div
                      key={st.id || index}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-2xs"
                            style={{ backgroundColor: st.color || '#3b82f6' }}
                          />
                          <span className="text-xs sm:text-sm font-bold text-slate-800">
                            {st.name}
                          </span>
                          {st.name.toLowerCase().includes('follow-up') && (
                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200/60">
                              Locked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 tnum font-mono">
                            {st.count.toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 tnum min-w-[42px] text-right font-mono">
                            {st.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.min(100, Math.max(0, st.percentage))}%`,
                            backgroundColor: st.color || '#3b82f6',
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No pipeline stage metrics recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Company Tag Intelligence Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Tag className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Lead Tag Distribution
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Audience segments by company tags defined in Workspace Settings
                  </p>
                </div>
                {tagDistribution && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full tnum font-mono">
                    {tagDistribution.totalTaggedProfiles} tagged leads
                  </span>
                )}
              </div>

              <div className="space-y-2.5 pt-4">
                {tagDistribution?.tags && tagDistribution.tags.length > 0 ? (
                  tagDistribution.tags.map((tagItem, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/60 truncate">
                          #{tagItem.name}
                        </span>
                        {tagItem.isConfigured && (
                          <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">
                            Company Tag
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-20 sm:w-28 bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(0, tagItem.percentage))}%` }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 tnum min-w-[28px] text-right font-mono">
                          {tagItem.count}
                        </span>
                        <span className="text-xs text-slate-400 tnum min-w-[36px] text-right font-mono">
                          {tagItem.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No company tags recorded yet.
                    <p className="text-[11px] text-slate-300 mt-1">
                      Configure tags in Settings and attach them to leads in the CRM drawer.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Funnel Drop-off Analysis */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Funnel Drop-off Points
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Bottleneck detection between customer journey stages
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                {(funnel?.dropOffPoints ?? []).map((dropOff, index) => {
                  const rate = dropOff.dropOffRate;
                  const isSevere = rate >= 50;
                  const isModerate = rate >= 20 && rate < 50;
                  const isGrowth = rate < 0;

                  const severityStyles = isSevere
                    ? {
                      card: "bg-red-50/50 border-red-200/80",
                      accent: "border-l-red-500",
                      badge: "bg-red-100/80 text-red-700 border-red-200",
                      label: "text-red-700",
                    }
                    : isModerate
                      ? {
                        card: "bg-amber-50/50 border-amber-200/80",
                        accent: "border-l-amber-500",
                        badge: "bg-amber-100/80 text-amber-700 border-amber-200",
                        label: "text-amber-700",
                      }
                      : isGrowth
                        ? {
                          card: "bg-emerald-50/50 border-emerald-200/80",
                          accent: "border-l-emerald-500",
                          badge: "bg-emerald-100/80 text-emerald-700 border-emerald-200",
                          label: "text-emerald-700",
                        }
                        : {
                          card: "bg-slate-50/60 border-slate-200",
                          accent: "border-l-blue-500",
                          badge: "bg-blue-100/80 text-blue-700 border-blue-200",
                          label: "text-slate-700",
                        };

                  return (
                    <div
                      key={index}
                      className={`relative overflow-hidden rounded-xl border ${severityStyles.card} ${severityStyles.accent} border-l-4 transition-all`}
                    >
                      <div className="flex items-center justify-between gap-4 p-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-md border bg-white text-slate-800 border-slate-200 shadow-2xs">
                              {dropOff.fromStage}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-md border bg-white text-blue-700 border-blue-200 shadow-2xs">
                              {dropOff.toStage}
                            </span>
                          </div>
                          <p className={`text-xs font-semibold ${severityStyles.label}`}>
                            {dropOff.count > 0
                              ? `${dropOff.count.toLocaleString()} prospects dropped`
                              : dropOff.count < 0
                                ? `${Math.abs(dropOff.count).toLocaleString()} prospects accelerated`
                                : "Stable transition"}
                          </p>
                        </div>

                        <div className="shrink-0">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-extrabold rounded-lg border font-mono ${severityStyles.badge}`}
                          >
                            {isGrowth
                              ? `+${Math.abs(rate)}% gain`
                              : `${rate}% drop`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance KPIs */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Response Performance
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Speed to lead and response time metrics
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      Average Speed to Lead
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 font-mono shadow-2xs">
                    {engagement?.averageResponseTime ?? 0}m
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      Live Active Conversations
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 font-mono shadow-2xs">
                    {engagement?.activeConversations ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audience Lists & Campaign Growth Engine */}
          <div className="pt-2">
            <AudienceListsAnalyticsCard />
          </div>

          <div className="pt-2">
            <OriginAttributionBarChart originAttribution={originAttribution} />
          </div>
        </div>
      ) : null}

      {/* Export Report Modal */}
      <ExportAnalyticsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        timeRange={timeRange}
        overview={overview}
        funnel={funnel}
        engagement={engagement}
        conversion={conversion}
        automation={automation}
        pipelineStages={pipelineStages}
        tagDistribution={tagDistribution}
        dailyTrends={dailyTrends}
        originAttribution={originAttribution}
      />
    </div>
  );
}
