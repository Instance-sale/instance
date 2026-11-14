import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

export const getDashboardAuth = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !session?.user?.email) return null;

  try {
    const user = await apiClient<any>("auth/me");
    if (!user) return null;
    return { session, user, company: user.company as any };
  } catch {
    // If backend returns error or session is not verified yet, fallback to session data
    if (session?.user) {
      return {
        session,
        user: session.user,
        company: (session.user as any).company || null,
      };
    }
    return null;
  }
});
