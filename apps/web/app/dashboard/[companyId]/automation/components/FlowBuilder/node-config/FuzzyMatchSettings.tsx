"use client";

import { useState, useMemo } from "react";
import { FlaskConical, Check, X } from "lucide-react";
import { isFuzzyKeywordMatch } from "@/lib/automation/fuzzy-match";

export function FuzzyMatchSettings({
  config,
  setConfig,
  keywords,
}: {
  config: Record<string, unknown>;
  setConfig: (next: Record<string, unknown>) => void;
  keywords: string[];
}) {
  const isFuzzy = Boolean(config.fuzzyMatch);
  const sensitivity = String(config.toleranceSensitivity || "normal");
  const [testInput, setTestInput] = useState("");

  const testResult = useMemo(() => {
    if (!testInput.trim() || !keywords || keywords.length === 0) return null;
    return isFuzzyKeywordMatch(testInput, keywords, {
      sensitivity: sensitivity as any,
      exactOnly: !isFuzzy,
    });
  }, [testInput, keywords, isFuzzy, sensitivity]);

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Typo Tolerance (Smart Match)
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Allow small spelling mistakes on mobile keyboards (e.g. &quot;prcing&quot; matches &quot;PRICING&quot;)
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
          <input
            type="checkbox"
            checked={isFuzzy}
            onChange={(e) =>
              setConfig({
                ...config,
                fuzzyMatch: e.target.checked,
                matchType: e.target.checked ? "FUZZY" : "CONTAINS",
              })
            }
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {isFuzzy && (
        <div className="space-y-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tolerance Sensitivity
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "strict", label: "Strict (1 typo)" },
                { id: "normal", label: "Normal (Smart)" },
                { id: "loose", label: "Loose (2 typos)" },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, toleranceSensitivity: lvl.id })
                  }
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${sensitivity === lvl.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Live Test Sandbox */}
          <div className="space-y-1.5 pt-1 border-t border-blue-100">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-900">
                <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Typo Simulator:</span>
              </label>
              <span className="text-[10px] text-blue-600">Type test word below</span>
            </div>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="e.g. prcing, wrkshp, prce..."
              className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            {testInput.trim() && (
              <div className="text-xs pt-1">
                {testResult?.isMatch ? (
                  <div className="flex items-center gap-1.5 text-emerald-800 font-medium bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Matches keyword <strong>&quot;{testResult.matchedKeyword}&quot;</strong> ({testResult.confidence}% match, {testResult.distance} typo edit)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>No match for &quot;{testInput}&quot; with current keywords</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
