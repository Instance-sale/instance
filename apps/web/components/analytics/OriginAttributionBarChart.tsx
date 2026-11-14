"use client";

import React, { useEffect, useRef } from "react";
import { Chart as ChartJS, registerables } from "chart.js";
import { Folder } from "lucide-react";
import type { OriginAttributionItem } from "@/lib/types/analytics";

ChartJS.register(...registerables);

interface OriginAttributionBarChartProps {
  originAttribution: OriginAttributionItem[] | null;
}

export default function OriginAttributionBarChart({
  originAttribution,
}: OriginAttributionBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const items = originAttribution && originAttribution.length > 0 ? originAttribution.slice(0, 5) : [];

  useEffect(() => {
    if (!canvasRef.current || items.length === 0) return;

    const existingChart = ChartJS.getChart(canvasRef.current);
    if (existingChart) {
      existingChart.destroy();
    }
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const labels = items.map((it) => (it.name.length > 18 ? `${it.name.slice(0, 18)}...` : it.name));
    const revenueData = items.map((it) => it.revenue);
    const backgroundColors = items.map((it) => it.folderColor || "#2563eb");

    chartRef.current = new ChartJS(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Attributed Revenue ($)",
            data: revenueData,
            backgroundColor: backgroundColors,
            borderRadius: 6,
            barThickness: 16,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#ffffff",
            titleColor: "#64748b",
            bodyColor: "#0f172a",
            borderColor: "#e2e8f0",
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            titleFont: { size: 11, weight: "normal" },
            bodyFont: { size: 12, weight: "bold", family: "monospace" },
            callbacks: {
              label: (context) => {
                const val = context.raw as number;
                const item = items[context.dataIndex];
                return [
                  `Revenue: $${val.toLocaleString()}`,
                  `Leads Captured: ${item.leadsCount} (${item.qualificationRate}% qual)`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: "#f1f5f9" },
            ticks: {
              color: "#94a3b8",
              font: { family: "monospace", size: 10 },
              callback: (v) => `$${v}`,
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: "#475569",
              font: { family: "Inter, sans-serif", size: 11, weight: 600 },
            },
          },
        },
      },
    });

    return () => {
      const existing = canvasRef.current ? ChartJS.getChart(canvasRef.current) : null;
      if (existing) {
        existing.destroy();
      }
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [items]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between h-full">
      {/* Head */}
      <div>
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Folder className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Origin Automation Revenue Attribution
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Attribution matrix linking captured leads and closed revenue to source flow
            </p>
          </div>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full font-mono">
            {items.length} Flows Active
          </span>
        </div>

        {/* Horizontal Bar Chart Canvas */}
        {items.length > 0 ? (
          <div className="w-full h-[180px] sm:h-[190px] pt-3 relative">
            <canvas ref={canvasRef} />
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No automation flow revenue tracked yet.
          </div>
        )}
      </div>

      {/* Attribution mini rows */}
      <div className="space-y-2 pt-3 border-t border-slate-100 mt-2">
        {items.slice(0, 3).map((item) => (
          <div
            key={item.automationId}
            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.folderColor || "#3b82f6" }}
              />
              <span className="font-semibold text-slate-800 truncate">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-slate-400 font-mono text-[11px]">
                {item.leadsCount} leads
              </span>
              <span className="font-extrabold text-blue-700 font-mono text-[11px]">
                ${item.revenue.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
