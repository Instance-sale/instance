"use client";

import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface PremiumLineChartProps {
  data?: {
    dates?: string[];
    values?: number[];
  };
  metric: string;
}

export default function PremiumLineChart({ data, metric }: PremiumLineChartProps) {
  const chartData = useMemo(() => {
    return (data?.dates || []).map((date, i) => ({
      label: date,
      value: data?.values?.[i] || 0,
    }));
  }, [data]);

  const trend =
    chartData.length > 1
      ? ((chartData[chartData.length - 1].value - chartData[0].value) /
          (chartData[0].value || 1)) *
        100
      : 0;

  const isPositive = trend >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md h-full flex flex-col justify-between">
      {/* Head */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Growth Velocity
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 capitalize">
            Daily {metric} trajectory over active window
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
            isPositive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
        </span>
      </div>

      {/* Chart Canvas */}
      <div className="h-[250px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="brandBlueLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#f1f5f9"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              minTickGap={25}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              dx={-6}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl bg-white text-slate-900 p-3 shadow-xl border border-slate-200/80">
                      <p className="text-[11px] font-medium text-slate-500 mb-1">
                        {label}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="text-base font-bold font-mono text-slate-900">
                          {Number(payload[0].value).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">
                          {metric}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ stroke: "#2563eb", strokeWidth: 1.5, strokeDasharray: "2 2" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="url(#brandBlueLineGrad)"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: "#ffffff",
                stroke: "#2563eb",
                strokeWidth: 3,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Foot */}
      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Smoothed dynamic trendline</span>
        <span className="font-semibold text-blue-700 font-mono">
          {chartData.length} data points
        </span>
      </div>
    </div>
  );
}
