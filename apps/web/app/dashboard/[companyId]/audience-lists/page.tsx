import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";
import DashboardShell from "../DashboardShell";
import AudienceListDashboard from "./components/AudienceListDashboard";

export default async function AudienceListsPage({
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

  return (
    <DashboardShell
      companyName={company.name}
      userName={user.name || company.ownerName || "Owner"}
      userEmail={user.email || ""}
      userRole={user.role}
      initials={initials}
      activeTabId="audience-lists"
      basePath={basePath}
    >
      <div className="px-4 lg:px-8 pt-4 lg:pt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 lg:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
              Audience Lists
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Segment your captured contacts by campaign, project, and channel
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          <div className="bg-white/60 backdrop-blur-xl rounded-xl lg:rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-3 sm:p-4 lg:p-6 overflow-x-auto">
            <AudienceListDashboard />
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
