import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { connectDb } from "./db";
import { User, Staff, Guardian, type Role } from "@/models";
import { HOME_BY_ROLE } from "./auth.config";

export type CurrentUser = {
  id: string;
  name: string;
  personName: string;
  roles: Role[];
  primaryRole: Role;
  staffId?: string;
  guardianId?: string;
  isClassTeacher: boolean;
  permissions?: string[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  await connectDb();
  const u = await User.findById(session.user.id).lean();
  if (!u || !u.active) return null;

  let personName = u.name;
  if (u.staff) personName = (await Staff.findById(u.staff).lean())?.name ?? personName;
  else if (u.guardian) personName = (await Guardian.findById(u.guardian).lean())?.name ?? personName;

  const roles = (u.roles ?? []) as Role[];
  return {
    id: String(u._id),
    name: u.name,
    personName,
    roles,
    primaryRole: roles[0] ?? "parent",
    staffId: u.staff ? String(u.staff) : undefined,
    guardianId: u.guardian ? String(u.guardian) : undefined,
    isClassTeacher: Boolean(u.isClassTeacher),
    permissions: u.permissions ?? [],
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const u = await requireUser();
  if (u.roles.includes("admin")) return u; // admin can see everything
  if (!roles.some((r) => u.roles.includes(r))) {
    redirect(HOME_BY_ROLE[u.primaryRole] ?? "/login");
  }
  return u;
}

/** For route handlers — throws a Response instead of redirecting. */
export async function requireApiRole(...roles: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw Response.json({ error: "unauthorized" }, { status: 401 });
  if (!u.roles.includes("admin") && !roles.some((r) => u.roles.includes(r))) {
    throw Response.json({ error: "forbidden" }, { status: 403 });
  }
  return u;
}
