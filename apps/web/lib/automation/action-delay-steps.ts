/**
 * Preset wait durations for outbound actions ( follow-up timing).
 * Stored as seconds in node config; UI steps through this ladder with + / −.
 */

export interface ActionDelayConfig {
  delayEnabled?: boolean;
  delaySeconds?: number;
}

/** Seconds for each step: 3s → 5s → 30s → 1m → 5m → 30m → 1h → 5h → 8h → 23h */
export const ACTION_DELAY_STEPS_SECONDS = [
  3,
  5,
  30,
  60,
  300,
  1800,
  3600,
  18_000,
  28_800,
  82_800,
] as const;

export const DEFAULT_ACTION_DELAY_SECONDS = ACTION_DELAY_STEPS_SECONDS[0];

export function normalizeActionDelaySeconds(
  seconds: number | undefined | null
): number {
  if (seconds == null || Number.isNaN(seconds)) {
    return DEFAULT_ACTION_DELAY_SECONDS;
  }
  const s = Math.floor(seconds);
  if (s <= 0) {
    return DEFAULT_ACTION_DELAY_SECONDS;
  }
  let best: number = ACTION_DELAY_STEPS_SECONDS[0];
  let bestDiff = Math.abs(s - best);
  for (const step of ACTION_DELAY_STEPS_SECONDS) {
    const diff = Math.abs(s - step);
    if (diff < bestDiff) {
      best = step;
      bestDiff = diff;
    }
  }
  return best;
}

export function getActionDelayStepIndex(seconds: number): number {
  const normalized = normalizeActionDelaySeconds(seconds);
  const idx = ACTION_DELAY_STEPS_SECONDS.indexOf(
    normalized as (typeof ACTION_DELAY_STEPS_SECONDS)[number]
  );
  return idx >= 0 ? idx : 0;
}

export function stepActionDelaySeconds(
  current: number | undefined | null,
  direction: 1 | -1
): { delayEnabled: boolean; delaySeconds: number } {
  if (direction === 1) {
    if (!current || current <= 0) {
      return { delayEnabled: true, delaySeconds: DEFAULT_ACTION_DELAY_SECONDS };
    }
    const idx = getActionDelayStepIndex(current);
    if (idx >= ACTION_DELAY_STEPS_SECONDS.length - 1) {
      return {
        delayEnabled: true,
        delaySeconds: ACTION_DELAY_STEPS_SECONDS[ACTION_DELAY_STEPS_SECONDS.length - 1],
      };
    }
    return {
      delayEnabled: true,
      delaySeconds: ACTION_DELAY_STEPS_SECONDS[idx + 1],
    };
  }

  // direction === -1 (stay on at minimum step; use delayEnabled toggle to turn off)
  if (!current || current <= 0) {
    return { delayEnabled: true, delaySeconds: DEFAULT_ACTION_DELAY_SECONDS };
  }
  const idx = getActionDelayStepIndex(current);
  if (idx <= 0) {
    return { delayEnabled: true, delaySeconds: DEFAULT_ACTION_DELAY_SECONDS };
  }
  return {
    delayEnabled: true,
    delaySeconds: ACTION_DELAY_STEPS_SECONDS[idx - 1],
  };
}

export function formatActionDelayLabel(seconds: number): string {
  const s = normalizeActionDelaySeconds(seconds);
  if (s < 60) {
    return s === 1 ? "1 second" : `${s} seconds`;
  }
  if (s < 3600) {
    const m = s / 60;
    return m === 1 ? "1 minute" : `${m} minutes`;
  }
  const h = s / 3600;
  if (h === 1) return "1 hour";
  if (Number.isInteger(h)) return `${h} hours`;
  return `${h} hours`;
}
