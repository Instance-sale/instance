export function slugifyCompanyName(name: string): string {
  return (
    name
      ?.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "company"
  );
}

interface CompanyRouteInfo {
  companyId: string;
  name?: string;
  dashboardKey?: string;
}

export function buildCompanyDashboardPath(
  company: CompanyRouteInfo,
  _locale?: string
): string {
  return `/dashboard/${company.companyId}`;
}
