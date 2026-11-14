"use client";

import React from "react";
import { Search, X, LayoutGrid, Kanban, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewMode, InteractionFilter } from "./types";

interface LeadsToolbarProps {
  search: string;
  setSearch: (val: string) => void;
  viewMode: ViewMode;
  setViewMode: (val: ViewMode) => void;
  handleOpenExportModal: (format: "csv" | "xml") => void;
  interactionFilter: InteractionFilter;
  setInteractionFilter: (val: InteractionFilter) => void;
  setPage: (val: number) => void;
  visibleCount: number;
  totalCount: number;
}

export function LeadsToolbar({
  search,
  setSearch,
  viewMode,
  setViewMode,
  handleOpenExportModal,
  interactionFilter,
  setInteractionFilter,
  setPage,
  visibleCount,
  totalCount,
}: LeadsToolbarProps) {
  return (
    <div className="glass-panel p-4 space-y-3">
      {/* Search and Main Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects by username, name, bio, tags..."
            className="w-full pl-10 pr-9 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher and Export */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "kanban"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Kanban className="w-3.5 h-3.5" />
              Pipeline
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleOpenExportModal("csv")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips Row */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/50">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          Source:
        </span>

        {/* Source Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "DM", "FOLLOW", "COMMENT", "STORY"] as const).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => {
                setInteractionFilter(source);
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                interactionFilter === source
                  ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-xs shadow-blue-500/20"
                  : "bg-white/70 text-slate-500 border-slate-200 hover:bg-white"
              )}
            >
              {source === "all" ? "All Sources" : source}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-700">{visibleCount}</span> of{" "}
          <span className="font-bold text-slate-700">{totalCount}</span>
        </div>
      </div>
    </div>
  );
}
