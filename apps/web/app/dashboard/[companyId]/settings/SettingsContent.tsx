"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BasicInformation from "./components/BasicInformation";
import PipelineSettings from "./components/PipelineSettings";
import IcebreakerSettings from "./components/IcebreakerSettings";
import ApiKeysSettings from "./components/ApiKeysSettings";

type SettingsTab = "basic" | "pipeline" | "icebreakers" | "apiKeys";

interface SettingsContentProps {
  userEmail?: string;
  userRole?: string;
}

export default function SettingsContent({
  userEmail = "",
  userRole = "Admin",
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("basic");
  const t = useTranslations("settings");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200/70 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userEmail && <span className="text-xs text-slate-500 font-medium">{userEmail}</span>}
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
            {userRole}
          </span>
        </div>
      </header>

      <div className="seg-track p-1">
        <button
          type="button"
          onClick={() => setActiveTab("basic")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "basic"
            ? "seg-pill-active"
            : "text-slate-600 hover:text-slate-900"
            }`}
        >
          <svg className={`w-4 h-4 ${activeTab === "basic" ? "text-blue-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {t("tabs.basic")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "pipeline"
            ? "seg-pill-active"
            : "text-slate-600 hover:text-slate-900"
            }`}
        >
          <svg className={`w-4 h-4 ${activeTab === "pipeline" ? "text-blue-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          {t("tabs.pipeline")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("icebreakers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "icebreakers"
            ? "seg-pill-active"
            : "text-slate-600 hover:text-slate-900"
            }`}
        >
          <svg className={`w-4 h-4 ${activeTab === "icebreakers" ? "text-blue-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {t("tabs.icebreakers")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("apiKeys")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "apiKeys"
            ? "seg-pill-active"
            : "text-slate-600 hover:text-slate-900"
            }`}
        >
          <svg className={`w-4 h-4 ${activeTab === "apiKeys" ? "text-blue-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          {t("tabs.apiKeys")}
        </button>
      </div>

      {/* Main Settings Panel */}
      <section className="glass-panel p-6 sm:p-8">
        {activeTab === "basic" && <BasicInformation />}
        {activeTab === "pipeline" && <PipelineSettings />}
        {activeTab === "icebreakers" && <IcebreakerSettings />}
        {activeTab === "apiKeys" && <ApiKeysSettings />}
      </section>
    </div>
  );
}
