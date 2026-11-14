"use client";

import { PlaceholderHelperChips } from "./PlaceholderHelperChips";

export function MessageVariationsSection({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (next: Record<string, unknown>) => void;
}) {
  const rawVariations = config.messageVariations;
  const variations: string[] = Array.isArray(rawVariations)
    ? rawVariations.map((v) => (typeof v === "string" ? v : (v as any)?.text || ""))
    : [];

  const maxVariations = 10;

  const addVariation = () => {
    if (variations.length >= maxVariations) return;
    setConfig({
      ...config,
      messageVariations: [...variations, ""],
    });
  };

  const updateVariation = (index: number, text: string) => {
    const updated = [...variations];
    updated[index] = text;
    setConfig({
      ...config,
      messageVariations: updated,
    });
  };

  const removeVariation = (index: number) => {
    const updated = variations.filter((_, i) => i !== index);
    setConfig({
      ...config,
      messageVariations: updated,
    });
  };

  const insertPlaceholderIntoVariation = (index: number, token: string) => {
    const current = variations[index] || "";
    const next = current
      ? current.endsWith(" ")
        ? `${current}${token}`
        : `${current} ${token}`
      : token;
    updateVariation(index, next);
  };

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Message Variations (Anti-Spam)
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Randomly rotates multiple variations to avoid Instagram spam blocks
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
          {variations.length} / {maxVariations} variations
        </span>
      </div>

      {variations.length > 0 && (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900">
          <span className="font-bold text-[10px] uppercase tracking-wide bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md shrink-0">
            Rotation Active
          </span>
          <span className="text-[11px] text-amber-800">
            A random variation below will be sent for anti-spam protection. (The primary message is only used when no variations are added.)
          </span>
        </div>
      )}

      {variations.map((text, idx) => (
        <div
          key={idx}
          className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Variation {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeVariation(idx)}
              className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
            >
              Remove
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => updateVariation(idx, e.target.value)}
            placeholder={`Enter variation ${idx + 1}...`}
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-none"
          />

          <PlaceholderHelperChips
            onInsert={(token) => insertPlaceholderIntoVariation(idx, token)}
          />
        </div>
      ))}

      {variations.length < maxVariations && (
        <button
          type="button"
          onClick={addVariation}
          className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-white"
        >
          <span>+</span>
          <span>Add Message Variation (Variation {variations.length + 1} of {maxVariations})</span>
        </button>
      )}
    </div>
  );
}
