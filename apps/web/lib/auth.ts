// apps/web/lib/auth.ts
import path from "node:path";
import dotenv from "dotenv";

// Ensure root .env is always loaded in all execution contexts
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import type { NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { apiClient } from '@/lib/api-client';

const internalAuthSecret =
  process.env.NEXTAUTH_SECRET ||
  "";

const internalAuthHeaders = {
  'x-internal-secret': internalAuthSecret,
};

export function ApiAdapter(): Adapter {
  return {
    async createUser(user) {
      return apiClient('auth/adapter/create-user', {
        method: 'POST',
        headers: internalAuthHeaders,
        body: JSON.stringify(user),
      });
    },
    async getUser(id) {
      try {
        const user = await apiClient(`auth/adapter/user/${id}`, {
          headers: internalAuthHeaders,
        });
        return user || null;
      } catch (err) {
        console.warn('[ApiAdapter.getUser] Not found or error:', err);
        return null;
      }
    },
    async getUserByEmail(email) {
      try {
        const user = await apiClient(`auth/adapter/user-by-email?email=${encodeURIComponent(email)}`, {
          headers: internalAuthHeaders,
        });
        return user || null;
      } catch (err) {
        console.warn('[ApiAdapter.getUserByEmail] Not found or error:', err);
        return null;
      }
    },
    async getUserByAccount({ providerAccountId, provider }) {
      try {
        const user = await apiClient(`auth/adapter/user-by-account?provider=${provider}&providerAccountId=${providerAccountId}`, {
          headers: internalAuthHeaders,
        });
        return user || null;
      } catch (err) {
        console.warn('[ApiAdapter.getUserByAccount] Not found or error:', err);
        return null;
      }
    },
    async updateUser(user) {
      return apiClient('auth/adapter/update-user', {
        method: 'POST',
        headers: internalAuthHeaders,
        body: JSON.stringify(user),
      });
    },
    async linkAccount(account) {
      return apiClient('auth/adapter/link-account', {
        method: 'POST',
        headers: internalAuthHeaders,
        body: JSON.stringify(account),
      });
    },
    async createVerificationToken(token) {
      return apiClient('auth/adapter/create-verification-token', {
        method: 'POST',
        headers: internalAuthHeaders,
        body: JSON.stringify(token),
      });
    },
    async useVerificationToken({ identifier, token }) {
      try {
        const result = await apiClient('auth/adapter/use-verification-token', {
          method: 'POST',
          headers: internalAuthHeaders,
          body: JSON.stringify({ identifier, token }),
        });
        return result || null;
      } catch (err) {
        console.warn('[ApiAdapter.useVerificationToken] Error:', err);
        return null;
      }
    },
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: ApiAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from:
        process.env.EMAIL_FROM ||
        process.env.EMAIL_SERVER_USER ||
        'noreply@instance.sale',
      sendVerificationRequest: async ({ identifier, url }) => {
        try {
          await apiClient('auth/send-verification-email', {
            method: 'POST',
            headers: internalAuthHeaders,
            body: JSON.stringify({ identifier, url }),
          });
        } catch (error) {
          console.error('[auth.sendVerificationRequest] Error sending email via API:', error);
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    verifyRequest: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      return true;
    },
    async session({ session, user, token }) {
      if (session.user) {
        const u = user || token;
        if (u) {
          session.user.id = (u as any).id;
          session.user.role = ((u as any).role || 'OWNER') as 'OWNER';
          session.user.companyId = (u as any).companyId || undefined;
        }
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
      }
      if (trigger === "update" && session) {
        if (session.companyId !== undefined) {
          token.companyId = session.companyId;
        }
        
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
};
