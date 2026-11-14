import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";
import { apiClient } from "@/lib/api-client";
import DashboardShell from "../DashboardShell";
import AutomationDashboard from "./components/AutomationDashboard";
import { Bot } from "lucide-react";

export default async function AutomationPage({
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

  const initials = getInitials(user.name || company.name || user.email || "");

  const basePath = `/dashboard/${companyId}`;

  // All IG rows for this company — fetched via NestJS API
  let instagramAccounts: Array<{ id: string; isActive: boolean }> = [];
  try {
    const res = await apiClient<{ accounts: Array<{ id: string; isActive: boolean }> }>("instagram/accounts");
    instagramAccounts = res.accounts || [];
  } catch (error) {
    console.error("[AutomationPage] Failed to fetch instagram accounts:", error);
  }

  return (
    <DashboardShell
      companyName={company.name}
      userName={user.name || company.ownerName || "Owner"}
      userEmail={user.email || ""}
      userRole={user.role}
      initials={initials}
      activeTabId="automation"
      basePath={basePath}
    >
      {instagramAccounts.length === 0 ? (
        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-xl lg:rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 sm:p-8 lg:p-12 text-center flex flex-col items-center justify-center mx-4 sm:mx-6 lg:mx-8 my-4 sm:my-6 lg:my-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl lg:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 sm:mb-3 tracking-tight px-4">
            No Instagram Account Connected
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mb-6 sm:mb-8 leading-relaxed max-w-md mx-auto px-4">
            Connect your Instagram Business or Creator account to start creating automations.
          </p>
          <a
            href="/setup"
            className="inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg lg:rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
          >
            Connect Instagram →
          </a>
        </div>
      ) : (
        <div className="h-full overflow-hidden px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6">
          {!instagramAccounts[0].isActive && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Reconnect Instagram.</strong> This account was disconnected or deactivated in
              Meta. Your automations are still saved — use{" "}
              <a href="/setup" className="font-semibold underline">
                Setup
              </a>{" "}
              to connect again and refresh your access token.
            </div>
          )}
          <AutomationDashboard
            instagramAccountId={instagramAccounts[0].id}
            basePath={basePath}
          />
        </div>
      )}
    </DashboardShell>
  );
}

function getInitials(displayName: string): string {
  if (!displayName) {
    return "IS";
  }

  const parts = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return displayName.slice(0, 2).toUpperCase();
  }

  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

