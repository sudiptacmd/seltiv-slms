import { z } from "zod";

export const PERIODS = ["pretest", "test", "final_term"] as const;
export const PERIOD_LABELS = { pretest: "Pretest", test: "Test", final_term: "Final term" };
export const COMPONENT_LABELS = {
  diary: "Diary", attendance: "Attendance", weekly_test: "Weekly test",
  final_exam: "Final exam", exam: "Exam", final_test: "Final test",
};
export const componentSchema = z.object({
  key: z.enum(["diary", "attendance", "weekly_test", "final_exam", "exam", "final_test"]),
  marks: z.number().finite().positive().max(1000),
}).strict();
export const allocationSchema = z.object({
  period: z.enum(PERIODS),
  total: z.number().finite().positive().max(1000),
  components: z.array(componentSchema).min(1).max(6),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.components.map(c => c.key)).size !== value.components.length)
    ctx.addIssue({ code: "custom", message: "A component cannot appear twice in the same assessment." });
  if (Math.abs(value.components.reduce((n, c) => n + c.marks, 0) - value.total) > 0.001)
    ctx.addIssue({ code: "custom", message: `${PERIOD_LABELS[value.period]} component marks must add up to ${value.total}.` });
});
export const requestSchema = z.object({
  classNumber: z.number().int().min(1).max(12),
  subjectName: z.string().trim().min(1).max(80),
  allocations: z.array(allocationSchema).min(1).max(3),
}).strict().superRefine((v, ctx) => {
  if (new Set(v.allocations.map(a => a.period)).size !== v.allocations.length)
    ctx.addIssue({ code: "custom", message: "An assessment cannot appear twice." });
});
export type Component = z.infer<typeof componentSchema>;
export type Allocation = z.infer<typeof allocationSchema>;
export type GradingRequest = z.infer<typeof requestSchema>;
export type Proposal = {
  token: string; className: string; subjectName: string; yearName: string;
  before: Allocation[]; after: Allocation[]; changed: Allocation["period"][];
  model: string; version: number;
};
export function mergeAllocations(before: Allocation[], updates: Allocation[]): Allocation[] {
  const map = new Map(before.map(a => [a.period, a]));
  for (const a of updates) map.set(a.period, a);
  return PERIODS.flatMap(p => map.has(p) ? [map.get(p)!] : []);
}
export function componentTotal(components: Component[], values: Record<string, unknown>): number | null {
  let total = 0, complete = true;
  for (const c of components) {
    const raw = values[c.key];
    if (raw == null || String(raw).trim() === "") { complete = false; continue; }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > c.marks)
      throw new Error(`${COMPONENT_LABELS[c.key]} must be between 0 and ${c.marks}.`);
    total += n;
  }
  return complete ? Math.round(total * 100) / 100 : null;
}
