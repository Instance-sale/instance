"use client";

import { useSyncExternalStore } from "react";
import {
  subscribeToasts,
  getToastsSnapshot,
  dismissToast,
  type ToastItem,
  type ToastType,
  toast,
} from "@/lib/toast";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export { toast };

const TOAST_ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_STYLES: Record<ToastType, { wrapper: string; icon: string; close: string }> = {
  success: {
    wrapper: "bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-500/10",
    icon: "text-emerald-600",
    close: "text-emerald-700/60 hover:text-emerald-900",
  },
  error: {
    wrapper: "bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-500/10",
    icon: "text-rose-600",
    close: "text-rose-700/60 hover:text-rose-900",
  },
  warning: {
    wrapper: "bg-amber-50/95 border-amber-200 text-amber-950 shadow-amber-500/10",
    icon: "text-amber-600",
    close: "text-amber-700/60 hover:text-amber-900",
  },
  info: {
    wrapper: "bg-sky-50/95 border-sky-200 text-sky-950 shadow-sky-500/10",
    icon: "text-sky-600",
    close: "text-sky-700/60 hover:text-sky-900",
  },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon = TOAST_ICONS[item.type] || Info;
  const styles = TOAST_STYLES[item.type] || TOAST_STYLES.info;

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2 sm:slide-in-from-right-4 ${styles.wrapper}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-sm font-semibold leading-tight break-words">{item.title}</p>
        {item.description && (
          <p className="text-xs opacity-90 mt-1 leading-relaxed break-words whitespace-pre-line">
            {item.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close notification"
        className={`shrink-0 p-1 rounded-md transition-colors ${styles.close}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const SERVER_SNAPSHOT: ToastItem[] = [];
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function Toaster() {
  const activeToasts = useSyncExternalStore(subscribeToasts, getToastsSnapshot, getServerSnapshot);

  if (!activeToasts || activeToasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      aria-live="polite"
      className="fixed top-4 right-4 z-[999999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-full pointer-events-none"
    >
      {activeToasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => dismissToast(item.id)} />
      ))}
    </aside>
  );
}
