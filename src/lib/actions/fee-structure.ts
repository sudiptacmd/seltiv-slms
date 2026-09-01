"use server";

import { connectDb } from "@/lib/db";
import { FeeHead, FeePlan, Discount } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { recordAudit } from "@/lib/audit";
import { guard, revalidate, fd, type ActionState } from "./_common";

export async function saveFeeHead(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin", "accountant");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const code = f.str("code").toUpperCase();
  if (!f.str("name") || !code) return { error: "Name and code are required." };
  try {
    await FeeHead.findOneAndUpdate(
      { code },
      { name: f.str("name"), code, recurring: f.bool("recurring"), order: f.num("order") ?? 0 },
      { upsert: true },
    );
  } catch {
    return { error: "That code is already in use." };
  }
  revalidate("/admin/finance/structure");
  return { ok: true, message: "Fee head saved." };
}

export async function saveFeePlan(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin", "accountant");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const year = await getCurrentYear();
  const classId = f.str("classId");
  if (!classId) return { error: "Pick a class." };

  const headIds = f.all("headId");
  const amounts = f.all("amount").map(Number);
  const items = headIds
    .map((h, i) => ({ head: h, amount: amounts[i] ?? 0 }))
    .filter((it) => it.amount > 0);

  await FeePlan.findOneAndUpdate(
    { year: year._id, klass: classId },
    {
      name: `${f.str("className")} — ${year.name}`,
      year: year._id,
      klass: classId,
      items,
      instalments: f.num("instalments") ?? 2,
      lateFeeRule: f.str("lateFeeRule") || "flat",
      lateFeeValue: f.num("lateFeeValue") ?? 100,
      graceDays: f.num("graceDays") ?? 0,
      dueDayOfMonth: f.num("dueDayOfMonth") ?? 5,
    },
    { upsert: true },
  );
  await recordAudit({ actor: user, action: "fee.plan", entity: "FeePlan", entityId: classId, after: { items, instalments: f.num("instalments") } });
  revalidate("/admin/finance/structure", "/accounts/fees/invoices");
  return { ok: true, message: "Fee plan saved." };
}

export async function addDiscount(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin", "accountant");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const year = await getCurrentYear();
  const studentId = f.str("studentId");
  if (!studentId) return { error: "Student is required." };
  await Discount.create({
    student: studentId,
    year: year._id,
    label: f.str("label"),
    kind: f.str("kind") === "flat" ? "flat" : "percent",
    value: f.num("value") ?? 0,
    active: true,
  });
  await recordAudit({ actor: user, action: "fee.discount", entity: "Discount", entityId: studentId, after: { label: f.str("label"), value: f.num("value") } });
  revalidate("/admin/finance/structure", `/admin/students/${studentId}`);
  return { ok: true, message: "Discount added — applies to future invoices." };
}
