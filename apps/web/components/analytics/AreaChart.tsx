"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ConversionMetrics } from "@/lib/types/analytics";
import { GitBranch, Clock, Percent } from "lucide-react";

interface PremiumAreaChartProps {
  data: ConversionMetrics | null | undefined;
}

export default function PremiumAreaChart({ data }: PremiumAreaChartProps) {
  const hasData = (data?.overallConversionRate ?? 0) > 0 || (data?.leadToQualified ?? 0) > 0;
  const chartData = [
    { stage: "Leads", value: hasData ? 100 : 0, label: "Total Leads" },
    { stage: "Qualified", value: data?.leadToQualified ?? 0, label: "Qualified Stage" },
    { stage: "Closed", value: data?.overallConversionRate ?? 0, label: "Deals Won" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md h-full flex flex-col justify-between">
      {/* Head */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Conversion Velocity
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Stage-by-stage qualification conversion rates
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold font-mono">
          <Percent className="w-3 h-3" />
          <span>{data?.overallConversionRate ?? 0}% Net</span>
        </div>
      </div>

      {/* Area Chart */}
      <div className="h-[210px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="brandBlueConversion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="stage"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              dy={8}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl bg-white text-slate-900 p-3 shadow-xl border border-slate-200/80">
                      <p className="text-[11px] font-medium text-slate-500 mb-1">
                        {label} Stage
                      </p>
                      <p className="text-base font-bold font-mono text-blue-600">
                        {payload[0].value}% Conversion
                      </p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ stroke: "#2563eb", strokeWidth: 1.5, strokeDasharray: "2 2" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#brandBlueConversion)"
              activeDot={{
                r: 5,
                fill: "#ffffff",
                stroke: "#2563eb",
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom KPI Highlights */}
      <div className="grid grid-cols-2 gap-3 pt-3.5 mt-2 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/60">
          <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold">
            %
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Overall Rate
            </p>
            <p className="text-sm font-extrabold text-blue-900 font-mono">
              {data?.overallConversionRate ?? 0}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100/60">
          <div className="w-8 h-8 rounded-lg bg-indigo-100/70 text-indigo-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Avg Sales Cycle
            </p>
            <p className="text-sm font-extrabold text-indigo-900 font-mono">
              {data?.averageSalesCycleLength ?? 0} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
