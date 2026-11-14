/**
 * Simple logger that respects NODE_ENV:
 * - **Development:** All messages go to console (you see them in your terminal).
 * - **Production:** `log` and `debug` are no-op (not visible). `warn` and `error` still run so you can see problems in server logs.
 *
 * Use this instead of raw `console.log` so production stays clean and you don't leak debug info.
 * For client-side code ("use client"), only `logger.log`/`debug` are no-op in production; warn/error still show in the user's browser console unless you guard those too.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
