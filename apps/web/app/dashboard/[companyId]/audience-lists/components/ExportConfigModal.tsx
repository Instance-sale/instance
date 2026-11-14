"use client";

import { useState } from "react";
import { Download, X, Check, FileSpreadsheet, Mail, Phone, Database } from "lucide-react";
import { cn } from "@/lib/utils";

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
  audienceLists?: Array<{ id: string; name: string; color: string }>;
  primaryAudienceList?: { id: string; name: string; color: string } | null;
  createdAt: string;
}

interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  activeListName?: string;
  activeFiltersText?: string;
}

interface ExportColumn {
  id: string;
  label: string;
  getValue: (c: Contact) => string;
}

const AVAILABLE_COLUMNS: ExportColumn[] = [
  { id: "username", label: "Instagram Handle", getValue: (c) => `@${c.username || ""}` },
  { id: "primaryEmail", label: "Primary Email", getValue: (c) => c.primaryEmail || (c.emails?.[0] ?? "") },
  { id: "allEmails", label: "All Emails", getValue: (c) => (c.emails || []).join("; ") },
  { id: "primaryPhone", label: "Primary Phone", getValue: (c) => c.primaryPhone || (c.phoneNumbers?.[0] ?? "") },
  { id: "allPhones", label: "All Phone Numbers", getValue: (c) => (c.phoneNumbers || []).join("; ") },
  { id: "audienceList", label: "Audience List / Project", getValue: (c) => c.primaryAudienceList?.name || c.audienceLists?.map(l => l.name).join(", ") || "General Inbound" },
  { id: "automation", label: "Automation Name", getValue: (c) => c.automationName || "" },
  { id: "folder", label: "Automation Folder", getValue: (c) => c.folderName || "" },
  { id: "source", label: "Full Origin Attribution", getValue: (c) => c.source || "" },
  { id: "instagramUserId", label: "Instagram User ID", getValue: (c) => c.instagramUserId || "" },
  { id: "createdAt", label: "Date Captured", getValue: (c) => new Date(c.createdAt).toLocaleDateString() },
];

export default function ExportConfigModal({
  isOpen,
  onClose,
  contacts,
  activeListName,
  activeFiltersText,
}: ExportConfigModalProps) {
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([
    "username",
    "primaryEmail",
    "primaryPhone",
    "audienceList",
    "automation",
    "createdAt",
  ]);

  if (!isOpen) return null;

  const toggleColumn = (id: string) => {
    setSelectedColumnIds((prev) =>
      prev.includes(id) ? prev.filter((colId) => colId !== id) : [...prev, id]
    );
  };

  const applyPreset = (preset: "email" | "phone" | "all") => {
    if (preset === "email") {
      setSelectedColumnIds(["username", "primaryEmail", "audienceList", "automation", "createdAt"]);
    } else if (preset === "phone") {
      setSelectedColumnIds(["username", "primaryPhone", "audienceList", "automation", "createdAt"]);
    } else if (preset === "all") {
      setSelectedColumnIds(AVAILABLE_COLUMNS.map((c) => c.id));
    }
  };

  const handleDownload = () => {
    if (selectedColumnIds.length === 0 || contacts.length === 0) return;

    const columnsToExport = AVAILABLE_COLUMNS.filter((col) =>
      selectedColumnIds.includes(col.id)
    );

    const headers = columnsToExport.map((col) => `"${col.label.replace(/"/g, '""')}"`);
    const rows = contacts.map((c) =>
      columnsToExport.map((col) => `"${(col.getValue(c) || "").replace(/"/g, '""')}"`).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanListName = (activeListName || "audience-contacts").toLowerCase().replace(/[^a-z0-9]/g, "-");
    link.setAttribute("href", url);
    link.setAttribute("download", `${cleanListName}-export.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">Export Audience Contacts</h2>
              <p className="text-xs text-slate-500">
                {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} ready for export
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scope Notice */}
        <div className="px-5 pt-4 pb-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Active Scope: {activeListName || "All Audience Lists"}</span>
              <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                {contacts.length} rows
              </span>
            </div>
            {activeFiltersText && (
              <p className="text-[11px] text-slate-500">{activeFiltersText}</p>
            )}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="px-5 py-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            1-Click Preset Templates
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyPreset("email")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
            >
              <Mail size={13} className="text-emerald-600" />
              <span>Email List</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset("phone")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
            >
              <Phone size={13} className="text-sky-600" />
              <span>SMS List</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
            >
              <Database size={13} className="text-indigo-600" />
              <span>Full Backup</span>
            </button>
          </div>
        </div>

        {/* Column Checkboxes */}
        <div className="px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Columns to Include ({selectedColumnIds.length})
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedColumnIds(
                  selectedColumnIds.length === AVAILABLE_COLUMNS.length
                    ? []
                    : AVAILABLE_COLUMNS.map((c) => c.id)
                )
              }
              className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              {selectedColumnIds.length === AVAILABLE_COLUMNS.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
            {AVAILABLE_COLUMNS.map((col) => {
              const checked = selectedColumnIds.includes(col.id);
              return (
                <label
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all",
                    checked
                      ? "bg-blue-50/80 border-blue-200 text-blue-900 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center transition-colors",
                      checked
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    )}
                  >
                    {checked && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={selectedColumnIds.length === 0 || contacts.length === 0}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer",
              selectedColumnIds.length === 0 || contacts.length === 0
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
            )}
          >
            <Download size={14} />
            Download CSV ({contacts.length})
          </button>
        </div>
      </div>
    </div>
  );
}
