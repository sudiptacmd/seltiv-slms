"use server";

import { connectDb } from "@/lib/db";
import { ServiceRequestType } from "@/models";
import { guard, revalidate, fd, type ActionState } from "@/lib/actions/_common";

export async function connectAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const code = f.str("code").toUpperCase();
  if (!f.str("name") || !code) return { error: "Name and code are required." };
  try {
    await ServiceRequestType.findOneAndUpdate(
      { code },
      {
        name: f.str("name"),
        code,
        fee: f.num("fee") ?? 0,
        stages: f.str("stages").split(",").map((s) => s.trim()).filter(Boolean),
        documentType: f.opt("documentType"),
        active: true,
      },
      { upsert: true },
    );
  } catch {
    return { error: "That code is already in use." };
  }
  revalidate("/admin/service-requests/types", "/parent/service-requests/new");
  return { ok: true, message: "Request type saved." };
}
