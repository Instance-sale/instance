"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell } from "recharts";
import { ChevronDown, MessageSquare, Zap, Send, MessageCircle } from "lucide-react";
import { EngagementMetrics } from "@/lib/types/analytics";

const PERIOD_OPTIONS = [
  { key: "per-week", label: "Per Week" },
  { key: "per-month", label: "Per Month" },
] as const;

interface HeroEngagementChartProps {
  data: EngagementMetrics | null | undefined;
}

export default function HeroEngagementChart({ data }: HeroEngagementChartProps) {
  const [period, setPeriod] = useState<"per-week" | "per-month">("per-month");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chartData = useMemo(() => {
    const sent = data?.messagesSent || 0;
    const received = data?.messagesReceived || 0;
    const total = sent + received;
    const sentRate = total > 0 ? (sent / total) * 100 : 50;
    const receivedRate = total > 0 ? (received / total) * 100 : 50;
    return [
      { name: "Outbound Sent", value: sentRate, count: sent, color: "#2563eb", icon: Send },
      { name: "Inbound Received", value: receivedRate, count: received, color: "#10b981", icon: MessageCircle },
    ];
  }, [data]);

  const activeConversations = data?.activeConversations || 0;
  const currentLabel =
    PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? "Per Month";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md h-full flex flex-col justify-between">
      {/* Head */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Engagement Breakdown
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Outbound messages sent vs inbound replies
          </p>
        </div>

        {/* Period Selector */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Time range"
            aria-expanded={open}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer"
          >
            <span>{currentLabel}</span>
            <ChevronDown
              className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
              style={{ transform: open ? "rotate(180deg)" : undefined }}
            />
          </button>
          {open && (
            <ul
              role="listbox"
              className="absolute right-0 top-full mt-1.5 w-36 py-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 text-xs font-medium"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <li
                  key={opt.key}
                  role="option"
                  aria-selected={period === opt.key}
                  onClick={() => {
                    setPeriod(opt.key);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    period === opt.key
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Body: Donut + Legends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center py-4 flex-1">
        {/* Donut Chart */}
        <div className="relative w-full h-[180px] sm:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-xl border border-slate-200/80 text-slate-900">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="font-medium text-slate-600">{d.name}:</span>
                        <span className="font-bold font-mono text-slate-900">
                          {Number(d.value).toFixed(1)}%
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={false}
              />
              <Pie
                animationDuration={900}
                animationEasing="ease-out"
                data={chartData}
                dataKey="value"
                innerRadius="68%"
                outerRadius="92%"
                nameKey="name"
                paddingAngle={3}
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Stat */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {activeConversations}
            </p>
            <p className="text-[10px] sm:text-xs text-blue-600 font-bold uppercase tracking-wider">
              Active Chats
            </p>
          </div>
        </div>

        {/* Legend rows */}
        <div className="flex flex-col justify-center space-y-3">
          {chartData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {item.value.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Foot */}
      <div className="pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-medium">Avg Resolution Time</span>
        </div>
        <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 font-mono">
          {data?.averageResponseTime ?? 0} min
        </span>
      </div>
    </div>
  );
}
