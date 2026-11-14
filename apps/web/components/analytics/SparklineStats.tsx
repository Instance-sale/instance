"use client";

import React, { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { AnalyticsMetric } from "@/lib/types/analytics";
import {
  Users,
  CheckCircle2,
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Activity,
  Bot,
  UserCheck,
  Briefcase,
} from "lucide-react";

function generateSparklineData(value: number, trend: number) {
  const points = 12;
  const data: number[] = [];
  let current = value;

  for (let i = 0; i < points; i++) {
    data.unshift(current);
    const variance = value * 0.08;
    const trendFactor = (trend / 100) * value;
    current = current - (trendFactor / points) + (Math.random() * variance - variance / 2);
  }

  return data.map((val, i) => ({
    step: i,
    value: Math.max(0, Math.round(val)),
  }));
}

const METRIC_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
    iconBg: string;
    strokeColor: string;
    fillColor: string;
  }
> = {
  "Total Leads": {
    icon: Users,
    accentClass: "text-blue-600",
    iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    strokeColor: "#2563eb",
    fillColor: "rgba(37, 99, 235, 0.12)",
  },
  "Qualified Leads": {
    icon: CheckCircle2,
    accentClass: "text-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    strokeColor: "#059669",
    fillColor: "rgba(5, 150, 105, 0.12)",
  },
  Revenue: {
    icon: DollarSign,
    accentClass: "text-blue-700",
    iconBg: "bg-blue-50 text-blue-700 border-blue-200",
    strokeColor: "#1d4ed8",
    fillColor: "rgba(29, 78, 216, 0.14)",
  },
  "Deals Closed": {
    icon: Target,
    accentClass: "text-indigo-600",
    iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
    strokeColor: "#4f46e5",
    fillColor: "rgba(79, 70, 229, 0.12)",
  },
};

interface SparklineStatsProps {
  metrics: AnalyticsMetric[];
}

export default function SparklineStats({ metrics }: SparklineStatsProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5">
        {metrics.map((m, i) => (
          <SparkCard key={m.label} metric={m} index={i} isInView={isInView} />
        ))}
      </div>
    </section>
  );
}

function SparkCard({
  metric,
  index,
  isInView,
}: {
  metric: AnalyticsMetric;
  index: number;
  isInView: boolean;
}) {
  const isPositive = metric.change >= 0;
  const config =
    METRIC_CONFIG[metric.label] || {
      icon: Activity,
      accentClass: "text-blue-600",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
      strokeColor: "#2563eb",
      fillColor: "rgba(37, 99, 235, 0.12)",
    };

  const Icon = config.icon;
  const numericVal = typeof metric.value === "number" ? metric.value : 0;
  const chartData = useMemo(() => {
    if (Array.isArray(metric.sparklineData) && metric.sparklineData.length > 0) {
      return metric.sparklineData.map((val, i) => ({
        step: i,
        value: Math.max(0, Math.round(val)),
      }));
    }
    return generateSparklineData(numericVal, metric.change);
  }, [numericVal, metric.change, metric.sparklineData]);

  const gradientId = `spark-grad-${metric.label.replace(/\s+/g, "-")}-${index}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md group flex flex-col justify-between"
    >
      <div>
        {/* Top Header: Icon badge, Label, Arrow Link */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${config.iconBg}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600 tracking-wide">
              {metric.label}
            </span>
          </div>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Main Metric Value */}
        <div className="flex items-baseline gap-1 mt-1">
          {metric.unit === "$" && (
            <span className="text-xl sm:text-2xl font-bold text-slate-500 font-mono">
              $
            </span>
          )}
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            {numericVal.toLocaleString()}
          </span>
          {metric.unit && metric.unit !== "$" && (
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
              {metric.unit}
            </span>
          )}
        </div>

        {/* Delta pill & comparison note */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
              isPositive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
            ) : (
              <TrendingDown className="w-3 h-3 stroke-[2.5]" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {metric.change}%
            </span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            vs previous period
          </span>
        </div>

        {/* Secondary Dynamic Breakdown Badges (Lucide Icons) */}
        {metric.subBadges && metric.subBadges.length > 0 ? (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
            {metric.subBadges.map((badge, bIdx) => {
              const BadgeIcon =
                badge.icon === "bot"
                  ? Bot
                  : badge.icon === "user"
                  ? UserCheck
                  : badge.icon === "target"
                  ? Target
                  : badge.icon === "briefcase"
                  ? Briefcase
                  : badge.icon === "dollar"
                  ? DollarSign
                  : null;

              return (
                <span
                  key={bIdx}
                  className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/70 font-mono text-[10.5px]"
                >
                  {BadgeIcon && <BadgeIcon className="w-3 h-3 text-slate-500 stroke-[2.2]" />}
                  <span>{badge.label}</span>
                </span>
              );
            })}
          </div>
        ) : metric.subValue ? (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center text-[11px] text-slate-600 font-medium">
            <span className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/70 font-mono text-[10.5px]">
              {metric.subValue}
            </span>
          </div>
        ) : null}
      </div>

      {/* Embedded Sparkline Area */}
      <div className="h-12 w-full mt-3 -mb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.strokeColor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={config.strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white text-slate-900 text-[10px] font-semibold px-2 py-1 rounded shadow-lg border border-slate-200/80 font-mono">
                      {payload[0].value?.toLocaleString()}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ stroke: config.strokeColor, strokeWidth: 1, strokeDasharray: "2 2" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={true}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

