"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, X, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "@/lib/toast";

interface FailedJobsBannerProps {
  basePath?: string;
  className?: string;
}

interface FailedJobsData {
  count: number;
  hasTokenExpiredError: boolean;
  jobs: Array<{
    id: string;
    jobType: string;
    lastError: string | null;
    isTokenExpired: boolean;
    accountUsername?: string | null;
  }>;
}

const getStorageKey = (basePath: string) => `dismissed_failed_jobs:${basePath || "global"}`;

const getSignature = (d: FailedJobsData | null) => {
  if (!d || d.count === 0) return "";
  const jobIds = d.jobs?.map((j) => j.id).sort().join(",") || "";
  return `${jobIds}:${d.count}:${d.hasTokenExpiredError}`;
};

export function FailedJobsBanner({ basePath = "", className = "" }: FailedJobsBannerProps) {
  const [data, setData] = useState<FailedJobsData | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const fetchFailedJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs/failed?limit=5");
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      if (json && typeof json.count === "number") {
        setData(json);
        if (json.count === 0) {
          try {
            localStorage.removeItem(getStorageKey(basePath));
          } catch {}
          setIsDismissed(false);
        } else {
          try {
            const dismissedSig = localStorage.getItem(getStorageKey(basePath));
            setIsDismissed(dismissedSig === getSignature(json));
          } catch {
            // localStorage unavailable
          }
        }
      }
    } catch {
      // Non-fatal background fetch
    }
  }, [basePath]);

  useEffect(() => {
    fetchFailedJobs();
    // Poll every 30 seconds for failed jobs
    const timer = setInterval(fetchFailedJobs, 30000);
    return () => clearInterval(timer);
  }, [fetchFailedJobs]);

  const handleDismiss = () => {
    if (data) {
      try {
        localStorage.setItem(getStorageKey(basePath), getSignature(data));
      } catch {}
    }
    setIsDismissed(true);
  };

  const handleRetryAll = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setRetrySuccess(null);
    try {
      localStorage.removeItem(getStorageKey(basePath));
    } catch {}

    try {
      const res = await fetch("/api/jobs/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error("Failed to retry jobs");
      }

      const resJson = await res.json().catch(() => null);
      const retriedCount = resJson?.retriedCount ?? data?.count ?? 0;
      setRetrySuccess(`Successfully queued ${retriedCount} failed messages for retry!`);
      toast.success("Retry initiated", `Queued ${retriedCount} failed message${retriedCount === 1 ? "" : "s"} for redelivery.`);

      // Refresh after short delay
      setTimeout(() => {
        fetchFailedJobs();
        setRetrySuccess(null);
      }, 2500);
    } catch (err: any) {
      console.error("[FailedJobsBanner] Retry failed:", err.message);
      toast.error("Retry failed", err?.message || "Could not re-queue failed messages.");
    } finally {
      setIsRetrying(false);
    }
  };

  if (isDismissed || !data || data.count === 0) {
    return null;
  }

  const isTokenExpired = data.hasTokenExpiredError;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginTop: 0 }}
        className={`w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2 ${className}`}
      >
        <div
          className={`relative rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${isTokenExpired
            ? "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-amber-500/30 text-amber-950 dark:text-amber-100"
            : "bg-gradient-to-r from-rose-500/10 via-red-500/10 to-rose-500/5 border-rose-500/30 text-rose-950 dark:text-rose-100"
            }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${isTokenExpired
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                  : "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                  }`}
              >
                {retrySuccess ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-bold tracking-tight text-black">
                  {retrySuccess
                    ? "Retry Initiated"
                    : isTokenExpired
                      ? "Instagram Connection Expired (OAuth 190)"
                      : "Automation Delivery Issues"}
                </h4>
                <p className="text-xs sm:text-sm mt-0.5 opacity-90 leading-relaxed max-w-2xl text-slate-800">
                  {retrySuccess ? (
                    retrySuccess
                  ) : isTokenExpired ? (
                    <>
                      <strong>{data.count}</strong> automated{" "}
                      {data.count === 1 ? "message" : "messages"} failed to deliver because your
                      Instagram session expired. Reconnect your Instagram account to restore
                      messaging, then retry the failed messages.
                    </>
                  ) : (
                    <>
                      <strong>{data.count}</strong> automated{" "}
                      {data.count === 1 ? "message" : "messages"} exhausted all retries and failed
                      to deliver due to temporary API or network errors. Click below to bulk-retry.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:self-center shrink-0">
              {isTokenExpired && !retrySuccess && (
                <Link
                  href={basePath ? `${basePath}/settings` : "/setup"}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
                >
                  <span>Reconnect Instagram</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <button
                type="button"
                onClick={handleRetryAll}
                disabled={isRetrying || !!retrySuccess}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all ${isTokenExpired
                  ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700 shadow-xs"
                  : "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-xs"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`}
                />
                <span>{isRetrying ? "Retrying..." : "Retry Failed Messages"}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-black/5 transition-colors"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
