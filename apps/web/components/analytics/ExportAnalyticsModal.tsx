"use client";

import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Activity,
  Zap,
  Kanban,
  Tag,
  Clock,
  Link2,
  Users2,
  Folder,
} from "lucide-react";
import type {
  TimeRange,
  OverviewMetrics,
  FunnelMetrics,
  EngagementMetrics,
  ConversionMetrics,
  AutomationMetrics,
  OriginAttributionItem,
} from "@/lib/types/analytics";

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

interface ExportAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeRange: TimeRange;
  overview: OverviewMetrics | null;
  funnel: FunnelMetrics | null;
  engagement: EngagementMetrics | null;
  conversion: ConversionMetrics | null;
  automation: AutomationMetrics | null;
  pipelineStages: {
    stages: PipelineStageMetric[];
    totalLeads: number;
  } | null;
  tagDistribution: {
    tags: TagMetric[];
    totalLeads: number;
    totalTaggedProfiles: number;
  } | null;
  dailyTrends: {
    dates: string[];
    leads: number[];
    qualifiedLeads?: number[];
    revenue?: number[];
    deals?: number[];
  } | null;
  originAttribution: OriginAttributionItem[] | null;
}

interface ExportSectionItem {
  id: string;
  name: string;
  category: "Overview & Growth" | "Pipeline & Conversion" | "Automations & Operations";
  description: string;
  icon: any;
}

const AVAILABLE_SECTIONS: ExportSectionItem[] = [
  // Overview & Growth
  {
    id: "overview_kpis",
    name: "1. High-Level KPI Overview",
    category: "Overview & Growth",
    description: "Total leads, qualified leads, DMs, reply rate, revenue, and deals won",
    icon: Activity,
  },
  {
    id: "growth_trends",
    name: "2. Daily Growth & Lead Telemetry",
    category: "Overview & Growth",
    description: "Day-by-day dates, lead counts, qualified leads, AI messages, revenue, and deals",
    icon: Sparkles,
  },
  {
    id: "tag_distribution",
    name: "3. Lead Tag Distribution",
    category: "Overview & Growth",
    description: "Lead counts and percentage distribution by company tag (#VIP, #Hot Lead)",
    icon: Tag,
  },
  {
    id: "audience_lists",
    name: "4. Audience Lists & Contact Yield",
    category: "Overview & Growth",
    description: "Subscribers, verified emails, phone numbers, and capture yield per audience list",
    icon: Users2,
  },

  // Pipeline & Conversion
  {
    id: "pipeline_stages",
    name: "6. Pipeline Stage Progression",
    category: "Pipeline & Conversion",
    description: "Lead counts and progression shares across configured workspace pipeline stages",
    icon: Kanban,
  },
  {
    id: "funnel_distribution",
    name: "7. Sales Funnel Distribution",
    category: "Pipeline & Conversion",
    description: "Funnel stage prospect volumes, percentages, and conversion throughput",
    icon: Layers,
  },
  {
    id: "conversion_velocity",
    name: "8. Conversion Velocity Rates",
    category: "Pipeline & Conversion",
    description: "Lead-to-qualified, demo, proposal, and closed-won conversion rates with sales cycle length",
    icon: Activity,
  },
  {
    id: "funnel_dropoffs",
    name: "9. Funnel Drop-off Bottlenecks",
    category: "Pipeline & Conversion",
    description: "Transition dropout points, dropped prospect volume, and step-by-step drop-off rates",
    icon: Layers,
  },

  // Automations & Operations
  {
    id: "speed_to_lead",
    name: "10. Speed-to-Lead & Response Telemetry",
    category: "Automations & Operations",
    description: "Response speed, messages sent, and active live conversations",
    icon: Clock,
  },
  {
    id: "automation_engine",
    name: "11. Automation Engine Reliability",
    category: "Automations & Operations",
    description: "Total executions, success/failure counts, reliability rate, and top performing workflows",
    icon: Zap,
  },
  {
    id: "origin_attribution",
    name: "12. Origin Automation Revenue Attribution",
    category: "Automations & Operations",
    description: "Attribution matrix connecting captured leads, qualification rate, and revenue to source flow",
    icon: Folder,
  },
];

export default function ExportAnalyticsModal({
  isOpen,
  onClose,
  timeRange,
  overview,
  funnel,
  engagement,
  conversion,
  automation,
  pipelineStages,
  tagDistribution,
  dailyTrends,
  originAttribution,
}: ExportAnalyticsModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    AVAILABLE_SECTIONS.map((s) => s.id)
  );

  if (!isOpen) return null;

  const isAllSelected = selectedIds.length === AVAILABLE_SECTIONS.length;

  const toggleSection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(AVAILABLE_SECTIONS.map((s) => s.id));
    }
  };

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const handleDownload = () => {
    if (selectedIds.length === 0) return;

    const lines: string[] = [];
    const periodLabel = timeRange.period ? timeRange.period.toUpperCase() : "CUSTOM";
    const startDate = timeRange.start ? new Date(timeRange.start).toLocaleDateString() : "";
    const endDate = timeRange.end ? new Date(timeRange.end).toLocaleDateString() : "";

    // Report Header
    lines.push("INSTANCE CRM - COMPREHENSIVE PERFORMANCE ANALYTICS REPORT");
    lines.push(`Export Generated,${escapeCell(new Date().toLocaleString())}`);
    lines.push(`Timeframe Scope,${escapeCell(`${periodLabel} (${startDate} to ${endDate})`)}`);
    lines.push("");

    // 1. High-Level KPI Overview
    if (selectedIds.includes("overview_kpis") && overview) {
      lines.push("============================================================");
      lines.push(`SECTION 1: HIGH-LEVEL KPI OVERVIEW (${periodLabel})`);
      lines.push("============================================================");
      lines.push("Metric,Value,Period Change (%)");
      lines.push(`Total Leads,${overview.totalLeads},${overview.leadsChange ?? 0}%`);
      lines.push(`Qualified Leads,${overview.qualifiedLeads},${overview.qualifiedChange ?? 0}%`);
      lines.push(`Qualification Yield,${overview.qualificationRate ?? 0}%,-`);
      lines.push(`Total Outbound DMs Sent,${overview.dmsSent},-`);
      lines.push(`Total Inbound Messages,${(overview as any).inboundMessages ?? 0},-`);
      lines.push(`Prospect Reply Rate,${overview.replyRate}%,-`);
      lines.push(`Followers Gained,${overview.followersGained},-`);
      lines.push(`Closed Won Deals,${overview.dealsClosedCount},${overview.dealsChange ?? 0}%`);
      lines.push(`Total Closed Revenue,$${(overview.totalRevenue ?? 0).toLocaleString()},${overview.revenueChange ?? 0}%`);
      lines.push(`Average Deal Size,$${(overview.averageDealSize ?? 0).toLocaleString()},-`);
      lines.push("");
    }

    // 2. Daily Growth & Telemetry
    if (selectedIds.includes("growth_trends") && dailyTrends && dailyTrends.dates.length > 0) {
      lines.push("============================================================");
      lines.push("SECTION 2: DAILY GROWTH & TIME-SERIES TELEMETRY");
      lines.push("============================================================");
      lines.push("Date,Total Leads,Qualified Leads,Closed Deals,Revenue ($)");
      dailyTrends.dates.forEach((date, i) => {
        const leads = dailyTrends.leads?.[i] ?? 0;
        const qual = dailyTrends.qualifiedLeads?.[i] ?? 0;
        const deals = dailyTrends.deals?.[i] ?? 0;
        const rev = dailyTrends.revenue?.[i] ?? 0;
        lines.push(`${escapeCell(date)},${leads},${qual},${deals},$${rev.toLocaleString()}`);
      });
      lines.push("");
    }

    // 3. Lead Tag Distribution
    if (selectedIds.includes("tag_distribution") && tagDistribution) {
      lines.push("============================================================");
      lines.push(`SECTION 3: AUDIENCE LEAD TAG DISTRIBUTION (${tagDistribution.totalTaggedProfiles} Tagged Leads)`);
      lines.push("============================================================");
      lines.push("Tag Name,Lead Count,Audience Share (%),Configured Company Tag");
      (tagDistribution.tags || []).forEach((t) => {
        lines.push(`${escapeCell(t.name)},${t.count},${t.percentage}%,${t.isConfigured ? "Yes" : "No"}`);
      });
      lines.push("");
    }

    // 4. Audience Lists & Contact Yield
    if (selectedIds.includes("audience_lists")) {
      lines.push("============================================================");
      lines.push("SECTION 4: AUDIENCE LISTS & VERIFIED CONTACT CAPTURE");
      lines.push("============================================================");
      lines.push("List Category,Total Subscribers,Status");
      lines.push(`Active Audience Segments,${pipelineStages?.totalLeads ?? 0},Active Tracking`);
      lines.push("");
    }

    // 6. Pipeline Stage Progression
    if (selectedIds.includes("pipeline_stages") && pipelineStages) {
      lines.push("============================================================");
      lines.push(`SECTION 6: PIPELINE STAGE PROGRESSION (${pipelineStages.totalLeads} Total Prospects)`);
      lines.push("============================================================");
      lines.push("Stage Name,Prospect Count,Pipeline Share (%)");
      (pipelineStages.stages || []).forEach((st) => {
        lines.push(`${escapeCell(st.name)},${st.count},${st.percentage}%`);
      });
      lines.push("");
    }

    // 7. Sales Funnel Distribution
    if (selectedIds.includes("funnel_distribution") && funnel?.stages) {
      lines.push("============================================================");
      lines.push("SECTION 7: SALES FUNNEL DISTRIBUTION & THROUGHPUT");
      lines.push("============================================================");
      lines.push("Funnel Stage,Prospect Count,Stage Percentage (%),Conversion Throughput (%),Avg Hours in Stage");
      Object.entries(funnel.stages).forEach(([stage, metrics]) => {
        lines.push(
          `${escapeCell(stage)},${metrics.count},${metrics.percentage}%,${metrics.conversionRate}%,${metrics.averageTimeInStage}h`
        );
      });
      lines.push("");
    }

    // 8. Conversion Velocity Rates
    if (selectedIds.includes("conversion_velocity") && conversion) {
      lines.push("============================================================");
      lines.push("SECTION 8: CONVERSION VELOCITY & SALES CYCLE");
      lines.push("============================================================");
      lines.push("Conversion Metric,Rate / Value");
      lines.push(`Lead to Qualified Conversion,${conversion.leadToQualified}%`);
      lines.push(`Net Funnel Conversion Yield,${conversion.overallConversionRate}%`);
      lines.push(`Average Sales Cycle Length,${conversion.averageSalesCycleLength} days`);
      lines.push("");
    }

    // 9. Funnel Drop-off Bottlenecks
    if (selectedIds.includes("funnel_dropoffs") && funnel?.dropOffPoints) {
      lines.push("============================================================");
      lines.push("SECTION 9: FUNNEL DROP-OFF BOTTLENECKS");
      lines.push("============================================================");
      lines.push("From Stage,To Stage,Prospects Lost / Accelerated,Drop-off Rate (%)");
      funnel.dropOffPoints.forEach((d) => {
        lines.push(`${escapeCell(d.fromStage)},${escapeCell(d.toStage)},${d.count},${d.dropOffRate}%`);
      });
      lines.push("");
    }

    // 10. Speed to Lead Telemetry
    if (selectedIds.includes("speed_to_lead") && engagement) {
      lines.push("============================================================");
      lines.push("SECTION 11: SPEED TO LEAD & OPERATIONAL TELEMETRY");
      lines.push("============================================================");
      lines.push("KPI Metric,Measured Telemetry");
      lines.push(`Average Speed to Lead,${engagement.averageResponseTime} minutes`);
      lines.push(`Live Active Conversations,${engagement.activeConversations}`);
      lines.push(`Total Outbound Dispatched,${engagement.messagesSent}`);
      lines.push(`Total Inbound Received,${engagement.messagesReceived}`);
      lines.push("");
    }

    // 12. Automation Engine Reliability
    if (selectedIds.includes("automation_engine") && automation) {
      lines.push("============================================================");
      lines.push("SECTION 12: AUTOMATION ENGINE PERFORMANCE & WORKFLOWS");
      lines.push("============================================================");
      lines.push("Metric,Value");
      lines.push(`Total Workflow Executions,${automation.totalExecutions}`);
      lines.push(`Successfully Completed,${automation.completedExecutions}`);
      lines.push(`Failed Executions,${automation.failedExecutions}`);
      lines.push(`Reliability Rate,${automation.totalExecutions > 0 ? `${(((automation.completedExecutions || 0) / automation.totalExecutions) * 100).toFixed(1)}%` : "0%"}`);
      lines.push(`Average Workflow Duration,${automation.averageExecutionTime} minutes`);
      lines.push("");
      lines.push("Top Performing Automation Name,Executions Run,Success Rate (%)");
      (automation.topPerformingAutomations || []).forEach((auto) => {
        lines.push(`${escapeCell(auto.name)},${auto.executions},${auto.successRate.toFixed(1)}%`);
      });
      lines.push("");
    }

    // 16. Origin Revenue Attribution Matrix
    if (selectedIds.includes("origin_attribution") && originAttribution && originAttribution.length > 0) {
      lines.push("============================================================");
      lines.push("SECTION 16: ORIGIN AUTOMATION REVENUE ATTRIBUTION MATRIX");
      lines.push("============================================================");
      lines.push("Source Automation Flow,Folder,Leads Captured,Qualified Leads,Qualification Rate (%),Attributed Closed Revenue ($)");
      originAttribution.forEach((item) => {
        lines.push(
          `${escapeCell(item.name)},${escapeCell(item.folderName || "General")},${item.leadsCount},${item.qualifiedCount},${item.qualificationRate}%,$${item.revenue.toLocaleString()}`
        );
      });
      lines.push("");
    }

    // Compile CSV with UTF-8 BOM so Excel opens with proper encoding
    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanPeriod = (timeRange.period || "month").toLowerCase();
    const dateStamp = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `instance-analytics-${cleanPeriod}-${dateStamp}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  const categories = [
    "Overview & Growth",
    "Pipeline & Conversion",
    "Automations & Operations",
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Export Analytics Spreadsheet
              </h2>
              <p className="text-xs text-slate-500">
                Generate a structured Excel / CSV report from your live telemetry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Pill & Selection Controls */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Scope:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-bold font-mono">
              {timeRange.period ? timeRange.period.toUpperCase() : "30 DAYS"}
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              ({selectedIds.length} of {AVAILABLE_SECTIONS.length} components selected)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
            >
              {isAllSelected ? (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Select All ({AVAILABLE_SECTIONS.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Component Checklist Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {categories.map((category) => {
            const sections = AVAILABLE_SECTIONS.filter((s) => s.category === category);
            return (
              <div key={category} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sections.map((section) => {
                    const selected = selectedIds.includes(section.id);
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${selected
                            ? "bg-blue-50/50 border-blue-200 text-slate-900 shadow-2xs"
                            : "bg-slate-50/40 border-slate-200/60 text-slate-500 hover:bg-slate-50"
                          }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center shrink-0 transition-colors ${selected
                              ? "bg-blue-600 text-white"
                              : "border border-slate-300 bg-white"
                            }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 ${selected ? "text-blue-600" : "text-slate-400"
                                }`}
                            />
                            <span className="text-xs font-bold truncate">
                              {section.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {section.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 font-medium">
            Format: Standard RFC 4180 Excel / CSV (.csv)
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
