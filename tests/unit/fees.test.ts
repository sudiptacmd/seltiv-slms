import { describe, it, expect } from "vitest";
import { computeInvoiceTotals, computeLateFee, buildInstalmentPlan, invoiceStatusFor } from "@/lib/fees";

describe("computeInvoiceTotals", () => {
  const lines = [
    { headId: "tuition", label: "Monthly Tuition", amount: 2500 },
    { headId: "exam", label: "Exam Fee", amount: 500 },
  ];

  it("sums lines with no discount (mockup: ৳2,500 + ৳500 = ৳3,000)", () => {
    const r = computeInvoiceTotals(lines, []);
    expect(r.grossTotal).toBe(3000);
    expect(r.netPayable).toBe(3000);
  });

  it("applies a percentage discount to the whole invoice", () => {
    const r = computeInvoiceTotals(lines, [{ kind: "percent", value: 50 }]);
    expect(r.discountTotal).toBe(1500);
    expect(r.netPayable).toBe(1500);
  });

  it("scopes a discount to specific fee heads", () => {
    const r = computeInvoiceTotals(lines, [{ kind: "percent", value: 100, headIds: ["tuition"] }]);
    expect(r.discountTotal).toBe(2500);
    expect(r.netPayable).toBe(500);
  });

  it("never discounts more than the gross", () => {
    const r = computeInvoiceTotals(lines, [{ kind: "flat", value: 9999 }]);
    expect(r.netPayable).toBe(0);
  });
});

describe("computeLateFee", () => {
  const due = new Date("2026-09-05");
  it("is zero within the grace period", () => {
    expect(computeLateFee(3000, due, new Date("2026-09-05"), "flat", 100, 0)).toBe(0);
  });
  it("flat charge once overdue", () => {
    expect(computeLateFee(3000, due, new Date("2026-09-20"), "flat", 100, 0)).toBe(100);
  });
  it("per-day accrues", () => {
    expect(computeLateFee(3000, due, new Date("2026-09-10"), "per_day", 20, 0)).toBe(100);
  });
  it("percent of net payable", () => {
    expect(computeLateFee(3000, due, new Date("2026-09-20"), "percent", 5, 0)).toBe(150);
  });
  it("respects grace days", () => {
    expect(computeLateFee(3000, due, new Date("2026-09-08"), "flat", 100, 5)).toBe(0);
    expect(computeLateFee(3000, due, new Date("2026-09-12"), "flat", 100, 5)).toBe(100);
  });
});

describe("buildInstalmentPlan", () => {
  it("splits into 2 by default, last instalment absorbs rounding", () => {
    const plan = buildInstalmentPlan(3001, 2, new Date("2026-09-05"));
    expect(plan).toHaveLength(2);
    expect(plan[0].amount + plan[1].amount).toBe(3001);
    expect(plan[1].dueDate.getMonth()).toBe(9); // October (0-indexed)
  });
  it("returns [] for a single instalment", () => {
    expect(buildInstalmentPlan(3000, 1, new Date())).toEqual([]);
  });
});

describe("invoiceStatusFor", () => {
  const due = new Date("2026-09-05");
  it("issued when unpaid and not yet due", () => {
    expect(invoiceStatusFor(3000, 0, due, new Date("2026-09-01"))).toBe("issued");
  });
  it("overdue when unpaid past the due date", () => {
    expect(invoiceStatusFor(3000, 0, due, new Date("2026-09-10"))).toBe("overdue");
  });
  it("partial / paid based on amount", () => {
    expect(invoiceStatusFor(3000, 1000, due)).toBe("partial");
    expect(invoiceStatusFor(3000, 3000, due)).toBe("paid");
  });
});
