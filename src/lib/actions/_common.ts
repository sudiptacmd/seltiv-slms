import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import type { Role } from "@/models/types";

export type ActionState = { ok?: boolean; error?: string; message?: string; redirect?: string };

export async function guard(...roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) return { user: null, deny: { error: "You are signed out. Reload the page." } as ActionState };
  if (!user.roles.includes("admin") && !roles.some((r) => user.roles.includes(r))) {
    return { user, deny: { error: "You do not have permission to do that." } as ActionState };
  }
  return { user, deny: null };
}

/** Role membership is always required; a nonempty action list narrows it. */
export async function guardAction(permission: string, ...roles: Role[]) {
  const result = await guard(...roles);
  if (result.deny || !result.user) return result;
  const u = result.user;
  if (!u.roles.includes('admin') && u.permissions?.length && !u.permissions.includes(permission)) {
    return { user: u, deny: { error: 'Your account does not have access to this action.' } as ActionState };
  }
  return result;
}

export function revalidate(...paths: string[]) {
  for (const p of paths) revalidatePath(p, p.includes("[") ? "page" : undefined);
}

export function fd(form: FormData) {
  return {
    str: (k: string) => String(form.get(k) ?? "").trim(),
    opt: (k: string) => {
      const v = String(form.get(k) ?? "").trim();
      return v === "" ? undefined : v;
    },
    num: (k: string) => {
      const v = form.get(k);
      if (v == null || v === "") return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    },
    bool: (k: string) => form.get(k) === "on" || form.get(k) === "true",
    date: (k: string) => {
      const v = String(form.get(k) ?? "").trim();
      if (!v) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    },
    all: (k: string) => form.getAll(k).map(String).filter(Boolean),
  };
}
