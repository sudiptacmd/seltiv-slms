import "server-only";
import { connectDb } from "./db";
import {
  AcademicYear,
  AdmissionApplication,
  ClassModel,
  Enrollment,
  Result,
  Exam,
  Section,
} from "@/models";
import { getCurrentYear } from "./queries";

const id = (x: unknown) => String(x);

/** The year students are promoted *into*: the earliest year that starts after the current one. */
export async function getNextYear() {
  await connectDb();
  const cur = await getCurrentYear();
  return (await AcademicYear.findOne({ startDate: { $gt: cur.startDate } }).sort({ startDate: 1 }).lean()) ?? null;
}

type Candidate = {
  key: string;
  kind: "student" | "applicant";
  id: string;
  name: string;
  code: string;
  from: string; // "Class 6 A · roll 3" / "New admission"
  result?: { gpa: number; failed: boolean };
};

/** Active current-year enrollments that have no next-year enrollment yet, with their latest result. */
async function pendingEnrollments(currentYear: { _id: unknown }, nextYear: { _id: unknown }) {
  const [active, placed] = await Promise.all([
    Enrollment.find({ year: currentYear._id, status: "active" })
      .populate("student", "name studentCode")
      .populate("section", "name")
      .lean(),
    Enrollment.find({ year: nextYear._id }).select("student").lean(),
  ]);
  const placedSet = new Set(placed.map((p) => id(p.student)));
  return active.filter((e) => e.student && !placedSet.has(id((e.student as unknown as { _id: unknown })._id)));
}

async function latestResults(yearId: unknown) {
  const exams = await Exam.find({ year: yearId }).select("createdAt").lean();
  const order = new Map(exams.map((e) => [id(e._id), new Date(e.createdAt).getTime()]));
  const results = await Result.find({ year: yearId }).select("student exam gpa failed").lean();
  const byStudent = new Map<string, { gpa: number; failed: boolean; at: number }>();
  for (const r of results) {
    const at = order.get(id(r.exam)) ?? 0;
    const cur = byStudent.get(id(r.student));
    if (!cur || at > cur.at) byStudent.set(id(r.student), { gpa: r.gpa, failed: r.failed, at });
  }
  return byStudent;
}

export async function getPromotionOverview() {
  await connectDb();
  const currentYear = await getCurrentYear();
  const nextYear = await getNextYear();
  if (!nextYear) return { currentYear, nextYear: null } as const;

  const [classes, sections, pending, results, applicants, nextEnr] = await Promise.all([
    ClassModel.find().sort({ numeric: 1 }).lean(),
    Section.find().sort({ name: 1 }).lean(),
    pendingEnrollments(currentYear, nextYear),
    latestResults(currentYear._id),
    AdmissionApplication.find({ stage: { $in: ["seat_offered", "verified"] }, enrolledStudent: { $exists: false } }).lean(),
    Enrollment.aggregate<{ _id: { klass: unknown; section: unknown }; n: number }>([
      { $match: { year: nextYear._id } },
      { $group: { _id: { klass: "$klass", section: "$section" }, n: { $sum: 1 } } },
    ]),
  ]);

  const seated = new Map(nextEnr.map((r) => [id(r._id.section), r.n]));
  const rows = classes.map((c, i) => {
    const prev = classes[i - 1];
    const fromPending = prev ? pending.filter((e) => id(e.klass) === id(prev._id)) : [];
    const failed = fromPending.filter((e) => results.get(id((e.student as unknown as { _id: unknown })._id))?.failed).length;
    const secs = sections.filter((s) => id(s.klass) === id(c._id));
    const placed = secs.reduce((n, s) => n + (seated.get(id(s._id)) ?? 0), 0);
    return {
      id: id(c._id),
      name: c.name,
      fromName: prev?.name ?? null,
      eligible: fromPending.length - failed,
      failed,
      newcomers: applicants.filter((a) => id(a.klass) === id(c._id)).length,
      sections: secs.map((s) => ({ name: s.name, capacity: s.capacity, placed: seated.get(id(s._id)) ?? 0 })),
      placed,
    };
  });

  const top = classes[classes.length - 1];
  // "Not promoted" = left out of a class plan that has already been run (its target class has seated students).
  const plannedTargets = new Set(rows.filter((r) => r.placed > 0).map((r) => r.id));
  const nextOf = (klassId: unknown) => classes[classes.findIndex((c) => id(c._id) === id(klassId)) + 1];
  const notPromoted = pending.filter((e) => id(e.klass) !== id(top?._id) && plannedTargets.has(id(nextOf(e.klass)?._id))).length;
  const promotedSoFar = nextEnr.reduce((n, r) => n + r.n, 0);
  return { currentYear, nextYear, rows, notPromoted, promotedSoFar, graduating: pending.filter((e) => id(e.klass) === id(top?._id)).length, topName: top?.name } as const;
}

export async function getPromotionPlan(targetClassId: string) {
  await connectDb();
  const currentYear = await getCurrentYear();
  const nextYear = await getNextYear();
  if (!nextYear) return null;
  const classes = await ClassModel.find().sort({ numeric: 1 }).lean();
  const idx = classes.findIndex((c) => id(c._id) === targetClassId);
  if (idx < 0) return null;
  const target = classes[idx];
  const prev = classes[idx - 1];

  const [pending, results, applicants, sections, nextEnr] = await Promise.all([
    pendingEnrollments(currentYear, nextYear),
    latestResults(currentYear._id),
    AdmissionApplication.find({ klass: target._id, stage: { $in: ["seat_offered", "verified"] }, enrolledStudent: { $exists: false } })
      .sort({ testScore: -1, applicationNo: 1 })
      .lean(),
    Section.find({ klass: target._id }).sort({ name: 1 }).lean(),
    Enrollment.aggregate<{ _id: unknown; n: number }>([
      { $match: { year: nextYear._id, klass: target._id } },
      { $group: { _id: "$section", n: { $sum: 1 } } },
    ]),
  ]);
  const seated = new Map(nextEnr.map((r) => [id(r._id), r.n]));

  const fromPrev = prev
    ? pending
        .filter((e) => id(e.klass) === id(prev._id))
        .sort((a, b) => (a.section as unknown as { name: string }).name.localeCompare((b.section as unknown as { name: string }).name) || a.rollNumber - b.rollNumber)
    : [];
  const candidates: Candidate[] = [
    ...fromPrev.map((e) => {
      const s = e.student as unknown as { _id: unknown; name: string; studentCode: string };
      const r = results.get(id(s._id));
      return {
        key: `s:${id(s._id)}`,
        kind: "student" as const,
        id: id(s._id),
        name: s.name,
        code: s.studentCode,
        from: `${prev!.name} ${(e.section as unknown as { name: string }).name} · roll ${e.rollNumber}`,
        result: r ? { gpa: r.gpa, failed: r.failed } : undefined,
      };
    }),
    ...applicants.map((a) => ({
      key: `a:${id(a._id)}`,
      kind: "applicant" as const,
      id: id(a._id),
      name: a.studentName,
      code: a.applicationNo,
      from: "New admission",
    })),
  ];

  return {
    currentYearName: currentYear.name,
    nextYearName: nextYear.name,
    target: { id: id(target._id), name: target.name },
    fromName: prev?.name ?? null,
    sections: sections.map((s) => ({ id: id(s._id), name: s.name, capacity: s.capacity, placed: seated.get(id(s._id)) ?? 0 })),
    candidates,
  };
}

/** Students still in last year's class with no seat next year, and every section they could go to. */
export async function getNotPromoted() {
  await connectDb();
  const currentYear = await getCurrentYear();
  const nextYear = await getNextYear();
  if (!nextYear) return null;
  const [classes, sections, pending, results, nextEnr, nextEnr2] = await Promise.all([
    ClassModel.find().sort({ numeric: 1 }).lean(),
    Section.find().sort({ name: 1 }).lean(),
    pendingEnrollments(currentYear, nextYear),
    latestResults(currentYear._id),
    Enrollment.aggregate<{ _id: unknown; n: number }>([
      { $match: { year: nextYear._id } },
      { $group: { _id: "$section", n: { $sum: 1 } } },
    ]),
    Enrollment.aggregate<{ _id: unknown; n: number }>([
      { $match: { year: nextYear._id } },
      { $group: { _id: "$klass", n: { $sum: 1 } } },
    ]),
  ]);
  const seated = new Map(nextEnr.map((r) => [id(r._id), r.n]));
  const cls = new Map(classes.map((c) => [id(c._id), c]));
  const top = classes[classes.length - 1];
  const planned = new Set(nextEnr2.map((r) => id(r._id)));
  const nextOf = (klassId: unknown) => classes[classes.findIndex((c) => id(c._id) === id(klassId)) + 1];

  const students = pending
    .filter((e) => id(e.klass) !== id(top?._id) && planned.has(id(nextOf(e.klass)?._id)))
    .map((e) => {
      const s = e.student as unknown as { _id: unknown; name: string; studentCode: string };
      const c = cls.get(id(e.klass))!;
      const next = classes[classes.findIndex((x) => id(x._id) === id(c._id)) + 1];
      const r = results.get(id(s._id));
      return {
        id: id(s._id),
        name: s.name,
        code: s.studentCode,
        classId: id(c._id),
        className: c.name,
        nextClassId: next ? id(next._id) : id(c._id),
        section: (e.section as unknown as { name: string }).name,
        roll: e.rollNumber,
        result: r ? { gpa: r.gpa, failed: r.failed } : undefined,
      };
    })
    .sort((a, b) => (cls.get(a.classId)!.numeric - cls.get(b.classId)!.numeric) || a.name.localeCompare(b.name));

  return {
    nextYearName: nextYear.name,
    students,
    sections: sections.map((s) => ({
      id: id(s._id),
      classId: id(s.klass),
      className: cls.get(id(s.klass))?.name ?? "",
      name: s.name,
      capacity: s.capacity,
      placed: seated.get(id(s._id)) ?? 0,
    })),
  };
}

export type PromotionPlan = NonNullable<Awaited<ReturnType<typeof getPromotionPlan>>>;
export type NotPromoted = NonNullable<Awaited<ReturnType<typeof getNotPromoted>>>;
