import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { buildCompanyDashboardPath } from "@/lib/company";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id && !session?.user?.email) {
    redirect("/login");
  }

  let user: any = null;
  try {
    user = await apiClient<any>("auth/me");
  } catch {
    redirect("/login");
  }

  if (!user?.company) {
    redirect("/setup");
  }

  const company = user.company;
  if (!company.setupComplete) {
    redirect("/setup");
  }

  const path = buildCompanyDashboardPath(company);
  redirect(path);
}
