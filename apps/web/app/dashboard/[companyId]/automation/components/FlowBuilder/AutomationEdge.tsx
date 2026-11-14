"use client";

import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";

const EDGE_COLORS = {
  default: { stroke: "#94a3b8", strokeWidth: 3 },
  true: { stroke: "#10b981", strokeWidth: 3 },
  false: { stroke: "#ef4444", strokeWidth: 3 },
  random: { stroke: "#8b5cf6", strokeWidth: 3 },
  split: { stroke: "#3b82f6", strokeWidth: 3 },
} as const;

export default function AutomationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  style,
  markerEnd,
  selectable: _selectable,
  deletable: _deletable,
  targetHandleId: _targetHandleId,
  pathOptions: _pathOptions,
  ...rest
}: EdgeProps) {
  const effectiveHandleId = sourceHandleId || (rest as any)?.sourceHandle || "";
  const isTrue = effectiveHandleId === "true";
  const isFalse = effectiveHandleId === "false";
  const isRandomPath = Boolean(effectiveHandleId.startsWith("path-"));
  const isSplitBranch = Boolean(effectiveHandleId.startsWith("branch-"));
  const isButtonBranch = Boolean(effectiveHandleId.startsWith("button-"));

  let colors: { stroke: string; strokeWidth: number } = EDGE_COLORS.default;
  let labelText: string | null = null;
  let labelClass = "bg-white text-slate-700 border-slate-200";

  if (isTrue) {
    colors = EDGE_COLORS.true;
    labelText = "True";
    labelClass = "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-emerald-100";
  } else if (isFalse) {
    colors = EDGE_COLORS.false;
    labelText = "False";
    labelClass = "bg-red-50 text-red-700 border-red-300 shadow-red-100";
  } else if (isRandomPath) {
    colors = EDGE_COLORS.random;
    const pathIdx = parseInt(effectiveHandleId.replace("path-", "") || "0", 10);
    labelText = `Path ${String.fromCharCode(65 + pathIdx)}`;
    labelClass = "bg-purple-50 text-purple-700 border-purple-300 shadow-purple-100";
  } else if (isSplitBranch) {
    colors = EDGE_COLORS.split;
    const branchIdx = parseInt(effectiveHandleId.replace("branch-", "") || "0", 10);
    labelText = `Branch ${branchIdx + 1}`;
    labelClass = "bg-blue-50 text-blue-700 border-blue-300 shadow-blue-100";
  } else if (isButtonBranch) {
    const btnIdx = parseInt(effectiveHandleId.replace("button-", "") || "0", 10);
    const buttonPalettes = [
      { stroke: "#10b981", labelClass: "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-emerald-100" },
      { stroke: "#8b5cf6", labelClass: "bg-violet-50 text-violet-700 border-violet-300 shadow-violet-100" },
      { stroke: "#f59e0b", labelClass: "bg-amber-50 text-amber-700 border-amber-300 shadow-amber-100" },
      { stroke: "#0284c7", labelClass: "bg-sky-50 text-sky-700 border-sky-300 shadow-sky-100" },
      { stroke: "#f43f5e", labelClass: "bg-rose-50 text-rose-700 border-rose-300 shadow-rose-100" },
    ];
    const palette = buttonPalettes[btnIdx % buttonPalettes.length];
    colors = { stroke: palette.stroke, strokeWidth: 3 };
    const customLabel = (rest as any)?.data?.label;
    labelText = customLabel ? String(customLabel) : `Option ${btnIdx + 1}`;
    labelClass = palette.labelClass;
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: colors.stroke,
          strokeWidth: colors.strokeWidth,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
        markerEnd={markerEnd}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className={`nodrag nopan px-2 py-0.5 rounded-full border text-[11px] font-bold shadow-sm select-none ${labelClass}`}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
