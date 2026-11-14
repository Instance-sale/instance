"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Calendar,
  Check,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Folder,
  Instagram,
  Layers,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Sparkles,
  Tag,
  Target,
  User,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Lead, PipelineConfig } from "./types";
import { formatDate, formatFollowers } from "./helpers";

interface LeadProfileDrawerProps {
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  basePath?: string;
  pipelineConfig: PipelineConfig;
  handleUpdateStatus: (leadId: string, status: string) => Promise<void>;
  handleAddTag: (leadId: string, tag: string) => Promise<void>;
  handleRemoveTag: (leadId: string, tag: string) => Promise<void>;
  handleDmClick: (lead: Lead) => void;
  copiedId: string | null;
  setCopiedId: (id: string | null) => void;
  copyTextToClipboard: (text: string, id: string) => void;
}

export function LeadProfileDrawer({
  selectedLead,
  setSelectedLead,
  basePath,
  pipelineConfig,
  handleUpdateStatus,
  handleAddTag,
  handleRemoveTag,
  handleDmClick,
  copiedId,
  setCopiedId,
  copyTextToClipboard,
}: LeadProfileDrawerProps) {
  return (
    <AnimatePresence>
      {selectedLead && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLead(null)}
            className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white/95 backdrop-blur-2xl border-l border-slate-200 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lead Inspection
                </span>
                <div className="flex items-center gap-2">
                  
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Profile Identity */}
              <div className="py-5 flex items-start gap-4">
                <div className="relative shrink-0">
                  {selectedLead.profilePictureUrl ? (
                    <img
                      src={selectedLead.profilePictureUrl}
                      alt={selectedLead.username || ''}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-200/80 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                      {selectedLead.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-100">
                    <Instagram size={12} className="text-pink-600" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display truncate">
                    {selectedLead.fullName || selectedLead.username}
                  </h2>
                  <a
                    href={`https://instagram.com/${selectedLead.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-medium"
                  >
                    @{selectedLead.username} <ArrowUpRight size={11} />
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 tnum">
                      {selectedLead.followersCount?.toLocaleString() || 0}
                    </span>
                    <span className="text-xs text-slate-400">followers</span>
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider border",
                      selectedLead.firstInteractionType === 'DM'
                        ? "bg-sky-50 text-sky-700 border-sky-200/60"
                        : selectedLead.firstInteractionType === 'FOLLOW'
                          ? "bg-violet-50 text-violet-700 border-violet-200/60"
                          : selectedLead.firstInteractionType === 'COMMENT'
                            ? "bg-amber-50 text-amber-700 border-amber-200/60"
                            : selectedLead.firstInteractionType === 'STORY' || selectedLead.firstInteractionType === 'STORY_REPLY' || selectedLead.firstInteractionType === 'STORY_MENTION'
                              ? "bg-rose-50 text-rose-700 border-rose-200/60"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {selectedLead.firstInteractionType === 'STORY' || selectedLead.firstInteractionType === 'STORY_REPLY' || selectedLead.firstInteractionType === 'STORY_MENTION'
                        ? 'Story'
                        : selectedLead.firstInteractionType === 'COMMENT'
                          ? 'Comment'
                          : selectedLead.firstInteractionType === 'FOLLOW'
                            ? 'Follow'
                            : selectedLead.firstInteractionType || 'DM'}
                    </span>
                  </div>

                  {/* Direct Stage / Status Switcher Dropdown */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Stage:
                    </span>
                    <select
                      value={selectedLead.status || 'New'}
                      onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-xs"
                    >
                      {[...pipelineConfig.customStatuses, 'Follow-up Due'].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Origin Automation & Folder */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Origin:
                    </span>
                    {selectedLead.originAutomation ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-medium shadow-2xs">
                        <Folder size={12} className="text-indigo-500 shrink-0" />
                        <span className="text-slate-600 font-normal">{selectedLead.originAutomation.folderName || 'Default Folder'}</span>
                        <span className="text-indigo-300">/</span>
                        <Zap size={12} className="text-indigo-600 shrink-0" />
                        <span className="font-semibold text-indigo-900 truncate max-w-[170px]">{selectedLead.originAutomation.automationName}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-xs text-slate-600 font-medium">
                        <Zap size={12} className="text-slate-400 shrink-0" />
                        <span>
                          {selectedLead.firstInteractionType === 'COMMENT'
                            ? 'Post Comment / Inbound Lead'
                            : selectedLead.firstInteractionType === 'STORY' || selectedLead.firstInteractionType === 'STORY_REPLY' || selectedLead.firstInteractionType === 'STORY_MENTION'
                              ? 'Instagram Story / Inbound Lead'
                              : selectedLead.firstInteractionType === 'FOLLOW'
                                ? 'New Follower / Inbound Lead'
                                : 'Direct DM / Inbound Lead'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Audience List Project Assignment */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Audience List:
                    </span>
                    {selectedLead.primaryAudienceList || (selectedLead.audienceLists && selectedLead.audienceLists.length > 0) ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-xs text-blue-700 font-bold shadow-2xs">
                        <Layers size={12} className="text-blue-500 shrink-0" />
                        <span>{selectedLead.primaryAudienceList?.name || selectedLead.audienceLists?.[0]?.name}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-xs text-slate-500 font-medium">
                        <Layers size={12} className="text-slate-400 shrink-0" />
                        <span>General Inbound</span>
                      </div>
                    )}
                  </div>

                  {/* Captured Contact Credentials (Emails & Phones) */}
                  {((selectedLead.emails && selectedLead.emails.length > 0) ||
                    (selectedLead.phoneNumbers && selectedLead.phoneNumbers.length > 0) ||
                    selectedLead.email ||
                    selectedLead.phone) && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                          Captured Contact Credentials
                        </span>
                        <div className="space-y-1">
                          {Array.from(new Set([...(selectedLead.emails || []), ...(selectedLead.email ? [selectedLead.email] : [])])).map((em, idx) => (
                            <div key={`lead-em-${idx}`} className="flex items-center justify-between text-xs text-slate-700 font-medium">
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">{em}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(em);
                                  setCopiedId(`em-${idx}`);
                                  setTimeout(() => setCopiedId(null), 1500);
                                }}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title="Copy email"
                              >
                                {copiedId === `em-${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ))}
                          {Array.from(new Set([...(selectedLead.phoneNumbers || []), ...(selectedLead.phone ? [selectedLead.phone] : [])])).map((ph, idx) => (
                            <div key={`lead-ph-${idx}`} className="flex items-center justify-between text-xs text-slate-700 font-medium">
                              <div className="flex items-center gap-1.5 truncate">
                                <Phone size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">{ph}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(ph);
                                  setCopiedId(`ph-${idx}`);
                                  setTimeout(() => setCopiedId(null), 1500);
                                }}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title="Copy phone"
                              >
                                {copiedId === `ph-${idx}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Feature 6: Dynamic Visual Deal Milestones Stepper (Automation-Origin Aware) */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {(() => {
                      const customAutomationStages = selectedLead.originAutomation?.selectedStages || (selectedLead as any)?.aiAgentConfig?.selectedPipelineStages;
                      const hasCustomOrigin = Array.isArray(customAutomationStages) && customAutomationStages.length > 0;
                      const activeStages: string[] = hasCustomOrigin
                        ? customAutomationStages
                        : Array.from(new Set(['New', ...pipelineConfig.customStatuses, 'Closed Won']));
                      const currentStatus = selectedLead.status || 'New';
                      const currentStageIndex = activeStages.findIndex((s) => s.toLowerCase() === currentStatus.toLowerCase());

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Deal Milestones</span>
                              {hasCustomOrigin && (
                                <span className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-0.5" title="Custom stages from originating automation flow">
                                  <Zap size={9} /> Custom ({activeStages.length})
                                </span>
                              )}
                            </div>
                            <select
                              value={currentStatus}
                              onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value)}
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-semibold text-blue-700 focus:outline-none cursor-pointer"
                            >
                              {activeStages.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-1">
                            {activeStages.map((stageName: string, idx: number) => {
                              const isPassed = currentStageIndex > -1 && idx < currentStageIndex;
                              const isCurrent = stageName.toLowerCase() === currentStatus.toLowerCase() || (currentStageIndex === -1 && idx === 0);
                              const isWon = stageName.toLowerCase() === 'closed won';

                              return (
                                <button
                                  key={stageName}
                                  type="button"
                                  onClick={() => handleUpdateStatus(selectedLead.id, stageName)}
                                  className={cn(
                                    "w-full text-left p-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between group cursor-pointer border",
                                    isCurrent
                                      ? isWon
                                        ? "bg-emerald-50 text-emerald-950 border-emerald-300 shadow-2xs font-bold ring-2 ring-emerald-200/50"
                                        : "bg-blue-50 text-blue-950 border-blue-300 shadow-2xs font-bold ring-2 ring-blue-200/50"
                                      : isPassed
                                        ? "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-100"
                                        : "bg-white/60 text-slate-400 border-dashed border-slate-200 hover:text-slate-700 hover:bg-white"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold transition-all",
                                      isCurrent
                                        ? isWon
                                          ? "bg-emerald-600 text-white animate-pulse"
                                          : "bg-blue-600 text-white animate-pulse"
                                        : isPassed
                                          ? "bg-emerald-500 text-white"
                                          : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                                    )}>
                                      {isPassed || (isCurrent && isWon) ? (
                                        <Check size={11} className="stroke-[3]" />
                                      ) : (
                                        <span>{idx + 1}</span>
                                      )}
                                    </div>
                                    <span className="truncate">{stageName}</span>
                                  </div>
                                  {isCurrent && (
                                    <span className={cn(
                                      "text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 rounded",
                                      isWon ? "bg-emerald-200/70 text-emerald-900" : "bg-blue-200/70 text-blue-900"
                                    )}>
                                      Active
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Tags Management Section - Strictly Company Tags Only */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-xs mb-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Tag size={13} className="text-blue-600" /> Lead Tags
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedLead.tags?.length || 0} active
                  </span>
                </div>

                {/* Current Tags Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {selectedLead.tags && selectedLead.tags.length > 0 ? (
                    selectedLead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/60"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(selectedLead.id, tag)}
                          className="text-blue-400 hover:text-blue-700 p-0.5 rounded-full transition-colors cursor-pointer"
                          title={`Remove #${tag}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No tags assigned to this lead yet.</p>
                  )}
                </div>

                {/* Add from Company Tags created in Settings */}
                {pipelineConfig.customTags.some((t) => !selectedLead.tags?.includes(t)) ? (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Add from Company Tags:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {pipelineConfig.customTags
                        .filter((t) => !selectedLead.tags?.includes(t))
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddTag(selectedLead.id, tag)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={11} /> {tag}
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">
                    All company tags assigned.
                  </p>
                )}
                <p className="text-[10px] text-slate-400 italic">
                  Note: Tags are configured globally in Settings. Custom tags cannot be created from the CRM.
                </p>
              </div>

              {/* Bio & Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Instagram Bio
                  </h4>
                  <p className="text-xs text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                    "{selectedLead.biography || 'No bio provided'}"
                  </p>
                </div>

                {selectedLead.website && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Website Link
                    </h4>
                    <a
                      href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline break-all"
                    >
                      {selectedLead.website} <ExternalLink size={11} />
                    </a>
                  </div>
                )}

                {/* Discovered Contact Info (All emails with copy) */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Discovered Contact Details
                  </h4>
                  <div className="space-y-1.5">
                    {selectedLead.emails && selectedLead.emails.length > 0 ? (
                      selectedLead.emails.map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="flex items-center gap-2 text-slate-700 font-medium">
                            <Mail size={13} className="text-blue-600" />
                            <a href={`mailto:${e}`} className="hover:underline text-slate-800">
                              {e}
                            </a>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyTextToClipboard(e, `drawer-email-${idx}`)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="Copy Email"
                          >
                            {copiedId === `drawer-email-${idx}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No email captured yet.</p>
                    )}
                    {selectedLead.phoneNumbers && selectedLead.phoneNumbers.length > 0 && (
                      selectedLead.phoneNumbers.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="flex items-center gap-2 text-slate-700 font-medium">
                            <Phone size={13} className="text-emerald-600" /> {p}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyTextToClipboard(p, `drawer-phone-${idx}`)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="Copy Phone"
                          >
                            {copiedId === `drawer-phone-${idx}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDmClick(selectedLead)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <MessageSquare size={13} /> Direct Message
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
