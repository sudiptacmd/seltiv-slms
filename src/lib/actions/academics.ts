"use server";

import { connectDb } from "@/lib/db";
import {
  AcademicYear,
  ClassModel,
  Section,
  Subject,
  SubjectAssignment,
  TimetableEntry,
  PeriodSlot,
  Settings,
} from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { recordAudit } from "@/lib/audit";
import { guard, revalidate, fd, type ActionState } from "./_common";

export async function saveAcademicYear(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.opt("id");
  const data = {
    name: f.str("name"),
    startDate: f.date("startDate") ?? new Date(),
    endDate: f.date("endDate") ?? new Date(),
  };
  if (!data.name) return { error: "Name is required." };
  if (f.bool("isCurrent")) {
    await AcademicYear.updateMany({}, { isCurrent: false });
  }
  if (id) {
    await AcademicYear.findByIdAndUpdate(id, { ...data, isCurrent: f.bool("isCurrent") });
  } else {
    await AcademicYear.create({ ...data, isCurrent: f.bool("isCurrent") });
  }
  if (f.bool("isCurrent")) {
    const y = await AcademicYear.findOne({ isCurrent: true });
    await Settings.updateOne({ key: "singleton" }, { currentYear: y?._id }, { upsert: true });
  }
  await recordAudit({ actor: user, action: "academic.year", entity: "AcademicYear", after: data });
  revalidate("/admin/academics/years");
  return { ok: true, message: "Academic year saved." };
}

export async function saveClass(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.opt("id");
  const name = f.str("name");
  const numeric = f.num("numeric") ?? 0;
  if (!name) return { error: "Name is required." };
  if (id) await ClassModel.findByIdAndUpdate(id, { name, numeric, order: numeric });
  else await ClassModel.create({ name, numeric, order: numeric });
  revalidate("/admin/academics/classes", "/admin/academics/subjects");
  return { ok: true, message: "Class saved." };
}

export async function saveSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.opt("id");
  const data = {
    klass: f.str("classId"),
    name: f.str("name"),
    capacity: f.num("capacity") ?? 40,
    classTeacher: f.opt("classTeacherId") || undefined,
    room: f.opt("room"),
  };
  if (!data.klass || !data.name) return { error: "Class and section name are required." };
  try {
    if (id) await Section.findByIdAndUpdate(id, data);
    else await Section.create(data);
  } catch {
    return { error: "That section already exists for this class." };
  }
  revalidate("/admin/academics/classes", "/admin/academics/assignments");
  return { ok: true, message: "Section saved." };
}

export async function saveSubject(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.opt("id");
  const data = {
    name: f.str("name"),
    code: f.str("code").toUpperCase(),
    klass: f.str("classId"),
    fullMarks: f.num("fullMarks") ?? 100,
    passMarks: f.num("passMarks") ?? 33,
    order: f.num("order") ?? 0,
  };
  if (!data.name || !data.code || !data.klass) return { error: "Name, code and class are required." };
  try {
    if (id) await Subject.findByIdAndUpdate(id, data);
    else await Subject.create(data);
  } catch {
    return { error: "A subject with that code already exists for this class." };
  }
  revalidate("/admin/academics/subjects");
  return { ok: true, message: "Subject saved." };
}

export async function assignSubjectTeacher(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const year = await getCurrentYear();
  const sectionId = f.str("sectionId");
  const subjectId = f.str("subjectId");
  const teacherId = f.str("teacherId");
  if (!sectionId || !subjectId || !teacherId) return { error: "Pick a section, subject and teacher." };
  await SubjectAssignment.findOneAndUpdate(
    { section: sectionId, subject: subjectId, year: year._id },
    { teacher: teacherId },
    { upsert: true },
  );
  revalidate("/admin/academics/assignments");
  return { ok: true, message: "Teacher assigned." };
}

export async function setClassTeacher(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  await Section.findByIdAndUpdate(f.str("sectionId"), { classTeacher: f.opt("teacherId") || null });
  revalidate("/admin/academics/assignments", "/admin/academics/classes");
  return { ok: true, message: "Class teacher updated." };
}

export async function saveTimetableEntry(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const year = await getCurrentYear();
  const sectionId = f.str("sectionId");
  const weekday = f.str("weekday");
  const slotId = f.str("slotId");
  const subjectId = f.opt("subjectId");
  const teacherId = f.opt("teacherId");

  if (!subjectId || !teacherId) {
    await TimetableEntry.deleteOne({ section: sectionId, weekday, slot: slotId, year: year._id });
    revalidate("/admin/academics/timetable");
    return { ok: true, message: "Slot cleared." };
  }

  // clash: teacher already booked that weekday+slot elsewhere
  const clash = await TimetableEntry.findOne({
    teacher: teacherId,
    weekday,
    slot: slotId,
    year: year._id,
    section: { $ne: sectionId },
  }).lean();
  if (clash) return { error: "That teacher is already booked for this period in another section." };

  await TimetableEntry.findOneAndUpdate(
    { section: sectionId, weekday, slot: slotId, year: year._id },
    { subject: subjectId, teacher: teacherId },
    { upsert: true },
  );
  revalidate("/admin/academics/timetable", "/teacher/timetable");
  return { ok: true, message: "Timetable updated." };
}

export async function addPeriodSlot(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const count = await PeriodSlot.countDocuments();
  await PeriodSlot.create({
    name: f.str("name"),
    order: f.num("order") ?? count + 1,
    startTime: f.str("startTime"),
    endTime: f.str("endTime"),
    isBreak: f.bool("isBreak"),
  });
  revalidate("/admin/academics/timetable");
  return { ok: true, message: "Period added." };
}
