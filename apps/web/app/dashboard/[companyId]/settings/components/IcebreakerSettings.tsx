"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { toast } from "@/lib/toast";

interface Icebreaker {
  question: string;
  payload: string;
  automationId?: string;
}

interface AutomationOption {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
}

interface AccountInfo {
  id: string;
  username: string;
}

export default function IcebreakerSettings() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [icebreakers, setIcebreakers] = useState<Icebreaker[]>([]);
  const [automations, setAutomations] = useState<AutomationOption[]>([]);
  const [metaSynced, setMetaSynced] = useState<boolean>(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // Live preview interactive state
  const [simulatedChat, setSimulatedChat] = useState<Array<{ sender: "user" | "bot"; text: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [icebreakerRes, autoRes] = await Promise.all([
        fetch("/api/instagram/icebreakers"),
        fetch("/api/automations"),
      ]);

      if (icebreakerRes.ok) {
        const data = await icebreakerRes.json();
        setAccount(data.account || null);
        setIcebreakers(Array.isArray(data.icebreakers) ? data.icebreakers : []);
        setMetaSynced(Boolean(data.metaSynced));
        setMetaError(data.metaError || null);
      } else {
        const errData = await icebreakerRes.json().catch(() => ({}));
        logger.warn("Could not fetch icebreakers:", errData);
      }

      if (autoRes.ok) {
        const autoData = await autoRes.json();
        const autoList = Array.isArray(autoData)
          ? autoData
          : Array.isArray(autoData?.automations)
            ? autoData.automations
            : [];
        setAutomations(
          autoList.map((a: any) => ({
            id: a.id,
            name: a.name,
            triggerType: a.triggerType,
            isActive: a.isActive,
          }))
        );
      }
    } catch (err) {
      logger.error("Failed loading icebreaker data:", err);
      toast.error("Failed to load Instagram icebreaker configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIcebreaker = () => {
    if (icebreakers.length >= 4) {
      toast.error("Meta limits Instagram accounts to a maximum of 4 icebreakers.");
      return;
    }
    setIcebreakers([
      ...icebreakers,
      {
        question: "",
        payload: "",
        automationId: "",
      },
    ]);
    toast.info(`Icebreaker #${icebreakers.length + 1} added. Click "Save & Publish" when ready.`);
  };

  const handleUpdateIcebreaker = (
    index: number,
    field: keyof Icebreaker,
    value: string
  ) => {
    setIcebreakers((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      // Auto-populate payload if empty when question changes
      if (field === "question" && !copy[index].payload) {
        copy[index].payload = value.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 30);
      }
      return copy;
    });
  };

  const handleRemoveIcebreaker = (index: number) => {
    const qText = icebreakers[index]?.question?.trim();
    const label = qText ? `"${qText.length > 24 ? qText.slice(0, 24) + "..." : qText}"` : `Icebreaker #${index + 1}`;
    setIcebreakers((prev) => prev.filter((_, i) => i !== index));
    toast.info(`${label} removed from drafts. Click "Save & Publish" to sync changes.`);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= icebreakers.length) return;
    setIcebreakers((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    toast.info("Icebreaker reordered. Remember to click 'Save & Publish' to persist.");
  };

  const handleSave = async () => {
    // Validation
    for (let i = 0; i < icebreakers.length; i++) {
      const item = icebreakers[i];
      if (!item.question.trim()) {
        toast.error(`Icebreaker #${i + 1} must have question text.`);
        return;
      }
      if (item.question.trim().length > 80) {
        toast.error(`Icebreaker #${i + 1} exceeds 80 characters.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/instagram/icebreakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account?.id,
          icebreakers: icebreakers.map((item) => ({
            question: item.question.trim(),
            payload: (item.payload.trim() || item.question.trim()),
            automationId: item.automationId || undefined,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMetaSynced(data.metaSynced);
        setMetaError(data.metaError || null);
        if (data.metaSynced) {
          toast.success("Icebreakers saved and published live to Instagram!");
        } else {
          toast.success("Icebreakers saved locally. Meta sync pending.");
        }
      } else {
        toast.error(data.message || "Failed to save icebreakers.");
      }
    } catch (err) {
      logger.error("Error saving icebreakers:", err);
      toast.error("Network error while publishing icebreakers.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAll = () => {
    setShowClearModal(true);
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/instagram/icebreakers${account?.id ? `?accountId=${account.id}` : ""}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIcebreakers([]);
        setMetaSynced(true);
        setMetaError(null);
        setSimulatedChat([]);
        setShowClearModal(false);
        toast.success("All icebreakers cleared from Instagram.");
      } else {
        toast.error(data.message || "Failed to delete icebreakers.");
      }
    } catch (err) {
      logger.error("Error deleting icebreakers:", err);
      toast.error("Failed to clear icebreakers.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSimulateClick = (item: Icebreaker) => {
    const questionText = item.question || "FAQ Button";
    const linkedAuto = automations.find((a) => a.id === item.automationId);
    const botReply = linkedAuto
      ? `Dispatched automation: "${linkedAuto.name}"`
      : `Triggered payload: [${item.payload || item.question}]`;

    setSimulatedChat([
      { sender: "user", text: questionText },
      { sender: "bot", text: botReply },
    ]);
  };

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading Instagram icebreakers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Meta sync badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200/80 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Instagram DM Icebreakers
            </h2>
            {account && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                @{account.username}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Display up to 4 interactive FAQ buttons to new leads when they first open an Instagram direct message.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {metaSynced ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Meta Profile Synced
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Sync Pending
            </span>
          )}
        </div>
      </div>

      {metaError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Meta Sync Notice</p>
            <p className="mt-0.5 text-amber-700">{metaError}</p>
          </div>
        </div>
      )}

      {/* Main 2-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Icebreaker cards editor */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Configured Buttons
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {icebreakers.length} / 4
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddIcebreaker}
              disabled={icebreakers.length >= 4}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${icebreakers.length >= 4
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Icebreaker
            </button>
          </div>

          {icebreakers.length === 0 ? (
            <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No Icebreakers configured yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create up to 4 clickable FAQ prompt buttons that Instagram presents automatically when a new lead opens your DM.
              </p>
              <button
                type="button"
                onClick={handleAddIcebreaker}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
              >
                Create First Icebreaker
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {icebreakers.map((item, idx) => {
                const charCount = (item.question || "").length;
                const isOverLimit = charCount > 80;

                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-200">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          Question Button #{idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, "down")}
                          disabled={idx === icebreakers.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveIcebreaker(idx)}
                          className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer ml-1"
                          title="Remove icebreaker"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Question Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-slate-700">
                          Question Text (Shown on button)
                        </label>
                        <span
                          className={`font-mono text-[11px] ${isOverLimit
                            ? "text-rose-600 font-bold"
                            : charCount > 70
                              ? "text-amber-600 font-medium"
                              : "text-slate-400"
                            }`}
                        >
                          {charCount} / 80
                        </span>
                      </div>
                      <input
                        type="text"
                        value={item.question}
                        maxLength={80}
                        onChange={(e) => handleUpdateIcebreaker(idx, "question", e.target.value)}
                        placeholder="e.g. What is your pricing?"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Action Dispatch Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Automation link picker */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Linked Automation (Optional)
                        </label>
                        <select
                          value={item.automationId || ""}
                          onChange={(e) => handleUpdateIcebreaker(idx, "automationId", e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                        >
                          <option value="">None (match via keyword / payload)</option>
                          {automations.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} {!a.isActive ? "(Inactive)" : ""}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400">
                          Directly dispatches this automation when tapped.
                        </p>
                      </div>

                      {/* Custom Payload Keyword */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          Webhook Payload / Keyword
                        </label>
                        <input
                          type="text"
                          value={item.payload}
                          onChange={(e) => handleUpdateIcebreaker(idx, "payload", e.target.value)}
                          placeholder="e.g. PRICING"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-slate-800 placeholder:text-slate-400"
                        />
                        <p className="text-[10px] text-slate-400">
                          Sent to webhook if no direct automation is chosen.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={isDeleting || icebreakers.length === 0}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all disabled:opacity-40 cursor-pointer text-center"
            >
              {isDeleting ? "Clearing..." : "Clear All Icebreakers"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publishing to Meta...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save & Publish to Instagram
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Live Instagram Mobile Simulator */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xl max-w-sm mx-auto text-slate-900">
            {/* Phone Speaker & Camera notch */}
            <div className="w-24 h-3.5 bg-slate-200/80 rounded-full mx-auto mb-4" />

            {/* Instagram DM Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 px-1">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-800">
                    {account?.username ? account.username.charAt(0).toUpperCase() : "I"}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-none">{account?.username || "your_brand"}</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Instagram Business</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Simulator Screen Content */}
            <div className="py-6 px-1 flex flex-col justify-between min-h-[380px]">
              {/* Account Profile Card */}
              <div className="text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px] mx-auto">
                  <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-800">
                    {account?.username ? account.username.charAt(0).toUpperCase() : "I"}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{account?.username || "Your Instagram Brand"}</h4>
                  <p className="text-[11px] text-slate-500">Instagram • 24h average reply time</p>
                </div>
              </div>

              {/* Simulated chat thread */}
              {simulatedChat.length > 0 && (
                <div className="space-y-2 my-2">
                  {simulatedChat.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${msg.sender === "user"
                          ? "bg-blue-600 text-white rounded-br-xs"
                          : "bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-xs"
                          }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Icebreaker interactive buttons */}
              <div className="space-y-2 pt-4">
                <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider font-semibold">
                  Frequently Asked Questions
                </p>

                {icebreakers.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-400 py-4 italic">
                    Add icebreaker questions on the left to preview them here.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {icebreakers.map((ib, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSimulateClick(ib)}
                        className="w-full px-3.5 py-2 text-left rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span className="truncate">{ib.question || `Icebreaker Question #${i + 1}`}</span>
                        <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Simulated DM Input Footer */}
            <div className="pt-3 border-t border-slate-200 px-1">
              <div className="px-3 py-2 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-400">
                <span>Message...</span>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear All In-App Confirmation Modal */}
      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Clear All Icebreakers?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to remove all icebreakers from Instagram? This immediately wipes FAQ prompt buttons from new direct message threads on Meta.
                </p>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Confirm Clear All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
