/**
 * CRM Leads Dashboard Page
 * 
 * Displays all Instagram user profiles collected from automations
 * with filtering, sorting, and export capabilities.
 */

import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";
import { apiClient } from "@/lib/api-client";
import DashboardShell from "../DashboardShell";
import CrmViewSwitcher from "./components/CrmViewSwitcher";
import Header from "./components/Header";
import { Instagram } from "lucide-react";

export default async function CRMPage({
  params,
}: {
  params: Promise<{
    companyId: string;
  }>;
}) {
  const auth = await getDashboardAuth();
  if (!auth) redirect("/login");
  const { user, company } = auth;
  const { companyId } = await params;

  // Get Instagram accounts for this company via API
  let instagramAccounts: any[] = [];
  try {
    const res = await apiClient<any>("instagram/accounts");
    instagramAccounts = Array.isArray(res) ? res : res?.accounts || [];
  } catch {
    instagramAccounts = [];
  }

  const initials = getInitials(user.name || company.name || user.email || "");
  const basePath = `/dashboard/${companyId}`;

  // Default to first Instagram account
  const defaultAccountId = instagramAccounts[0]?.id || null;

  return (
    <DashboardShell
      companyName={company.name}
      userName={user.name || company.ownerName || "Owner"}
      userEmail={user.email || ""}
      userRole={user.role}
      initials={initials}
      activeTabId="crm"
      basePath={basePath}
    >
      <div className="flex flex-col h-full w-full">
        <Header
          initials={initials}
          userName={user.name || company.ownerName || "Owner"}
          userEmail={user.email || ""}
          basePath={basePath}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1700px] mx-auto space-y-6">
            {!defaultAccountId ? (
              <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/5 p-8 sm:p-12 lg:p-16 text-center">
                <div className="relative max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-tr from-amber-100 via-orange-100 to-rose-100 rounded-3xl flex items-center justify-center text-slate-900 shadow-sm border border-orange-200/60">
                    <Instagram className="w-8 h-8 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
                      Connect Your Instagram Channel
                    </h2>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                      Sync DMs, comments, story mentions and followers. Track leads in the Kanban pipeline and table view with custom stages and tags in real time.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={`${basePath}/settings`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-all shadow-md shadow-slate-900/15 hover:shadow-lg active:scale-95 text-sm"
                    >
                      Connect Instagram Channel →
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <CrmViewSwitcher instagramAccountId={defaultAccountId} basePath={basePath} />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function getInitials(displayName: string): string {
  if (!displayName) {
    return "SK";
  }
  const cleaned = displayName.trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
