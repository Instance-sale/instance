"use client";

import React from "react";
import { Users, Clock } from "lucide-react";

interface LeadsStatsCardsProps {
  stats: {
    total: number;
    followUpCount?: number;
  };
}

export function LeadsStatsCards({ stats }: LeadsStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Total Prospects Card */}
      <div className="glass-card p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Prospects
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Users size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-display tnum">
            {stats.total.toLocaleString()}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Captured across Instagram channels</span>
        </div>
      </div>

      {/* Follow-up Due Card */}
      <div className="glass-card p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Follow-up Due
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-display tnum">
            {(stats.followUpCount ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Contacts awaiting follow-up action</span>
        </div>
      </div>
    </div>
  );
}
