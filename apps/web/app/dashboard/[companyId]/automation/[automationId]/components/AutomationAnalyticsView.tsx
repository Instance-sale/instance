"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Zap,
  CheckCircle2,
  Users,
  RefreshCw,
  TrendingDown,
  ArrowRight,
  Tag,
  Layers,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PremiumBarChart = dynamic(() => import("@/components/analytics/BarChart"), {
  loading: () => <div className="h-64 bg-slate-100/60 rounded-2xl animate-pulse" />,
  ssr: false,
});

interface AutomationAnalyticsViewProps {
  automation: {
    id: string;
    name: string;
    triggerType: string;
    isActive: boolean;
    nodes?: any[];
  };
  basePath: string;
}

export default function AutomationAnalyticsView({
  automation,
  basePath,
}: AutomationAnalyticsViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      setError(null);
      const res = await fetch(`/api/automations/${automation.id}/analytics`);
      if (!res.ok) {
        throw new Error(`Failed to load analytics: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      console.error("[AutomationAnalyticsView] Fetch error:", err);
      setError(err?.message || "Failed to load automation analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [automation.id]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary || {
    totalTriggers: 0,
    completedRuns: 0,
    completionRate: 0,
    failedRuns: 0,
    leadsInFunnel: 0,
    qualifiedLeads: 0,
    dealsClosedCount: 0,
    totalRevenue: 0,
  };

  const funnelSteps = Array.isArray(data?.funnelSteps) ? data.funnelSteps : [];
  const stageDistribution = Array.isArray(data?.stageDistribution) ? data.stageDistribution : [];
  const tagDistribution = Array.isArray(data?.tagDistribution) ? data.tagDistribution : [];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 space-y-6">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Automation Funnel Analytics
            </h2>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                automation.isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              )}
            >
              {automation.isActive ? "Live Telemetry" : "Draft Mode"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time execution retention, drop-off rates, and audience engagement for "{automation.name}".
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Updated {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", refreshing && "animate-spin text-blue-600")} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Aggregating live automation executions from database...</p>
        </div>
      ) : (
        <>
          {/* 1. Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Triggers */}
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Trigger Runs</span>
                <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {summary.totalTriggers.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400">
                Total workflow activations from Instagram
              </p>
            </div>

            {/* Card 2: Completed Funnel Runs */}
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Completed Runs</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {summary.completedRuns.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {summary.completionRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Completed all workflow steps successfully
              </p>
            </div>

            {/* Card 3: Drop-Off & Incomplete */}
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Drop-Off & Incomplete</span>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {Math.max(summary.failedRuns, summary.totalTriggers - summary.completedRuns).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-rose-600">
                  {summary.totalTriggers > 0
                    ? Math.round(
                        (Math.max(summary.failedRuns, summary.totalTriggers - summary.completedRuns) /
                          summary.totalTriggers) *
                          100
                      )
                    : 0}
                  % drop
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Stopped at an intermediate step or condition
              </p>
            </div>

            {/* Card 4: Unique Audience Reached */}
            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Audience Engaged</span>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {summary.leadsInFunnel.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-blue-600">
                  Unique Leads
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Distinct Instagram profiles captured in CRM
              </p>
            </div>
          </div>

          {/* 2. Visual Step-by-Step Waterfall Funnel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  <span>Step-by-Step Retention & Drop-Off Funnel</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tracks how many users progress through each node, retention from the trigger baseline, and drop-off rate.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {funnelSteps.length} Flow Nodes
              </span>
            </div>

            {funnelSteps.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No nodes configured in this automation yet.
              </div>
            ) : (
              <div className="space-y-6 pt-1">
                <div className="pb-2">
                  <PremiumBarChart
                    data={funnelSteps.map((s: any) => ({
                      name: s.label,
                      executions: s.executedCount,
                    }))}
                    title="Funnel Step Execution Volume"
                    description="Real-time count of executions reaching each workflow node"
                    dataKey="executions"
                    categoryKey="name"
                    color="#4f46e5"
                  />
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {funnelSteps.map((step: any, idx: number) => {
                    const isTrigger = idx === 0;
                    const isLast = idx === funnelSteps.length - 1;

                    return (
                      <div key={step.nodeId || idx} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {step.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              ({step.type.replace(/^ACTION_|^TRIGGER_|^FLOW_/, '')})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-semibold text-slate-700">
                              {step.executedCount.toLocaleString()} executed
                            </span>
                            <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200/60">
                              {step.funnelPercentage}% of Funnel
                            </span>
                            {!isTrigger && step.stepDropoffRate > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-0.5">
                                <TrendingDown className="w-2.5 h-2.5" />
                                <span>{step.stepDropoffRate}% drop</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Visual Funnel Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                          <div
                            className={cn(
                              "h-full transition-all duration-500 rounded-full",
                              isTrigger
                                ? "bg-violet-600"
                                : isLast
                                  ? "bg-emerald-600"
                                  : "bg-blue-600"
                            )}
                            style={{ width: `${Math.max(2, Math.min(100, step.funnelPercentage))}%` }}
                          />
                        </div>

                        {/* Condition Branch Comparison (Yes vs No) */}
                        {step.branchSplits && (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 mt-2 grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-200/60">
                              <span className="font-bold text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>True / Yes Branch:</span>
                              </span>
                              <span className="font-bold text-emerald-900">
                                {step.branchSplits.true?.count || 0} ({step.branchSplits.true?.percentage || 0}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/60 border border-rose-200/60">
                              <span className="font-bold text-rose-800 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>False / No Branch:</span>
                              </span>
                              <span className="font-bold text-rose-900">
                                {step.branchSplits.false?.count || 0} ({step.branchSplits.false?.percentage || 0}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Pipeline Stages & Tag Distributions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: CRM Pipeline Stage Progression */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>CRM Pipeline Stage Progression</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Distribution of active leads across deal milestones.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {summary.leadsInFunnel} Leads
                </span>
              </div>

              {stageDistribution.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No leads recorded in pipeline stages for this automation yet.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {stageDistribution.map((st: any) => (
                    <div key={st.stage} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{st.stage}</span>
                        <span className="font-bold text-slate-900">
                          {st.count} ({st.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, st.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Assigned Tags in this Flow */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>Assigned Contact Tags</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Frequency of company tags applied to leads during execution.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {tagDistribution.length} Tags
                </span>
              </div>

              {tagDistribution.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No tags applied by this automation yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tagDistribution.map((t: any) => (
                    <div
                      key={t.tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{t.tag}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 font-bold">
                        {t.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
