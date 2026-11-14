"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Instagram,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Download,
  RefreshCw,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Tag,
  Camera,
  X,
} from "lucide-react";

export interface StoryMentionItem {
  id: string;
  instagramAccountId: string;
  instagramUserId: string;
  username: string | null;
  followerCount: number | null;
  mediaUrl: string | null;
  storyExpiresAt: string | null;
  repostStatus: "PENDING" | "REPOSTED" | "DISMISSED";
  dynamicPromoCode: string | null;
  createdAt: string;
  instagramAccount?: {
    id: string;
    username: string;
    profilePictureUrl?: string;
  };
}

interface StoryMentionsTableProps {
  instagramAccountId?: string | null;
  basePath?: string;
}

export default function StoryMentionsTable({
  instagramAccountId,
  basePath,
}: StoryMentionsTableProps) {
  const [mentions, setMentions] = useState<StoryMentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMentions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (instagramAccountId) params.set("accountId", instagramAccountId);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/instagram/story-mentions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMentions(data.mentions || []);
      }
    } catch (err) {
      console.error("Failed to fetch story mentions:", err);
    } finally {
      setLoading(false);
    }
  }, [instagramAccountId, statusFilter]);

  useEffect(() => {
    fetchMentions();
  }, [fetchMentions]);

  const handleUpdateStatus = async (mentionId: string, newStatus: string) => {
    setUpdatingId(mentionId);
    try {
      const res = await fetch(`/api/instagram/story-mentions/${mentionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repostStatus: newStatus }),
      });
      if (res.ok) {
        setMentions((prev) =>
          prev.map((m) => (m.id === mentionId ? { ...m, repostStatus: newStatus as any } : m))
        );
      }
    } catch (err) {
      console.error("Failed to update mention status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMentions = mentions.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.username?.toLowerCase().includes(q) ||
      m.instagramUserId.includes(q) ||
      m.dynamicPromoCode?.toLowerCase().includes(q)
    );
  });

  const getRemainingHours = (expiresAtStr: string | null) => {
    if (!expiresAtStr) return null;
    const expiresAt = new Date(expiresAtStr).getTime();
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return "Expired";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${hours}h left`;
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/80">
          {["ALL", "PENDING", "REPOSTED", "DISMISSED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${statusFilter === status ? "bg-white text-blue-700 font-bold shadow-2xs border border-blue-100/80" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"}`}
            >
              {status === "ALL" && "All Mentions"}
              {status === "PENDING" && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>Pending Repost</span>
                </span>
              )}
              {status === "REPOSTED" && (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Reposted</span>
                </span>
              )}
              {status === "DISMISSED" && (
                <span className="inline-flex items-center gap-1.5">
                  <XCircle className="w-3 h-3 text-slate-400" />
                  <span>Dismissed</span>
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by username or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={fetchMentions}
            title="Refresh list"
            className="p-2 text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Gallery / List Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <div className="w-8 h-8 mx-auto border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading user-generated story mentions...</p>
        </div>
      ) : filteredMentions.length === 0 ? (
        <div className="p-12 text-center bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-14 h-14 mx-auto bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl flex items-center justify-center">
            <Camera className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Story Mentions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            When users tag @yourbrand in their Instagram Stories, their story media, follower count, and dynamic coupons will automatically appear here for 1-click reposting.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMentions.map((item) => {
            const isVip = (item.followerCount || 0) >= 5000;
            const remaining = getRemainingHours(item.storyExpiresAt);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-0.5">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-800">
                        {item.username ? item.username[0].toUpperCase() : "U"}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          @{item.username || item.instagramUserId}
                        </span>
                        {isVip && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            <span>VIP</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {item.followerCount ? `${item.followerCount.toLocaleString()} followers` : "Community Member"}
                      </p>
                    </div>
                  </div>

                  {remaining && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${remaining === "Expired"
                          ? "bg-slate-100 text-slate-400"
                          : "bg-rose-50 text-rose-600 font-mono"
                        }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>{remaining}</span>
                    </span>
                  )}
                </div>

                {/* Media Preview Box */}
                <div className="relative bg-slate-950 aspect-[9/12] max-h-64 flex items-center justify-center overflow-hidden group">
                  {item.mediaUrl ? (
                    <img
                      src={item.mediaUrl}
                      alt="Story preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400">
                      <Instagram className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Story Asset Tagged</p>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  {item.mediaUrl && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewMediaUrl(item.mediaUrl)}
                        className="p-2.5 bg-white/90 text-slate-900 rounded-full hover:bg-white transition-all shadow-lg cursor-pointer"
                        title="View Full Size"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="p-2.5 bg-white/90 text-slate-900 rounded-full hover:bg-white transition-all shadow-lg cursor-pointer"
                        title="Download Asset"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer / Status & Actions */}
                <div className="p-4 bg-slate-50/50 space-y-3">
                  {item.dynamicPromoCode && (
                    <div className="flex items-center justify-between text-xs bg-purple-50/80 border border-purple-200/60 rounded-xl px-2.5 py-1.5">
                      <span className="text-purple-700 font-medium">Coupon Generated:</span>
                      <span className="font-mono font-bold text-purple-900 bg-purple-100/70 px-1.5 py-0.5 rounded">
                        {item.dynamicPromoCode}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href={`https://ig.me/m/${item.username || item.instagramUserId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <Instagram className="w-3.5 h-3.5 text-rose-500" />
                      <span>Open IG</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>

                    <div className="flex items-center gap-1.5">
                      {item.repostStatus !== "REPOSTED" && (
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, "REPOSTED")}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Reposted</span>
                        </button>
                      )}
                      {item.repostStatus !== "DISMISSED" && (
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, "DISMISSED")}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                          title="Dismiss"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Preview Modal */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 p-2 rounded-full cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewMediaUrl}
              alt="Story Preview Full"
              className="w-full h-auto max-h-[80vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
