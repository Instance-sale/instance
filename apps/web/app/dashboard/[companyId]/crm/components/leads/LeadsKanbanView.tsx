"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Instagram, MoreVertical, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lead, PipelineConfig } from "./types";
import { formatDate, formatFollowers } from "./helpers";

export interface KanbanColumnItem {
  id: string;
  name: string;
  dotColor: string;
  badgeColor: string;
  leads: Lead[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  isLocked: boolean;
}

interface LeadsKanbanViewProps {
  kanbanColumns: KanbanColumnItem[];
  draggedLeadId: string | null;
  setDraggedLeadId: (id: string | null) => void;
  handleDragStart: (leadId: string, e: React.DragEvent) => void;
  handleDropOnColumn: (targetStage: string, e: React.DragEvent) => void;
  handleColumnScroll: (stageName: string, e: React.UIEvent<HTMLDivElement>) => void;
  openActionLeadId: string | null;
  setOpenActionLeadId: (id: string | null) => void;
  setSelectedLead: (lead: Lead) => void;
  handleOpenInstagram: (lead: Lead) => void;
  handleDmClick: (lead: Lead) => void;
  handleUpdateStatus: (leadId: string, status: string) => Promise<void>;
  isUpdatingStatus: string | null;
  pipelineConfig: PipelineConfig;
  copiedId: string | null;
  copyTextToClipboard: (text: string, id: string) => void;
  fetchColumnLeads: (stageName: string, pageNum: number, append?: boolean) => Promise<void>;
}

export function LeadsKanbanView({
  kanbanColumns,
  draggedLeadId,
  setDraggedLeadId,
  handleDragStart,
  handleDropOnColumn,
  handleColumnScroll,
  openActionLeadId,
  setOpenActionLeadId,
  setSelectedLead,
  handleOpenInstagram,
  handleDmClick,
  handleUpdateStatus,
  isUpdatingStatus,
  pipelineConfig,
  copiedId,
  copyTextToClipboard,
  fetchColumnLeads,
}: LeadsKanbanViewProps) {
  return (
    <div
      className="overflow-x-auto pb-4 no-scrollbar"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div
        className="flex gap-4 items-start min-w-full"
        style={{
          minWidth: `${kanbanColumns.length * 310}px`,
        }}
      >
        {kanbanColumns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => handleDropOnColumn(col.name, e)}
            className={cn(
              "glass-panel p-3.5 flex flex-col min-h-[580px] max-h-[820px] bg-white/80 transition-all flex-1 min-w-[300px] border",
              draggedLeadId ? "border-dashed border-blue-300/80 bg-blue-50/10" : "border-slate-200/70"
            )}
          >
            {/* Column Head */}
            <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className={cn("w-2.5 h-2.5 rounded-full ring-3 ring-slate-200/50", col.dotColor)} />
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  {col.name}
                  {col.isLocked && (
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200/60">
                      Locked
                    </span>
                  )}
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 tnum">
                {col.total !== undefined ? col.total : col.leads.length}
              </span>
            </div>

            {/* Column Drop Notice on Drag */}
            {draggedLeadId && (
              <div className="mb-2 p-2 rounded-xl border border-dashed border-blue-400 bg-blue-50/50 text-center text-[11px] font-semibold text-blue-700 animate-pulse">
                Drop to move to {col.name}
              </div>
            )}

            {/* Column Cards with Independent Scroll */}
            <div
              onScroll={(e) => handleColumnScroll(col.name, e)}
              className="space-y-2.5 overflow-y-auto flex-1 pr-1 no-scrollbar"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {col.loading && col.leads.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-xs text-slate-400">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <span>Loading {col.name}...</span>
                </div>
              ) : col.leads.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200/70 rounded-2xl text-xs text-slate-400">
                  No leads in this stage
                  <p className="text-[10px] text-slate-300 mt-1">Drag and drop leads here</p>
                </div>
              ) : (
                col.leads.map((lead) => (
                  <motion.div
                    key={lead.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(lead.id, e as any)}
                    onDragEnd={() => setDraggedLeadId(null)}
                    onClick={() => setSelectedLead(lead)}
                    className={cn(
                      "glass-card p-3.5 hover:shadow-md cursor-grab active:cursor-grabbing border transition-all group relative",
                      draggedLeadId === lead.id
                        ? "opacity-50 border-blue-400 scale-[0.98]"
                        : "border-white hover:border-slate-300",
                      isUpdatingStatus === lead.id && "ring-2 ring-blue-500 animate-pulse"
                    )}
                  >
                    {/* Top Row: User Avatar, Name, 3-dot Menu */}
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="relative shrink-0">
                        {lead.profilePictureUrl ? (
                          <img
                            src={lead.profilePictureUrl}
                            alt={lead.username || ''}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                            {lead.username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-100">
                          <Instagram size={9} className="text-pink-600" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-slate-900 truncate">
                            {lead.fullName || lead.username}
                          </p>
                          {/* 3-Dot Action Menu Button */}
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionLeadId(openActionLeadId === lead.id ? null : lead.id)
                              }
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Actions"
                            >
                              <MoreVertical size={13} />
                            </button>

                            {/* 3-Dot Dropdown Menu */}
                            {openActionLeadId === lead.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                  Move Stage
                                </div>
                                {pipelineConfig.customStatuses.map((stage) => (
                                  <button
                                    key={stage}
                                    type="button"
                                    onClick={() => handleUpdateStatus(lead.id, stage)}
                                    className={cn(
                                      "w-full text-left px-3 py-1.5 hover:bg-blue-50 text-slate-700 flex items-center justify-between transition-colors",
                                      lead.status?.toLowerCase() === stage.toLowerCase() && "font-bold text-blue-700 bg-blue-50/60"
                                    )}
                                  >
                                    <span>{stage}</span>
                                    {lead.status?.toLowerCase() === stage.toLowerCase() && (
                                      <Check size={12} className="text-blue-600" />
                                    )}
                                  </button>
                                ))}
                                <div className="h-px bg-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLead(lead);
                                    setOpenActionLeadId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-medium"
                                >
                                  Inspect Full Lead
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDmClick(lead);
                                    setOpenActionLeadId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-blue-600 font-medium flex items-center justify-between"
                                >
                                  <span>Direct Message</span>
                                  <ArrowUpRight size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 truncate">
                          @{lead.username}
                        </p>
                      </div>
                    </div>

                    {/* Bio snippet */}
                    <p className="text-[11.5px] text-slate-600 line-clamp-2 leading-relaxed mb-2">
                      {lead.biography || "No bio details recorded."}
                    </p>

                    {/* Tags Preview Pills */}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mb-2">
                        {lead.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/60"
                          >
                            #{tag}
                          </span>
                        ))}
                        {lead.tags.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            +{lead.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {lead.originAutomation && (
                      <div className="flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50/80 border border-indigo-100/90 px-2 py-0.5 rounded-md mb-2 truncate">
                        <Zap size={10} className="text-indigo-600 shrink-0" />
                        <span className="font-semibold truncate">
                          {lead.originAutomation.folderName ? `${lead.originAutomation.folderName} / ` : ''}{lead.originAutomation.automationName}
                        </span>
                      </div>
                    )}

                    {/* Score & Actions Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider border",
                          lead.firstInteractionType === 'DM'
                            ? "bg-sky-50 text-sky-700 border-sky-200/60"
                            : lead.firstInteractionType === 'FOLLOW'
                              ? "bg-violet-50 text-violet-700 border-violet-200/60"
                              : lead.firstInteractionType === 'COMMENT'
                                ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                : lead.firstInteractionType === 'STORY' || lead.firstInteractionType === 'STORY_REPLY' || lead.firstInteractionType === 'STORY_MENTION'
                                  ? "bg-rose-50 text-rose-700 border-rose-200/60"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {lead.firstInteractionType === 'STORY' || lead.firstInteractionType === 'STORY_REPLY' || lead.firstInteractionType === 'STORY_MENTION'
                            ? 'Story'
                            : lead.firstInteractionType === 'COMMENT'
                              ? 'Comment'
                              : lead.firstInteractionType === 'FOLLOW'
                                ? 'Follow'
                                : lead.firstInteractionType || 'DM'}
                        </span>
                        <span className="text-slate-400 tnum">
                          {formatFollowers(lead.followersCount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDmClick(lead);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          DM <ArrowUpRight size={11} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}

              {/* Loading more spinner / Load more button */}
              {col.loadingMore && (
                <div className="py-2 text-center flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
              {col.hasMore && !col.loadingMore && (
                <button
                  type="button"
                  onClick={() => fetchColumnLeads(col.name, (col.page || 1) + 1, true)}
                  className="w-full py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-dashed border-blue-200 transition-all cursor-pointer mt-1"
                >
                  Load more ({col.leads.length} of {col.total})
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
