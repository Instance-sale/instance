import type { Node } from "@xyflow/react";

export type StickyNoteColor = "yellow" | "pink" | "blue" | "green";

export const STICKY_NOTE_MIN_FONT_SIZE = 10;
export const STICKY_NOTE_MAX_FONT_SIZE = 48;
export const STICKY_NOTE_DEFAULT_FONT_SIZE = 14;

export interface StickyNoteData {
  content: string;
  color: StickyNoteColor;
  width: number;
  height: number;
  fontSize?: number;
  linkedNodeId?: string;
  autoFocus?: boolean;
}

export interface PersistedStickyNote {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  content: string;
  color: StickyNoteColor;
  fontSize?: number;
  linkedNodeId?: string;
}

export const STICKY_NOTE_COLORS: Record<
  StickyNoteColor,
  { bg: string; border: string; text: string }
> = {
  yellow: { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-950" },
  pink: { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-950" },
  blue: { bg: "bg-sky-100", border: "border-sky-300", text: "text-sky-950" },
  green: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-950" },
};

export const DEFAULT_STICKY_NOTE: StickyNoteData = {
  content: "",
  color: "yellow",
  width: 220,
  height: 140,
  fontSize: STICKY_NOTE_DEFAULT_FONT_SIZE,
};

export function clampStickyNoteFontSize(size: number): number {
  return Math.min(
    STICKY_NOTE_MAX_FONT_SIZE,
    Math.max(STICKY_NOTE_MIN_FONT_SIZE, Math.round(size))
  );
}

/** Supports legacy sm/md/lg values from earlier saves */
export function normalizeStickyNoteFontSize(fontSize: unknown): number {
  if (typeof fontSize === "number" && !Number.isNaN(fontSize)) {
    return clampStickyNoteFontSize(fontSize);
  }
  if (fontSize === "sm") return 12;
  if (fontSize === "lg") return 18;
  if (fontSize === "md") return 14;
  return STICKY_NOTE_DEFAULT_FONT_SIZE;
}

export function createStickyNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Workflow nodes only (excludes sticky notes) */
export function getExecutionNodes(nodes: Node[]): Node[] {
  return nodes.filter((node) => node.type !== "note");
}
