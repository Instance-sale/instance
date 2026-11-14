"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Trophy,
  Camera,
  Sparkles,
  Zap,
  CheckCircle2,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { CelebrationModal } from "./CelebrationModal";

export interface NotificationItem {
  id: string;
  type: "MILESTONE" | "STORY_MENTION" | "QUALIFIED_LEAD" | "AUTOMATION_ALERT" | "SYSTEM";
  title: string;
  message: string;
  metadata?: any;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  companyId?: string;
  basePath?: string;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell({
  companyId,
  basePath = "",
  className = "",
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "MILESTONE" | "STORY_MENTION" | "LEADS">("ALL");
  const [activeCelebration, setActiveCelebration] = useState<NotificationItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const url = companyId ? `/api/notifications?companyId=${companyId}` : "/api/notifications";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Non-blocking fetch failure
    }
  }, [companyId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (item: NotificationItem) => {
    if (!item.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        const url = companyId
          ? `/api/notifications/${item.id}/read?companyId=${companyId}`
          : `/api/notifications/${item.id}/read`;
        await fetch(url, { method: "PATCH" });
      } catch {
        // Ignored
      }
    }

    if (item.type === "MILESTONE") {
      setActiveCelebration(item);
    } else if (item.linkUrl) {
      setIsOpen(false);
      const targetUrl = item.linkUrl.startsWith("http")
        ? item.linkUrl
        : `${basePath}/${item.linkUrl.replace(/^\//, "")}`;
      router.push(targetUrl);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      const url = companyId
        ? `/api/notifications/read-all?companyId=${companyId}`
        : "/api/notifications/read-all";
      await fetch(url, { method: "POST" });
    } catch {
      // Ignored
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "MILESTONE") return n.type === "MILESTONE";
    if (activeFilter === "STORY_MENTION") return n.type === "STORY_MENTION";
    if (activeFilter === "LEADS") return n.type === "QUALIFIED_LEAD";
    return true;
  });

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "MILESTONE":
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
            <Trophy size={16} />
          </div>
        );
      case "STORY_MENTION":
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Camera size={16} />
          </div>
        );
      case "QUALIFIED_LEAD":
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles size={16} />
          </div>
        );
      case "AUTOMATION_ALERT":
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap size={16} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Bell size={16} />
          </div>
        );
    }
  };

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
        {/* Bell Trigger Button */}
        <button
          type="button"
          onClick={() => {
            const nextState = !isOpen;
            setIsOpen(nextState);
            if (nextState) fetchNotifications();
          }}
          className="cursor-pointer p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 transition-all border border-transparent hover:border-slate-200/60 relative"
          title="Notifications & Activity"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-xs ring-2 ring-white animate-in zoom-in-50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-200/90 overflow-hidden"
            >
              {/* Header */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold border border-rose-200/60">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {(
                    [
                      { id: "ALL", label: "All" },
                      { id: "MILESTONE", label: "Milestones" },
                      { id: "STORY_MENTION", label: "Mentions" },
                      { id: "LEADS", label: "Leads" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        activeFilter === tab.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification List */}
              <div className="divide-y divide-slate-100/70 max-h-[360px] overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No notifications matching this filter right now.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleMarkAsRead(item)}
                      className={`p-3 text-xs flex items-start gap-3 transition-colors cursor-pointer group ${
                        item.isRead
                          ? "hover:bg-slate-50/80 opacity-80"
                          : "bg-blue-50/30 hover:bg-blue-50/60 font-medium"
                      }`}
                    >
                      {getIcon(item.type)}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${item.isRead ? "text-slate-800" : "font-bold text-slate-900"}`}>
                            {item.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                        {item.type === "MILESTONE" && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <Trophy size={10} />
                            Click to celebrate
                          </span>
                        )}
                      </div>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5 ring-2 ring-white" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celebration Modal for Milestone Unlocks */}
      {activeCelebration && (
        <CelebrationModal
          isOpen={Boolean(activeCelebration)}
          onClose={() => setActiveCelebration(null)}
          title={activeCelebration.title}
          message={activeCelebration.message}
          metadata={activeCelebration.metadata}
          onAction={() => {
            if (activeCelebration.linkUrl) {
              const targetUrl = activeCelebration.linkUrl.startsWith("http")
                ? activeCelebration.linkUrl
                : `${basePath}/${activeCelebration.linkUrl.replace(/^\//, "")}`;
              router.push(targetUrl);
            }
          }}
        />
      )}
    </>
  );
}
