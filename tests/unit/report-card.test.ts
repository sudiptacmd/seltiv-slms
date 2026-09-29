import { describe, expect, it } from "vitest";
import { computeReport, computeRow, defaultSchemeRows, rankReports, rowFullMarks, validateRowValues, type RowValues } from "@/lib/report-card";

const subjects = [
  ["BAN", "Bangla"], ["ENG", "English"], ["MATH", "Mathematics"], ["BGS", "Bangladesh and Global Studies"],
  ["SCI", "Science"], ["REL", "Religion"], ["ICT", "ICT"],
].map(([code, name], i) => ({ _id: `s${i}`, code, name }));
const scheme = defaultSchemeRows(subjects);
const row = (key: string) => scheme.find((r) => r.key === key)!;
const main = (written: number, objective: number, practical: number, oral: number, attendance: number, assignment: number, ct: number, diary: number): RowValues =>
  ({ written, objective, practical, oral, attendance, assignment, ct, diary });

// Figures from the school's printed Half Yearly card (Class Seven).
const card: [string, RowValues, number, string, number][] = [
  ["ban1", main(42, 22, 0, 20, 4.34, 10, 9.88, 5), 74.33, "A", 4],
  ["ban2", main(30, 13, 0, 0, 4.34, 10, 10, 5), 44.77, "A+", 5],
  ["eng1", main(64, 0, 0, 19, 4.34, 6, 9.75, 5), 71.25, "A", 4],
  ["eng2", main(26, 0, 0, 0, 4.34, 7, 7.5, 5), 30.12, "A-", 3.5],
  ["math", main(60, 22, 0, 20, 4.34, 10, 10, 5), 87, "A+", 5],
  ["bgs", main(55, 28, 0, 20, 4.34, 10, 10, 5), 87.7, "A+", 5],
  ["sci", main(66, 21, 0, 20, 4.34, 10, 9.75, 5), 90.35, "A+", 5],
  ["rel", main(55, 25, 0, 20, 4.34, 10, 10, 5), 85.6, "A+", 5],
  ["ict", main(21, 0, 20, 0, 4.34, 10, 10, 5), 43.37, "A+", 5],
];

describe("report card marking", () => {
  it("uses the card's full marks: 100 for full subjects, 50 for 2nd papers and ICT", () => {
    expect(scheme.filter((r) => r.kind === "main").map((r) => [r.key, rowFullMarks(r)])).toEqual([
      ["ban1", 100], ["ban2", 50], ["eng1", 100], ["eng2", 50], ["math", 100], ["bgs", 100], ["sci", 100], ["rel", 100], ["ict", 50],
    ]);
    expect(rowFullMarks(row("home_agri"))).toBe(50);
  });

  it.each(card)("reproduces %s from the printed card", (key, values, total, grade, gp) => {
    const r = computeRow(row(key), values, false);
    expect(r.total).toBeCloseTo(total, 2);
    expect([r.grade, r.gp]).toEqual([grade, gp]);
  });

  it("converts summative at 70% and continuous at the row's rate", () => {
    const r = computeRow(row("ban1"), card[0][1], false);
    expect([r.summativeConverted, r.continuousConverted]).toEqual([44.8, 29.53]);
  });

  it("computes the grand total and GPA across main rows only", () => {
    const entries = new Map(card.map(([k, values]) => [k, { values, absent: false }]));
    entries.set("home_agri", { values: { cw: 20, project: 10, ct: 20 }, absent: false });
    const rep = computeReport(scheme, entries);
    expect(rep.grandTotal).toBeCloseTo(614.49, 2);
    expect(rep.gpa).toBe(4.61);
    expect(rep.rows.find((r) => r.key === "home_agri")).toMatchObject({ total: 50, grade: "A+", gp: 5 });
    expect(rep.failed).toBe(false);
  });

  it("fails the result when any main row is absent, failed or missing", () => {
    const entries = new Map(card.map(([k, values]) => [k, { values, absent: false }]));
    entries.set("math", { values: {}, absent: true });
    expect(computeReport(scheme, entries)).toMatchObject({ failed: true, gpa: 0, grade: "F" });
    entries.set("math", { values: main(10, 5, 0, 5, 1, 1, 1, 1), absent: false });
    expect(computeReport(scheme, entries).rows.find((r) => r.key === "math")).toMatchObject({ grade: "F", failed: true });
  });

  it("rejects marks above a field's maximum", () => {
    expect(() => validateRowValues(row("ban2"), { written: 36 })).toThrow("Bangla 2nd Paper Written must be between 0 and 35.");
    expect(() => validateRowValues(row("ban2"), { oral: 5 })).not.toThrow(); // oral does not apply to 2nd papers; ignored
  });

  it("ranks passed students by GPA then grand total, sharing ties", () => {
    const ranks = rankReports([
      { id: "a", gpa: 4.5, grandTotal: 600, failed: false },
      { id: "b", gpa: 5, grandTotal: 580, failed: false },
      { id: "c", gpa: 4.5, grandTotal: 600, failed: false },
      { id: "d", gpa: 0, grandTotal: 700, failed: true },
    ]);
    expect(Object.fromEntries(ranks)).toEqual({ b: 1, a: 2, c: 2, d: 4 });
  });
});
