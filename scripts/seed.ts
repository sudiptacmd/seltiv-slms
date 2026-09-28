/* eslint-disable no-console */
/**
 * Seed the database with demo data that reproduces the proposal mockups
 * (Nabila Rahman, Class 8B, the payroll table, the admissions pipeline, …).
 *
 *   npm run seed            # seed into an empty DB (refuses if data exists)
 *   npm run seed -- --fresh # drop everything and reseed
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDb } from "../src/lib/db";
import * as M from "../src/models";
import { DEFAULT_GRADE_BANDS, computeResult, rankResults } from "../src/lib/academic";
import { computeInvoiceTotals, buildInstalmentPlan, invoiceStatusFor } from "../src/lib/fees";

const FRESH = process.argv.includes("--fresh");
const PW = "password123";

function d(s: string) {
  return new Date(s + "T00:00:00.000Z");
}
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}
function token() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function main() {
  await connectDb();
  const db = mongoose.connection;
  console.log("• connected:", db.name);

  const existing = await M.User.estimatedDocumentCount();
  if (existing > 0 && !FRESH) {
    console.error(`✗ DB already has ${existing} users. Re-run with --fresh to wipe and reseed.`);
    process.exit(1);
  }
  if (FRESH) {
    await db.dropDatabase();
    console.log("• dropped database");
  }

  /* ─────────────── Grading scale + academic year + terms ─────────────── */
  const scale = await M.GradingScale.create({
    name: "Bangladesh Secondary (GPA 5)",
    isDefault: true,
    bands: DEFAULT_GRADE_BANDS,
    failGrade: "F",
  });

  const year = await M.AcademicYear.create({
    name: "2026",
    startDate: d("2026-01-01"),
    endDate: d("2026-12-31"),
    isCurrent: true,
  });

  const terms = await M.Term.insertMany([
    { year: year._id, name: "First Term", order: 1, weight: 25 },
    { year: year._id, name: "Half-Yearly", order: 2, weight: 25 },
    { year: year._id, name: "Annual", order: 3, weight: 50 },
  ]);

  /* ─────────────── Classes, sections, subjects ─────────────── */
  const classDefs = [
    { name: "Class 6", numeric: 6 },
    { name: "Class 7", numeric: 7 },
    { name: "Class 8", numeric: 8 },
    { name: "Class 9", numeric: 9 },
    { name: "Class 10", numeric: 10 },
  ];
  const classes = await M.ClassModel.insertMany(
    classDefs.map((c, i) => ({ ...c, order: i })),
  );
  const classByNum = new Map(classes.map((c) => [c.numeric, c]));

  const sections: M.ISection[] = [];
  for (const c of classes) {
    for (const s of ["A", "B"]) {
      sections.push(
        (await M.Section.create({ klass: c._id, name: s, capacity: 40 })) as unknown as M.ISection,
      );
    }
  }
  const sectionOf = (num: number, name: string) =>
    sections.find(
      (s) => String(s.klass) === String(classByNum.get(num)!._id) && s.name === name,
    )!;

  const SUBJECTS = [
    { name: "Bangla", code: "BAN" },
    { name: "English", code: "ENG" },
    { name: "Mathematics", code: "MATH" },
    { name: "Science", code: "SCI" },
    { name: "Bangladesh & Global Studies", code: "BGS" },
    { name: "Religion & Moral Education", code: "REL" },
    { name: "ICT", code: "ICT" },
  ];
  const subjects: M.ISubject[] = [];
  for (const c of classes) {
    for (let i = 0; i < SUBJECTS.length; i++) {
      subjects.push(
        (await M.Subject.create({
          ...SUBJECTS[i],
          klass: c._id,
          fullMarks: SUBJECTS[i].code === "ICT" ? 50 : 100,
          passMarks: SUBJECTS[i].code === "ICT" ? 17 : 33,
          order: i,
        })) as unknown as M.ISubject,
      );
    }
  }
  const subjectsOf = (classId: mongoose.Types.ObjectId) =>
    subjects.filter((s) => String(s.klass) === String(classId));

  /* ─────────────── Period slots ─────────────── */
  const slots = await M.PeriodSlot.insertMany([
    { name: "Period 1", order: 1, startTime: "09:00", endTime: "09:45" },
    { name: "Period 2", order: 2, startTime: "09:45", endTime: "10:30" },
    { name: "Period 3", order: 3, startTime: "10:30", endTime: "11:15" },
    { name: "Break", order: 4, startTime: "11:15", endTime: "11:35", isBreak: true },
    { name: "Period 4", order: 5, startTime: "11:35", endTime: "12:20" },
    { name: "Period 5", order: 6, startTime: "12:20", endTime: "13:05" },
    { name: "Period 6", order: 7, startTime: "13:05", endTime: "13:50" },
  ]);
  const teachingSlots = slots.filter((s) => !s.isBreak);

  /* ─────────────── Staff ─────────────── */
  const staffSeed = [
    { name: "Rehana Parvin", designation: "Head Teacher", type: "teaching", gender: "female" },
    { name: "Md. Alamgir Hossain", designation: "Senior Teacher", type: "teaching", gender: "male", subj: "MATH" },
    { name: "Farhana Yasmin", designation: "Teacher", type: "teaching", gender: "female", subj: "ENG" },
    { name: "Nasrin Akhter", designation: "Teacher", type: "teaching", gender: "female", subj: "BAN" },
    { name: "Kamrul Hasan", designation: "Teacher", type: "teaching", gender: "male", subj: "SCI" },
    { name: "Tania Sultana", designation: "Teacher", type: "teaching", gender: "female", subj: "BGS" },
    { name: "Abdur Rahim", designation: "Teacher", type: "teaching", gender: "male", subj: "REL" },
    { name: "Sultana Razia", designation: "Teacher", type: "teaching", gender: "female", subj: "ICT" },
    { name: "Mizanur Rahman", designation: "Assistant Teacher", type: "teaching", gender: "male", subj: "MATH" },
    { name: "Jahangir Alam", designation: "Accountant", type: "non_teaching", gender: "male" },
    { name: "Shirin Sultana", designation: "Office Assistant", type: "non_teaching", gender: "female" },
  ] as const;

  const staff: M.IStaff[] = [];
  for (let i = 0; i < staffSeed.length; i++) {
    const s = staffSeed[i];
    const subj = "subj" in s && s.subj ? subjects.filter((x) => x.code === s.subj).map((x) => x._id) : [];
    staff.push(
      (await M.Staff.create({
        staffCode: `SFHS-T${String(i + 1).padStart(3, "0")}`,
        name: s.name,
        designation: s.designation,
        type: s.type,
        gender: s.gender,
        phone: `+88017000001${String(i).padStart(2, "0")}`,
        email: `${s.name.toLowerCase().replace(/[^a-z]+/g, ".")}@sfhs.edu.bd`,
        dateOfJoining: d("2019-01-01"),
        subjects: subj,
        active: true,
      })) as unknown as M.IStaff,
    );
  }
  const teacherBySubj = (code: string) =>
    staff.find((s) => s.type === "teaching" && staffSeed[staff.indexOf(s)]?.["subj" as never] === (code as never)) ??
    staff.find((s) => s.type === "teaching")!;

  /* ─────────────── Users (one per role) ─────────────── */
  const passwordHash = await bcrypt.hash(PW, 10);
  const headStaff = staff[0];
  const mathTeacher = staff[1]; // Md. Alamgir Hossain
  const accountantStaff = staff.find((s) => s.designation === "Accountant")!;

  await M.User.create({
    name: "Administrator",
    phone: "+8801700000001",
    email: "admin@sfhs.edu.bd",
    passwordHash,
    roles: ["admin"],
    permissions: ["attendance.take", "marks.post", "notice.send", "invoice.batch", "payment.collect", "report.view", "user.manage", "audit.view"],
    staff: headStaff._id,
  });
  await M.User.create({
    name: mathTeacher.name,
    phone: "+8801700000010",
    email: mathTeacher.email,
    passwordHash,
    roles: ["teacher"],
    permissions: ["attendance.take", "marks.post"],
    isClassTeacher: true,
    staff: mathTeacher._id,
  });
  await M.User.create({
    name: accountantStaff.name,
    phone: "+8801700000020",
    email: accountantStaff.email,
    passwordHash,
    roles: ["accountant"],
    permissions: ["invoice.batch", "payment.collect", "report.view"],
    staff: accountantStaff._id,
  });
  // give a second teacher account too
  await M.User.create({
    name: staff[2].name,
    phone: "+8801700000011",
    email: staff[2].email,
    passwordHash,
    roles: ["teacher"],
    permissions: ["attendance.take", "marks.post"],
    staff: staff[2]._id,
  });

  /* ─────────────── Class-teacher + subject assignments ─────────────── */
  const class8B = sectionOf(8, "B");
  class8B.classTeacher = mathTeacher._id;
  await M.Section.updateOne({ _id: class8B._id }, { classTeacher: mathTeacher._id });

  for (const sec of sections) {
    const classSubjects = subjectsOf(sec.klass as unknown as mongoose.Types.ObjectId);
    for (const subj of classSubjects) {
      const t = teacherBySubj(subj.code);
      await M.SubjectAssignment.create({
        section: sec._id,
        subject: subj._id,
        teacher: t._id,
        year: year._id,
      });
    }
    // class teacher for each section (round-robin over the non-hero teaching staff)
    if (!sec.classTeacher && String(sec._id) !== String(class8B._id)) {
      const pool = staff.filter((s) => s.type === "teaching" && String(s._id) !== String(mathTeacher._id));
      const t = pool[sections.indexOf(sec) % pool.length];
      await M.Section.updateOne({ _id: sec._id }, { classTeacher: t._id });
    }
  }

  /* ─────────────── Timetable for Class 8B ─────────────── */
  const weekdays: M.Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday"];
  const c8subjects = subjectsOf(class8B.klass as unknown as mongoose.Types.ObjectId);
  for (const wd of weekdays) {
    for (let p = 0; p < teachingSlots.length; p++) {
      const subj = pick(c8subjects, p + weekdays.indexOf(wd));
      await M.TimetableEntry.create({
        year: year._id,
        section: class8B._id,
        weekday: wd,
        slot: teachingSlots[p]._id,
        subject: subj._id,
        teacher: teacherBySubj(subj.code)._id,
      });
    }
  }

  /* ─────────────── Students, guardians, enrolments ─────────────── */
  // Distinct from the named mockup roster below so there are no duplicate people.
  const FIRST_M = ["Ayaan", "Rifat", "Arif", "Nayeem", "Shakil", "Fahim", "Zayan", "Imran", "Sami", "Adnan", "Tahmid", "Rayhan", "Mahin", "Siam", "Nabil", "Zarif", "Ashfaq", "Redwan"];
  const FIRST_F = ["Rifa", "Tasnim", "Nusrat", "Lamia", "Anika", "Faria", "Samira", "Ishrat", "Maliha", "Raisa", "Zaima", "Prova", "Oishi", "Tania", "Meherin", "Adiba", "Sadia", "Rehnuma"];
  const LAST = ["Chowdhury", "Jahan", "Karim", "Bhuiyan", "Sarker", "Talukder", "Mridha", "Molla", "Bhattacharjee", "Siddique", "Mahmud", "Kabir", "Rashid", "Haque", "Anwar", "Faruk", "Zaman", "Alam"];

  type SeededStudent = { student: M.IStudent; enr: M.IEnrollment; guardianUserPhone?: string };
  const seededStudents: SeededStudent[] = [];
  let studentCounter = 0;

  async function makeStudent(opts: {
    name: string;
    gender: "male" | "female";
    classNum: number;
    section: string;
    roll: number;
    guardianName: string;
    guardianPhone: string;
    withUser?: boolean;
    dob: string;
  }): Promise<SeededStudent> {
    studentCounter++;
    const guardian = await M.Guardian.create({
      name: opts.guardianName,
      relation: "father",
      phone: opts.guardianPhone,
      occupation: pick(["Businessman", "Service Holder", "Teacher", "Farmer", "Doctor"], studentCounter),
      address: "Kaliganj, Gazipur",
    });
    const student = (await M.Student.create({
      studentCode: `SFHS-2026-${String(1000 + studentCounter)}`,
      name: opts.name,
      gender: opts.gender,
      dateOfBirth: d(opts.dob),
      religion: "Islam",
      admissionDate: d("2024-01-05"),
      status: "active",
      guardians: [{ guardian: guardian._id, isPrimary: true }],
      bloodGroup: pick(["A+", "B+", "O+", "AB+", "O-"], studentCounter),
      address: "Kaliganj, Gazipur",
    })) as unknown as M.IStudent;

    const sec = sectionOf(opts.classNum, opts.section);
    const enr = (await M.Enrollment.create({
      student: student._id,
      year: year._id,
      klass: classByNum.get(opts.classNum)!._id,
      section: sec._id,
      rollNumber: opts.roll,
      status: "active",
    })) as unknown as M.IEnrollment;

    if (opts.withUser) {
      await M.User.create({
        name: opts.guardianName,
        phone: opts.guardianPhone,
        passwordHash,
        roles: ["parent"],
        guardian: guardian._id,
      });
    }
    return { student, enr, guardianUserPhone: opts.withUser ? opts.guardianPhone : undefined };
  }

  // Class 8B — the mockup roster (rolls 14-19 named), plus fill to 30
  const namedC8B = [
    { name: "Nabila Rahman", gender: "female" as const, roll: 14, g: "Mahbubur Rahman", withUser: true },
    { name: "Tanvir Hasan", gender: "male" as const, roll: 15, g: "Kamal Hasan" },
    { name: "Sumaiya Akter", gender: "female" as const, roll: 16, g: "Jalal Uddin" },
    { name: "Rakib Islam", gender: "male" as const, roll: 17, g: "Nazrul Islam" },
    { name: "Mehjabin Nur", gender: "female" as const, roll: 18, g: "Anwar Hossain" },
    { name: "Sabbir Ahmed", gender: "male" as const, roll: 19, g: "Bashir Ahmed" },
  ];
  for (const s of namedC8B) {
    seededStudents.push(
      await makeStudent({
        name: s.name,
        gender: s.gender,
        classNum: 8,
        section: "B",
        roll: s.roll,
        guardianName: s.g,
        guardianPhone: s.withUser ? "+8801700000030" : `+8801801${String(1000 + s.roll)}`,
        withUser: s.withUser,
        dob: "2011-03-15",
      }),
    );
  }
  for (let r = 1; r <= 30; r++) {
    if (namedC8B.some((n) => n.roll === r)) continue;
    const female = r % 2 === 0;
    seededStudents.push(
      await makeStudent({
        name: `${female ? pick(FIRST_F, r) : pick(FIRST_M, r)} ${pick(LAST, r + 2)}`,
        gender: female ? "female" : "male",
        classNum: 8,
        section: "B",
        roll: r,
        guardianName: `${pick(FIRST_M, r + 5)} ${pick(LAST, r + 2)}`,
        guardianPhone: `+8801811${String(2000 + r)}`,
        dob: "2011-06-10",
      }),
    );
  }

  // Lightly fill every other section (12 each) so class-wide figures/ranks work
  let fillN = 0;
  for (const sec of sections) {
    const clsNum = classes.find((c) => String(c._id) === String(sec.klass))!.numeric;
    if (clsNum === 8 && sec.name === "B") continue;
    for (let r = 1; r <= 12; r++) {
      fillN++;
      const female = fillN % 2 === 0;
      const pool = female ? FIRST_F : FIRST_M;
      // deterministic, non-repeating first×last combination per fill student
      const first = pool[fillN % pool.length];
      const last = LAST[Math.floor(fillN / pool.length) % LAST.length];
      seededStudents.push(
        await makeStudent({
          name: `${first} ${last}`,
          gender: female ? "female" : "male",
          classNum: clsNum,
          section: sec.name,
          roll: r,
          guardianName: `${FIRST_M[(fillN + 4) % FIRST_M.length]} ${last}`,
          guardianPhone: `+880182${String(clsNum)}${sec.name === "A" ? "1" : "2"}${String(1000 + r)}`,
          dob: `${2020 - clsNum}-04-12`,
        }),
      );
    }
  }
  console.log(`• students: ${seededStudents.length}`);

  /* ─────────────── Fee heads + plans ─────────────── */
  const feeHeads = await M.FeeHead.insertMany([
    { name: "Monthly Tuition", code: "TUITION", recurring: true, order: 0 },
    { name: "Exam Fee", code: "EXAM", recurring: false, order: 1 },
    { name: "Admission Fee", code: "ADMISSION", recurring: false, order: 2 },
    { name: "Late Fee", code: "LATE", recurring: false, order: 3 },
    { name: "Session Charge", code: "SESSION", recurring: false, order: 4 },
  ]);
  const tuitionHead = feeHeads.find((h) => h.code === "TUITION")!;
  const examHead = feeHeads.find((h) => h.code === "EXAM")!;

  const tuitionByClass: Record<number, number> = { 6: 1800, 7: 2000, 8: 2500, 9: 2800, 10: 3200 };
  for (const c of classes) {
    await M.FeePlan.create({
      name: `${c.name} — 2026`,
      year: year._id,
      klass: c._id,
      items: [{ head: tuitionHead._id, amount: tuitionByClass[c.numeric] }],
      instalments: 2,
      lateFeeRule: "flat",
      lateFeeValue: 100,
      graceDays: 0,
      dueDayOfMonth: 5,
    });
  }

  /* ─────────────── Invoices for Apr–Sep 2026 ─────────────── */
  const invoiceMonths = [
    { period: "2026-04", label: "April 2026", due: d("2026-04-05"), exam: true },
    { period: "2026-05", label: "May 2026", due: d("2026-05-05"), exam: false },
    { period: "2026-06", label: "June 2026", due: d("2026-06-05"), exam: false },
    { period: "2026-07", label: "July 2026", due: d("2026-07-05"), exam: false },
    { period: "2026-08", label: "August 2026", due: d("2026-08-05"), exam: false },
    { period: "2026-09", label: "September 2026", due: d("2026-09-05"), exam: true },
  ];
  let invSeq = 200;
  const now = d("2026-09-01");
  const nabilaStudent0 = seededStudents[0];
  for (const st of seededStudents) {
    const clsNum = classes.find((c) => String(c._id) === String(st.enr.klass))!.numeric;
    const tuition = tuitionByClass[clsNum];
    for (const m of invoiceMonths) {
      invSeq++;
      const lines = [{ headId: String(tuitionHead._id), label: "Monthly Tuition", amount: tuition, headCode: "TUITION" }];
      if (m.exam) lines.push({ headId: String(examHead._id), label: "Exam Fee", amount: 500, headCode: "EXAM" });
      const totals = computeInvoiceTotals(lines, []);
      // Older months almost fully collected; the current month (Sep, not yet
      // due) mostly unpaid — nets out to ~78% overall (matches the mockup).
      const idx = seededStudents.indexOf(st);
      const isNabilaFee = idx === 0;
      const monthNo = Number(m.period.slice(5));
      let paidAmount = 0;
      if (m.period < "2026-09") {
        // past months: most students paid; a scattered ~1-in-9 misses any given
        // month, and August is a touch laxer (nets to ~80% collected YTD)
        const miss = (idx * 3 + monthNo * 5) % 9 === 0 || (m.period === "2026-08" && (idx + monthNo) % 5 === 0);
        paidAmount = isNabilaFee || !miss ? totals.netPayable : 0;
      } else {
        // September (not yet due): only a minority have paid early
        paidAmount = idx % 5 === 2 ? totals.netPayable : 0;
      }
      const status = invoiceStatusFor(totals.netPayable, paidAmount, m.due, now);
      const isNabilaSep = String(st.student._id) === String(nabilaStudent0.student._id) && m.period === "2026-09";
      const inv = await M.Invoice.create({
        invoiceNo: isNabilaSep ? "INV-2026-09-0142" : `INV-${m.period}-${String(invSeq).padStart(4, "0")}`,
        student: st.student._id,
        year: year._id,
        section: st.enr.section,
        klass: st.enr.klass,
        period: m.period,
        title: `Tuition Fee — ${m.label}`,
        lines: lines.map((l) => ({ head: l.headId, label: l.label, amount: l.amount })),
        discountTotal: 0,
        lateFee: 0,
        grossTotal: totals.grossTotal,
        netPayable: totals.netPayable,
        paidAmount,
        dueDate: m.due,
        status,
        instalmentPlan: buildInstalmentPlan(totals.netPayable, 2, m.due),
        payToken: token(),
      });
      if (paidAmount > 0) {
        const viaBkash = idx % 3 === 0;
        const paidAt = new Date(m.due.getTime() - ((idx % 9) + 1) * 86400000);
        let bkashTxn = null;
        if (viaBkash) {
          bkashTxn = await M.BkashTransaction.create({
            paymentID: "MOCK" + token().slice(0, 16).toUpperCase(),
            trxId: "TRX" + token().slice(0, 10).toUpperCase(),
            amount: paidAmount,
            senderMsisdn: (await M.Guardian.findById(st.student.guardians[0].guardian).lean())?.phone ?? "+8801700000000",
            merchantInvoiceNumber: inv.invoiceNo,
            status: "completed",
            matchedInvoice: inv._id,
            createdAt: paidAt,
          });
        }
        const payment = await M.Payment.create({
          receiptNo: `RCP-${m.period}-${String(invSeq).padStart(4, "0")}`,
          invoice: inv._id,
          student: st.student._id,
          amount: paidAmount,
          method: viaBkash ? "bkash" : "cash",
          status: "success",
          reference: bkashTxn?.trxId,
          bkashTransaction: bkashTxn?._id,
          receivedBy: viaBkash ? undefined : accountantStaff._id,
          paidAt,
        });
        if (bkashTxn) {
          bkashTxn.matchedPayment = payment._id;
          await bkashTxn.save();
        }
      }
    }
  }
  const nabila = seededStudents[0];

  // a couple of completed-but-unmatched bKash transactions for the reconciliation queue
  for (let u = 0; u < 3; u++) {
    const st = seededStudents[10 + u * 7];
    const g = await M.Guardian.findById(st.student.guardians[0].guardian).lean();
    await M.BkashTransaction.create({
      paymentID: "MOCK" + token().slice(0, 16).toUpperCase(),
      trxId: "TRX" + token().slice(0, 10).toUpperCase(),
      amount: 2500,
      senderMsisdn: g?.phone ?? "+8801700000000",
      merchantInvoiceNumber: `INV-2026-09-9${u}`,
      status: "completed",
      createdAt: d("2026-09-01"),
    });
  }
  console.log("• invoices generated");

  /* ─────────────── Exams, marks, results ─────────────── */
  // GPA targets for Nabila across the three terms
  const nabilaTargets = [
    { term: 0, name: "First Term Examination 2026", pct: [82, 78, 88, 84, 80, 90, 86] },
    { term: 1, name: "Half-Yearly Examination 2026", pct: [86, 80, 92, 88, 84, 93, 90] },
    { term: 2, name: "Annual Examination 2026", pct: [88, 82, 94, 90, 86, 95, 92] }, // Bangla 88, Eng 82, Math 94, Sci 90
  ];

  for (const target of nabilaTargets) {
    const mm = ["04", "07", "11"][target.term];
    const exam = await M.Exam.create({
      year: year._id,
      term: terms[target.term]._id,
      name: target.name,
      classes: classes.map((c) => c._id),
      startDate: d(`2026-${mm}-10`),
      endDate: d(`2026-${mm}-20`),
      routinePublished: true,
      resultPublished: true,
    });

    for (const c of classes) {
      const cSubs = subjectsOf(c._id as unknown as mongoose.Types.ObjectId);
      for (const subj of cSubs) {
        await M.ExamSubject.create({
          exam: exam._id,
          klass: c._id,
          subject: subj._id,
          fullMarks: subj.fullMarks,
          passMarks: subj.passMarks,
          examDate: d(`2026-${mm}-1${cSubs.indexOf(subj)}`),
        });
      }
    }

    // marks for every enrolled student
    const enrs = await M.Enrollment.find({ year: year._id }).lean();
    const resultsBySection = new Map<string, { student: string; totalObtained: number; gpa: number }[]>();
    const resultsByClass = new Map<string, { student: string; totalObtained: number; gpa: number }[]>();

    for (const enr of enrs) {
      const cNum = classes.find((c) => String(c._id) === String(enr.klass))!.numeric;
      const cSubs = subjectsOf(enr.klass as unknown as mongoose.Types.ObjectId);
      const isNabila = String(enr.student) === String(nabila.student._id) && cNum === 8;
      const seedBase = (parseInt(String(enr.student).slice(-4), 16) % 40) + 45; // 45..85

      // ~9% of students fail the Annual exam (→ pass rate ≈ 91%, matches mockup)
      const failsAnnual = !isNabila && target.term === 2 && parseInt(String(enr.student).slice(-3), 16) % 11 === 0;
      const marks = cSubs.map((subj, si) => {
        let pctVal: number;
        if (isNabila) pctVal = target.pct[si] ?? 80;
        else {
          const termLift = target.term * 2; // students improve slightly across terms
          pctVal = Math.min(98, Math.max(20, seedBase + termLift + ((si * 7 + cNum) % 23) - 9));
        }
        if (failsAnnual && si === 2) pctVal = 24; // tank Mathematics
        const obtained = Math.round((pctVal / 100) * subj.fullMarks);
        return { subj, obtained };
      });

      await M.Mark.insertMany(
        marks.map((m) => ({
          exam: exam._id,
          section: enr.section,
          subject: m.subj._id,
          student: enr.student,
          obtained: m.obtained,
          enteredBy: teacherBySubj(m.subj.code)._id,
        })),
      );

      const computed = computeResult(
        marks.map((m) => ({
          subjectId: String(m.subj._id),
          obtained: m.obtained,
          fullMarks: m.subj.fullMarks,
          passMarks: m.subj.passMarks,
          absent: false,
        })),
        scale,
      );

      const res = await M.Result.create({
        exam: exam._id,
        year: year._id,
        section: enr.section,
        klass: enr.klass,
        student: enr.student,
        subjects: computed.subjects.map((s) => ({
          subject: s.subjectId,
          obtained: s.obtained,
          fullMarks: s.fullMarks,
          grade: s.grade,
          gpa: s.gpa,
          absent: s.absent,
        })),
        totalObtained: computed.totalObtained,
        totalFull: computed.totalFull,
        percent: computed.percent,
        gpa: computed.gpa,
        grade: computed.grade,
        failed: computed.failed,
        sectionRank: 0,
        classRank: 0,
        publishedAt: new Date(),
      });

      const secKey = String(enr.section);
      const clsKey = String(enr.klass);
      if (!resultsBySection.has(secKey)) resultsBySection.set(secKey, []);
      if (!resultsByClass.has(clsKey)) resultsByClass.set(clsKey, []);
      resultsBySection.get(secKey)!.push({ student: String(res._id), totalObtained: computed.totalObtained, gpa: computed.gpa });
      resultsByClass.get(clsKey)!.push({ student: String(res._id), totalObtained: computed.totalObtained, gpa: computed.gpa });
    }

    for (const [, list] of resultsBySection) {
      const ranks = rankResults(list);
      for (const [rid, rank] of ranks) await M.Result.updateOne({ _id: rid }, { sectionRank: rank });
    }
    for (const [, list] of resultsByClass) {
      const ranks = rankResults(list);
      for (const [rid, rank] of ranks) await M.Result.updateOne({ _id: rid }, { classRank: rank });
    }
  }
  console.log("• exams + results computed");

  /* ─────────────── Attendance ─────────────── */
  // Class 8B: daily since mid-July, up to and including "today" (2026-09-01).
  // Every other section: the last 6 school days (so the admin monitor has data).
  const enrBySection = new Map<string, SeededStudent[]>();
  for (const s of seededStudents) {
    const k = String(s.enr.section);
    if (!enrBySection.has(k)) enrBySection.set(k, []);
    enrBySection.get(k)!.push(s);
  }
  const teacherOfSection = new Map<string, mongoose.Types.ObjectId>();
  for (const sec of sections) {
    const fresh = await M.Section.findById(sec._id).lean();
    teacherOfSection.set(String(sec._id), (fresh?.classTeacher ?? mathTeacher._id) as mongoose.Types.ObjectId);
  }

  const TODAY = d("2026-09-01");
  function schoolDays(from: Date, to: Date): string[] {
    const out: string[] = [];
    for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
      const day = new Date(t);
      const dow = day.getUTCDay();
      if (dow === 5 || dow === 6) continue; // Fri/Sat weekend (BD)
      out.push(day.toISOString().slice(0, 10));
    }
    return out;
  }

  async function rollCall(sec: M.ISection, dateStr: string, roster: SeededStudent[], strongForNabila: boolean, locked: boolean, idxSeed: number) {
    let present = 0, absent = 0, late = 0;
    const session = await M.AttendanceSession.create({
      year: year._id,
      section: sec._id,
      date: dateStr,
      period: "Period 1",
      takenBy: teacherOfSection.get(String(sec._id)) ?? mathTeacher._id,
      locked,
    });
    for (let si = 0; si < roster.length; si++) {
      const st = roster[si];
      const isNabila = String(st.student._id) === String(nabila.student._id);
      const seed = (si * 7 + idxSeed) % 100;
      let status: M.AttendanceStatus = "present";
      if (strongForNabila && isNabila) status = idxSeed === 5 ? "absent" : idxSeed % 17 === 8 ? "late" : "present";
      else if (seed >= 95) status = "absent";
      else if (seed >= 89) status = "late";
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else late++;
      await M.AttendanceRecord.create({
        session: session._id,
        student: st.student._id,
        section: sec._id,
        date: dateStr,
        status,
        smsSent: status === "absent",
      });
    }
    session.presentCount = present;
    session.absentCount = absent;
    session.lateCount = late;
    await session.save();
  }

  const c8bDays = schoolDays(d("2026-07-13"), TODAY);
  const c8bStudents = enrBySection.get(String(class8B._id)) ?? [];
  for (let i = 0; i < c8bDays.length; i++) {
    await rollCall(class8B, c8bDays[i], c8bStudents, true, i < c8bDays.length - 2, i);
  }

  const recentDays = schoolDays(d("2026-08-24"), TODAY);
  for (const sec of sections) {
    if (String(sec._id) === String(class8B._id)) continue;
    const roster = enrBySection.get(String(sec._id)) ?? [];
    if (!roster.length) continue;
    for (let i = 0; i < recentDays.length; i++) {
      await rollCall(sec as unknown as M.ISection, recentDays[i], roster, false, i < recentDays.length - 1, i + sections.indexOf(sec));
    }
  }
  console.log(`• attendance: 8B ${c8bDays.length} days + ${recentDays.length} days for other sections`);

  /* ─────────────── Salary structures + August payroll ─────────────── */
  const salarySeed: Record<string, { basic: number; hra: number; med: number; pf: number }> = {
    "Head Teacher": { basic: 32000, hra: 8000, med: 2000, pf: 5 },
    "Senior Teacher": { basic: 24000, hra: 10000, med: 4000, pf: 5 }, // ~38000 gross
    Teacher: { basic: 18000, hra: 8000, med: 3500, pf: 5 }, // ~29500
    "Assistant Teacher": { basic: 15000, hra: 6000, med: 3000, pf: 5 },
    Accountant: { basic: 16000, hra: 7000, med: 3000, pf: 5 }, // ~26000
    "Office Assistant": { basic: 11000, hra: 4500, med: 2500, pf: 5 }, // ~18000
  };
  for (const s of staff) {
    const cfg = salarySeed[s.designation] ?? salarySeed["Teacher"];
    await M.SalaryStructure.create({
      staff: s._id,
      basic: cfg.basic,
      components: [
        { label: "House Rent", kind: "allowance", amount: cfg.hra },
        { label: "Medical", kind: "allowance", amount: cfg.med },
      ],
      providentFundPercent: cfg.pf,
      effectiveFrom: d("2026-01-01"),
      active: true,
    });
  }

  const run = await M.PayrollRun.create({
    month: 8,
    year: 2026,
    status: "draft",
    workingDays: 26,
    createdBy: accountantStaff._id,
  });
  const payslipStatusByName: Record<string, M.PayslipStatus> = {
    "Md. Alamgir Hossain": "paid",
    "Farhana Yasmin": "paid",
    "Jahangir Alam": "pending",
    "Shirin Sultana": "draft",
  };
  for (const s of staff) {
    const st = await M.SalaryStructure.findOne({ staff: s._id }).lean();
    if (!st) continue;
    const allowances = st.components.filter((c) => c.kind === "allowance").map((c) => ({ label: c.label, amount: c.amount }));
    const pf = Math.round((st.basic * st.providentFundPercent) / 100);
    const gross = st.basic + allowances.reduce((a, c) => a + c.amount, 0);
    const net = gross - pf;
    await M.Payslip.create({
      run: run._id,
      staff: s._id,
      month: 8,
      year: 2026,
      basic: st.basic,
      allowances,
      deductions: [{ label: "Provident Fund", amount: pf }],
      providentFund: pf,
      daysPresent: 26,
      daysInMonth: 31,
      lopDays: 0,
      lopAmount: 0,
      gross,
      net,
      status: payslipStatusByName[s.name] ?? "draft",
      paidAt: payslipStatusByName[s.name] === "paid" ? d("2026-09-01") : undefined,
    });
  }
  console.log("• payroll: August 2026 run");

  /* ─────────────── Notices ─────────────── */
  const adminUser = await M.User.findOne({ roles: "admin" });
  const noticeSeed = [
    { title: "School closed on 21 August", body: "The school will remain closed on 21 August 2026 on account of Janmashtami. Classes resume 22 August.", sent: 612, delivered: 604, kind: "all_parents" as const },
    { title: "Tuition fee reminder — August", body: "Guardians are requested to clear the August tuition by the 5th to avoid a late fee.", sent: 240, delivered: 236, kind: "all_parents" as const },
    { title: "Half-yearly exam routine published", body: "The Half-Yearly Examination 2026 routine is now available on the portal. Exams begin 10 July.", sent: 300, delivered: 297, kind: "all_parents" as const },
    { title: "Class 8 guardians meeting", body: "A guardians' meeting for Class 8 will be held on Saturday at 10:00 AM in the school hall.", sent: 40, delivered: 40, kind: "class" as const },
  ];
  for (const n of noticeSeed) {
    await M.Notice.create({
      title: n.title,
      body: n.body,
      audience: n.kind === "class" ? { kind: "class", klass: classByNum.get(8)!._id } : { kind: "all_parents" },
      channels: ["portal", "sms"],
      status: "published",
      publishedAt: d("2026-08-15"),
      createdBy: adminUser?._id,
      recipientCount: n.sent,
      smsSent: n.sent,
      smsDelivered: n.delivered,
      smsFailed: n.sent - n.delivered,
    });
  }
  // notice recipients for the parent user (so the parent portal shows a feed)
  const nabilaUser = await M.User.findOne({ phone: "+8801700000030" });
  const publishedNotices = await M.Notice.find({ status: "published" }).lean();
  for (const pn of publishedNotices) {
    await M.NoticeRecipient.create({
      notice: pn._id,
      user: nabilaUser?._id,
      guardian: nabila.student.guardians[0].guardian,
      student: nabila.student._id,
      readAt: pn.title.includes("closed") ? new Date() : undefined,
      smsStatus: "delivered",
    });
  }
  console.log("• notices");

  await M.CalendarDay.insertMany([
    { date: "2026-10-01", kind: "event", title: "Class 8 science project submission" },
    { date: "2026-10-04", kind: "event", title: "Weekly test marks deadline" },
    { date: "2026-10-08", kind: "holiday", title: "Durga Puja holiday" },
    { date: "2026-10-15", kind: "event", title: "Parent–teacher meeting" },
    { date: "2026-11-10", kind: "exam", title: "Annual examination begins" },
  ]);

  /* ─────────────── Service request types + Nabila's requests ─────────────── */
  const srTypes = await M.ServiceRequestType.insertMany([
    { name: "Transfer Certificate", code: "TC", fee: 200, stages: ["Submitted", "Verification", "Head-teacher approval", "Ready"], documentType: "transfer_certificate" },
    { name: "Testimonial", code: "TESTIMONIAL", fee: 100, stages: ["Submitted", "Verification", "Ready"], documentType: "testimonial" },
    { name: "Bonafide Certificate", code: "BONAFIDE", fee: 50, stages: ["Submitted", "Ready"], documentType: "bonafide" },
    { name: "Duplicate ID Card", code: "DUP_ID", fee: 150, stages: ["Submitted", "Payment", "Collected"], documentType: "id_card" },
  ]);
  const srSeed = [
    { type: "TC", status: "in_review" as const, stage: "Head-teacher approval", submitted: "2026-08-18" },
    { type: "TESTIMONIAL", status: "ready" as const, stage: "Ready", submitted: "2026-08-04" },
    { type: "DUP_ID", status: "closed" as const, stage: "Collected", submitted: "2026-07-29" },
  ];
  let srSeq = 0;
  for (const sr of srSeed) {
    srSeq++;
    const t = srTypes.find((x) => x.code === sr.type)!;
    await M.ServiceRequest.create({
      requestNo: `SR-2026-${String(srSeq).padStart(4, "0")}`,
      type: t._id,
      student: nabila.student._id,
      requestedBy: nabilaUser?._id,
      reason: sr.type === "TC" ? "Family relocating to Dhaka" : sr.type === "TESTIMONIAL" ? "Scholarship application" : "Lost the ID card",
      currentStage: sr.stage,
      status: sr.status,
      assignee: headStaff._id,
      feePaid: true,
      events: [
        { at: d(sr.submitted), stage: "Submitted", status: "submitted", note: "Request submitted by guardian." },
        ...(sr.status !== "submitted" ? [{ at: d(sr.submitted), stage: sr.stage, status: sr.status, note: "In progress." }] : []),
      ],
    });
  }
  console.log("• service requests");

  /* ─────────────── Admission session 2027 ─────────────── */
  const session2027 = await M.AdmissionSession.create({
    name: "Admission 2027",
    year: year._id,
    opensAt: d("2026-08-01"),
    closesAt: d("2026-09-30"),
    isOpen: true,
    applicationFee: 500,
    requiredDocuments: ["Birth Certificate", "Previous Marksheet", "Passport-size Photo", "Guardian NID"],
    seats: classes.map((c) => ({ klass: c._id, count: 40 })),
  });
  const appStages: M.ApplicationStage[] = ["submitted", "test_scheduled", "verified", "seat_offered", "enrolled", "rejected"];
  for (let i = 1; i <= 24; i++) {
    const female = i % 2 === 0;
    const stage = pick(appStages, i);
    const cls = pick([6, 7, 9], i);
    await M.AdmissionApplication.create({
      applicationNo: `APP-2027-${String(i).padStart(4, "0")}`,
      session: session2027._id,
      klass: classByNum.get(cls)!._id,
      stage,
      studentName: `${female ? pick(FIRST_F, i) : pick(FIRST_M, i)} ${pick(LAST, i)}`,
      gender: female ? "female" : "male",
      dateOfBirth: d(`${2020 - cls}-05-20`),
      guardianName: `${pick(FIRST_M, i + 4)} ${pick(LAST, i)}`,
      guardianRelation: "father",
      guardianPhone: `+880191${String(100000 + i)}`,
      previousSchool: "Kaliganj Govt. Primary School",
      previousClass: `Class ${cls - 1}`,
      previousResult: "GPA 4.8",
      documents: ["Birth Certificate", "Previous Marksheet", "Passport-size Photo"].map((label, di) => ({
        label,
        url: "",
        status: stage === "submitted" ? "pending" : di === 0 && i % 4 === 0 ? "rejected" : "verified",
        uploadedAt: new Date(),
      })),
      testScore: ["verified", "seat_offered", "enrolled"].includes(stage) ? 60 + (i % 35) : undefined,
      applicationFeePaid: stage !== "submitted",
      rejectionReason: stage === "rejected" ? "Did not meet the entrance test cut-off" : undefined,
    });
  }
  await M.EntranceTest.create({
    session: session2027._id,
    title: "Entrance Test — Class 6, 7 & 9",
    date: d("2026-09-20"),
    venue: "School Main Building",
    fullMarks: 100,
    applicants: (await M.AdmissionApplication.find({ session: session2027._id, stage: "test_scheduled" }).select("_id")).map((a) => a._id),
  });
  console.log("• admissions 2027");

  /* ─────────────── Settings + a few notifications ─────────────── */
  await M.Settings.create({
    key: "singleton",
    schoolName: "Sheikh Farid High School",
    headTeacher: "Rehana Parvin",
    address: "Kaliganj, Gazipur, Bangladesh",
    phone: "+8801700000000",
    email: "office@sfhs.edu.bd",
    currentYear: year._id,
    gradingScale: scale._id,
  });

  if (adminUser) {
    await M.Notification.insertMany([
      { user: adminUser._id, title: "3 mark sheets awaiting approval", href: "/admin/exams", icon: "clipboard" },
      { user: adminUser._id, title: "September fee run not generated", href: "/admin/finance/invoices", icon: "wallet" },
    ]);
  }
  if (nabilaUser) {
    await M.Notification.insertMany([
      { user: nabilaUser._id, title: "September tuition due on 5 Sep", href: "/parent/fees", icon: "wallet" },
      { user: nabilaUser._id, title: "Annual Examination results published", href: "/parent/child/gradesheet", icon: "award" },
    ]);
  }

  if (adminUser) {
    await M.AuditLog.insertMany([
      { actor: adminUser._id, actorName: "Administrator", action: "notice.publish", entity: "Notice", after: { audience: "All parents", channels: ["portal", "sms"] }, createdAt: d("2026-09-28") },
      { actor: adminUser._id, actorName: "Administrator", action: "invoice.batch_generate", entity: "Invoice", after: { period: "2026-09", invoices: 138 }, createdAt: d("2026-09-27") },
      { actor: adminUser._id, actorName: "Administrator", action: "user.permission", entity: "User", after: { grants: ["marks.post", "attendance.take"] }, createdAt: d("2026-09-26") },
      { actor: adminUser._id, actorName: "Administrator", action: "timetable.auto_generate", entity: "TimetableEntry", after: { section: "Class 8 B", slots: 30 }, createdAt: d("2026-09-25") },
    ]);
  }

  console.log("\n✓ Seed complete.\n");
  console.table([
    { role: "Admin", login: "01700000001", password: PW },
    { role: "Teacher (class teacher, Class 8B)", login: "01700000010", password: PW },
    { role: "Teacher", login: "01700000011", password: PW },
    { role: "Accountant", login: "01700000020", password: PW },
    { role: "Parent (Nabila Rahman's guardian)", login: "01700000030", password: PW },
  ]);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
