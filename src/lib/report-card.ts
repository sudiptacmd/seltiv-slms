/**
 * Report-card marking (Bangladesh secondary format).
 *
 * A "main" row (e.g. Bangla 1st Paper) has a summative part — Written, Objective, Practical —
 * converted at `summativePct` into (a), and a continuous part — Oral, Attendance, Assignment,
 * C.T., Diary — converted at `continuousPct` into (b). Total = (a) + (b).
 * An "extra" row (e.g. Home Science / Agriculture) is continuous-only: CW + Assignment/Project/
 * Practical + C.T., added as-is. It is shown separately and is not part of the grand total or GPA.
 *
 * A field with max 0 does not apply to that row.
 */
import { gradeFor } from "./academic";
import type { IGradingScale } from "@/models/academic";

export const SUMMATIVE_FIELDS = ["written", "objective", "practical"] as const;
export const CONTINUOUS_FIELDS = ["oral", "attendance", "assignment", "ct", "diary"] as const;
export const EXTRA_FIELDS = ["cw", "project", "ct"] as const;
export type RowKind = "main" | "extra";
export type FieldKey = (typeof SUMMATIVE_FIELDS)[number] | (typeof CONTINUOUS_FIELDS)[number] | (typeof EXTRA_FIELDS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  written: "Written",
  objective: "Objective",
  practical: "Practical",
  oral: "Oral",
  attendance: "Attendance",
  assignment: "Assignment",
  ct: "C.T.",
  diary: "Diary",
  cw: "CW",
  project: "Assignment / Project / Practical",
};

export type SchemeRow = {
  key: string;
  label: string;
  subject?: string;
  kind: RowKind;
  max: Partial<Record<FieldKey, number>>;
  summativePct: number;
  continuousPct: number;
};

export type RowValues = Partial<Record<FieldKey, number | null>>;

export const fieldsFor = (kind: RowKind): readonly FieldKey[] =>
  kind === "extra" ? EXTRA_FIELDS : [...SUMMATIVE_FIELDS, ...CONTINUOUS_FIELDS];

export const activeFields = (row: SchemeRow) => fieldsFor(row.kind).filter((f) => (row.max[f] ?? 0) > 0);

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (row: SchemeRow, fields: readonly FieldKey[], pick: (f: FieldKey) => number) =>
  fields.filter((f) => (row.max[f] ?? 0) > 0).reduce((s, f) => s + pick(f), 0);

export function rowFullMarks(row: SchemeRow): number {
  const max = (f: FieldKey) => row.max[f] ?? 0;
  if (row.kind === "extra") return r2(sum(row, EXTRA_FIELDS, max));
  return r2((sum(row, SUMMATIVE_FIELDS, max) * row.summativePct) / 100 + (sum(row, CONTINUOUS_FIELDS, max) * row.continuousPct) / 100);
}

/** Throws with a readable message when a value is outside 0…max for its field. */
export function validateRowValues(row: SchemeRow, values: RowValues) {
  for (const f of activeFields(row)) {
    const v = values[f];
    if (v == null) continue;
    if (!Number.isFinite(v) || v < 0 || v > (row.max[f] ?? 0)) throw new Error(`${row.label} ${FIELD_LABELS[f]} must be between 0 and ${row.max[f]}.`);
  }
}

export type ComputedRow = {
  key: string;
  label: string;
  kind: RowKind;
  subject?: string;
  values: RowValues;
  summativeConverted: number | null;
  continuousConverted: number | null;
  total: number | null;
  fullMarks: number;
  grade: string;
  gp: number;
  absent: boolean;
  failed: boolean;
  complete: boolean;
};

type Scale = Pick<IGradingScale, "bands" | "failGrade"> | null | undefined;

export function computeRow(row: SchemeRow, values: RowValues, absent: boolean, scale?: Scale): ComputedRow {
  const fullMarks = rowFullMarks(row);
  const fields = activeFields(row);
  const complete = absent || fields.every((f) => values[f] != null);
  const entered = fields.some((f) => values[f] != null);
  const v = (f: FieldKey) => values[f] ?? 0;
  let a: number | null = null, b: number | null = null, total: number | null = null;
  if (absent) total = 0;
  else if (entered) {
    if (row.kind === "extra") total = r2(sum(row, EXTRA_FIELDS, v));
    else {
      a = r2((sum(row, SUMMATIVE_FIELDS, v) * row.summativePct) / 100);
      b = r2((sum(row, CONTINUOUS_FIELDS, v) * row.continuousPct) / 100);
      total = r2(a + b);
    }
  }
  const { grade, gpa } = total == null ? { grade: "", gpa: 0 } : gradeFor(fullMarks ? (total / fullMarks) * 100 : 0, scale);
  const failed = absent || (total != null && gpa === 0);
  return {
    key: row.key, label: row.label, kind: row.kind, subject: row.subject, values,
    summativeConverted: a, continuousConverted: b, total, fullMarks,
    grade: absent ? scale?.failGrade ?? "F" : grade, gp: failed ? 0 : gpa, absent, failed, complete,
  };
}

export type ComputedReport = {
  rows: ComputedRow[];
  grandTotal: number;
  totalFull: number;
  percent: number;
  gpa: number;
  grade: string;
  failed: boolean;
};

/**
 * GPA = mean grade point of the main rows (each paper counts as its own row, as printed on the card).
 * Any failed or absent main row fails the result and sets GPA to 0.
 */
export function computeReport(
  scheme: SchemeRow[],
  entries: Map<string, { values: RowValues; absent: boolean }>,
  scale?: Scale,
): ComputedReport {
  const rows = scheme.map((row) => {
    const e = entries.get(row.key);
    return computeRow(row, e?.values ?? {}, e?.absent ?? false, scale);
  });
  const main = rows.filter((r) => r.kind === "main");
  const grandTotal = r2(main.reduce((s, r) => s + (r.total ?? 0), 0));
  const totalFull = r2(main.reduce((s, r) => s + r.fullMarks, 0));
  const failed = main.some((r) => r.failed || r.total == null);
  const gpa = failed || !main.length ? 0 : r2(main.reduce((s, r) => s + r.gp, 0) / main.length);
  const percent = totalFull ? r2((grandTotal / totalFull) * 100) : 0;
  const bands = (scale?.bands?.length ? scale.bands : null);
  const grade = failed ? scale?.failGrade ?? "F" : gradeFromGpa(gpa, bands);
  return { rows, grandTotal, totalFull, percent, gpa, grade, failed };
}

function gradeFromGpa(gpa: number, bands: { grade: string; gpa: number }[] | null) {
  const list = (bands ?? [
    { grade: "A+", gpa: 5 }, { grade: "A", gpa: 4 }, { grade: "A-", gpa: 3.5 }, { grade: "B", gpa: 3 }, { grade: "C", gpa: 2 }, { grade: "D", gpa: 1 }, { grade: "F", gpa: 0 },
  ]).slice().sort((x, y) => y.gpa - x.gpa);
  return list.find((b) => gpa >= b.gpa)?.grade ?? "F";
}

/** Standard competition ranking: passed before failed, then GPA, then grand total. */
export function rankReports<T extends { id: string; gpa: number; grandTotal: number; failed: boolean }>(list: T[]) {
  const key = (r: T) => [r.failed ? 1 : 0, -r.gpa, -r.grandTotal] as const;
  const sorted = list.slice().sort((x, y) => {
    const a = key(x), b = key(y);
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  });
  const ranks = new Map<string, number>();
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    ranks.set(r.id, prev && prev.failed === r.failed && prev.gpa === r.gpa && prev.grandTotal === r.grandTotal ? ranks.get(prev.id)! : i + 1);
  });
  return ranks;
}

const CA_FULL = { attendance: 5, assignment: 10, ct: 10, diary: 5 };
const mainRow = (key: string, label: string, subject: string | undefined, summ: Partial<Record<FieldKey, number>>, oral: number): SchemeRow => ({
  key, label, subject, kind: "main",
  max: { written: 0, objective: 0, practical: 0, ...summ, oral, ...CA_FULL },
  summativePct: 70,
  continuousPct: oral ? 60 : 50,
});

/**
 * Default rows for a class, matching the school's printed card:
 * 100-mark subjects: summative out of 100 at 70% + continuous out of 50 (with Oral) at 60%.
 * 50-mark papers (2nd papers, ICT): summative out of 50 at 70% + continuous out of 30 at 50%.
 */
export function defaultSchemeRows(subjects: { _id: unknown; name: string; code: string }[]): SchemeRow[] {
  const rows: SchemeRow[] = [];
  for (const s of subjects) {
    const id = String(s._id), code = s.code.toUpperCase();
    if (code === "BAN") {
      rows.push(mainRow("ban1", `${s.name} 1st Paper`, id, { written: 70, objective: 30 }, 20));
      rows.push(mainRow("ban2", `${s.name} 2nd Paper`, id, { written: 35, objective: 15 }, 0));
    } else if (code === "ENG") {
      rows.push(mainRow("eng1", `${s.name} 1st Paper`, id, { written: 100 }, 20));
      rows.push(mainRow("eng2", `${s.name} 2nd Paper`, id, { written: 50 }, 0));
    } else if (code === "ICT") {
      rows.push(mainRow("ict", s.name, id, { written: 25, practical: 25 }, 0));
    } else {
      rows.push(mainRow(code.toLowerCase(), s.name, id, { written: 70, objective: 30 }, 20));
    }
  }
  rows.push({ key: "home_agri", label: "Home Science / Agriculture", kind: "extra", max: { cw: 20, project: 10, ct: 20 }, summativePct: 100, continuousPct: 100 });
  return rows;
}
