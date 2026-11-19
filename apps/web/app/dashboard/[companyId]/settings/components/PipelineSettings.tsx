"use client";

import { useState, useEffect } from "react";
import { toast } from "@/lib/toast";
import {
  Kanban,
  Tag,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  Save,
  MessageSquare,
  Hash,
} from "lucide-react";

export default function PipelineSettings() {
  const [customStatuses, setCustomStatuses] = useState<string[]>(["New", "Engaged", "Qualified"]);
  const [newStatusName, setNewStatusName] = useState("");
  const [customTags, setCustomTags] = useState<string[]>(["VIP", "Hot Lead", "High Budget", "Warm"]);
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch pipeline config
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const res = await fetch("/api/crm/pipeline-config");
        if (res.ok) {
          const data = await res.json();
          const customStatusesList = data.customStatuses || data.config?.customStatuses;
          if (Array.isArray(customStatusesList) && customStatusesList.length > 0) {
            setCustomStatuses(customStatusesList);
          }
          const customTagsList = data.customTags || data.config?.customTags;
          if (Array.isArray(customTagsList)) {
            setCustomTags(customTagsList);
          }
        }
      } catch (err) {
        console.error("Error loading pipeline config:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (customStatuses.length < 1) {
      const err = "You must have at least 1 custom status.";
      setErrorMessage(err);
      toast.error(err);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/crm/pipeline-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customStatuses,
          customTags,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update pipeline settings");
      }

      setSuccessMessage("Pipeline configuration and tags saved successfully!");
      toast.success("Pipeline configuration and tags saved successfully!");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pipeline-config-updated"));
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      const errText = err.message || "An error occurred while saving.";
      setErrorMessage(errText);
      toast.error("Failed to save pipeline configuration", errText);
    } finally {
      setSaving(false);
    }
  };

  const addStatus = () => {
    const trimmed = newStatusName.trim();
    if (!trimmed) return;
    if (customStatuses.includes(trimmed)) {
      setErrorMessage("A status with this name already exists.");
      toast.warning(`Status "${trimmed}" already exists.`);
      return;
    }
    if (customStatuses.length >= 8) {
      setErrorMessage("Maximum 8 custom statuses allowed.");
      toast.warning("Maximum 8 custom statuses allowed.");
      return;
    }
    setCustomStatuses([...customStatuses, trimmed]);
    setNewStatusName("");
    setErrorMessage(null);
    toast.info(`Status "${trimmed}" added. Remember to click Save.`);
  };

  const removeStatus = (idx: number) => {
    if (customStatuses.length <= 1) {
      setErrorMessage("You must have at least 1 custom status.");
      toast.error("You must have at least 1 custom status.");
      return;
    }
    const removed = customStatuses[idx];
    setCustomStatuses(customStatuses.filter((_, i) => i !== idx));
    setErrorMessage(null);
    toast.info(`Status "${removed}" removed. Remember to click Save.`);
  };

  const moveStatus = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= customStatuses.length) return;
    const reordered = [...customStatuses];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    setCustomStatuses(reordered);
    toast.info("Status reordered. Remember to click Save.");
  };

  const addTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    if (customTags.includes(trimmed)) {
      toast.warning(`Tag "${trimmed}" already exists.`);
      return;
    }
    setCustomTags([...customTags, trimmed]);
    setNewTagName("");
    toast.info(`Tag "${trimmed}" added. Remember to click Save.`);
  };

  const removeTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((t) => t !== tagToRemove));
    toast.info(`Tag "${tagToRemove}" removed. Remember to click Save.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: Pipeline Statuses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Kanban className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Custom Pipeline Stages
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure your custom workflow stages (e.g. 1 to 8 stages).
            </p>
          </div>
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
            {customStatuses.length} custom stage{customStatuses.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Statuses List */}
        <div className="space-y-2">
          {customStatuses.map((status, idx) => (
            <div
              key={status}
              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center font-mono">
                  {idx + 1}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {status}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Custom Stage
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => moveStatus(idx, "up")}
                  disabled={idx === 0}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStatus(idx, "down")}
                  disabled={idx === customStatuses.length - 1}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStatus(idx)}
                  disabled={customStatuses.length <= 1}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Remove Status"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Status Input */}
        {customStatuses.length < 8 ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="e.g. Discovery Call, Proposal Sent, Won"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStatus())}
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <button
              type="button"
              onClick={addStatus}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Stage
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Maximum of 8 custom stages reached.
          </p>
        )}
      </div>

      <hr className="border-slate-200/60" />

      {/* SECTION 2: Custom Lead Tags */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Tag className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Lead Qualification Tags
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tags used to categorize and filter leads in your CRM pipeline (e.g. VIP, High Budget).
          </p>
        </div>

        {/* Tag Pills */}
        <div className="flex flex-wrap gap-2">
          {customTags.map((tag) => (
            <span
              key={tag}
              className="group inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-xs font-semibold shadow-2xs"
            >
              <Hash className="w-3 h-3 text-blue-500" />
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
                title={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add Tag */}
        <div className="flex items-center gap-2 max-w-md">
          <input
            type="text"
            placeholder="New tag (e.g. Enterprise, Local, Influencer)"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          <button
            type="button"
            onClick={addTag}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="pt-4 border-t border-slate-200/70 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
          <span>{saving ? "Saving Changes..." : "Save Pipeline Configuration"}</span>
        </button>
      </div>
    </div>
  );
}
