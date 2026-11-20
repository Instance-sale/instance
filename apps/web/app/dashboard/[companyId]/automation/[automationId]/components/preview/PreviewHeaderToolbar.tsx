"use client";

import React from "react";
import { Smartphone, Monitor, RotateCcw, X } from "lucide-react";

interface PreviewHeaderToolbarProps {
  automationName: string;
  simulatedIsFollowing: boolean;
  setSimulatedIsFollowing: React.Dispatch<React.SetStateAction<boolean>>;
  currentViewMode: "mobile" | "desktop";
  setCurrentViewMode: (mode: "mobile" | "desktop") => void;
  startSimulation: () => void;
  onClose: () => void;
}

export function PreviewHeaderToolbar({
  automationName,
  simulatedIsFollowing,
  setSimulatedIsFollowing,
  currentViewMode,
  setCurrentViewMode,
  startSimulation,
  onClose,
}: PreviewHeaderToolbarProps) {
  return (
    <div className="flex items-center justify-between w-full max-w-3xl mb-3 px-3.5 py-2 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg text-slate-800">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="text-xs font-bold tracking-wide text-slate-800 truncate">
          Interactive Instagram Simulator
        </span>
        <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono truncate">
          • {automationName}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Follower Status Toggle Button */}
        <button
          type="button"
          onClick={() => {
            setSimulatedIsFollowing((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${simulatedIsFollowing
            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          title="Toggle Simulated Follower Status (for testing Follower Gate conditions)"
        >
          <span>{simulatedIsFollowing ? "👤 Follower: YES" : "👤 Follower: NO"}</span>
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setCurrentViewMode("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${currentViewMode === "mobile"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/50"
              : "text-slate-500 hover:text-slate-800"
              }`}
            title="iPhone View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentViewMode("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${currentViewMode === "desktop"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/50"
              : "text-slate-500 hover:text-slate-800"
              }`}
            title="Desktop Web View"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
        </div>

        {/* Restart Simulation */}
        <button
          type="button"
          onClick={startSimulation}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer border border-slate-200"
          title="Restart Flow Simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 transition-all cursor-pointer border border-slate-200"
          title="Close Preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
