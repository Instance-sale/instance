"use client";

import { useRef, useMemo } from "react";

const PLACEHOLDER_SPLIT_REGEX = /(\{name\}|\{comment\}|\{username\}|\{promo\}|\{promo_code\})/gi;
const IS_PLACEHOLDER = /^\{name\}$|^\{comment\}$|^\{username\}$|^\{promo\}$|^\{promo_code\}$/i;
// Blue chip background only; text is transparent so the textarea's text shows through (avoids double/overlap)
const PLACEHOLDER_CHIP_CLASS =
  "bg-blue-100 rounded px-0.5 py-0.5 border border-blue-200 text-transparent select-none";

export function MessageWithPlaceholderHighlight({
  value,
  onChange,
  placeholder,
  rows = 4,
  "data-testid": testId,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  "data-testid"?: string;
}) {
  const highlightRef = useRef<HTMLDivElement>(null);
  const parts = useMemo(() => {
    if (!value) return [];
    return value.split(PLACEHOLDER_SPLIT_REGEX);
  }, [value]);

  return (
    <div className="relative w-full">
      {/* Highlight layer: only blue chip backgrounds; all text is transparent so we see the textarea text once */}
      <div
        ref={highlightRef}
        className="pointer-events-none absolute inset-0 overflow-auto rounded-xl border border-transparent px-3 py-2 text-sm whitespace-pre-wrap break-words font-sans text-transparent"
        style={{ lineHeight: 1.5, minHeight: rows * 24 }}
        aria-hidden
      >
        {parts.map((part, i) =>
          IS_PLACEHOLDER.test(part) ? (
            <span key={i} className={PLACEHOLDER_CHIP_CLASS}>
              {part}
            </span>
          ) : (
            part
          )
        )}
      </div>
      <textarea
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (highlightRef.current) highlightRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        placeholder={placeholder}
        rows={rows}
        className="relative w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-900 caret-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none placeholder:text-slate-400 resize-none"
        style={{ lineHeight: 1.5 }}
      />
    </div>
  );
}
