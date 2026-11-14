import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";
import { apiClient } from "@/lib/api-client";
import { buildCompanyDashboardPath } from "@/lib/company";
import DashboardShell from "../../DashboardShell";
import AutomationEditor from "./components/AutomationEditor";
import { logger } from "@/lib/logger";

export default async function AutomationDetailPage({
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
    logger.log(`[AutomationDetailPage] Failed to fetch automation:`, error);
  }

  // CRITICAL: Log what's actually loaded from database
  if (automation) {
    logger.log(`[AutomationDetailPage] 🔍 LOADED FROM DATABASE:`);
    logger.log(`[AutomationDetailPage]   Automation ID: ${automation.id}`);
    logger.log(`[AutomationDetailPage]   Automation Name: ${automation.name}`);
    logger.log(`[AutomationDetailPage]   Nodes Count: ${automation.nodes?.length || 0}`);
    
    automation.nodes?.forEach((node: any, index: number) => {
      logger.log(`[AutomationDetailPage]   Node ${index + 1} from DB:`, {
        nodeId: node.nodeId,
        type: node.type,
        hasConfig: !!node.config,
        configKeys: Object.keys(node.config || {}),
        config: node.config,
        configString: JSON.stringify(node.config || {}),
      });
    });
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
      <AutomationEditor automation={automation as any} basePath={basePath} />
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
