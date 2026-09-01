"use server";

import { connectDb } from "@/lib/db";
import {
  AdmissionSession,
  AdmissionApplication,
  EntranceTest,
  Student,
  Guardian,
  Enrollment,
  Section,
  User,
  nextSeq,
} from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { normalizeMsisdn, sendSms } from "@/lib/adapters/sms";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { guard, revalidate, fd, type ActionState } from "./_common";
import type { ApplicationStage } from "@/models/types";

/* ── Public application submission ── */
export async function submitApplication(_prev: ActionState, form: FormData): Promise<ActionState> {
  await connectDb();
  const f = fd(form);
  const session = await AdmissionSession.findOne({ isOpen: true }).sort({ createdAt: -1 }).lean();
  if (!session || new Date() > new Date(session.closesAt)) return { error: "Admissions are currently closed." };

  const studentName = f.str("studentName");
  const guardianName = f.str("guardianName");
  const guardianPhone = normalizeMsisdn(f.str("guardianPhone"));
  const klass = f.str("klass");
  if (!studentName || !guardianName || !guardianPhone || !klass) return { error: "Please fill in all required fields." };

  const seq = await nextSeq(`application-${session.name}`);
  const app = await AdmissionApplication.create({
    applicationNo: `APP-${new Date(session.closesAt).getFullYear()}-${String(seq).padStart(4, "0")}`,
    session: session._id,
    klass,
    stage: "submitted",
    studentName,
    gender: (f.opt("gender") as "male") ?? "male",
    dateOfBirth: f.date("dateOfBirth"),
    birthCertNo: f.opt("birthCertNo"),
    religion: f.opt("religion"),
    address: f.opt("address"),
    guardianName,
    guardianRelation: (f.opt("guardianRelation") as "father") ?? "father",
    guardianPhone,
    guardianEmail: f.opt("guardianEmail"),
    guardianOccupation: f.opt("guardianOccupation"),
    previousSchool: f.opt("previousSchool"),
    previousClass: f.opt("previousClass"),
    previousResult: f.opt("previousResult"),
    documents: (session.requiredDocuments ?? []).map((label) => ({ label, url: "", status: "pending", uploadedAt: new Date() })),
    applicationFeePaid: session.applicationFee === 0,
  });

  await sendSms(
    guardianPhone,
    `${env.school.code}: Application ${app.applicationNo} received for ${studentName}. Track it at ${env.appUrl}/admissions/status`,
    { purpose: "other", relatedId: String(app._id) },
  );
  return { ok: true, message: `Application submitted. Your application number is ${app.applicationNo}.` };
}

/* ── Admin: move a stage / verify documents / enrol ── */
export async function updateApplication(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.str("id");
  const app = await AdmissionApplication.findById(id);
  if (!app) return { error: "Application not found." };

  const action = f.str("action");

  if (action === "stage") {
    const stage = f.str("stage") as ApplicationStage;
    app.stage = stage;
    if (stage === "rejected") app.rejectionReason = f.opt("reason");
    await app.save();
    const g = await User.findOne({ phone: app.guardianPhone });
    void g;
    await sendSms(
      app.guardianPhone,
      `${env.school.code}: Application ${app.applicationNo} — status: ${stage.replace(/_/g, " ")}.`,
      { purpose: "other", relatedId: id },
    );
  } else if (action === "test_score") {
    app.testScore = f.num("testScore");
    app.stage = "verified";
    await app.save();
  } else if (action === "verify_doc") {
    const idx = f.num("docIndex") ?? -1;
    const status = f.str("status") as "verified" | "rejected";
    if (app.documents[idx]) {
      app.documents[idx].status = status;
      app.documents[idx].note = f.opt("note");
      await app.save();
    }
  } else if (action === "enrol") {
    if (app.enrolledStudent) return { error: "Already enrolled." };
    const sectionId = f.str("sectionId");
    const rollNumber = f.num("rollNumber");
    if (!sectionId || rollNumber == null) return { error: "Pick a section and roll number." };
    const year = await getCurrentYear();
    const section = await Section.findById(sectionId).lean();
    if (!section) return { error: "Invalid section." };
    if (await Enrollment.findOne({ section: sectionId, rollNumber, year: year._id })) {
      return { error: `Roll ${rollNumber} is taken.` };
    }

    let guardian = await Guardian.findOne({ phone: app.guardianPhone });
    if (!guardian) {
      guardian = await Guardian.create({
        name: app.guardianName,
        relation: app.guardianRelation,
        phone: app.guardianPhone,
        email: app.guardianEmail,
        occupation: app.guardianOccupation,
        address: app.address,
      });
    }
    const sseq = await nextSeq(`student-${year.name}`);
    const student = await Student.create({
      studentCode: `${env.school.code}-${year.name}-${1000 + sseq}`,
      name: app.studentName,
      gender: app.gender,
      dateOfBirth: app.dateOfBirth,
      birthCertNo: app.birthCertNo,
      religion: app.religion,
      address: app.address,
      admissionDate: new Date(),
      status: "active",
      guardians: [{ guardian: guardian._id, isPrimary: true }],
      fromApplication: app._id,
    });
    await Enrollment.create({ student: student._id, year: year._id, klass: section.klass, section: section._id, rollNumber, status: "active" });
    if (!(await User.findOne({ phone: guardian.phone }))) {
      const bcrypt = (await import("bcryptjs")).default;
      await User.create({
        name: guardian.name,
        phone: guardian.phone,
        passwordHash: await bcrypt.hash("changeme123", 10),
        roles: ["parent"],
        guardian: guardian._id,
        mustChangePassword: true,
      });
    }
    app.enrolledStudent = student._id;
    app.stage = "enrolled";
    await app.save();
    await sendSms(app.guardianPhone, `${env.school.code}: ${app.studentName} is enrolled — student ID ${student.studentCode}. Login with this phone number.`, { purpose: "other" });
  }

  await recordAudit({ actor: user, action: `admission.${action}`, entity: "AdmissionApplication", entityId: id, after: { stage: app.stage } });
  revalidate("/admin/admissions", `/admin/admissions/${id}`, "/admin/students");
  return { ok: true, message: "Application updated." };
}

/* ── Admin: session config ── */
export async function saveAdmissionSession(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const year = await getCurrentYear();
  const id = f.opt("id");

  const data = {
    name: f.str("name"),
    year: year._id,
    opensAt: f.date("opensAt") ?? new Date(),
    closesAt: f.date("closesAt") ?? new Date(),
    isOpen: f.bool("isOpen"),
    applicationFee: f.num("applicationFee") ?? 0,
    requiredDocuments: f.str("requiredDocuments").split(",").map((s) => s.trim()).filter(Boolean),
  };
  if (id) await AdmissionSession.findByIdAndUpdate(id, data);
  else await AdmissionSession.create(data);

  await recordAudit({ actor: user, action: "admission.session", entity: "AdmissionSession", after: data });
  revalidate("/admin/admissions/settings", "/admin/admissions", "/admissions/apply");
  return { ok: true, message: "Admission session saved." };
}

export async function scheduleEntranceTest(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const session = await AdmissionSession.findOne().sort({ createdAt: -1 }).lean();
  if (!session) return { error: "Create an admission session first." };

  const test = await EntranceTest.create({
    session: session._id,
    title: f.str("title"),
    date: f.date("date") ?? new Date(),
    venue: f.opt("venue"),
    fullMarks: f.num("fullMarks") ?? 100,
    applicants: f.all("applicantId"),
  });
  await AdmissionApplication.updateMany(
    { _id: { $in: f.all("applicantId") } },
    { stage: "test_scheduled", entranceTest: test._id },
  );
  await recordAudit({ actor: user, action: "admission.test", entity: "EntranceTest", entityId: String(test._id) });
  revalidate("/admin/admissions/tests", "/admin/admissions");
  return { ok: true, message: `Test scheduled with ${f.all("applicantId").length} applicants.` };
}
