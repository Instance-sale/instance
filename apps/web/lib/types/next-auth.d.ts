import "next-auth";

type UserRole = "OWNER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      companyId?: string | null;
    };
  }

  interface User {
    role: UserRole;
    companyId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    companyId?: string | null;
  }
}

