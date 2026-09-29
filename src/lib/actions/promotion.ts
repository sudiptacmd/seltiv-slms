"use server";

import { connectDb } from "@/lib/db";
import { AcademicYear, AdmissionApplication, ClassModel, Enrollment, Section } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { getNextYear } from "@/lib/promotion";
import { enrolApplicant } from "@/lib/enrolment";
import { recordAudit } from "@/lib/audit";
import { guard, revalidate, fd, type ActionState } from "./_common";

const PATHS = ["/admin/students/promote", "/admin/students", "/admin/academics/classes"];

async function nextRoll(sectionId: unknown, yearId: unknown) {
  const last = await Enrollment.findOne({ section: sectionId, year: yearId }).sort({ rollNumber: -1 }).select("rollNumber").lean();
  return (last?.rollNumber ?? 0) + 1;
}

async function seatedCount(sectionId: unknown, yearId: unknown) {
  return Enrollment.countDocuments({ section: sectionId, year: yearId });
}

/** Opens the next academic year (not current) so promotion has somewhere to go. */
export async function createNextYear(): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  if (await getNextYear()) return { error: "The next academic year already exists." };
  const cur = await getCurrentYear();
  const plusYear = (d: Date) => new Date(new Date(d).setFullYear(new Date(d).getFullYear() + 1));
  const name = /^\d{4}$/.test(cur.name) ? String(Number(cur.name) + 1) : `${cur.name} (next)`;
  const data = { name, startDate: plusYear(cur.startDate), endDate: plusYear(cur.endDate), isCurrent: false };
  await AcademicYear.create(data);
  await recordAudit({ actor: user, action: "academic.year", entity: "AcademicYear", after: data });
  revalidate(...PATHS, "/admin/academics/years");
  return { ok: true, message: `Academic year ${name} created.` };
}

type PlanPayload = {
  classId: string;
  sections: { key: string; id?: string; name: string; capacity: number }[];
  rows: { kind: "student" | "applicant"; id: string; sectionKey: string }[];
};

/** Places every ticked student and new admission into the chosen sections of the target class. */
export async function confirmPromotion(payload: PlanPayload): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const currentYear = await getCurrentYear();
  const nextYear = await getNextYear();
  if (!nextYear) return { error: "Create the next academic year first." };
  const klass = await ClassModel.findById(payload.classId).lean();
  if (!klass) return { error: "Unknown class." };
  if (!payload.rows.length) return { error: "Tick at least one student to promote." };

  const names = payload.sections.map((s) => s.name.trim().toUpperCase());
  if (names.some((n) => !n) || new Set(names).size !== names.length) return { error: "Each section needs its own name." };
  if (payload.sections.some((s) => !Number.isInteger(s.capacity) || s.capacity < 1)) return { error: "Section size must be at least 1." };

  const secByKey = new Map(payload.sections.map((s) => [s.key, s]));
  const assigned = new Map<string, typeof payload.rows>();
  for (const r of payload.rows) {
    if (!secByKey.has(r.sectionKey)) return { error: "Every ticked student needs a section." };
    assigned.set(r.sectionKey, [...(assigned.get(r.sectionKey) ?? []), r]);
  }

  // Validate everything before writing anything.
  for (const s of payload.sections) {
    const already = s.id ? await seatedCount(s.id, nextYear._id) : 0;
    const n = assigned.get(s.key)?.length ?? 0;
    if (already + n > s.capacity) return { error: `${klass.name} ${s.name} holds ${s.capacity} — ${already + n} assigned. Raise its size or move students.` };
  }
  const studentIds = payload.rows.filter((r) => r.kind === "student").map((r) => r.id);
  const [current, dup] = await Promise.all([
    Enrollment.find({ student: { $in: studentIds }, year: currentYear._id, status: "active" }).lean(),
    Enrollment.countDocuments({ student: { $in: studentIds }, year: nextYear._id }),
  ]);
  if (dup) return { error: "Some of these students are already promoted. Reload the page." };
  if (current.length !== studentIds.length) return { error: "Some students are no longer active in the current year. Reload the page." };

  // Sections: create the new ones, update sizes of existing ones.
  const sectionIds = new Map<string, unknown>();
  for (const s of payload.sections) {
    if (s.id) {
      await Section.updateOne({ _id: s.id }, { capacity: s.capacity });
      sectionIds.set(s.key, s.id);
    } else {
      try {
        const doc = await Section.create({ klass: klass._id, name: s.name.trim().toUpperCase(), capacity: s.capacity });
        sectionIds.set(s.key, doc._id);
      } catch {
        return { error: `Section ${s.name} already exists for ${klass.name}.` };
      }
    }
  }

  const currentByStudent = new Map(current.map((e) => [String(e.student), e]));
  let promoted = 0;
  let admitted = 0;
  for (const s of payload.sections) {
    for (const r of assigned.get(s.key) ?? []) {
      const sectionId = sectionIds.get(s.key)!;
      const roll = await nextRoll(sectionId, nextYear._id);
      if (r.kind === "student") {
        await Enrollment.create({ student: r.id, year: nextYear._id, klass: klass._id, section: sectionId, rollNumber: roll, status: "active" });
        await Enrollment.updateOne({ _id: currentByStudent.get(r.id)!._id }, { status: "promoted" });
        promoted++;
      } else {
        const app = await AdmissionApplication.findById(r.id);
        if (!app || app.enrolledStudent) continue;
        const { student } = await enrolApplicant(app.toObject(), nextYear, { _id: sectionId, klass: klass._id }, roll);
        app.enrolledStudent = student._id;
        app.stage = "enrolled";
        await app.save();
        admitted++;
      }
    }
  }

  await recordAudit({ actor: user, action: "promotion.confirm", entity: "Class", entityId: payload.classId, after: { promoted, admitted, year: nextYear.name } });
  revalidate(...PATHS, "/admin/admissions");
  return { ok: true, message: `${klass.name}: ${promoted} promoted, ${admitted} new admissions placed for ${nextYear.name}.` };
}

/** Promotes (or retains) one student who was left out of the bulk plan. */
export async function promoteOne(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const currentYear = await getCurrentYear();
  const nextYear = await getNextYear();
  if (!nextYear) return { error: "Create the next academic year first." };

  const studentId = f.str("studentId");
  const [enr, section] = await Promise.all([
    Enrollment.findOne({ student: studentId, year: currentYear._id, status: "active" }),
    Section.findById(f.str("sectionId")).lean(),
  ]);
  if (!enr || !section) return { error: "Pick a section for this student." };
  if (await Enrollment.findOne({ student: studentId, year: nextYear._id })) return { error: "Already placed for next year." };

  const [from, to] = await Promise.all([ClassModel.findById(enr.klass).lean(), ClassModel.findById(section.klass).lean()]);
  if (!from || !to || to.numeric < from.numeric) return { error: "A student cannot move to a lower class." };
  if ((await seatedCount(section._id, nextYear._id)) >= section.capacity) return { error: `${to.name} ${section.name} is full. Raise its size under Classes & Sections.` };

  const same = String(from._id) === String(to._id);
  await Enrollment.create({ student: studentId, year: nextYear._id, klass: to._id, section: section._id, rollNumber: await nextRoll(section._id, nextYear._id), status: "active" });
  enr.status = same ? "retained" : "promoted";
  await enr.save();
  await recordAudit({ actor: user, action: same ? "promotion.retain" : "promotion.manual", entity: "Student", entityId: studentId, after: { to: `${to.name} ${section.name}`, year: nextYear.name } });
  revalidate(...PATHS);
  return { ok: true, message: same ? `Kept in ${to.name} ${section.name} for ${nextYear.name}.` : `Promoted to ${to.name} ${section.name}.` };
}
