import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";
import { emailProvider } from "@/server/auth/email";
import { isAdminEmail } from "@/server/auth/roles";
import { db } from "@/server/db";

declare module "next-auth" {
  interface User {
    role?: UserRole;
  }
  interface Session {
    user: { id: string; email: string; name?: string | null; image?: string | null; role: UserRole };
  }
}

const { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ADMIN_EMAILS } = env();

export const googleEnabled = Boolean(AUTH_GOOGLE_ID && AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  trustHost: true,
  providers: [emailProvider, ...(googleEnabled ? [Google({ allowDangerousEmailAccountLinking: true })] : [])],
  pages: { signIn: "/signin", verifyRequest: "/signin/check-email", error: "/signin" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role ?? "HOST";
      return session;
    },
  },
  events: {
    // Promote emails listed in ADMIN_EMAILS on every sign-in, so admins need no manual DB edit.
    async signIn({ user }) {
      if (user.id && user.role !== "ADMIN" && isAdminEmail(user.email, ADMIN_EMAILS)) {
        await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    },
  },
});
