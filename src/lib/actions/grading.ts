"use server";

import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { Exam, Section, Enrollment, GradeEntry, ExamStudentRecord, ReportScheme, ClassModel } from "@/models";
import { getReportScheme } from "@/lib/grading";
import { activeFields, fieldsFor, validateRowValues, type RowValues, type SchemeRow } from "@/lib/report-card";
import { recordAudit } from "@/lib/audit";
import { guard, revalidate, type ActionState } from "./_common";

const isId = (x: string) => /^[a-f0-9]{24}$/.test(x);

async function openSheet(examId: string, sectionId: string) {
  if (!isId(examId) || !isId(sectionId)) return { error: "Invalid mark sheet." };
  const [exam, section] = await Promise.all([Exam.findById(examId).lean(), Section.findById(sectionId).lean()]);
  if (!exam || !section || !exam.classes.some((c) => String(c) === String(section.klass))) return { error: "This exam does not cover that section." };
  if (exam.resultPublished) return { error: "Results are published — marks are locked." };
  const enrollments = await Enrollment.find({ section: sectionId, year: exam.year, status: "active" }).select("student").lean();
  return { exam, section, students: enrollments.map((e) => String(e.student)) };
}

/** Save one report-card row (subject/paper) for every student in the section. */
export async function saveGradeRow(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const examId = String(form.get("examId") ?? ""), sectionId = String(form.get("sectionId") ?? ""), rowKey = String(form.get("row") ?? "");
  const sheet = await openSheet(examId, sectionId);
  if ("error" in sheet) return { error: sheet.error };
  const row = (await getReportScheme(String(sheet.section.klass))).find((r) => r.key === rowKey);
  if (!row) return { error: "That subject is not on this class's report card." };

  const docs: { student: string; values: RowValues; absent: boolean }[] = [];
  try {
    for (const sid of sheet.students) {
      const absent = form.get(`a_${sid}`) === "on";
      const values: RowValues = {};
      if (!absent) for (const f of activeFields(row)) {
        const raw = String(form.get(`v_${sid}_${f}`) ?? "").trim();
        values[f] = raw === "" ? null : Math.round(Number(raw) * 100) / 100;
      }
      validateRowValues(row, values);
      docs.push({ student: sid, values, absent });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid marks." };
  }
  await GradeEntry.bulkWrite(docs.map((d) => ({
    updateOne: {
      filter: { exam: new Types.ObjectId(examId), student: new Types.ObjectId(d.student), row: row.key },
      update: { $set: { section: new Types.ObjectId(sectionId), values: Object.fromEntries(Object.entries(d.values).filter(([, v]) => v != null)), absent: d.absent, enteredBy: new Types.ObjectId(user!.id) } },
      upsert: true,
    },
  })));
  const entered = docs.filter((d) => d.absent || activeFields(row).every((f) => d.values[f] != null)).length;
  await recordAudit({ actor: user, action: "grade.save", entity: "GradeEntry", entityId: `${examId}:${sectionId}:${row.key}`, meta: { entered, of: docs.length } });
  revalidate(`/admin/exams/${examId}/grading`);
  return { ok: true, message: `${row.label}: saved — ${entered} of ${docs.length} students complete.` };
}

/** Save attendance and remarks printed on the card. */
export async function saveExamRecords(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const examId = String(form.get("examId") ?? ""), sectionId = String(form.get("sectionId") ?? "");
  const sheet = await openSheet(examId, sectionId);
  if ("error" in sheet) return { error: sheet.error };
  const num = (k: string) => {
    const raw = String(form.get(k) ?? "").trim();
    if (raw === "") return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 400) throw new Error("Days must be whole numbers between 0 and 400.");
    return n;
  };
  const ops = [];
  try {
    for (const sid of sheet.students) {
      const workingDays = num(`wd_${sid}`), present = num(`p_${sid}`), late = num(`l_${sid}`);
      if (workingDays != null && present != null && present > workingDays) throw new Error("Present days cannot exceed working days.");
      const remarks = String(form.get(`r_${sid}`) ?? "").trim().slice(0, 300);
      ops.push({ updateOne: {
        filter: { exam: new Types.ObjectId(examId), student: new Types.ObjectId(sid) },
        update: { $set: { section: new Types.ObjectId(sectionId), workingDays, present, late, remarks } },
        upsert: true,
      } });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid entry." };
  }
  await ExamStudentRecord.bulkWrite(ops);
  await recordAudit({ actor: user, action: "grade.records", entity: "ExamStudentRecord", entityId: `${examId}:${sectionId}` });
  revalidate(`/admin/exams/${examId}/grading`);
  return { ok: true, message: `Attendance and remarks saved for ${ops.length} students.` };
}

/** Replace a class's report-card layout. Row keys are kept so marks already entered stay attached. */
export async function saveReportScheme(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const klassId = String(form.get("klassId") ?? "");
  if (!isId(klassId) || !await ClassModel.exists({ _id: klassId })) return { error: "Class not found." };
  let rows: SchemeRow[];
  try {
    rows = JSON.parse(String(form.get("rows") ?? "[]"));
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("Add at least one subject.");
    const keys = new Set<string>();
    rows = rows.map((r) => {
      const label = String(r.label ?? "").trim();
      const key = String(r.key ?? "").trim();
      if (!label) throw new Error("Every subject needs a name.");
      if (!/^[a-z0-9_]{1,40}$/.test(key) || keys.has(key)) throw new Error(`Invalid or duplicate key for ${label}.`);
      keys.add(key);
      const kind = r.kind === "extra" ? "extra" : "main";
      const max: SchemeRow["max"] = {};
      for (const f of fieldsFor(kind)) {
        const n = Number(r.max?.[f] ?? 0);
        if (!Number.isFinite(n) || n < 0 || n > 200) throw new Error(`${label}: maximum marks must be between 0 and 200.`);
        max[f] = n;
      }
      const pct = (v: unknown) => { const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`${label}: convert % must be 0–100.`); return n; };
      const row: SchemeRow = { key, label, kind, max, summativePct: kind === "extra" ? 100 : pct(r.summativePct), continuousPct: kind === "extra" ? 100 : pct(r.continuousPct) };
      if (r.subject && isId(String(r.subject))) row.subject = String(r.subject);
      if (!activeFields(row).length) throw new Error(`${label}: give at least one column a maximum above 0.`);
      return row;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid layout." };
  }
  await ReportScheme.updateOne({ klass: klassId }, { $set: { rows, updatedBy: user!.id } }, { upsert: true });
  await recordAudit({ actor: user, action: "report_scheme.save", entity: "ReportScheme", entityId: klassId, after: { rows: rows.length } });
  revalidate("/admin/exams/report-scheme");
  return { ok: true, message: "Report card layout saved." };
}
