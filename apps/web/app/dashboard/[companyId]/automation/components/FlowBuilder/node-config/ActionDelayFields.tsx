"use client";

import {
  stepActionDelaySeconds,
  formatActionDelayLabel,
  normalizeActionDelaySeconds,
  ACTION_DELAY_STEPS_SECONDS,
  DEFAULT_ACTION_DELAY_SECONDS,
} from "@/lib/automation/action-delay-steps";

export function ActionDelayFields({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (next: Record<string, unknown>) => void;
}) {
  const enabled = !!config.delayEnabled;
  const seconds = normalizeActionDelaySeconds(
    enabled ? (config.delaySeconds as number) : DEFAULT_ACTION_DELAY_SECONDS
  );
  const atMin = enabled && seconds <= ACTION_DELAY_STEPS_SECONDS[0];
  const atMax =
    enabled &&
    seconds >= ACTION_DELAY_STEPS_SECONDS[ACTION_DELAY_STEPS_SECONDS.length - 1];

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <p className="text-xs text-slate-500">
        Turn wait on, then use + / − to pick a delay (3s up to 23h).
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() =>
            setConfig({
              ...config,
              delayEnabled: !enabled,
              delaySeconds: enabled
                ? config.delaySeconds
                : DEFAULT_ACTION_DELAY_SECONDS,
            })
          }
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors hover:opacity-90 ${enabled ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 hover:bg-slate-400"
            }`}
          aria-label={enabled ? "Wait on" : "Wait off"}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : ""
              }`}
          />
        </button>
        <span className="text-sm font-medium text-slate-700 w-14 shrink-0">
          {enabled ? "On" : "Off"}
        </span>
        {enabled ? (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() =>
                setConfig({ ...config, ...stepActionDelaySeconds(seconds, -1) })
              }
              disabled={atMin}
              className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent"
              aria-label="Decrease wait time"
            >
              −
            </button>
            <span className="flex-1 text-center text-sm font-medium text-slate-800 truncate">
              {formatActionDelayLabel(seconds)}
            </span>
            <button
              type="button"
              onClick={() =>
                setConfig({ ...config, ...stepActionDelaySeconds(seconds, 1) })
              }
              disabled={atMax}
              className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent"
              aria-label="Increase wait time"
            >
              +
            </button>
          </div>
        ) : (
          <span className="text-sm text-slate-500">No wait</span>
        )}
      </div>
    </div>
  );
}
