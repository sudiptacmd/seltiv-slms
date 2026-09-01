"use server";

import { connectDb } from "@/lib/db";
import { Student, Guardian, Enrollment, Section, ClassModel, Staff, User, ImportJob, nextSeq } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { normalizeMsisdn } from "@/lib/adapters/sms";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { parseImport, type ImportKind } from "@/lib/import-templates";
import { guard, revalidate, type ActionState } from "./_common";

type RowResult = { row: number; ok: boolean; message: string; preview: string };

export type ImportPreview = {
  kind: ImportKind;
  fileName: string;
  fileB64: string;
  rows: RowResult[];
  okCount: number;
  errorCount: number;
};

export async function validateImport(_prev: ActionState & { preview?: ImportPreview }, form: FormData): Promise<ActionState & { preview?: ImportPreview }> {
  const { deny } = await guard();
  if (deny) return deny;
  const kind = String(form.get("kind") ?? "") as ImportKind;
  const file = form.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose an .xlsx file." };
  if (file.size > 5_000_000) return { error: "File too large (max 5 MB)." };

  const buf = Buffer.from(await file.arrayBuffer());
  await connectDb();
  const year = await getCurrentYear();

  let raw: Record<string, string>[];
  try {
    raw = await parseImport(kind, buf);
  } catch {
    return { error: "Could not read that file — is it the right template?" };
  }
  if (raw.length === 0) return { error: "No data rows found." };

  const classes = await ClassModel.find().lean();
  const sections = await Section.find().lean();

  const rows: RowResult[] = [];
  for (const rec of raw) {
    const rowNum = Number(rec.__row);
    try {
      if (kind === "students") {
        if (!rec.name) throw new Error("Name is required");
        if (!["male", "female", "other"].includes(rec.gender)) throw new Error("Gender must be male/female/other");
        const klass = classes.find((c) => c.name.toLowerCase() === rec.className.toLowerCase());
        if (!klass) throw new Error(`Unknown class "${rec.className}"`);
        const section = sections.find((s) => String(s.klass) === String(klass._id) && s.name.toLowerCase() === rec.section.toLowerCase());
        if (!section) throw new Error(`No section "${rec.section}" in ${klass.name}`);
        if (!rec.roll || Number.isNaN(Number(rec.roll))) throw new Error("Roll must be a number");
        const clash = await Enrollment.findOne({ section: section._id, rollNumber: Number(rec.roll), year: year._id });
        if (clash) throw new Error(`Roll ${rec.roll} already used in ${klass.name} ${section.name}`);
        rows.push({ row: rowNum, ok: true, message: "", preview: `${rec.name} → ${klass.name} ${section.name} roll ${rec.roll}` });
      } else if (kind === "guardians") {
        if (!rec.name || !rec.phone) throw new Error("Name and phone required");
        const student = rec.studentCode ? await Student.findOne({ studentCode: rec.studentCode }) : null;
        if (rec.studentCode && !student) throw new Error(`No student with ID "${rec.studentCode}"`);
        rows.push({ row: rowNum, ok: true, message: "", preview: `${rec.name} (${rec.phone})${student ? ` → ${student.name}` : ""}` });
      } else {
        if (!rec.name || !rec.designation || !rec.phone) throw new Error("Name, designation and phone required");
        rows.push({ row: rowNum, ok: true, message: "", preview: `${rec.name} — ${rec.designation}` });
      }
    } catch (e) {
      rows.push({ row: rowNum, ok: false, message: e instanceof Error ? e.message : "Invalid row", preview: rec.name || "(blank)" });
    }
  }

  return {
    ok: true,
    preview: {
      kind,
      fileName: file.name,
      fileB64: buf.toString("base64"),
      rows,
      okCount: rows.filter((r) => r.ok).length,
      errorCount: rows.filter((r) => !r.ok).length,
    },
  };
}

export async function commitImport(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard();
  if (deny) return deny;
  const kind = String(form.get("kind") ?? "") as ImportKind;
  const fileB64 = String(form.get("fileB64") ?? "");
  const fileName = String(form.get("fileName") ?? "import.xlsx");
  if (!fileB64) return { error: "Session expired — re-upload the file." };

  await connectDb();
  const year = await getCurrentYear();
  const buf = Buffer.from(fileB64, "base64");
  const raw = await parseImport(kind, buf);

  const bcrypt = (await import("bcryptjs")).default;
  const classes = await ClassModel.find().lean();
  const sections = await Section.find().lean();

  const job = await ImportJob.create({ kind, fileName, status: "pending", totalRows: raw.length, createdBy: user!.id });
  let ok = 0;
  const issues: { row: number; message: string }[] = [];

  for (const rec of raw) {
    const rowNum = Number(rec.__row);
    try {
      if (kind === "students") {
        const klass = classes.find((c) => c.name.toLowerCase() === rec.className.toLowerCase());
        const section = sections.find((s) => klass && String(s.klass) === String(klass._id) && s.name.toLowerCase() === rec.section.toLowerCase());
        if (!klass || !section) throw new Error("class/section not found");
        const roll = Number(rec.roll);
        if (await Enrollment.findOne({ section: section._id, rollNumber: roll, year: year._id })) throw new Error(`roll ${roll} taken`);

        let guardian = null;
        if (rec.guardianName && rec.guardianPhone) {
          const phone = normalizeMsisdn(rec.guardianPhone);
          guardian = (await Guardian.findOne({ phone })) ?? (await Guardian.create({
            name: rec.guardianName,
            relation: (["father", "mother", "guardian"].includes(rec.guardianRelation) ? rec.guardianRelation : "father") as "father",
            phone,
            occupation: rec.occupation || undefined,
          }));
          if (!(await User.findOne({ phone }))) {
            await User.create({
              name: guardian.name,
              phone,
              passwordHash: await bcrypt.hash("changeme123", 10),
              roles: ["parent"],
              guardian: guardian._id,
              mustChangePassword: true,
            });
          }
        }

        const seq = await nextSeq(`student-${year.name}`);
        const student = await Student.create({
          studentCode: `${env.school.code}-${year.name}-${1000 + seq}`,
          name: rec.name,
          gender: rec.gender as "male",
          dateOfBirth: rec.dob ? new Date(rec.dob) : undefined,
          religion: rec.religion || undefined,
          bloodGroup: rec.bloodGroup || undefined,
          address: rec.address || undefined,
          status: "active",
          admissionDate: new Date(),
          guardians: guardian ? [{ guardian: guardian._id, isPrimary: true }] : [],
        });
        await Enrollment.create({
          student: student._id,
          year: year._id,
          klass: klass._id,
          section: section._id,
          rollNumber: roll,
          status: "active",
        });
        ok++;
      } else if (kind === "guardians") {
        const phone = normalizeMsisdn(rec.phone);
        const guardian = (await Guardian.findOne({ phone })) ?? (await Guardian.create({
          name: rec.name,
          relation: (["father", "mother", "guardian"].includes(rec.relation) ? rec.relation : "guardian") as "guardian",
          phone,
          email: rec.email || undefined,
          occupation: rec.occupation || undefined,
        }));
        if (rec.studentCode) {
          const student = await Student.findOne({ studentCode: rec.studentCode });
          if (student && !student.guardians.some((g) => String(g.guardian) === String(guardian._id))) {
            student.guardians.push({ guardian: guardian._id, isPrimary: student.guardians.length === 0 });
            await student.save();
          }
        }
        if (!(await User.findOne({ phone }))) {
          await User.create({
            name: guardian.name,
            phone,
            passwordHash: await bcrypt.hash("changeme123", 10),
            roles: ["parent"],
            guardian: guardian._id,
            mustChangePassword: true,
          });
        }
        ok++;
      } else {
        const seq = await nextSeq("staff");
        await Staff.create({
          staffCode: `${env.school.code}-T${String(seq).padStart(3, "0")}`,
          name: rec.name,
          designation: rec.designation,
          type: rec.type === "non_teaching" ? "non_teaching" : "teaching",
          phone: normalizeMsisdn(rec.phone),
          email: rec.email || undefined,
          gender: (["male", "female", "other"].includes(rec.gender) ? rec.gender : undefined) as "male" | undefined,
          dateOfJoining: rec.doj ? new Date(rec.doj) : undefined,
          qualifications: rec.qualifications || undefined,
          active: true,
        });
        ok++;
      }
    } catch (e) {
      issues.push({ row: rowNum, message: e instanceof Error ? e.message : "failed" });
    }
  }

  job.status = issues.length && ok === 0 ? "failed" : "committed";
  job.okRows = ok;
  job.errorRows = issues.length;
  job.issues = issues;
  await job.save();

  await recordAudit({ actor: user, action: `import.${kind}`, entity: "ImportJob", entityId: String(job._id), after: { ok, errors: issues.length } });
  revalidate("/admin/students", "/admin/staff");
  return {
    ok: true,
    message: `Imported ${ok} ${kind}. ${issues.length ? `${issues.length} row(s) skipped.` : ""}`,
  };
}
