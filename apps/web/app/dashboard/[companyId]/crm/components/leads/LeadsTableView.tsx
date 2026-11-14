"use client";

import React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Filter,
  Instagram,
  Mail,
  MessageSquare,
  Phone,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Lead, SortField } from "./types";
import { formatDate, formatFollowers } from "./helpers";

interface LeadsTableViewProps {
  leads: Lead[];
  loading: boolean;
  sortBy: SortField;
  handleSort: (field: SortField) => void;
  setSelectedLead: (lead: Lead) => void;
  handleOpenInstagram: (lead: Lead) => void;
  handleDmClick: (lead: Lead) => void;
  copiedId: string | null;
  copyTextToClipboard: (text: string, id: string) => void;
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  totalPages: number;
  limit: number;
  setLimit: (lim: number) => void;
  total: number;
}

export function LeadsTableView({
  leads,
  loading,
  sortBy,
  handleSort,
  setSelectedLead,
  handleOpenInstagram,
  handleDmClick,
  copiedId,
  copyTextToClipboard,
  page,
  setPage,
  totalPages,
  limit,
  setLimit,
  total,
}: LeadsTableViewProps) {
  return (
    <div className="glass-panel overflow-hidden border border-slate-200/80">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/70 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">
                <button
                  onClick={() => handleSort('username')}
                  className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  User Profile
                  <Filter size={10} className={sortBy === 'username' ? 'text-blue-600' : 'text-slate-300'} />
                </button>
              </th>
              <th className="py-3 px-4">Followers</th>
              <th className="py-3 px-4 min-w-[240px]">Bio & Tags</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/70">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="hover:bg-blue-50/40 transition-all cursor-pointer group"
              >
                {/* User Profile */}
                <td className="py-3.5 px-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {lead.profilePictureUrl ? (
                        <img
                          src={lead.profilePictureUrl}
                          alt={lead.username || ''}
                          className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white shadow-2xs group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-2xs">
                          {lead.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-100">
                        <Instagram size={10} className="text-pink-600" />
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                        {lead.fullName || lead.username}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        @{lead.username}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Followers */}
                <td className="py-3.5 px-4 text-xs font-semibold text-slate-700 tnum">
                  {formatFollowers(lead.followersCount)}
                </td>

                {/* Signals & Bio */}
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-1 max-w-sm">
                    <p className="text-xs text-slate-700 line-clamp-1 leading-snug">
                      {lead.biography || "No bio available"}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Array.isArray(lead.tags) && lead.tags.length > 0 ? (
                        lead.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/60"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200/60">
                          #lead
                        </span>
                      )}
                      {Array.isArray(lead.tags) && lead.tags.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          +{lead.tags.length - 3}
                        </span>
                      )}
                      {lead.website && (
                        <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200/60 flex items-center gap-0.5">
                          <ExternalLink size={8} /> site
                        </span>
                      )}
                      {lead.originAutomation && (
                        <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-200/60 flex items-center gap-1">
                          <Zap size={8} className="text-indigo-600 shrink-0" />
                          <span className="truncate max-w-[120px]">{lead.originAutomation.automationName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="py-3.5 px-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                    lead.status === 'Follow-up Due' || lead.status === 'Follow Up Due'
                      ? "bg-rose-50 text-rose-700 border-rose-200/60"
                      : lead.status?.toLowerCase() === 'qualified'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        : "bg-blue-50 text-blue-700 border-blue-200/60"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      lead.status === 'Follow-up Due' || lead.status === 'Follow Up Due'
                        ? "bg-rose-500"
                        : lead.status?.toLowerCase() === 'qualified'
                          ? "bg-emerald-500"
                          : "bg-blue-500"
                    )} />
                    {lead.status || 'New'}
                  </span>
                </td>

                {/* Channel Source */}
                <td className="py-3.5 px-4">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider border",
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
                      : lead.firstInteractionType || 'Unknown'}
                  </span>
                </td>

                {/* Contact Info Pills */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1">
                    {lead.emails && lead.emails.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyTextToClipboard(lead.emails![0], `email-${lead.id}`);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition-colors"
                        title={`Copy Email: ${lead.emails[0]}`}
                      >
                        {copiedId === `email-${lead.id}` ? <Check size={12} className="text-emerald-600" /> : <Mail size={12} />}
                      </button>
                    )}
                    {lead.phoneNumbers && lead.phoneNumbers.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyTextToClipboard(lead.phoneNumbers![0], `phone-${lead.id}`);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition-colors"
                        title={`Copy Phone: ${lead.phoneNumbers[0]}`}
                      >
                        {copiedId === `phone-${lead.id}` ? <Check size={12} className="text-emerald-600" /> : <Phone size={12} />}
                      </button>
                    )}
                    {(!lead.emails?.length && !lead.phoneNumbers?.length) && (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 sm:px-6 text-right">
                  <div className="inline-flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleDmClick(lead)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      <MessageSquare size={12} />
                      DM
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Ribbon */}
      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-3 bg-slate-50/70 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-2">
              Page <b className="text-slate-900 tnum">{page}</b> of <b className="text-slate-900 tnum">{totalPages}</b>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
