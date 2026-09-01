import type { IGradeBand, IGradingScale } from "@/models/academic";

/** Bangladesh secondary GPA-5 scale (used as the seeded default). */
export const DEFAULT_GRADE_BANDS: IGradeBand[] = [
  { grade: "A+", minPercent: 80, gpa: 5.0 },
  { grade: "A", minPercent: 70, gpa: 4.0 },
  { grade: "A-", minPercent: 60, gpa: 3.5 },
  { grade: "B", minPercent: 50, gpa: 3.0 },
  { grade: "C", minPercent: 40, gpa: 2.0 },
  { grade: "D", minPercent: 33, gpa: 1.0 },
  { grade: "F", minPercent: 0, gpa: 0.0 },
];

export function gradeFor(
  percent: number,
  scale?: Pick<IGradingScale, "bands" | "failGrade"> | null,
): { grade: string; gpa: number } {
  const bands = (scale?.bands?.length ? scale.bands : DEFAULT_GRADE_BANDS)
    .slice()
    .sort((a, b) => b.minPercent - a.minPercent);
  for (const band of bands) {
    if (percent >= band.minPercent) return { grade: band.grade, gpa: band.gpa };
  }
  return { grade: scale?.failGrade ?? "F", gpa: 0 };
}

export type SubjectMark = {
  subjectId: string;
  obtained: number | null;
  fullMarks: number;
  passMarks: number;
  absent: boolean;
  exempt?: boolean;
};

export type ComputedResult = {
  subjects: {
    subjectId: string;
    obtained: number | null;
    fullMarks: number;
    grade: string;
    gpa: number;
    absent: boolean;
  }[];
  totalObtained: number;
  totalFull: number;
  percent: number;
  gpa: number;
  grade: string;
  failed: boolean;
};

/**
 * GPA = mean of subject grade-points; any subject failed (or absent) fails the
 * result and caps GPA at 0 — the common SSC convention. Kept deliberately
 * simple (no 4th-subject bonus handling for now).
 */
export function computeResult(
  marks: SubjectMark[],
  scale?: Pick<IGradingScale, "bands" | "failGrade"> | null,
): ComputedResult {
  const graded = marks.filter((m) => !m.exempt);
  let totalObtained = 0;
  let totalFull = 0;
  let anyFail = false;
  const subjects = graded.map((m) => {
    const obtained = m.absent ? 0 : m.obtained ?? 0;
    const percent = m.fullMarks ? (obtained / m.fullMarks) * 100 : 0;
    const { grade, gpa } = gradeFor(percent, scale);
    const failed = m.absent || obtained < m.passMarks;
    if (failed) anyFail = true;
    totalObtained += obtained;
    totalFull += m.fullMarks;
    return {
      subjectId: m.subjectId,
      obtained: m.absent ? null : m.obtained,
      fullMarks: m.fullMarks,
      grade: failed ? scale?.failGrade ?? "F" : grade,
      gpa: failed ? 0 : gpa,
      absent: m.absent,
    };
  });

  const percent = totalFull ? (totalObtained / totalFull) * 100 : 0;
  const meanGpa = subjects.length ? subjects.reduce((s, x) => s + x.gpa, 0) / subjects.length : 0;
  const overall = gradeFor(percent, scale);

  return {
    subjects,
    totalObtained,
    totalFull,
    percent: round(percent, 2),
    gpa: anyFail ? 0 : round(meanGpa, 2),
    grade: anyFail ? scale?.failGrade ?? "F" : overall.grade,
    failed: anyFail,
  };
}

/** Dense ranking (1,1,3…) by total obtained desc, then GPA desc. */
export function rankResults<T extends { student: string; totalObtained: number; gpa: number }>(
  results: T[],
): Map<string, number> {
  const sorted = results
    .slice()
    .sort((a, b) => b.totalObtained - a.totalObtained || b.gpa - a.gpa);
  const ranks = new Map<string, number>();
  let rank = 0;
  let prevKey = "";
  sorted.forEach((r, i) => {
    const key = `${r.totalObtained}|${r.gpa}`;
    if (key !== prevKey) rank = i + 1;
    ranks.set(r.student, rank);
    prevKey = key;
  });
  return ranks;
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
