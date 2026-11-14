"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeProps, NodeResizer } from "@xyflow/react";
import { GripVertical, Minus, Plus, X } from "lucide-react";
import { useStickyNoteContext } from "../StickyNoteContext";
import {
  STICKY_NOTE_COLORS,
  STICKY_NOTE_MAX_FONT_SIZE,
  STICKY_NOTE_MIN_FONT_SIZE,
  clampStickyNoteFontSize,
  normalizeStickyNoteFontSize,
  type StickyNoteColor,
  type StickyNoteData,
} from "../stickyNoteTypes";

export default function StickyNoteNode({ id, data, selected }: NodeProps) {
  const { updateStickyNote, deleteStickyNote } = useStickyNoteContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  const noteData = data as unknown as StickyNoteData;
  const color = noteData.color || "yellow";
  const fontSize = normalizeStickyNoteFontSize(noteData.fontSize);
  const colorStyles = STICKY_NOTE_COLORS[color];
  const width = noteData.width ?? 220;
  const height = noteData.height ?? 140;

  const [fontInput, setFontInput] = useState(String(fontSize));

  useEffect(() => {
    if (document.activeElement !== fontInputRef.current) {
      setFontInput(String(fontSize));
    }
  }, [fontSize]);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateStickyNote(id, { content: e.target.value });
    },
    [id, updateStickyNote]
  );

  const handleColorChange = useCallback(
    (newColor: StickyNoteColor) => {
      updateStickyNote(id, { color: newColor });
    },
    [id, updateStickyNote]
  );

  const commitFontSize = useCallback(
    (raw: string) => {
      const parsed = parseInt(raw, 10);
      if (Number.isNaN(parsed)) {
        setFontInput(String(fontSize));
        return;
      }
      const clamped = clampStickyNoteFontSize(parsed);
      setFontInput(String(clamped));
      updateStickyNote(id, { fontSize: clamped });
    },
    [fontSize, id, updateStickyNote]
  );

  const adjustFontSize = useCallback(
    (delta: number) => {
      const next = clampStickyNoteFontSize(fontSize + delta);
      setFontInput(String(next));
      updateStickyNote(id, { fontSize: next });
    },
    [fontSize, id, updateStickyNote]
  );

  const handleResizeEnd = useCallback(
    (_event: unknown, params: { width: number; height: number }) => {
      updateStickyNote(id, { width: params.width, height: params.height });
    },
    [id, updateStickyNote]
  );

  const focusTextarea = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <>
      <NodeResizer
        minWidth={120}
        minHeight={80}
        isVisible={selected}
        onResizeEnd={handleResizeEnd}
        lineClassName="border-amber-400"
        handleClassName="h-2.5 w-2.5 rounded-sm bg-amber-400 border-2 border-white"
      />
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-lg border-2 shadow-lg ${colorStyles.bg} ${colorStyles.border} ${
          selected ? "ring-2 ring-amber-400/70 shadow-xl" : "shadow-md"
        }`}
        style={{ width, height, minWidth: 120, minHeight: 80 }}
      >
        <div
          className="flex cursor-grab items-center gap-1 border-b border-black/10 px-2 py-1 active:cursor-grabbing"
          title="Drag to move"
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-black/40" />
          <span className="flex-1 text-[10px] font-medium uppercase tracking-wide text-black/40">
            Sticky note
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteStickyNote(id);
            }}
            className="nodrag nopan rounded p-0.5 text-black/40 transition-colors hover:bg-black/10 hover:text-red-600"
            aria-label="Delete note"
            title="Delete note"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {selected && (
          <div className="nodrag nopan flex items-center justify-between gap-2 border-b border-black/10 px-2 py-1.5">
            <div className="flex gap-1">
              {(Object.keys(STICKY_NOTE_COLORS) as StickyNoteColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorChange(c);
                  }}
                  className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    STICKY_NOTE_COLORS[c].bg
                  } ${color === c ? "border-slate-700 scale-110" : "border-transparent"}`}
                  aria-label={`${c} color`}
                  title={`${c} color`}
                />
              ))}
            </div>

            <div
              className="flex items-center gap-0.5 rounded-md border border-black/10 bg-white/60"
              title={`Font size (${STICKY_NOTE_MIN_FONT_SIZE}-${STICKY_NOTE_MAX_FONT_SIZE})`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustFontSize(-1);
                }}
                disabled={fontSize <= STICKY_NOTE_MIN_FONT_SIZE}
                className="nodrag nopan rounded-l-md p-1 text-black/60 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Decrease font size"
              >
                <Minus className="h-3 w-3" />
              </button>
              <input
                ref={fontInputRef}
                type="text"
                inputMode="numeric"
                value={fontInput}
                onChange={(e) => {
                  e.stopPropagation();
                  setFontInput(e.target.value.replace(/[^\d]/g, ""));
                }}
                onBlur={() => commitFontSize(fontInput)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitFontSize(fontInput);
                    fontInputRef.current?.blur();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="nodrag nopan w-9 border-x border-black/10 bg-transparent py-0.5 text-center text-[11px] font-semibold text-black/70 outline-none"
                aria-label="Font size"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  adjustFontSize(1);
                }}
                disabled={fontSize >= STICKY_NOTE_MAX_FONT_SIZE}
                className="nodrag nopan rounded-r-md p-1 text-black/60 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Increase font size"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={noteData.content || ""}
          onChange={handleContentChange}
          onClick={(e) => {
            e.stopPropagation();
            focusTextarea();
          }}
          placeholder="Click to write..."
          style={{ fontSize: `${fontSize}px` }}
          className={`nodrag nopan nowheel min-h-0 flex-1 resize-none bg-transparent px-3 py-2 leading-relaxed outline-none ${colorStyles.text} placeholder:text-black/30`}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        />
      </div>
    </>
  );
}
