"use client";

import { useState, useEffect, useMemo } from "react";
import { InstagramMediaItem } from "@/lib/types/instagram";
import {
  X,
  Image as ImageIcon,
  Film,
  Layers,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Calendar,
} from "lucide-react";
import { logger } from "@/lib/logger";

interface MediaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaId: string, mediaType: string, item?: InstagramMediaItem) => void;
  accountId: string;
  type: "post" | "reel" | "story" | "all";
}

export default function MediaSelector({
  isOpen,
  onClose,
  onSelect,
  accountId,
  type,
}: MediaSelectorProps) {
  const [media, setMedia] = useState<InstagramMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "untagged" | "automated">("all");
  const [paging, setPaging] = useState<{
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  } | null>(null);

  const totalCount = media.length;
  const automatedCount = useMemo(() => media.filter((m) => m.isAutomated).length, [media]);
  const untaggedCount = useMemo(() => media.filter((m) => !m.isAutomated).length, [media]);

  const filteredMedia = useMemo(() => {
    if (statusFilter === "untagged") return media.filter((m) => !m.isAutomated);
    if (statusFilter === "automated") return media.filter((m) => Boolean(m.isAutomated));
    return media;
  }, [media, statusFilter]);

  useEffect(() => {
    if (isOpen && accountId) {
      fetchMedia();
    }
  }, [isOpen, accountId, type]);

  const fetchMedia = async (after?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        accountId,
        type,
        limit: "25",
      });
      if (after) {
        params.append("after", after);
      }

      const response = await fetch(`/api/instagram/media?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch media");
      }

      if (after) {
        // Append to existing media (pagination)
        setMedia((prev) => [...prev, ...data.data]);
      } else {
        // Replace media (new fetch)
        setMedia(data.data);
      }
      setPaging(data.paging || null);
    } catch (err: any) {
      logger.error("[MediaSelector] Error fetching media:", err);
      setError(err.message || "Failed to load posts/reels");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: InstagramMediaItem) => {
    setSelectedMediaId(item.id);
  };

  const handleConfirm = () => {
    if (selectedMediaId) {
      const selected = media.find((m) => m.id === selectedMediaId);
      if (selected) {
        // Map Instagram media_type to our mediaType
        let mediaType: string;
        if (type === "story" || selected.media_type === "STORIES" || selected.media_type === "STORY") {
          mediaType = "STORY";
        } else {
          mediaType =
            selected.media_type === "VIDEO" || selected.media_type === "REELS"
              ? "REEL"
              : "POST";
        }
        onSelect(selected.id, mediaType, selected);
        onClose();
      }
    }
  };

  const handleLoadMore = () => {
    if (paging?.cursors?.after) {
      fetchMedia(paging.cursors.after);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Select {type === "post" ? "Post" : type === "reel" ? "Reel" : type === "story" ? "Story" : "Post/Reel"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose which {type === "post" ? "post" : type === "reel" ? "reel" : type === "story" ? "story" : "content"} to attach to this automation trigger
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audit / Tagging Filter Tabs */}
          {!loading && media.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Content ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("untagged")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "untagged"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Untagged ({untaggedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("automated")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "automated"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                Automated ({automatedCount})
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading && media.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-slate-500 font-medium">Loading media...</div>
              </div>
            </div>
          ) : error ? (
            /access token|session has been invalidated|password|not active|unauthorized/i.test(error) ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 space-y-4 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900">
                    Instagram Session Expired
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Meta invalidated your session (often happens after changing a password or security check). Please reconnect your Instagram account to continue loading stories and posts.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 w-full">
                  <a
                    href="/api/instagram/auth"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reconnect Instagram Account</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => fetchMedia()}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center max-w-md border border-red-100 text-xs">
                  {error}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => fetchMedia()}
                    className="px-4 py-2 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                {statusFilter === "untagged" ? (
                  <ShieldCheck className="w-8 h-8 text-emerald-600" />
                ) : (
                  <ImageIcon className="w-8 h-8" />
                )}
              </div>
              <p className="text-slate-900 font-semibold text-lg">
                {statusFilter === "untagged"
                  ? "All recent content is automated!"
                  : statusFilter === "automated"
                    ? "No automations attached yet"
                    : "No media found"}
              </p>
              <div className="text-slate-500 mt-1 max-w-xs text-xs">
                {statusFilter === "untagged"
                  ? "Every one of your loaded posts/stories already has an automation trigger attached."
                  : statusFilter === "automated"
                    ? "None of your loaded posts/stories currently have an active automation."
                    : type === "story"
                        ? "No active stories found (stories expire after 24 hours)."
                        : "We couldn't find any media on your connected account."}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selectedMediaId === item.id
                    ? "border-blue-600 ring-2 ring-blue-200 z-10 scale-[1.02] shadow-lg"
                    : "border-transparent shadow-sm hover:border-blue-300 hover:shadow-md"
                    }`}
                >
                  {/* Thumbnail */}
                  <img
                    src={item.thumbnail_url || item.media_url || "/placeholder.png"}
                    alt={item.caption || "Media"}
                    className="w-full h-full object-cover bg-slate-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.png";
                    }}
                  />

                  {/* Status Badges (Top-Left) */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                    {item.isAutomated ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs"
                        title={item.automation?.name ? `Automated: ${item.automation.name}` : "Automated"}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                        Automated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-amber-300 text-[10px] font-bold shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Untagged
                      </span>
                    )}
                  </div>

                  {/* Selected indicator */}
                  {selectedMediaId === item.id && (
                    <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-[1px] flex items-center justify-center z-20">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-200">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Media type badge (Top-Right) */}
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                    {item.media_type === "VIDEO" || item.media_type === "REELS" ? (
                      <span className="bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-lg">
                        <Film className="w-3 h-3" />
                      </span>
                    ) : item.media_type === "CAROUSEL_ALBUM" ? (
                      <span className="bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-lg">
                        <Layers className="w-3 h-3" />
                      </span>
                    ) : null}
                  </div>

                  {/* Caption & Automation Name preview - Hover only */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    {item.isAutomated && item.automation?.name && (
                      <p className="text-emerald-300 text-[10px] font-bold mb-1 truncate flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 shrink-0" />
                        {item.automation.name}
                      </p>
                    )}
                    {item.caption && (
                      <p className="text-white text-xs line-clamp-2 text-left font-medium">
                        {item.caption}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Load More */}
          {paging?.cursors?.after && !loading && (
            <div className="flex justify-center mt-8 pb-4">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                Load More Media
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {selectedMediaId ? '1 selected' : 'No selection'}
            </span>
            <button
              onClick={handleConfirm}
              disabled={!selectedMediaId}
              className={`px-8 py-2.5 text-sm font-semibold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${selectedMediaId
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                }`}
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
