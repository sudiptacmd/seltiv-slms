import "server-only";
import { connectDb } from "./db";
import { Invoice, Payment, Enrollment, Student, Section, ClassModel, BkashTransaction, ReminderLog } from "@/models";
import { getCurrentYear, todayStr } from "./queries";

export async function accountsDashboard() {
  await connectDb();
  const year = await getCurrentYear();
  const today = todayStr();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [todayPayments, monthPayments, invoices, unmatched] = await Promise.all([
    Payment.find({ status: "success", paidAt: { $gte: new Date(today + "T00:00:00") } }).select("amount").lean(),
    Payment.find({ status: "success", paidAt: { $gte: monthStart } }).select("amount method").lean(),
    Invoice.find({ year: year._id, status: { $ne: "void" } }).select("netPayable paidAmount dueDate").lean(),
    BkashTransaction.countDocuments({ status: "completed", matchedPayment: { $exists: false } }),
  ]);

  const now = new Date();
  const outstanding = invoices
    .filter((i) => new Date(i.dueDate) <= now)
    .reduce((s, i) => s + Math.max(0, i.netPayable - i.paidAmount), 0);

  return {
    todayCollected: todayPayments.reduce((s, p) => s + p.amount, 0),
    monthCollected: monthPayments.reduce((s, p) => s + p.amount, 0),
    monthByMethod: {
      cash: monthPayments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0),
      bkash: monthPayments.filter((p) => p.method === "bkash").reduce((s, p) => s + p.amount, 0),
    },
    outstanding,
    defaulters: invoices.filter((i) => new Date(i.dueDate) <= now && i.netPayable - i.paidAmount > 0.5).length,
    unmatchedBkash: unmatched,
  };
}

export type FeeLedgerFilter = { q?: string; classId?: string; status?: string; page?: number };

export async function feeLedger(filter: FeeLedgerFilter) {
  await connectDb();
  const year = await getCurrentYear();
  const perPage = 30;
  const page = Math.max(1, filter.page ?? 1);

  const enrQuery: Record<string, unknown> = { year: year._id, status: "active" };
  if (filter.classId) enrQuery.klass = filter.classId;
  const enrollments = await Enrollment.find(enrQuery).populate("klass", "name").populate("section", "name").lean();

  const studentQuery: Record<string, unknown> = { _id: { $in: enrollments.map((e) => e.student) } };
  if (filter.q) studentQuery.$or = [{ name: { $regex: filter.q, $options: "i" } }, { studentCode: { $regex: filter.q, $options: "i" } }];
  const students = await Student.find(studentQuery).lean();
  const studentIds = students.map((s) => String(s._id));

  const invoices = await Invoice.find({ student: { $in: studentIds }, year: year._id, status: { $ne: "void" } }).lean();
  const byStudent = new Map<string, { billed: number; paid: number; due: number; overdue: boolean }>();
  const now = new Date();
  for (const inv of invoices) {
    const e = byStudent.get(String(inv.student)) ?? { billed: 0, paid: 0, due: 0, overdue: false };
    e.billed += inv.netPayable;
    e.paid += inv.paidAmount;
    const bal = inv.netPayable - inv.paidAmount;
    if (bal > 0.5 && new Date(inv.dueDate) <= now) {
      e.due += bal;
      e.overdue = true;
    }
    byStudent.set(String(inv.student), e);
  }

  const enrMap = new Map(enrollments.map((e) => [String(e.student), e]));
  let rows = students.map((s) => {
    const acc = byStudent.get(String(s._id)) ?? { billed: 0, paid: 0, due: 0, overdue: false };
    const enr = enrMap.get(String(s._id));
    const k = enr?.klass as unknown as { name: string } | undefined;
    const sec = enr?.section as unknown as { name: string } | undefined;
    return {
      id: String(s._id),
      name: s.name,
      code: s.studentCode,
      klass: k ? `${k.name} ${sec?.name ?? ""}` : "—",
      billed: acc.billed,
      paid: acc.paid,
      due: acc.due,
      status: acc.due > 0 ? "overdue" : acc.billed > acc.paid ? "partial" : "paid",
    };
  });

  if (filter.status === "overdue") rows = rows.filter((r) => r.due > 0);
  if (filter.status === "paid") rows = rows.filter((r) => r.due === 0 && r.billed > 0);
  rows.sort((a, b) => b.due - a.due || a.name.localeCompare(b.name));

  return {
    rows: rows.slice((page - 1) * perPage, page * perPage),
    total: rows.length,
    page,
    pageCount: Math.max(1, Math.ceil(rows.length / perPage)),
  };
}

export async function defaultersList() {
  await connectDb();
  const year = await getCurrentYear();
  const now = new Date();
  const invoices = await Invoice.find({
    year: year._id,
    status: { $in: ["issued", "overdue", "partial"] },
    dueDate: { $lte: now },
  })
    .populate("student", "name studentCode guardians")
    .lean();

  const reminders = await ReminderLog.find({ invoice: { $in: invoices.map((i) => i._id) } }).lean();
  const remindedInvoices = new Set(reminders.map((r) => String(r.invoice)));

  return invoices
    .filter((i) => i.netPayable - i.paidAmount > 0.5)
    .map((i) => ({
      invoiceId: String(i._id),
      invoiceNo: i.invoiceNo,
      student: (i.student as unknown as { name: string })?.name ?? "—",
      studentId: String((i.student as unknown as { _id: unknown })?._id),
      period: i.title,
      due: i.netPayable - i.paidAmount,
      dueDate: i.dueDate,
      reminded: remindedInvoices.has(String(i._id)),
      payToken: i.payToken,
    }))
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
}

export async function classOptions() {
  await connectDb();
  const classes = await ClassModel.find().sort({ order: 1 }).lean();
  return classes.map((c) => ({ value: String(c._id), label: c.name }));
}

void Section;
