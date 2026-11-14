"use client";

import { Position, NodeProps } from "@xyflow/react";
import { NodeIcon } from "../node-icons";
import { ConnectionHandle } from "../ConnectionHandle";
import NodeHoverActions from "./NodeHoverActions";
import { Layers } from "lucide-react";

export default function ActionNode({ id, data, selected }: NodeProps) {
  const isCondition = data.type === "ACTION_CONDITION";
  const isDmNode = data.type === "ACTION_SEND_DM" || data.type === "ACTION_REPLY_DM";
  const config = (data.config as any) || {};

  const isCarousel = isDmNode && (config.messageFormat === "carousel" || (Array.isArray(config.carouselCards) && config.carouselCards.length > 0));
  const carouselCardsCount = Array.isArray(config.carouselCards) ? config.carouselCards.length : 0;

  const buttons: Array<{ type: 'reply' | 'link'; title: string; url?: string; enableBranch?: boolean }> = Array.isArray(config.buttons)
    ? config.buttons.filter((b: any) => b && typeof b.title === 'string' && b.title.trim().length > 0)
    : [];

  const branchedButtons = buttons
    .map((btn, originalIdx) => ({ ...btn, originalIdx }))
    .filter((btn) => btn.type !== "link" && Boolean(btn.enableBranch));

  const hasButtons = buttons.length > 0;

  const buttonBadgeClasses = [
    "bg-emerald-50 text-emerald-700 border-emerald-300",
    "bg-violet-50 text-violet-700 border-violet-300",
    "bg-amber-50 text-amber-700 border-amber-300",
    "bg-sky-50 text-sky-700 border-sky-300",
    "bg-rose-50 text-rose-700 border-rose-300",
  ] as const;

  return (
    <div
      className={`group relative flex flex-col justify-center px-5 py-4 rounded-2xl border-2 bg-white shadow-md transition-all duration-200 ${isCondition ? "min-w-[300px]" : "min-w-[270px]"
        } ${selected
          ? "border-blue-500 ring-2 ring-blue-200 shadow-blue-200/50"
          : "border-slate-200/80 hover:border-slate-300 hover:shadow-lg"
        }`}
    >
      <NodeHoverActions nodeId={id} />
      <ConnectionHandle type="target" position={Position.Top} className="z-10 cursor-crosshair" />

      <div className="flex items-center gap-3.5">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 bg-blue-100 text-blue-600">
          <NodeIcon icon={String(data.icon || "send")} size={24} />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 tracking-tight truncate">
              {String(data.label || "Action")}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono block truncate mt-0.5">
            {String(data.type)}
          </span>
        </div>
      </div>

      {/* Structured interactive button indicator strip */}
      {hasButtons && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Buttons:
          </span>
          {buttons.map((btn, bIdx) => (
            <span
              key={bIdx}
              className={`text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${btn.type === "link"
                ? "bg-slate-50 text-slate-600 border-slate-200"
                : btn.enableBranch
                  ? "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                  : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
            >
              {btn.type === "link" ? (
                <svg className="w-2.5 h-2.5 text-slate-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              )}
              <span className="max-w-[120px] truncate">{btn.title}</span>
              {btn.enableBranch && (
                <span className="text-[9px] text-blue-600 font-bold ml-0.5">⚡</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Multi-Card Carousel Indicator Pill */}
      {isCarousel && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Layers className="w-3 h-3 text-violet-600" />
            <span>Interactive Carousel ({carouselCardsCount} {carouselCardsCount === 1 ? 'card' : 'cards'})</span>
          </span>
        </div>
      )}

      {branchedButtons.length > 0 ? (
        <>
          {/* Bottom Default Continuation Handle */}
          <div
            className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-500 whitespace-nowrap select-none"
            aria-hidden
          >
            Default
          </div>
          <ConnectionHandle
            type="source"
            position={Position.Bottom}
            id="default"
            className="z-10 cursor-crosshair"
          />

          {/* Right-Side Selective Button Branch Handles */}
          {branchedButtons.map((btn, bIdx) => {
            const count = branchedButtons.length;
            const topPercent = count === 1 ? "50%" : `${Math.round(((bIdx + 1) / (count + 1)) * 100)}%`;
            const badgeClass = buttonBadgeClasses[btn.originalIdx % buttonBadgeClasses.length];
            return (
              <div key={btn.originalIdx}>
                <div
                  className="pointer-events-none absolute right-3 -translate-y-1/2 text-[10px] font-semibold flex items-center z-10"
                  style={{ top: topPercent }}
                  aria-hidden
                >
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shadow-xs max-w-[85px] truncate ${badgeClass}`}>
                    {btn.title || `Option ${btn.originalIdx + 1}`}
                  </span>
                </div>
                <ConnectionHandle
                  type="source"
                  position={Position.Right}
                  id={`button-${btn.originalIdx}`}
                  variant={`button-${btn.originalIdx % 5}` as any}
                  className="z-10 cursor-crosshair"
                  style={{ top: topPercent }}
                />
              </div>
            );
          })}
        </>
      ) : isDmNode ? (
        <ConnectionHandle
          type="source"
          position={Position.Bottom}
          id="default"
          className="z-10 cursor-crosshair"
        />
      ) : (
        <ConnectionHandle type="source" position={Position.Bottom} className="z-10 cursor-crosshair" />
      )}
    </div>
  );
}
