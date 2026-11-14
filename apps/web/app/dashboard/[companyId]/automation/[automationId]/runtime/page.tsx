import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";
import { apiClient } from "@/lib/api-client";
import { buildCompanyDashboardPath } from "@/lib/company";
import DashboardShell from "../../../DashboardShell";
import AutomationRuntimeView from "./components/AutomationRuntimeView";
import { logger } from "@/lib/logger";

export default async function AutomationRuntimePage({
  params,
}: {
  params: Promise<{
    companyId: string;
    automationId: string;
  }>;
}) {
  const auth = await getDashboardAuth();
  if (!auth) redirect("/login");
  const { user, company } = auth;
  const { companyId, automationId } = await params;

  // Get automation via NestJS API
  let automation: any = null;
  try {
    const res = await apiClient<{ automation: any }>(`automations/${automationId}`);
    automation = res?.automation || null;
  } catch (error) {
    logger.log(`[AutomationRuntimePage] Failed to fetch automation:`, error);
  }

  if (!automation) {
    redirect(`${buildCompanyDashboardPath(company)}/automation`);
  }

  const initials = getInitials(user.name || company.name || user.email || "");
  const basePath = `/dashboard/${companyId}`;

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
      <AutomationRuntimeView automation={automation} basePath={basePath} />
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
