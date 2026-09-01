import "server-only";
import { connectDb } from "./db";
import { AuditLog } from "@/models";
import type { CurrentUser } from "./session";

export async function recordAudit(input: {
  actor?: CurrentUser | null;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}) {
  await connectDb();
  await AuditLog.create({
    actor: input.actor?.id,
    actorName: input.actor?.personName ?? input.actor?.name ?? "system",
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
    meta: input.meta,
  });
}

/** Shallow diff for human-readable audit `before`/`after`. */
export function diff<T extends Record<string, unknown>>(before: T, after: T): { before: Partial<T>; after: Partial<T> } {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k as keyof T] = before[k] as T[keyof T];
      a[k as keyof T] = after[k] as T[keyof T];
    }
  }
  return { before: b, after: a };
}
