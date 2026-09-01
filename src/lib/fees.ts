import type { LateFeeRule } from "@/models/types";

export type FeeLineInput = { headId: string; label: string; amount: number; headCode?: string };
export type DiscountInput = { kind: "percent" | "flat"; value: number; headIds?: string[] };

export type ComputedInvoice = {
  lines: FeeLineInput[];
  grossTotal: number;
  discountTotal: number;
  netPayable: number;
};

export function computeInvoiceTotals(lines: FeeLineInput[], discounts: DiscountInput[]): ComputedInvoice {
  const grossTotal = lines.reduce((s, l) => s + l.amount, 0);
  let discountTotal = 0;
  for (const d of discounts) {
    const base = d.headIds?.length
      ? lines.filter((l) => d.headIds!.includes(l.headId)).reduce((s, l) => s + l.amount, 0)
      : grossTotal;
    discountTotal += d.kind === "percent" ? (base * d.value) / 100 : d.value;
  }
  discountTotal = Math.min(discountTotal, grossTotal);
  return {
    lines,
    grossTotal: round(grossTotal),
    discountTotal: round(discountTotal),
    netPayable: round(grossTotal - discountTotal),
  };
}

export function computeLateFee(
  baseNetPayable: number,
  dueDate: Date,
  now: Date,
  rule: LateFeeRule,
  value: number,
  graceDays: number,
): number {
  const graceEnd = new Date(dueDate);
  graceEnd.setDate(graceEnd.getDate() + graceDays);
  if (now <= graceEnd || rule === "none") return 0;
  const daysLate = Math.ceil((now.getTime() - graceEnd.getTime()) / 86_400_000);
  switch (rule) {
    case "flat":
      return round(value);
    case "per_day":
      return round(value * daysLate);
    case "percent":
      return round((baseNetPayable * value) / 100);
    default:
      return 0;
  }
}

export function buildInstalmentPlan(
  netPayable: number,
  count: number,
  firstDueDate: Date,
): { number: number; amount: number; dueDate: Date; paid: boolean }[] {
  if (count <= 1) return [];
  const per = Math.floor((netPayable / count) * 100) / 100;
  const plan: { number: number; amount: number; dueDate: Date; paid: boolean }[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? round(netPayable - allocated) : per;
    allocated += amount;
    const due = new Date(firstDueDate);
    due.setMonth(due.getMonth() + i);
    plan.push({ number: i + 1, amount, dueDate: due, paid: false });
  }
  return plan;
}

export function invoiceStatusFor(netPayable: number, paidAmount: number, dueDate: Date, now = new Date()) {
  if (paidAmount <= 0) return now > dueDate ? "overdue" : "issued";
  if (paidAmount >= netPayable) return "paid";
  return "partial";
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
