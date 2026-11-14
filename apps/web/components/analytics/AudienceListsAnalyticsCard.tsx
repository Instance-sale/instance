"use client";

import { useState, useEffect } from "react";
import { Users2, Mail, Phone, ArrowUpRight, Layers } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface AudienceListMetric {
  id: string;
  name: string;
  color: string;
  isPinned: boolean;
  totalContacts: number;
  emailCount: number;
  phoneCount: number;
}

const COLOR_BAR_MAP: Record<string, string> = {
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  slate: "bg-slate-500",
};

export default function AudienceListsAnalyticsCard() {
  const [lists, setLists] = useState<AudienceListMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useParams();

  const companyId = params?.companyId as string;
  const basePath = `/dashboard/${companyId}`;

  useEffect(() => {
    fetch("/api/audience-lists")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLists(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalContactsAcrossLists = lists.reduce((acc, l) => acc + (l.totalContacts || 0), 0);
  const totalEmailsAcrossLists = lists.reduce((acc, l) => acc + (l.emailCount || 0), 0);
  const totalPhonesAcrossLists = lists.reduce((acc, l) => acc + (l.phoneCount || 0), 0);

  if (loading) {
    return (
      <div className="glass-card p-6 h-64 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200" />
          <div className="w-32 h-3 bg-slate-200 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-xs">
            <Users2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Audience Lists & Campaign Growth
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of captured prospects across product segments
            </p>
          </div>
        </div>

        <Link
          href={`${basePath}/audience-lists`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100/70 transition-colors w-fit cursor-pointer"
        >
          <span>Manage Lists</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Top High-Level Metrics Pill Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total List Subscribers
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-display tnum">
            {totalContactsAcrossLists.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Across {lists.length} active lists
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">
              Verified Inboxes
            </span>
            <Mail size={13} className="text-emerald-600" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 font-display tnum">
            {totalEmailsAcrossLists.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-700 block mt-0.5">
            {totalContactsAcrossLists > 0
              ? `${Math.round((totalEmailsAcrossLists / totalContactsAcrossLists) * 100)}% email capture yield`
              : "0% yield"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-sky-50/40 border border-sky-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-sky-800">
              Phone Destinations
            </span>
            <Phone size={13} className="text-sky-600" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 font-display tnum">
            {totalPhonesAcrossLists.toLocaleString()}
          </span>
          <span className="text-[11px] text-sky-700 block mt-0.5">
            {totalContactsAcrossLists > 0
              ? `${Math.round((totalPhonesAcrossLists / totalContactsAcrossLists) * 100)}% phone capture yield`
              : "0% yield"}
          </span>
        </div>
      </div>

      {/* List Breakdown Rows */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Subscribers by Project List
        </span>

        {lists.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Layers size={20} className="text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Audience Lists created yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Create product lists to start segmenting your incoming leads automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {lists.map((list) => {
              const percentage =
                totalContactsAcrossLists > 0
                  ? Math.round((list.totalContacts / totalContactsAcrossLists) * 100)
                  : 0;
              const barColor = COLOR_BAR_MAP[list.color] || COLOR_BAR_MAP.blue;

              return (
                <div
                  key={list.id}
                  className="p-3 rounded-2xl bg-slate-50/60 border border-slate-200/70 hover:bg-slate-50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full", barColor)} />
                      <span className="font-bold text-slate-900">{list.name}</span>
                      {list.isPinned && (
                        <span className="text-[9.5px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          Pinned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-medium">
                        {list.emailCount} emails • {list.phoneCount} phones
                      </span>
                      <span className="font-mono font-bold text-slate-800 tnum">
                        {list.totalContacts} ({percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", barColor)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
