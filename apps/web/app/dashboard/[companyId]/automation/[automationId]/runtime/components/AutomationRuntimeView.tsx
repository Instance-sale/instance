"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Activity,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Bot,
  Zap,
  SlidersHorizontal,
  Code2,
  Calendar,
} from "lucide-react";

interface ExecutionStep {
  id: string;
  nodeId: string;
  status: string;
  input: any;
  output: any;
  errorMessage?: string | null;
  executedAt: string;
}

interface Execution {
  id: string;
  automationId: string;
  instagramUserId: string;
  conversationId?: string | null;
  status: "COMPLETED" | "FAILED" | "RUNNING" | "PENDING" | "CANCELLED";
  currentNodeId?: string | null;
  variables?: any;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
  steps: ExecutionStep[];
  userProfile?: {
    username?: string;
    fullName?: string;
    profilePictureUrl?: string;
  } | null;
}

interface AutomationRuntimeViewProps {
  automation: {
    id: string;
    name: string;
    triggerType: string;
    isActive: boolean;
    nodes?: any[];
  };
  basePath: string;
}

export default function AutomationRuntimeView({
  automation,
  basePath,
}: AutomationRuntimeViewProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedExecutionIds, setExpandedExecutionIds] = useState<Record<string, boolean>>({});
  const [showRawJsonMap, setShowRawJsonMap] = useState<Record<string, boolean>>({});

  const fetchExecutions = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/automations/${automation.id}/executions?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setExecutions(data.executions || []);
        // Automatically expand the first run if available
        if (data.executions && data.executions.length > 0) {
          setExpandedExecutionIds((prev) => ({
            ...prev,
            [data.executions[0].id]: true,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load executions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [automation.id]);

  const toggleExpand = (id: string) => {
    setExpandedExecutionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleRawJson = (id: string) => {
    setShowRawJsonMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered list
  const filteredExecutions = useMemo(() => {
    return executions.filter((exec) => {
      // Status filter
      if (selectedStatus !== "ALL" && exec.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const usernameMatch = exec.userProfile?.username?.toLowerCase().includes(q);
        const nameMatch = exec.userProfile?.fullName?.toLowerCase().includes(q);
        const userIdMatch = exec.instagramUserId.toLowerCase().includes(q);
        const errorMatch = exec.errorMessage?.toLowerCase().includes(q);
        return usernameMatch || nameMatch || userIdMatch || errorMatch;
      }
      return true;
    });
  }, [executions, selectedStatus, searchQuery]);

  // Stats calculation
  const totalRuns = executions.length;
  const successfulRuns = executions.filter((e) => e.status === "COMPLETED").length;
  const failedRuns = executions.filter((e) => e.status === "FAILED").length;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 100;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-0 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Navigation & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link
                href={`${basePath}/automation`}
                className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Automations
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-semibold">{automation.name}</span>
              <span>/</span>
              <span className="text-blue-600 font-medium">Runtime Logs</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Runtime Execution History
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  automation.isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {automation.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Detailed step-by-step logs of every message, condition, and action triggered by this automation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchExecutions}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh Logs</span>
            </button>
            <Link
              href={`${basePath}/automation/${automation.id}`}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-200 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Editor</span>
            </Link>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1.5 text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Total Executions</span>
              <Play className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalRuns}</div>
            <div className="text-xs text-slate-400 mt-0.5">Recorded runs</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1.5 text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Success Rate</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{successRate}%</div>
            <div className="text-xs text-emerald-600 mt-0.5 font-medium">{successfulRuns} successful</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1.5 text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Failed Runs</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{failedRuns}</div>
            <div className="text-xs text-slate-400 mt-0.5">{failedRuns === 0 ? "No errors" : "Requires attention"}</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1.5 text-slate-500">
              <span className="text-xs font-medium uppercase tracking-wider">Trigger Type</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {automation.triggerType.replace(/_/g, " ")}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Active trigger</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          {/* Status tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 w-full sm:w-auto">
            {[
              { id: "ALL", label: "All Runs", count: totalRuns },
              { id: "COMPLETED", label: "Completed", count: successfulRuns },
              { id: "FAILED", label: "Failed", count: failedRuns },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedStatus === tab.id ? "bg-white text-blue-700 font-bold shadow-xs border border-blue-100/80" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"}`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user or keyword..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Execution Logs List */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Loading runtime logs...</p>
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600 shadow-inner">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {executions.length === 0 ? "No runs recorded yet" : "No runs match your filter"}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                {executions.length === 0
                  ? "When your Instagram audience interacts with your triggers, every executed step, message sent, and condition check will be recorded here in real time."
                  : "Try clearing your search query or changing the status filter to see other execution logs."}
              </p>
            </div>
            {executions.length === 0 && (
              <div className="pt-2">
                <Link
                  href={`${basePath}/automation/${automation.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                >
                  <Play className="w-3.5 h-3.5" />
                  Test Flow in Preview Simulator
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExecutions.map((exec, index) => {
              const runNumber = executions.length - index;
              const isExpanded = !!expandedExecutionIds[exec.id];
              const showRaw = !!showRawJsonMap[exec.id];
              const isSuccess = exec.status === "COMPLETED";
              const isFailed = exec.status === "FAILED";

              const startTime = new Date(exec.startedAt);
              const formattedDate = startTime.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedTime = startTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <div
                  key={exec.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                    isExpanded ? "border-blue-300 ring-2 ring-blue-500/10 shadow-md" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleExpand(exec.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSuccess
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : isFailed
                            ? "bg-red-50 text-red-600 border border-red-100"
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isFailed ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <Activity className="w-5 h-5 animate-pulse" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            Run #{runNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isSuccess
                                ? "bg-emerald-100 text-emerald-700"
                                : isFailed
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {exec.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formattedDate} at {formattedTime}
                          </span>
                          {exec.userProfile?.username && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <User className="w-3 h-3 text-blue-500" />
                              @{exec.userProfile.username}
                            </span>
                          )}
                          {!exec.userProfile?.username && exec.instagramUserId && (
                            <span className="text-slate-400 font-mono text-[11px]">
                              ID: {exec.instagramUserId.slice(0, 10)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                        {exec.steps?.length || 0} steps executed
                      </span>
                      <div className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Step-by-Step Execution Breakdown */}
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-6 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
                      {/* Error Banner if execution failed */}
                      {exec.errorMessage && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
                          <XCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                          <div>
                            <span className="font-bold">Execution Error: </span>
                            <span>{exec.errorMessage}</span>
                          </div>
                        </div>
                      )}

                      {/* Chronological Steps */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Execution Steps Timeline ({exec.steps?.length || 0})
                          </h4>
                          <button
                            type="button"
                            onClick={() => toggleRawJson(exec.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            <span>{showRaw ? "Hide Raw JSON" : "View Raw Payload"}</span>
                          </button>
                        </div>

                        {exec.steps && exec.steps.length > 0 ? (
                          <div className="space-y-2.5 relative pl-4 sm:pl-6 before:content-[''] before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                            {exec.steps.map((step, sIdx) => {
                              const stepDate = new Date(step.executedAt);
                              const stepTime = stepDate.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              });

                              const stepInput = step.input as any;
                              const stepOutput = step.output as any;

                              // Detect step kind
                              const isDM =
                                step.nodeId.includes("dm") ||
                                stepOutput?.message ||
                                stepInput?.message;

                              return (
                                <div
                                  key={step.id || sIdx}
                                  className="relative bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2"
                                >
                                  {/* Step Node Marker */}
                                  <div className="absolute -left-[22px] sm:-left-[30px] top-4 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white" />

                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800">
                                        Step {sIdx + 1}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px]">
                                        {step.nodeId}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                          step.status === "SUCCESS" || step.status === "COMPLETED"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-amber-50 text-amber-600"
                                        }`}
                                      >
                                        {step.status}
                                      </span>
                                    </div>
                                    <span className="text-slate-400 text-[11px] font-mono">
                                      {stepTime}
                                    </span>
                                  </div>

                                  {/* Step Content: Message sent or action executed */}
                                  {(stepOutput?.message || stepInput?.message) && (
                                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>Sent Message:</span>
                                      </div>
                                      <p className="text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                                        {stepOutput?.message || stepInput?.message}
                                      </p>
                                      {/* Buttons if included */}
                                      {(stepOutput?.buttons || stepInput?.buttons) && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                          {(stepOutput?.buttons || stepInput?.buttons).map(
                                            (b: any, bIdx: number) => (
                                              <span
                                                key={bIdx}
                                                className="px-2.5 py-1 bg-white border border-blue-200 text-blue-700 text-[11px] font-semibold rounded-lg shadow-xs"
                                              >
                                                {typeof b === "string" ? b : b.title || b.text}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Error message in step */}
                                  {step.errorMessage && (
                                    <p className="text-xs text-red-600 font-medium">
                                      Error: {step.errorMessage}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                            Trigger recorded. Single-step execution completed.
                          </div>
                        )}
                      </div>

                      {/* Raw JSON Debug Viewer */}
                      {showRaw && (
                        <div className="mt-3 p-4 bg-slate-900 rounded-xl text-slate-100 text-xs font-mono overflow-x-auto max-h-80">
                          <pre>{JSON.stringify(exec, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
