import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";
import { apiClient } from "@/lib/api-client";
import { TimeRange } from "@/lib/types/analytics";
import DashboardShell from "../DashboardShell";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export default async function AnalyticsPage({
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

  // Fetch initial analytics data server-side to reduce TBT
  const initialTimeRange: TimeRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(),
    period: 'month'
  };

  let initialAnalyticsData: any = null;
  try {
    initialAnalyticsData = await apiClient('analytics', {
      method: 'POST',
      body: JSON.stringify({ timeRange: initialTimeRange }),
    });
  } catch (error) {
    console.error('[AnalyticsPage] Failed to fetch server-side initial data:', error);
  }

  return (
    <DashboardShell
      companyName={company.name}
      userName={user.name || company.ownerName || "Owner"}
      userEmail={user.email || ""}
      userRole={user.role}
      initials={initials}
      activeTabId="analytics"
      basePath={basePath}
    >
      <AnalyticsDashboard 
        companyId={company.id} 
        initialData={initialAnalyticsData}
        initialTimeRange={initialTimeRange}
      />
    </DashboardShell>
  );
}

function getInitials(displayName: string): string {
  if (!displayName) {
    return "SK";
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

