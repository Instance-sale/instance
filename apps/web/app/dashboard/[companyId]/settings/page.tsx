import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";
import DashboardShell from "../DashboardShell";
import SettingsContent from "./SettingsContent";

export default async function SettingsPage({
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
      activeTabId="settings"
      basePath={basePath}
    >
      <SettingsContent
        userEmail={user.email || ""}
        userRole={user.role || "Admin"}
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

