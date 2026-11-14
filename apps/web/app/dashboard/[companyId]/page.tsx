import { redirect } from "next/navigation";
import { getDashboardAuth } from "@/lib/dashboard-auth";

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{
    companyId: string;
  }>;
}) {
  const auth = await getDashboardAuth();
  if (!auth) redirect("/login");
  const { companyId } = await params;

  redirect(`/dashboard/${companyId}/crm`);
}
