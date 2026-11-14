"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Mail,
  Phone,
  User,
  Loader2,
  AlertCircle,
  Folder,
  Pin,
  Plus,
  Layers,
  Sparkles,
  ArrowUpDown,
  Check,
  Copy,
  ChevronDown,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import ExportConfigModal from "./ExportConfigModal";

interface AudienceList {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  color: string;
  isPinned: boolean;
  pinnedOrder: number;
  totalContacts: number;
  emailCount: number;
  phoneCount: number;
  createdAt: string;
}

interface Contact {
  id: string;
  username: string;
  instagramAccountId: string;
  instagramUserId: string;
  emails: string[];
  phoneNumbers: string[];
  primaryEmail: string | null;
  primaryPhone: string | null;
  folderName?: string | null;
  automationName?: string | null;
  source?: string | null;
  audienceLists?: Array<{ id: string; name: string; color: string; isPinned?: boolean }>;
  primaryAudienceList?: { id: string; name: string; color: string } | null;
  updatedAt: string;
  createdAt: string;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", ring: "ring-blue-500" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", ring: "ring-indigo-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", ring: "ring-amber-500" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", ring: "ring-rose-500" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", ring: "ring-violet-500" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200", ring: "ring-cyan-500" },
  slate: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", ring: "ring-slate-500" },
};

interface AudienceListDashboardProps {
  initialListId?: string;
}

export default function AudienceListDashboard({
  initialListId,
}: AudienceListDashboardProps = {}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [audienceLists, setAudienceLists] = useState<AudienceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedListId, setSelectedListId] = useState<string>(initialListId || "all");
  const [channelFilter, setChannelFilter] = useState<"all" | "email" | "phone" | "both">("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAllListsModalOpen, setIsAllListsModalOpen] = useState(false);
  const [activeReassignContactId, setActiveReassignContactId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Create list form state
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListColor, setNewListColor] = useState("blue");
  const [newListPinned, setNewListPinned] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  // Fetch Audience Lists
  const loadAudienceLists = useCallback(async () => {
    try {
      const res = await fetch("/api/audience-lists");
      if (!res.ok) throw new Error("Failed to load audience lists");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAudienceLists(data);
      }
    } catch (err) {
      logger.error("Failed to fetch audience lists:", err);
    }
  }, []);

  // Fetch Contacts
  const loadContacts = useCallback(
    async (nextPage: number, append: boolean) => {
      append ? setLoadingMore(true) : setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: "15",
          sortBy,
          sortOrder,
        });

        if (selectedListId && selectedListId !== "all") {
          params.set("audienceListId", selectedListId);
        }
        if (channelFilter && channelFilter !== "all") {
          params.set("channelFilter", channelFilter);
        }
        if (search.trim()) {
          params.set("search", search.trim());
        }

        const res = await fetch(`/api/audience-contacts?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load contacts");
        const data = await res.json();
        const newItems: Contact[] = data.contacts || [];
        setContacts((prev) => (append ? [...prev, ...newItems] : newItems));
        setPage(nextPage);
        setHasMore(data.pagination?.hasMore ?? false);
      } catch (err) {
        setError("Failed to load audience list. Please try again later.");
        logger.error(err);
      } finally {
        append ? setLoadingMore(false) : setLoading(false);
      }
    },
    [selectedListId, channelFilter, search, sortBy, sortOrder]
  );

  useEffect(() => {
    loadAudienceLists();
  }, [loadAudienceLists]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadContacts(1, false);
    }, 200);
    return () => clearTimeout(timer);
  }, [loadContacts]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadContacts(page + 1, true);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      const res = await fetch("/api/audience-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim() || undefined,
          color: newListColor,
          isPinned: newListPinned,
        }),
      });
      if (!res.ok) throw new Error("Failed to create list");
      await loadAudienceLists();
      setNewListName("");
      setNewListDescription("");
      setNewListColor("blue");
      setNewListPinned(false);
      setIsCreateModalOpen(false);
    } catch (err) {
      logger.error("Error creating list:", err);
    } finally {
      setCreatingList(false);
    }
  };

  const handleTogglePin = async (listId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/audience-lists/${listId}/pin`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle pin");
      await loadAudienceLists();
    } catch (err) {
      logger.error("Error toggling pin:", err);
    }
  };

  const handleReassignContact = async (contactCaptureId: string, audienceListId: string) => {
    try {
      const res = await fetch("/api/audience-lists/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactCaptureId,
          audienceListId,
          action: "set",
        }),
      });
      if (!res.ok) throw new Error("Failed to reassign contact");
      setActiveReassignContactId(null);
      await loadContacts(page, false);
      await loadAudienceLists();
    } catch (err) {
      logger.error("Error reassigning contact:", err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // Top pinned lists (up to 4)
  const pinnedLists = audienceLists.filter((l) => l.isPinned).slice(0, 4);

  // Stats computation
  const totalEmails = contacts.reduce((acc, c) => acc + (c.emails?.length || 0), 0);
  const totalPhones = contacts.reduce((acc, c) => acc + (c.phoneNumbers?.length || 0), 0);

  const activeListObject = audienceLists.find((l) => l.id === selectedListId);
  const activeListName = selectedListId === "all" ? "All Audience Contacts" : activeListObject?.name || "Audience List";

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Captured Contacts
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <User size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tnum">
            {contacts.length.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Unique prospects across lists</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Verified Emails
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Mail size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tnum">
            {totalEmails.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Direct newsletter & marketing inboxes</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Phone Numbers
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Phone size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tnum">
            {totalPhones.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">WhatsApp & high-intent SMS leads</p>
        </div>
      </div>

      {/* Feature 3: Top Pinned Lists Quick-Access Bar */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin size={14} className="text-blue-600 rotate-45" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Pinned Project Lists
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              (Quick 1-click filter)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAllListsModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              See All Lists ({audienceLists.length})
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <Plus size={13} />
              New List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* "All Contacts" Default Quick Card */}
          <div
            onClick={() => setSelectedListId("all")}
            className={cn(
              "p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between group",
              selectedListId === "all"
                ? "bg-blue-50/80 border-blue-400 shadow-sm ring-2 ring-blue-500/20"
                : "bg-white/80 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 truncate">All Contacts</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                Master
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-extrabold text-slate-900 font-display">
                {contacts.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">All campaigns</span>
            </div>
          </div>

          {/* User Pinned Lists */}
          {pinnedLists.map((list) => {
            const isSelected = selectedListId === list.id;
            const colorTokens = COLOR_MAP[list.color] || COLOR_MAP.blue;

            return (
              <div
                key={list.id}
                onClick={() => setSelectedListId(isSelected ? "all" : list.id)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between group",
                  isSelected
                    ? `${colorTokens.bg} ${colorTokens.border} shadow-sm ring-2 ${colorTokens.ring}/20`
                    : "bg-white/80 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn("text-xs font-bold truncate", isSelected ? colorTokens.text : "text-slate-900")}>
                    {list.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleTogglePin(list.id, e)}
                    className="p-1 rounded-md text-blue-600 hover:bg-blue-100/60 transition-colors cursor-pointer"
                    title="Unpin list"
                  >
                    <Pin size={11} className="rotate-45" />
                  </button>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-xl font-extrabold text-slate-900 font-display">
                    {list.totalContacts}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500">
                    <span className="text-emerald-700">{list.emailCount} emails</span>
                    <span>•</span>
                    <span className="text-sky-700">{list.phoneCount} phones</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Fallback if user has no pinned lists */}
          {pinnedLists.length === 0 && (
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="p-3.5 rounded-2xl border border-dashed border-slate-300 hover:border-blue-400 bg-white/40 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center py-5 col-span-1 sm:col-span-3"
            >
              <Plus size={16} className="text-slate-400 mb-1" />
              <span className="text-xs font-bold text-slate-700">Create your first product list</span>
              <span className="text-[11px] text-slate-400">e.g. Newsletter, Course Launch, VIP Advisory</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="glass-panel p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by handle, email, phone or automation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* Project / List Selector Dropdown */}
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-xs"
          >
            <option value="all">All Lists ({audienceLists.reduce((a, b) => a + b.totalContacts, 0)})</option>
            {audienceLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.totalContacts})
              </option>
            ))}
          </select>

          {/* Channel Filter (All, Email, Phone, Both) */}
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
            {(
              [
                { id: "all", label: "All" },
                { id: "email", label: "Email" },
                { id: "phone", label: "Phone" },
                { id: "both", label: "Both" },
              ] as const
            ).map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannelFilter(ch.id)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all cursor-pointer text-xs",
                  channelFilter === ch.id
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Sorting Dropdown */}
          <button
            type="button"
            onClick={() => {
              if (sortBy === "createdAt") {
                setSortBy("username");
                setSortOrder("asc");
              } else {
                setSortBy("createdAt");
                setSortOrder("desc");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs cursor-pointer"
            title="Toggle sort order"
          >
            <ArrowUpDown size={13} className="text-slate-400" />
            <span>{sortBy === "username" ? "By Username" : "By Date"}</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            disabled={contacts.length === 0}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-all shadow-xs active:scale-95 cursor-pointer",
              contacts.length === 0
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-blue-500/25"
            )}
          >
            <Download size={13} />
            Export List ({contacts.length})
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="glass-panel overflow-hidden border border-slate-200/80">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-800">Loading audience contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 border border-slate-200/60">
              <User size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-display">No contacts found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search keywords, list filter, or channel selection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Instagram Profile</th>
                  <th className="py-3 px-4">Audience List / Project</th>
                  <th className="py-3 px-4">Captured Emails</th>
                  <th className="py-3 px-4">Phone Numbers</th>
                  <th className="py-3 px-4">Automation Origin</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Captured On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/70">
                {contacts.map((contact) => {
                  const assignedList = contact.primaryAudienceList || contact.audienceLists?.[0];
                  const colorTokens = assignedList ? COLOR_MAP[assignedList.color] || COLOR_MAP.blue : COLOR_MAP.slate;

                  return (
                    <tr key={contact.id} className="hover:bg-slate-50/80 transition-all">
                      {/* Column 1: Instagram Profile */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                            {contact.username?.charAt(0).toUpperCase() || <User size={14} />}
                          </div>
                          <div className="min-w-0">
                            <a
                              href={`https://instagram.com/${contact.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-slate-900 text-xs sm:text-sm hover:underline block truncate"
                            >
                              @{contact.username}
                            </a>
                            <span className="text-[10.5px] text-slate-400 font-mono truncate block">
                              ID: {contact.instagramUserId || "N/A"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Audience List / Project with 1-Click Reassignment */}
                      <td className="py-3.5 px-4">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReassignContactId(
                                activeReassignContactId === contact.id ? null : contact.id
                              )
                            }
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs",
                              colorTokens.bg,
                              colorTokens.text,
                              colorTokens.border
                            )}
                          >
                            <Layers size={11} />
                            <span>{assignedList?.name || "General Inbound"}</span>
                            <ChevronDown size={11} className="opacity-60" />
                          </button>

                          {/* Quick List Switcher Dropdown */}
                          {activeReassignContactId === contact.id && (
                            <div className="absolute z-20 mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 block">
                                Reassign to List:
                              </span>
                              {audienceLists.map((list) => (
                                <button
                                  key={list.id}
                                  type="button"
                                  onClick={() => handleReassignContact(contact.id, list.id)}
                                  className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer",
                                    assignedList?.id === list.id ? "bg-blue-50 text-blue-700" : "text-slate-700"
                                  )}
                                >
                                  <span>{list.name}</span>
                                  {assignedList?.id === list.id && <Check size={12} className="text-blue-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Captured Emails */}
                      <td className="py-3.5 px-4">
                        {contact.emails && contact.emails.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {contact.emails.map((email, i) => (
                              <div
                                key={i}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium group"
                              >
                                <Mail size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate max-w-[170px]">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(email)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                  title="Copy email"
                                >
                                  {copiedText === email ? (
                                    <Check size={11} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No email</span>
                        )}
                      </td>

                      {/* Column 4: Phone Numbers */}
                      <td className="py-3.5 px-4">
                        {contact.phoneNumbers && contact.phoneNumbers.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {contact.phoneNumbers.map((phone, i) => (
                              <div
                                key={i}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium group"
                              >
                                <Phone size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">{phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(phone)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                  title="Copy phone"
                                >
                                  {copiedText === phone ? (
                                    <Check size={11} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No phone</span>
                        )}
                      </td>

                      {/* Column 5: Automation Origin */}
                      <td className="py-3.5 px-4">
                        {contact.folderName || contact.automationName ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-900 w-fit text-xs font-semibold">
                              <Folder size={11} className="text-amber-600 shrink-0" />
                              <span className="text-[10px]">{contact.folderName || "General"}</span>
                              <span className="text-amber-300 text-[10px]">/</span>
                              <span className="text-[10px]">{contact.automationName || "Automation"}</span>
                            </div>
                            {/* <span className="text-[10px] text-slate-400 font-mono pl-0.5">
                              {contact.source}
                            </span> */}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Direct Inbound</span>
                        )}
                      </td>

                      {/* Column 6: Captured On */}
                      <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-500 font-medium whitespace-nowrap text-right tnum">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 text-xs font-semibold rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 shadow-xs cursor-pointer transition-all"
          >
            {loadingMore ? "Loading more contacts..." : "Load More Contacts"}
          </button>
        </div>
      )}

      {/* Feature 1: Create New List Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 font-display">Create Audience List</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateList} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">List Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Newsletter, Product A Course"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Subscribers captured from Reel giveaways and bio links"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Color Tag</label>
                <div className="flex items-center gap-2">
                  {Object.keys(COLOR_MAP).map((colorKey) => (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setNewListColor(colorKey)}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 transition-transform cursor-pointer",
                        COLOR_MAP[colorKey].bg,
                        COLOR_MAP[colorKey].border,
                        newListColor === colorKey ? "scale-110 ring-2 ring-blue-500 ring-offset-2" : "opacity-70 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newListPinned}
                    onChange={(e) => setNewListPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pin to Top Quick-Access Bar</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingList || !newListName.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {creatingList ? "Saving..." : "Create List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "See All Lists" Directory Modal */}
      {isAllListsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display">All Audience Project Lists</h2>
                <p className="text-xs text-slate-500">{audienceLists.length} total lists configured</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAllListsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {audienceLists.map((list) => {
                const colorTokens = COLOR_MAP[list.color] || COLOR_MAP.blue;
                return (
                  <div
                    key={list.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3.5 h-3.5 rounded-full", colorTokens.bg, colorTokens.border, "border")} />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{list.name}</span>
                        {list.description && (
                          <span className="text-[11px] text-slate-400 block">{list.description}</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-medium">
                          {list.totalContacts} contacts ({list.emailCount} emails, {list.phoneCount} phones)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(list.id)}
                        className={cn(
                          "p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer",
                          list.isPinned
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <Pin size={12} className={list.isPinned ? "rotate-45" : ""} />
                        <span>{list.isPinned ? "Pinned" : "Pin"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedListId(list.id);
                          setIsAllListsModalOpen(false);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Filter View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Feature 7: Precision Export Modal */}
      <ExportConfigModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        contacts={contacts}
        activeListName={activeListName}
        activeFiltersText={`Channel: ${channelFilter.toUpperCase()} | Sorting: ${sortBy} ${sortOrder}`}
      />
    </div>
  );
}
