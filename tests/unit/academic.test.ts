import { describe, it, expect } from "vitest";
import { computeResult, gradeFor, rankResults, DEFAULT_GRADE_BANDS } from "@/lib/academic";

const scale = { bands: DEFAULT_GRADE_BANDS, failGrade: "F" };

describe("gradeFor", () => {
  it("maps percentages to the Bangladesh GPA-5 scale", () => {
    expect(gradeFor(85, scale)).toEqual({ grade: "A+", gpa: 5 });
    expect(gradeFor(72, scale)).toEqual({ grade: "A", gpa: 4 });
    expect(gradeFor(40, scale)).toEqual({ grade: "C", gpa: 2 });
    expect(gradeFor(10, scale)).toEqual({ grade: "F", gpa: 0 });
  });
});

describe("computeResult", () => {
  const subj = (obtained: number, full = 100, pass = 33) => ({
    subjectId: Math.random().toString(),
    obtained,
    fullMarks: full,
    passMarks: pass,
    absent: false,
  });

  it("averages subject grade points for an all-pass student", () => {
    const r = computeResult([subj(88), subj(82), subj(94), subj(90)], scale);
    expect(r.failed).toBe(false);
    expect(r.grade).toBe("A+");
    expect(r.gpa).toBe(5); // all four subjects A+
    expect(r.totalObtained).toBe(354);
    expect(r.percent).toBeCloseTo(88.5, 1);
  });

  it("fails the whole result and zeroes GPA when any subject is below pass marks", () => {
    const r = computeResult([subj(88), subj(20), subj(94)], scale);
    expect(r.failed).toBe(true);
    expect(r.gpa).toBe(0);
    expect(r.grade).toBe("F");
  });

  it("treats an absent subject as a fail", () => {
    const r = computeResult(
      [subj(88), { ...subj(0), absent: true }],
      scale,
    );
    expect(r.failed).toBe(true);
    expect(r.subjects[1].absent).toBe(true);
  });
});

describe("rankResults", () => {
  it("dense-ranks by total then GPA, sharing ranks on ties", () => {
    const ranks = rankResults([
      { student: "a", totalObtained: 400, gpa: 5 },
      { student: "b", totalObtained: 400, gpa: 5 },
      { student: "c", totalObtained: 380, gpa: 4.5 },
      { student: "d", totalObtained: 350, gpa: 4 },
    ]);
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(3);
    expect(ranks.get("d")).toBe(4);
  });
});
