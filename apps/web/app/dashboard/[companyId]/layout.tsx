import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";
import { buildCompanyDashboardPath } from "@/lib/company";

export default async function DashboardSegmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    companyId: string;
  }>;
}) {
  const { companyId } = await params;
  const auth = await getDashboardAuth();
  if (!auth) redirect("/login");
  if (!auth.company) redirect("/setup");

  const { company } = auth;

  if (company.companyId !== companyId) {
    redirect(buildCompanyDashboardPath(company));
  }

  return <>{children}</>;
}
