"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";

interface PremiumBarChartProps {
  data: any[];
  title: string;
  description?: string;
  dataKey: string;
  categoryKey?: string;
  color?: string;
}

export default function PremiumBarChart({
  data,
  title,
  description,
  dataKey,
  categoryKey = "name",
  color = "#2563eb",
}: PremiumBarChartProps) {
  const gradientId = `barGrad-${title.replace(/\s+/g, "-")}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md h-full flex flex-col justify-between">
      {/* Head */}
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
          </div>
          {description && (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          )}
        </div>
      </div>

      {/* Bar Chart Canvas */}
      <div className="h-[250px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey={categoryKey}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              dy={8}
            />
            <Tooltip
              cursor={{ fill: "rgba(37, 99, 235, 0.04)" }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl bg-white text-slate-900 p-3 shadow-xl border border-slate-200/80">
                      <p className="text-[11px] font-medium text-slate-500 mb-1">
                        {label}
                      </p>
                      <p className="text-base font-bold font-mono text-blue-600">
                        {Number(payload[0].value).toLocaleString()} prospects
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey={dataKey}
              fill={`url(#${gradientId})`}
              radius={[6, 6, 0, 0]}
              barSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Foot */}
      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Pipeline throughput distribution</span>
        <span className="font-semibold text-blue-700 font-mono">
          Updated live
        </span>
      </div>
    </div>
  );
}
