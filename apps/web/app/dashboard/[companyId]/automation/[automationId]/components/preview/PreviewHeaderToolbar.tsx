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
        <div className="flex items-center justify-between w-full max-w-3xl mb-3 px-3 py-2 bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-white/10 text-white shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-neutral-200">
              Interactive Instagram Simulator
            </span>
            <span className="hidden sm:inline-block text-[11px] text-neutral-400 font-mono">
              • {automationName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Follower Status Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setSimulatedIsFollowing((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${simulatedIsFollowing
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                : "bg-white/10 border-white/10 text-neutral-300 hover:text-white"
                }`}
              title="Toggle Simulated Follower Status (for testing Follower Gate conditions)"
            >
              <span>{simulatedIsFollowing ? "👤 Follower: YES" : "👤 Follower: NO"}</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setCurrentViewMode("mobile")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${currentViewMode === "mobile"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-neutral-300 hover:text-white"
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
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-neutral-300 hover:text-white"
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
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white transition-all cursor-pointer border border-white/10"
              title="Restart Flow Simulation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-red-500/80 text-neutral-200 hover:text-white transition-all cursor-pointer border border-white/10"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
  );
}
