"use server";

import { connectDb } from "@/lib/db";
import {
  Student,
  Guardian,
  Enrollment,
  Section,
  ClassModel,
  User,
  nextSeq,
} from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { normalizeMsisdn } from "@/lib/adapters/sms";
import { guard, revalidate, fd, type ActionState } from "./_common";

export async function saveStudent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard();
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.opt("id");
  const year = await getCurrentYear();

  const name = f.str("name");
  const gender = f.str("gender") as "male" | "female" | "other";
  if (!name || !gender) return { error: "Name and gender are required." };

  const guardianName = f.str("guardianName");
  const guardianPhone = normalizeMsisdn(f.str("guardianPhone"));
  const sectionId = f.str("sectionId");
  const rollNumber = f.num("rollNumber");

  try {
    if (id) {
      const before = await Student.findById(id).lean();
      await Student.findByIdAndUpdate(id, {
        name,
        gender,
        dateOfBirth: f.date("dateOfBirth"),
        bloodGroup: f.opt("bloodGroup"),
        religion: f.opt("religion"),
        address: f.opt("address"),
        birthCertNo: f.opt("birthCertNo"),
        photoUrl: f.opt("photoUrl"),
        medicalNotes: f.opt("medicalNotes"),
      });
      await recordAudit({ actor: user, action: "student.update", entity: "Student", entityId: id, before, after: { name, gender } });
      revalidate("/admin/students", `/admin/students/${id}`);
      return { ok: true, redirect: `/admin/students/${id}` };
    }

    // new student
    if (!sectionId || rollNumber == null) return { error: "Section and roll number are required for a new student." };
    const section = await Section.findById(sectionId).lean();
    if (!section) return { error: "Invalid section." };

    const dup = await Enrollment.findOne({ section: sectionId, rollNumber, year: year._id });
    if (dup) return { error: `Roll ${rollNumber} is already taken in that section.` };

    let guardian = null;
    if (guardianName && guardianPhone) {
      guardian = await Guardian.findOne({ phone: guardianPhone });
      if (!guardian) {
        guardian = await Guardian.create({
          name: guardianName,
          relation: (f.opt("guardianRelation") as "father" | "mother" | "guardian") ?? "father",
          phone: guardianPhone,
          occupation: f.opt("guardianOccupation"),
          address: f.opt("address"),
        });
      }
    }

    const seq = await nextSeq(`student-${year.name}`);
    const student = await Student.create({
      studentCode: `${env.school.code}-${year.name}-${1000 + seq}`,
      name,
      gender,
      dateOfBirth: f.date("dateOfBirth"),
      bloodGroup: f.opt("bloodGroup"),
      religion: f.opt("religion"),
      address: f.opt("address"),
      birthCertNo: f.opt("birthCertNo"),
      photoUrl: f.opt("photoUrl"),
      admissionDate: f.date("admissionDate") ?? new Date(),
      status: "active",
      guardians: guardian ? [{ guardian: guardian._id, isPrimary: true }] : [],
    });

    await Enrollment.create({
      student: student._id,
      year: year._id,
      klass: section.klass,
      section: section._id,
      rollNumber,
      status: "active",
    });

    // create / attach a parent login
    if (guardian) {
      const existing = await User.findOne({ phone: guardian.phone });
      if (!existing) {
        const bcrypt = (await import("bcryptjs")).default;
        await User.create({
          name: guardian.name,
          phone: guardian.phone,
          passwordHash: await bcrypt.hash("changeme123", 10),
          roles: ["parent"],
          guardian: guardian._id,
          mustChangePassword: true,
        });
      } else if (!existing.guardian) {
        existing.guardian = guardian._id;
        if (!existing.roles.includes("parent")) existing.roles.push("parent");
        await existing.save();
      }
    }

    await recordAudit({ actor: user, action: "student.create", entity: "Student", entityId: String(student._id), after: { name, studentCode: student.studentCode } });
    revalidate("/admin/students");
    return { ok: true, redirect: `/admin/students/${student._id}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save student." };
  }
}

export async function setStudentStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard();
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.str("id");
  const status = f.str("status") as "active" | "transferred" | "withdrawn" | "graduated";
  const before = await Student.findById(id).lean();
  await Student.findByIdAndUpdate(id, { status });
  if (status !== "active") {
    const year = await getCurrentYear();
    await Enrollment.updateMany({ student: id, year: year._id }, { status: "left" });
  }
  await recordAudit({ actor: user, action: "student.status", entity: "Student", entityId: id, before: { status: before?.status }, after: { status } });
  revalidate("/admin/students", `/admin/students/${id}`);
  return { ok: true, message: `Student marked ${status}.` };
}

export async function transferStudent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard();
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.str("id");
  const sectionId = f.str("toSectionId");
  const rollNumber = f.num("rollNumber");
  if (!sectionId || rollNumber == null) return { error: "Pick a section and roll number." };

  const year = await getCurrentYear();
  const section = await Section.findById(sectionId).lean();
  if (!section) return { error: "Invalid section." };
  const clash = await Enrollment.findOne({ section: sectionId, rollNumber, year: year._id, student: { $ne: id } });
  if (clash) return { error: `Roll ${rollNumber} is taken in that section.` };

  const enr = await Enrollment.findOne({ student: id, year: year._id });
  if (!enr) return { error: "No current enrollment to transfer." };
  const before = { section: String(enr.section), rollNumber: enr.rollNumber };
  enr.klass = section.klass;
  enr.section = section._id;
  enr.rollNumber = rollNumber;
  await enr.save();
  await recordAudit({ actor: user, action: "student.transfer", entity: "Enrollment", entityId: id, before, after: { section: sectionId, rollNumber } });
  revalidate(`/admin/students/${id}`, "/admin/students");
  return { ok: true, message: "Student transferred." };
}

