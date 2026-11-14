"use client";

import { Position, NodeProps } from "@xyflow/react";
import { NodeIcon } from "../node-icons";
import { ConnectionHandle } from "../ConnectionHandle";
import NodeHoverActions from "./NodeHoverActions";
import { Zap } from "lucide-react";

export default function TriggerNode({ id, data, selected }: NodeProps) {
  const analytics = data.analytics as any;

  return (
    <div
      className={`group relative flex flex-col justify-center px-5 py-4 rounded-2xl border-2 bg-white shadow-md transition-all duration-200 min-w-[270px] ${
        selected
          ? "border-violet-500 ring-2 ring-violet-200 shadow-violet-200/50"
          : "border-violet-200 hover:border-violet-300 hover:shadow-lg"
      }`}
    >
      <NodeHoverActions nodeId={id} />
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 text-violet-600 shrink-0">
          <NodeIcon icon={String(data.icon || "message-circle")} size={24} />
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

      {analytics && typeof analytics.executedCount === "number" && (
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-violet-100 text-[10.5px]">
          <span className="font-bold text-violet-700 flex items-center gap-1">
            <Zap className="w-3 h-3 text-violet-600" />
            <span>{analytics.executedCount.toLocaleString()} Executed</span>
          </span>
          <div className="flex items-center gap-1.5">
            {analytics.failedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md font-bold bg-rose-50 text-rose-600 border border-rose-200">
                {analytics.failedCount} Failed
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded-md font-bold bg-violet-50 text-violet-700 border border-violet-200">
              {analytics.funnelPercentage}% Funnel
            </span>
          </div>
        </div>
      )}

      <ConnectionHandle type="source" position={Position.Bottom} />
    </div>
  );
}
