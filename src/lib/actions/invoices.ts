"use server";

import { connectDb } from "@/lib/db";
import { Invoice, FeePlan, FeeHead, Enrollment, Discount, Student, nextSeq } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { computeInvoiceTotals, computeLateFee, buildInstalmentPlan, invoiceStatusFor } from "@/lib/fees";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { guard, guardAction, revalidate, type ActionState } from "./_common";
import crypto from "node:crypto";

/** Generate monthly tuition invoices for a period, e.g. "2026-10". */
export async function generateInvoiceRun(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guardAction("invoice.batch", "accountant");
  if (deny) return deny;
  await connectDb();

  const period = String(form.get("period") ?? "");
  const includeExamFee = form.get("examFee") === "on";
  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "Pick a valid month." };

  const year = await getCurrentYear();
  const [plans, heads, enrollments] = await Promise.all([
    FeePlan.find({ year: year._id, active: true }).lean(),
    FeeHead.find().lean(),
    Enrollment.find({ year: year._id, status: "active" }).lean(),
  ]);
  const planByClass = new Map(plans.map((p) => [String(p.klass), p]));
  const examHead = heads.find((h) => h.code === "EXAM");
  const [y, m] = period.split("-").map(Number);

  let created = 0;
  let skipped = 0;

  for (const enr of enrollments) {
    const plan = planByClass.get(String(enr.klass));
    if (!plan) {
      skipped++;
      continue;
    }
    const exists = await Invoice.findOne({ student: enr.student, period });
    if (exists) {
      skipped++;
      continue;
    }

    const lines = plan.items.map((it) => {
      const head = heads.find((h) => String(h._id) === String(it.head));
      return { headId: String(it.head), label: head?.name ?? "Fee", amount: it.amount };
    });
    if (includeExamFee && examHead) lines.push({ headId: String(examHead._id), label: "Exam Fee", amount: 500 });

    const discounts = await Discount.find({ student: enr.student, year: year._id, active: true }).lean();
    const totals = computeInvoiceTotals(
      lines,
      discounts.map((d) => ({ kind: d.kind, value: d.value, headIds: d.heads?.map((h) => String(h)) })),
    );

    const dueDate = new Date(y, m - 1, plan.dueDayOfMonth);
    const seq = await nextSeq(`invoice-${period}`);
    await Invoice.create({
      invoiceNo: `INV-${period}-${String(seq).padStart(4, "0")}`,
      student: enr.student,
      year: year._id,
      section: enr.section,
      klass: enr.klass,
      period,
      title: `Tuition Fee — ${new Date(y, m - 1, 1).toLocaleString("en", { month: "long", year: "numeric" })}`,
      lines: lines.map((l) => ({ head: l.headId, label: l.label, amount: l.amount })),
      discountTotal: totals.discountTotal,
      lateFee: 0,
      grossTotal: totals.grossTotal,
      netPayable: totals.netPayable,
      paidAmount: 0,
      dueDate,
      status: invoiceStatusFor(totals.netPayable, 0, dueDate),
      instalmentPlan: buildInstalmentPlan(totals.netPayable, plan.instalments, dueDate),
      payToken: crypto.randomBytes(16).toString("hex"),
    });
    created++;
  }

  await recordAudit({ actor: user, action: "invoice.run", entity: "Invoice", entityId: period, after: { created, skipped } });
  revalidate("/accounts/fees", "/accounts/fees/invoices", "/admin/finance", "/admin/finance/invoices");
  return { ok: true, message: `${created} invoices created for ${period}. ${skipped} skipped (already invoiced or no fee plan).` };
}

/** Apply overdue late fees to unpaid invoices whose grace period has passed. */
export async function applyLateFees(_prev: ActionState): Promise<ActionState> {
  const { user, deny } = await guard("accountant");
  if (deny) return deny;
  await connectDb();
  const year = await getCurrentYear();
  const plans = await FeePlan.find({ year: year._id }).lean();
  const planByClass = new Map(plans.map((p) => [String(p.klass), p]));
  const now = new Date();

  const invoices = await Invoice.find({
    year: year._id,
    status: { $in: ["issued", "overdue", "partial"] },
    lateFee: 0,
  }).lean();

  let touched = 0;
  for (const inv of invoices) {
    const plan = planByClass.get(String(inv.klass));
    if (!plan) continue;
    const fee = computeLateFee(inv.netPayable, inv.dueDate, now, plan.lateFeeRule, plan.lateFeeValue, plan.graceDays);
    if (fee <= 0) continue;
    const netPayable = inv.netPayable + fee;
    await Invoice.updateOne(
      { _id: inv._id },
      {
        lateFee: fee,
        netPayable,
        status: invoiceStatusFor(netPayable, inv.paidAmount, inv.dueDate, now),
        $push: { lines: { head: null, label: "Late Fee", amount: fee } },
      },
    );
    touched++;
  }
  await recordAudit({ actor: user, action: "fee.late_fee_run", entity: "Invoice", after: { touched } });
  revalidate("/accounts/fees", "/admin/finance");
  return { ok: true, message: `Late fee applied to ${touched} overdue invoice(s).` };
}

void env;
void Student;
