"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Play,
  MoreVertical,
  Activity,
  CheckCircle,
  Clock,
  Trash2,
  Copy,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Terminal,
  Sparkles,
} from "lucide-react";
import { logger } from "@/lib/logger";

interface Automation {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  _count?: {
    executions: number;
  };
  stats?: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecution?: string;
    executions24h: number;
  };
}

interface AutomationListProps {
  automations: Automation[];
  folderId: string;
  basePath: string;
  onCreateAutomation: () => void;
  onDeleteAutomation?: (id: string) => Promise<void> | void;
  onDuplicateAutomation?: (id: string) => Promise<void> | void;
}

export default function AutomationList({
  automations,
  folderId: _folderId,
  basePath,
  onCreateAutomation,
  onDeleteAutomation,
  onDuplicateAutomation,
}: AutomationListProps) {
  const router = useRouter();
  const [automationsWithStats, setAutomationsWithStats] = useState<Automation[]>(automations);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [automationToDelete, setAutomationToDelete] = useState<Automation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAutomationsWithStats(automations);
  }, [automations]);

  // Close 3-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuId]);

  useEffect(() => {
    // Fetch stats for all automations
    const fetchStats = async () => {
      const statsPromises = automations.map(async (automation) => {
        try {
          const response = await fetch(`/api/automations/${automation.id}/stats`);
          if (response.ok) {
            const data = await response.json();
            return { ...automation, stats: data.stats };
          }
        } catch (error) {
          logger.error(`Failed to fetch stats for automation ${automation.id}:`, error);
        }
        return automation;
      });

      const automationsWithStatsData = await Promise.all(statsPromises);
      setAutomationsWithStats(automationsWithStatsData);
    };

    if (automations.length > 0) {
      fetchStats();
    }
  }, [automations]);

  // Calculate overall stats
  const overallStats = automationsWithStats.reduce(
    (acc, automation) => {
      if (automation.stats) {
        acc.totalExecutions += automation.stats.totalExecutions || 0;
        acc.successful += automation.stats.successfulExecutions || 0;
        acc.failed += automation.stats.failedExecutions || 0;
        acc.executions24h += automation.stats.executions24h || 0;
        acc.active += automation.isActive ? 1 : 0;
      }
      return acc;
    },
    { totalExecutions: 0, successful: 0, failed: 0, executions24h: 0, active: 0 }
  );

  const handleDeleteConfirm = async () => {
    if (!automationToDelete || !onDeleteAutomation) return;
    try {
      setIsDeleting(true);
      await onDeleteAutomation(automationToDelete.id);
      setAutomationToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6 lg:space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Automations</h2>
              <p className="text-slate-500 mt-1">Manage and monitor your automated workflows</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCreateAutomation}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 sm:px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Automation</span>
              </button>
            </div>
          </div>

          {/* Status Dashboard */}
          {automationsWithStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">Active</span>
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{overallStats.active}</span>
                  <span className="text-xs text-slate-400">/ {automationsWithStats.length}</span>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">24h Activity</span>
                  <Clock className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{overallStats.executions24h}</span>
                  <span className="text-xs text-emerald-600 font-medium">runs today</span>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">Success Rate</span>
                  <CheckCircle className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {overallStats.totalExecutions > 0
                      ? Math.round((overallStats.successful / overallStats.totalExecutions) * 100)
                      : 0}
                    %
                  </span>
                  <span className="text-xs text-slate-400">{overallStats.successful} ok</span>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">Total Runs</span>
                  <Play className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{overallStats.totalExecutions}</span>
                  <span className="text-xs text-slate-400">
                    {overallStats.failed > 0 && `${overallStats.failed} failed`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {automations.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                <Plus className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No automations yet</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Create your first automation to start handling Instagram interactions automatically.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onCreateAutomation}
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Choose Template</span>
                </button>
              </div>
            </div>
          ) : (
            /* Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {automationsWithStats.map((automation) => {
                const isMenuOpen = activeMenuId === automation.id;

                return (
                  <div
                    key={automation.id}
                    onClick={() => router.push(`${basePath}/automation/${automation.id}`)}
                    className="group relative flex flex-col p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Activity className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${automation.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                        >
                          {automation.isActive ? "Active" : "Inactive"}
                        </span>

                        {/* 3-Dot Action Button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : automation.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Automation options"
                            aria-label="Automation options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 z-30 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 animate-in fade-in zoom-in-95 duration-150"
                            >
                              <Link
                                href={`${basePath}/automation/${automation.id}`}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                <span>Open in Editor</span>
                              </Link>

                              <Link
                                href={`${basePath}/automation/${automation.id}/runtime`}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors"
                              >
                                <Terminal className="w-3.5 h-3.5 text-blue-500" />
                                <span>View Runtime Logs</span>
                              </Link>

                              {onDuplicateAutomation && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    onDuplicateAutomation(automation.id);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Duplicate</span>
                                </button>
                              )}

                              {onDeleteAutomation && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    setAutomationToDelete(automation);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors border-t border-slate-100 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete automation</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-900 text-lg mb-1 group-hover:text-blue-700 transition-colors">
                      {automation.name}
                    </h3>

                    <p className="text-sm text-slate-500 mb-6 line-clamp-2 min-h-[2.5rem]">
                      {automation.description || "No description provided."}
                    </p>

                    {/* Card Footer with Trigger and Interactive Clickable Runs Badge */}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700 capitalize">
                          {automation.triggerType.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Clickable Runs Pill redirects directly to /runtime */}
                      <Link
                        href={`${basePath}/automation/${automation.id}/runtime`}
                        onClick={(e) => e.stopPropagation()}
                        className="items-center px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 transition-all font-medium text-xs cursor-pointer shadow-xs"
                        title="Click to view execution logs and run history"
                      >
                        <Play className="w-3 h-3 text-blue-500 fill-blue-500/20" />
                        <span>{automation.stats?.executions24h ?? 0} runs today</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Automation Confirmation Modal */}
      {automationToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeleting) setAutomationToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete &ldquo;{automationToDelete.name}&rdquo;?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete this automation? Its flow configuration, triggers, nodes, and past execution logs will be permanently deleted.
                </p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAutomationToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Automation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
