// Toast state manager and event dispatcher (Zero external dependencies)

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  createdAt: number;
}

type Listener = () => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToastsSnapshot(): ToastItem[] {
  return toasts;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

function addToast(type: ToastType, title: string, description?: string, options?: Partial<ToastOptions>): string {
  const id = options?.id || Math.random().toString(36).substring(2, 9);
  const duration = options?.duration ?? (type === "error" ? 6000 : 4000);

  // Avoid duplicate toasts with same title & description within short interval
  const isDuplicate = toasts.some(
    (t) => t.type === type && t.title === title && t.description === description && Date.now() - t.createdAt < 1000
  );
  if (isDuplicate) return id;

  const newToast: ToastItem = {
    id,
    type,
    title,
    description,
    duration,
    createdAt: Date.now(),
  };

  // Limit active toasts to 5 at a time
  toasts = [...toasts.slice(-4), newToast];
  notify();

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}

function parseError(error: unknown, fallbackTitle = "An error occurred"): { title: string; description?: string } {
  if (!error) return { title: fallbackTitle };
  if (typeof error === "string") return { title: error };
  if (error instanceof Error) {
    return { title: fallbackTitle, description: error.message };
  }
  if (typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    const message = (errObj.message || errObj.error || errObj.details) as string | undefined;
    if (message) return { title: fallbackTitle, description: String(message) };
  }
  return { title: fallbackTitle };
}

export const toast = {
  success: (title: string, description?: string, options?: Partial<ToastOptions>) =>
    addToast("success", title, description, options),

  error: (titleOrError: unknown, descriptionOrFallback?: string, options?: Partial<ToastOptions>) => {
    if (typeof titleOrError === "string") {
      return addToast("error", titleOrError, descriptionOrFallback, options);
    }
    const { title, description } = parseError(titleOrError, descriptionOrFallback || "Action failed");
    return addToast("error", title, description, options);
  },

  warning: (title: string, description?: string, options?: Partial<ToastOptions>) =>
    addToast("warning", title, description, options),

  info: (title: string, description?: string, options?: Partial<ToastOptions>) =>
    addToast("info", title, description, options),

  dismiss: (id: string) => dismissToast(id),
};
