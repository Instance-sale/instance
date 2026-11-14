"use client";

import { Pencil } from "lucide-react";
import { useStickyNoteContextOptional } from "../StickyNoteContext";

interface NodeHoverActionsProps {
  nodeId: string;
}

export default function NodeHoverActions({ nodeId }: NodeHoverActionsProps) {
  const ctx = useStickyNoteContextOptional();
  if (!ctx) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        ctx.addStickyNoteNearNode(nodeId);
      }}
      className="absolute -top-2 -right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md opacity-0 transition-opacity group-hover:opacity-100 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
      aria-label="Add sticky note"
      title="Add sticky note cursor-pointer"
    >
      <Pencil className="h-3.5 w-3.5 cursor-pointer" />
    </button>
  );
}
