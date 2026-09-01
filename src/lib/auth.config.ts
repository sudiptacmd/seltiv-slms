import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/models/types";

/**
 * Edge-safe auth config (no DB imports) — shared by middleware and the full
 * server config. The Credentials provider itself lives in ./auth.ts.
 */

export const HOME_BY_ROLE: Record<Role, string> = {
  admin: "/admin",
  teacher: "/teacher",
  accountant: "/accounts",
  parent: "/parent",
};

const PREFIX_ROLE: [string, Role][] = [
  ["/admin", "admin"],
  ["/teacher", "teacher"],
  ["/accounts", "accountant"],
  ["/parent", "parent"],
];

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id?: string }).id;
        token.roles = Array.from((user as { roles?: Role[] }).roles ?? []).map(String) as Role[];
        token.name = user.name ?? token.name;
        token.personName = (user as { personName?: string }).personName;
        token.mustChangePassword = Boolean((user as { mustChangePassword?: boolean }).mustChangePassword);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = (token.uid as string) ?? "";
      session.user.roles = (token.roles as Role[]) ?? [];
      session.user.mustChangePassword = Boolean(token.mustChangePassword);
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const roles = (auth?.user?.roles ?? []) as Role[];
      const isLoggedIn = roles.length > 0 || Boolean(auth?.user?.id);

      const publicPaths = [
        "/login",
        "/forgot-password",
        "/reset-password",
        "/admissions/apply",
        "/admissions/status",
        "/pay",
        "/api/webhooks",
        "/api/files",
      ];
      if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
      if (pathname === "/") return true;

      const match = PREFIX_ROLE.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
      if (!match) return true; // non-portal routes handled elsewhere
      if (!isLoggedIn) return false;
      return roles.includes(match[1]) || roles.includes("admin");
    },
  },
} satisfies NextAuthConfig;
