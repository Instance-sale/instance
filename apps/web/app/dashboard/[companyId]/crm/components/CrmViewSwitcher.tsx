"use client";

import { useState } from "react";
import LeadsTable from "./LeadsTable";
import StoryMentionsTable from "./StoryMentionsTable";
import { Users, Camera } from "lucide-react";

interface CrmViewSwitcherProps {
  instagramAccountId: string;
  basePath: string;
}

export default function CrmViewSwitcher({
  instagramAccountId,
  basePath,
}: CrmViewSwitcherProps) {
  const [activeTab, setActiveTab] = useState<"leads" | "ugc">("leads");

  return (
    <div className="space-y-6 w-full">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "leads"
            ? "bg-white text-blue-700 font-bold shadow-2xs border border-blue-100/80"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
        >
          <Users className={`w-4 h-4 ${activeTab === "leads" ? "text-blue-600" : "text-slate-400"}`} />
          <span>All Leads Pipeline</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ugc")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "ugc"
            ? "bg-white text-blue-700 font-bold shadow-2xs border border-blue-100/80"
            : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
        >
          <Camera className={`w-4 h-4 ${activeTab === "ugc" ? "text-blue-600" : "text-slate-400"}`} />
          <span>Story Mentions & UGC</span>
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/70 text-[10px] font-bold rounded-full">
            New
          </span>
        </button>
      </div>

      {activeTab === "leads" ? (
        <LeadsTable instagramAccountId={instagramAccountId} basePath={basePath} />
      ) : (
        <StoryMentionsTable instagramAccountId={instagramAccountId} basePath={basePath} />
      )}
    </div>
  );
}
