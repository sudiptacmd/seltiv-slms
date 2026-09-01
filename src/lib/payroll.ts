import "server-only";
import { connectDb } from "./db";
import { Payslip, PayrollRun, SalaryStructure, Staff } from "@/models";

export async function staffPayslips(staffId: string) {
  await connectDb();
  return Payslip.find({ staff: staffId }).sort({ year: -1, month: -1 }).lean();
}

export async function payrollRunDetail(month: number, year: number) {
  await connectDb();
  const run = await PayrollRun.findOne({ month, year }).lean();
  if (!run) return null;
  const payslips = await Payslip.find({ run: run._id }).populate("staff", "name designation staffCode type").lean();
  return { run, payslips };
}

export async function latestPayrollRun() {
  await connectDb();
  return PayrollRun.findOne().sort({ year: -1, month: -1 }).lean();
}

export function computePayslip(
  structure: { basic: number; components: { label: string; kind: string; amount: number }[]; providentFundPercent: number },
  opts: { daysInMonth: number; lopDays: number; extraDeductions?: { label: string; amount: number }[] },
) {
  const allowances = structure.components.filter((c) => c.kind === "allowance").map((c) => ({ label: c.label, amount: c.amount }));
  const baseDeductions = structure.components.filter((c) => c.kind === "deduction").map((c) => ({ label: c.label, amount: c.amount }));
  const pf = Math.round((structure.basic * structure.providentFundPercent) / 100);
  const grossFull = structure.basic + allowances.reduce((s, a) => s + a.amount, 0);
  const perDay = grossFull / opts.daysInMonth;
  const lopAmount = Math.round(perDay * opts.lopDays);
  const deductions = [
    ...baseDeductions,
    ...(pf ? [{ label: "Provident Fund", amount: pf }] : []),
    ...(lopAmount ? [{ label: `Loss of pay (${opts.lopDays}d)`, amount: lopAmount }] : []),
    ...(opts.extraDeductions ?? []),
  ];
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  return {
    allowances,
    deductions,
    providentFund: pf,
    lopAmount,
    gross: grossFull,
    net: grossFull - totalDeductions,
  };
}

export async function ensurePayslipsForRun(runId: string) {
  await connectDb();
  const run = await PayrollRun.findById(runId);
  if (!run) return;
  const structures = await SalaryStructure.find({ active: true }).lean();
  const daysInMonth = new Date(run.year, run.month, 0).getDate();
  for (const st of structures) {
    const exists = await Payslip.findOne({ run: run._id, staff: st.staff });
    if (exists) continue;
    const c = computePayslip(st, { daysInMonth, lopDays: 0 });
    await Payslip.create({
      run: run._id,
      staff: st.staff,
      month: run.month,
      year: run.year,
      basic: st.basic,
      allowances: c.allowances,
      deductions: c.deductions,
      providentFund: c.providentFund,
      daysPresent: run.workingDays,
      daysInMonth,
      lopDays: 0,
      lopAmount: 0,
      gross: c.gross,
      net: c.net,
      status: "draft",
    });
  }
}
