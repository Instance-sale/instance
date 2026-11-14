"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Check, FileSpreadsheet, FileCode, SlidersHorizontal, CheckSquare, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExportFieldOption {
  id: string;
  label: string;
  description: string;
  category: "Standard" | "Contact" | "Sales Discovery";
  defaultSelected: boolean;
}

export const EXPORT_FIELDS: ExportFieldOption[] = [
  // Standard Fields
  {
    id: "id",
    label: "Lead ID",
    description: "Unique database identifier",
    category: "Standard",
    defaultSelected: true,
  },
  {
    id: "username",
    label: "Instagram Username",
    description: "Account handle (@username)",
    category: "Standard",
    defaultSelected: true,
  },
  {
    id: "fullName",
    label: "Full Name",
    description: "Display name from Instagram profile",
    category: "Standard",
    defaultSelected: true,
  },
  {
    id: "biography",
    label: "Biography",
    description: "Public bio text",
    category: "Standard",
    defaultSelected: true,
  },
  {
    id: "website",
    label: "Website Link",
    description: "External bio link or portfolio",
    category: "Standard",
    defaultSelected: true,
  },
  {
    id: "firstInteractionType",
    label: "First Interaction",
    description: "Entry channel (DM, Comment, Story, Follow) and date",
    category: "Standard",
    defaultSelected: true,
  },
  {
    id: "createdAt",
    label: "Created Date",
    description: "When lead was first captured",
    category: "Standard",
    defaultSelected: true,
  },
  {
    id: "updatedAt",
    label: "Last Updated Date",
    description: "Timestamp of most recent activity",
    category: "Standard",
    defaultSelected: true,
  },

  // Contact Info
  {
    id: "emails",
    label: "Captured Email Addresses",
    description: "Emails discovered via automations and bio",
    category: "Contact",
    defaultSelected: false,
  },
  {
    id: "phoneNumbers",
    label: "Captured Phone Numbers",
    description: "Phone numbers provided in conversations",
    category: "Contact",
    defaultSelected: false,
  },

  // Sales Discovery
  {
    id: "tags",
    label: "Lead Tags",
    description: "Assigned company tags (e.g. #VIP, #Hot Lead)",
    category: "Sales Discovery",
    defaultSelected: false,
  },
  {
    id: "budget",
    label: "Budget Evaluation",
    description: "Client spending range identified by AI",
    category: "Sales Discovery",
    defaultSelected: false,
  },
  {
    id: "timeline",
    label: "Buying Timeline",
    description: "Urgency and purchase horizon",
    category: "Sales Discovery",
    defaultSelected: false,
  },
  {
    id: "status",
    label: "Pipeline Stage / Status",
    description: "Current stage in your sales workflow",
    category: "Sales Discovery",
    defaultSelected: false,
  },
  {
    id: "followersCount",
    label: "Followers Count",
    description: "Total audience size on Instagram",
    category: "Sales Discovery",
    defaultSelected: false,
  },
];

interface ExportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: "csv" | "xml", selectedFields: string[]) => void;
  initialFormat?: "csv" | "xml";
}

export default function ExportLeadsModal({
  isOpen,
  onClose,
  onExport,
  initialFormat = "csv",
}: ExportLeadsModalProps) {
  const [format, setFormat] = useState<"csv" | "xml">(initialFormat);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(() => {
    return new Set(
      EXPORT_FIELDS.filter((f) => f.defaultSelected).map((f) => f.id)
    );
  });

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFields(new Set(EXPORT_FIELDS.map((f) => f.id)));
  };

  const selectDefaults = () => {
    setSelectedFields(
      new Set(EXPORT_FIELDS.filter((f) => f.defaultSelected).map((f) => f.id))
    );
  };

  const handleConfirm = () => {
    onExport(format, Array.from(selectedFields));
    onClose();
  };

  const categories = [
    "Standard",
    "Contact",
    "Sales Discovery",
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display">
                    Export Prospects & Leads
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select attributes to include in your data export
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Format Selection Ribbon */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Format:
                </span>
                <div className="seg-track p-0.5 bg-white border border-slate-200 rounded-xl flex items-center">
                  <button
                    type="button"
                    onClick={() => setFormat("csv")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      format === "csv"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileSpreadsheet size={13} />
                    CSV File
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat("xml")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      format === "xml"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileCode size={13} />
                    XML Document
                  </button>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare size={11} /> Select All
                </button>
                <button
                  type="button"
                  onClick={selectDefaults}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw size={11} /> Defaults
                </button>
              </div>
            </div>

            {/* Scrollable Fields Grid */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {categories.map((category) => {
                const fieldsInCategory = EXPORT_FIELDS.filter(
                  (f) => f.category === category
                );
                return (
                  <div key={category} className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {category} Attributes
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {
                          fieldsInCategory.filter((f) => selectedFields.has(f.id))
                            .length
                        }{" "}
                        / {fieldsInCategory.length} active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fieldsInCategory.map((field) => {
                        const isChecked = selectedFields.has(field.id);
                        return (
                          <div
                            key={field.id}
                            onClick={() => toggleField(field.id)}
                            className={cn(
                              "flex items-start justify-between p-3 rounded-2xl border transition-all cursor-pointer group select-none",
                              isChecked
                                ? "bg-blue-50/50 border-blue-200/90 shadow-2xs"
                                : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                            )}
                          >
                            <div className="min-w-0 pr-3">
                              <p
                                className={cn(
                                  "text-xs font-bold truncate",
                                  isChecked ? "text-blue-900" : "text-slate-800"
                                )}
                              >
                                {field.label}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {field.description}
                              </p>
                            </div>

                            {/* Custom Toggle Switch */}
                            <div
                              className={cn(
                                "w-9 h-5 rounded-full transition-colors relative shrink-0 p-0.5 mt-0.5",
                                isChecked ? "bg-blue-600" : "bg-slate-200"
                              )}
                            >
                              <motion.div
                                animate={{ x: isChecked ? 16 : 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 30,
                                }}
                                className="w-4 h-4 rounded-full bg-white shadow-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500">
                <b className="text-slate-900 font-mono">
                  {selectedFields.size}
                </b>{" "}
                fields selected for export
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={selectedFields.size === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={13} />
                  Download {format.toUpperCase()}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
