"use server";

import { connectDb } from "@/lib/db";
import { PayrollRun, Payslip, SalaryStructure, Notification, User } from "@/models";
import { ensurePayslipsForRun, computePayslip } from "@/lib/payroll";
import { generatePayslipPdf } from "@/lib/documents";
import { recordAudit } from "@/lib/audit";
import { guard, revalidate, type ActionState } from "./_common";

export async function createPayrollRun(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("accountant");
  if (deny) return deny;
  await connectDb();
  const month = Number(form.get("month"));
  const year = Number(form.get("year"));
  const workingDays = Number(form.get("workingDays") ?? 26);
  if (!month || !year) return { error: "Pick a month and year." };

  const existing = await PayrollRun.findOne({ month, year });
  if (existing) {
    await ensurePayslipsForRun(String(existing._id));
    revalidate("/accounts/payroll");
    return { ok: true, message: "Run already exists — payslips refreshed." };
  }
  const run = await PayrollRun.create({ month, year, workingDays, status: "draft", createdBy: user!.staffId });
  await ensurePayslipsForRun(String(run._id));
  await recordAudit({ actor: user, action: "payroll.create", entity: "PayrollRun", entityId: String(run._id), after: { month, year } });
  revalidate("/accounts/payroll");
  return { ok: true, message: `Draft payroll created for ${month}/${year}.` };
}

export async function updatePayslip(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("accountant");
  if (deny) return deny;
  await connectDb();
  const id = String(form.get("id") ?? "");
  const lopDays = Number(form.get("lopDays") ?? 0);
  const bonus = Number(form.get("bonus") ?? 0);

  const payslip = await Payslip.findById(id);
  if (!payslip) return { error: "Payslip not found." };
  if (payslip.status === "paid") return { error: "This payslip is already paid." };

  const structure = await SalaryStructure.findOne({ staff: payslip.staff, active: true }).lean();
  if (!structure) return { error: "No salary structure for this staff member." };

  const c = computePayslip(structure, {
    daysInMonth: payslip.daysInMonth,
    lopDays,
    extraDeductions: [],
  });
  payslip.allowances = [...c.allowances, ...(bonus ? [{ label: "Bonus / Adjustment", amount: bonus }] : [])];
  payslip.deductions = c.deductions;
  payslip.providentFund = c.providentFund;
  payslip.lopDays = lopDays;
  payslip.lopAmount = c.lopAmount;
  payslip.daysPresent = payslip.daysInMonth - lopDays;
  payslip.gross = c.gross + bonus;
  payslip.net = c.net + bonus;
  await payslip.save();

  revalidate("/accounts/payroll");
  return { ok: true, message: "Payslip updated." };
}

export async function markPayslipPaid(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("accountant");
  if (deny) return deny;
  await connectDb();
  const id = String(form.get("id") ?? "");
  const ref = String(form.get("reference") ?? "").trim() || undefined;
  const payslip = await Payslip.findById(id);
  if (!payslip) return { error: "Payslip not found." };
  payslip.status = "paid";
  payslip.paidAt = new Date();
  payslip.paymentRef = ref;
  payslip.pdfUrl = await generatePayslipPdf(id);
  await payslip.save();

  const staffUser = await User.findOne({ staff: payslip.staff });
  if (staffUser) {
    await Notification.create({
      user: staffUser._id,
      title: `Salary paid — ${payslip.month}/${payslip.year}`,
      href: "/teacher/profile",
      icon: "wallet",
    });
  }
  await recordAudit({ actor: user, action: "payroll.pay", entity: "Payslip", entityId: id, after: { net: payslip.net } });
  revalidate("/accounts/payroll");
  return { ok: true, message: "Marked paid and payslip generated." };
}

export async function generateAllPayslips(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("accountant");
  if (deny) return deny;
  await connectDb();
  const runId = String(form.get("runId") ?? "");
  const slips = await Payslip.find({ run: runId, status: { $ne: "paid" } });
  for (const s of slips) {
    s.pdfUrl = await generatePayslipPdf(String(s._id));
    if (s.status === "draft") s.status = "pending";
    await s.save();
  }
  await PayrollRun.updateOne({ _id: runId }, { status: "finalised" });
  revalidate("/accounts/payroll");
  return { ok: true, message: `${slips.length} payslips generated. Run finalised.` };
}
