"use client";

import { Position, NodeProps } from "@xyflow/react";
import { NodeIcon } from "../node-icons";
import { ConnectionHandle } from "../ConnectionHandle";
import NodeHoverActions from "./NodeHoverActions";

export default function FlowNode({ id, data, selected }: NodeProps) {
  const isCondition = data.type === "ACTION_CONDITION";
  const isRandom = data.type === "FLOW_RANDOM";
  const isSplit = data.type === "FLOW_SPLIT";
  const isEnd = data.type === "FLOW_END";

  const config = (data.config as any) || {};
  const randomPathCount = Math.max(2, Math.min(5, parseInt(config.pathCount, 10) || 2));
  const splitBranchCount = Math.max(2, Math.min(5, parseInt(config.branchCount, 10) || 2));

  const weightsArray = config.weights
    ? String(config.weights).split(",").map((w: string) => parseFloat(w.trim())).filter((w: number) => !isNaN(w))
    : Array(randomPathCount).fill(100 / randomPathCount);

  const analytics = data.analytics as any;

  const nodeMinWidth = isRandom
    ? Math.max(300, randomPathCount * 95)
    : isSplit
      ? Math.max(300, splitBranchCount * 90)
      : isCondition
        ? 300
        : 260;

  return (
    <div
      style={{ minWidth: `${nodeMinWidth}px` }}
      className={`group relative flex flex-col justify-center px-5 py-4 rounded-2xl border-2 bg-white shadow-md transition-all duration-200 ${selected
          ? "border-slate-500 ring-2 ring-slate-200 shadow-slate-200/50"
          : "border-slate-200 hover:border-slate-300 hover:shadow-lg"
        }`}
    >
      <NodeHoverActions nodeId={id} />
      {!isEnd && (
        <ConnectionHandle type="target" position={Position.Top} />
      )}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-600 shrink-0">
          <NodeIcon icon={String(data.icon || "git-branch")} size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-base text-slate-900 truncate">
            {String(data.label || "")}
          </div>
          {data.description ? (
            <div className="text-sm text-slate-500 truncate mt-0.5">
              {String(data.description)}
            </div>
          ) : null}
        </div>
      </div>

      {/* Layer 1: Ambient Node Execution Telemetry */}
      {analytics && typeof analytics.executedCount === "number" && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] w-full">
          <span className="font-semibold text-slate-700">
            {analytics.executedCount.toLocaleString()} executed
          </span>
          <div className="flex items-center gap-1.5">
            {analytics.failedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md font-bold bg-rose-50 text-rose-600 border border-rose-200">
                {analytics.failedCount} failed
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {analytics.funnelPercentage}% Funnel
            </span>
          </div>
        </div>
      )}

      {!isEnd && (
        <>
          {isCondition ? (
            (Boolean(config.isFollowerGate) || (!config.conditionGroups?.length && config.condition?.fieldType === "follower" && Boolean(config.message))) ? (
              <>
                <div
                  className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-emerald-600 whitespace-nowrap select-none flex items-center gap-1"
                  aria-hidden
                >
                  <span>When Following</span>
                </div>
                <ConnectionHandle
                  type="source"
                  position={Position.Bottom}
                  id="true"
                  variant="true"
                  className="z-10 cursor-crosshair"
                />
              </>
            ) : (
              <>
                <div
                  className="pointer-events-none absolute -bottom-5 left-[30%] -translate-x-1/2 text-xs font-semibold text-red-600 whitespace-nowrap select-none flex items-center gap-1"
                  aria-hidden
                >
                  <span>False</span>
                  {analytics?.branchSplits && (
                    <span className="text-[10px] text-red-500 font-bold">
                      ({analytics.branchSplits.false?.percentage ?? 0}%)
                    </span>
                  )}
                </div>
                <ConnectionHandle
                  type="source"
                  position={Position.Bottom}
                  id="false"
                  variant="false"
                  className="z-10 cursor-crosshair"
                  style={{ left: "30%" }}
                />
                <div
                  className="pointer-events-none absolute -bottom-5 left-[70%] -translate-x-1/2 text-xs font-semibold text-emerald-600 whitespace-nowrap select-none flex items-center gap-1"
                  aria-hidden
                >
                  <span>True</span>
                  {analytics?.branchSplits && (
                    <span className="text-[10px] text-emerald-500 font-bold">
                      ({analytics.branchSplits.true?.percentage ?? 0}%)
                    </span>
                  )}
                </div>
                <ConnectionHandle
                  type="source"
                  position={Position.Bottom}
                  id="true"
                  variant="true"
                  className="z-10 cursor-crosshair"
                  style={{ left: "70%" }}
                />
              </>
            )
          ) : isRandom ? (
            <>
              {Array.from({ length: randomPathCount }).map((_, idx) => {
                const percent = Math.round(100 / (randomPathCount + 1) * (idx + 1));
                const weight = weightsArray[idx] !== undefined ? `${weightsArray[idx]}%` : `${Math.round(100 / randomPathCount)}%`;
                const letter = String.fromCharCode(65 + idx);
                return (
                  <div key={idx}>
                    <div
                      className="pointer-events-none absolute -bottom-5 text-[11px] font-semibold text-purple-700 whitespace-nowrap select-none -translate-x-1/2"
                      style={{ left: `${percent}%` }}
                      aria-hidden
                    >
                      Path {letter} ({weight})
                    </div>
                    <ConnectionHandle
                      type="source"
                      position={Position.Bottom}
                      id={`path-${idx}`}
                      className="z-10 cursor-crosshair !border-purple-500 !bg-purple-50 hover:!bg-purple-100 hover:!border-purple-600"
                      style={{ left: `${percent}%` }}
                    />
                  </div>
                );
              })}
            </>
          ) : isSplit ? (
            <>
              {Array.from({ length: splitBranchCount }).map((_, idx) => {
                const percent = Math.round(100 / (splitBranchCount + 1) * (idx + 1));
                return (
                  <div key={idx}>
                    <div
                      className="pointer-events-none absolute -bottom-5 text-[11px] font-semibold text-blue-700 whitespace-nowrap select-none -translate-x-1/2"
                      style={{ left: `${percent}%` }}
                      aria-hidden
                    >
                      Branch {idx + 1}
                    </div>
                    <ConnectionHandle
                      type="source"
                      position={Position.Bottom}
                      id={`branch-${idx}`}
                      className="z-10 cursor-crosshair !border-blue-500 !bg-blue-50 hover:!bg-blue-100 hover:!border-blue-600"
                      style={{ left: `${percent}%` }}
                    />
                  </div>
                );
              })}
            </>
          ) : (
            <ConnectionHandle type="source" position={Position.Bottom} className="z-10 cursor-crosshair" />
          )}
        </>
      )}
    </div>
  );
}
