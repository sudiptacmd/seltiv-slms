import "server-only";
import { createElement } from "react";
import { connectDb } from "./db";
import {
  Payment,
  Invoice,
  Student,
  Enrollment,
  Payslip,
  Staff,
  Result,
  Section,
  Subject,
  Exam,
  Settings,
  GeneratedDocument,
  ServiceRequest,
  ServiceRequestType,
  FeeHead,
} from "@/models";
import { getCurrentYear } from "./queries";
import { uploadPdf } from "./adapters/storage";
import { env } from "./env";
import { formatDate, monthLabel } from "./utils";
import {
  ReceiptPdf,
  InvoicePdf,
  PayslipPdf,
  CertificatePdf,
} from "@/pdf/documents";
import { ReportCardPdf } from "@/pdf/report-card";

async function render(element: React.ReactElement): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  // @ts-expect-error react-pdf types lag on the element shape
  return renderToBuffer(element);
}

async function studentContext(studentId: string) {
  const year = await getCurrentYear();
  const [student, enrollment] = await Promise.all([
    Student.findById(studentId).lean(),
    Enrollment.findOne({ student: studentId, year: year._id }).populate("klass", "name").populate("section", "name").lean(),
  ]);
  const k = enrollment?.klass as unknown as { name: string } | undefined;
  const sec = enrollment?.section as unknown as { name: string } | undefined;
  return {
    student,
    className: k ? `${k.name} ${sec?.name ?? ""}`.trim() : "—",
    roll: enrollment?.rollNumber ?? "—",
  };
}

export async function generateAndStoreReceipt(paymentId: string): Promise<string> {
  await connectDb();
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) throw new Error("Payment not found");
  const invoice = await Invoice.findById(payment.invoice).lean();
  if (!invoice) throw new Error("Invoice not found");
  const { student, className } = await studentContext(String(payment.student));
  const receivedBy = payment.receivedBy ? (await Staff.findById(payment.receivedBy).lean())?.name : undefined;

  const buf = await render(
    createElement(ReceiptPdf, {
      receiptNo: payment.receiptNo ?? String(payment._id),
      date: payment.paidAt,
      student: student?.name ?? "—",
      studentCode: student?.studentCode ?? "—",
      className,
      invoiceTitle: invoice.title,
      method: payment.method,
      reference: payment.reference,
      lines: invoice.lines.map((l) => ({ label: l.label, amount: l.amount })),
      amountPaid: payment.amount,
      invoiceTotal: invoice.netPayable,
      balance: invoice.netPayable - invoice.paidAmount,
      receivedBy,
    }),
  );
  const { url } = await uploadPdf(buf, { folder: `receipts`, filename: `${payment.receiptNo ?? payment._id}.pdf` });
  await GeneratedDocument.create({ type: "receipt", title: `Receipt ${payment.receiptNo}`, url, student: payment.student, relatedId: String(payment._id) });
  return url;
}

export async function generateInvoicePdf(invoiceId: string): Promise<string> {
  await connectDb();
  const invoice = await Invoice.findById(invoiceId).lean();
  if (!invoice) throw new Error("Invoice not found");
  const { student, className } = await studentContext(String(invoice.student));
  const buf = await render(
    createElement(InvoicePdf, {
      invoiceNo: invoice.invoiceNo,
      title: invoice.title,
      issueDate: invoice.createdAt,
      dueDate: invoice.dueDate,
      student: student?.name ?? "—",
      studentCode: student?.studentCode ?? "—",
      className,
      lines: invoice.lines.map((l) => ({ label: l.label, amount: l.amount })),
      discount: invoice.discountTotal,
      lateFee: invoice.lateFee,
      netPayable: invoice.netPayable,
      paid: invoice.paidAmount,
    }),
  );
  const { url } = await uploadPdf(buf, { folder: "invoices", filename: `${invoice.invoiceNo}.pdf` });
  await GeneratedDocument.create({ type: "invoice", title: `Invoice ${invoice.invoiceNo}`, url, student: invoice.student, relatedId: invoiceId });
  return url;
}

export async function generatePayslipPdf(payslipId: string): Promise<string> {
  await connectDb();
  const payslip = await Payslip.findById(payslipId).lean();
  if (!payslip) throw new Error("Payslip not found");
  const staff = await Staff.findById(payslip.staff).lean();
  const buf = await render(
    createElement(PayslipPdf, {
      staff: staff?.name ?? "—",
      staffCode: staff?.staffCode ?? "—",
      designation: staff?.designation ?? "—",
      month: monthLabel(payslip.month, payslip.year),
      basic: payslip.basic,
      allowances: payslip.allowances,
      deductions: payslip.deductions,
      gross: payslip.gross,
      net: payslip.net,
      daysPresent: payslip.daysPresent,
      daysInMonth: payslip.daysInMonth,
    }),
  );
  const { url } = await uploadPdf(buf, { folder: "payslips", filename: `${staff?.staffCode}-${payslip.year}-${payslip.month}.pdf` });
  await GeneratedDocument.create({ type: "payslip", title: `Payslip ${monthLabel(payslip.month, payslip.year)}`, url, staff: payslip.staff, relatedId: payslipId });
  return url;
}

/** Report card PDF. Parents only ever get published results; office staff can preview drafts. */
export async function generateReportCardPdf(studentId: string, examId?: string, includeUnpublished = false): Promise<string> {
  await connectDb();
  const year = await getCurrentYear();
  const { student } = await studentContext(studentId);
  const q: Record<string, unknown> = { student: studentId, year: year._id };
  if (examId) q.exam = examId;
  const results = await Result.find(q).populate({ path: "exam", select: "name term resultPublished", populate: { path: "term", select: "order" } }).lean();
  const shown = results.filter((r) => includeUnpublished || (r.exam as unknown as { resultPublished?: boolean })?.resultPublished);
  shown.sort((a, b) => ((a.exam as unknown as { term?: { order: number } }).term?.order ?? 0) - ((b.exam as unknown as { term?: { order: number } }).term?.order ?? 0));

  const allSubjectIds = [...new Set(shown.flatMap((r) => r.subjects.map((sub) => sub.subject).filter(Boolean).map(String)))];
  const subjects = await Subject.find({ _id: { $in: allSubjectIds } }).lean();
  const subjMap = new Map(subjects.map((sub) => [String(sub._id), sub.name]));
  const latest = shown.at(-1);
  const enrollment = await Enrollment.findOne({ student: studentId, year: year._id }).lean();
  const section = await Section.findById(latest?.section ?? enrollment?.section).populate("klass", "name").populate("classTeacher", "name").lean();
  const settings = await Settings.findOne().lean();

  const buf = await render(
    createElement(ReportCardPdf, {
      school: {
        name: settings?.schoolName || env.school.name,
        code: env.school.code,
        address: settings?.address || env.school.address,
        eiin: settings?.eiin || env.school.eiin || undefined,
        phone: settings?.phone || env.school.phone,
        email: settings?.email || env.school.email,
        headTeacher: settings?.headTeacher,
        logoUrl: settings?.logoUrl || env.school.logoUrl || undefined,
      },
      year: year.name,
      student: student?.name ?? "—",
      studentCode: student?.studentCode ?? "—",
      className: (section?.klass as unknown as { name?: string } | undefined)?.name ?? "—",
      section: section?.name ?? "—",
      roll: enrollment?.rollNumber ?? "—",
      classTeacher: (section?.classTeacher as unknown as { name?: string } | undefined)?.name,
      exams: shown.map((r) => ({
        name: (r.exam as unknown as { name: string }).name,
        rows: r.rows,
        grandTotal: r.totalObtained,
        totalFull: r.totalFull,
        percent: r.percent,
        failed: r.failed,
        gpa: r.gpa,
        grade: r.grade,
        sectionRank: r.sectionRank,
        classRank: r.classRank,
        sectionCount: r.sectionCount,
        classCount: r.classCount,
        remarks: r.remarks,
        attendance: r.attendance,
        subjects: r.subjects.map((sub) => ({
          name: sub.label ?? subjMap.get(String(sub.subject)) ?? "—",
          obtained: sub.obtained,
          fullMarks: sub.fullMarks,
          grade: sub.grade,
          absent: sub.absent,
        })),
      })),
    }),
  );
  const { url } = await uploadPdf(buf, { folder: "report-cards", filename: `${student?.studentCode}-${examId ?? "all"}-${Date.now()}.pdf` });
  await GeneratedDocument.create({ type: examId ? "gradesheet" : "report_card", title: `Report — ${student?.name}`, url, student: studentId, relatedId: examId });
  return url;
}

const CERT_BODY: Record<string, (v: { student: string; className: string; school: string; father: string; dob: string }) => string> = {
  transfer_certificate: (v) =>
    `This is to certify that ${v.student}, son/daughter of ${v.father}, was a bona fide student of this institution, studying in ${v.className}. The student has cleared all dues and is granted a Transfer Certificate at the guardian's request. We wish the student every success.`,
  testimonial: (v) =>
    `This is to certify that ${v.student} has been a student of ${v.school} in ${v.className}. During the period of study the student's conduct and character were, to the best of our knowledge, good. This testimonial is issued on the guardian's request.`,
  bonafide: (v) =>
    `This is to certify that ${v.student}, born on ${v.dob}, is a bona fide student of ${v.school}, currently enrolled in ${v.className}. This certificate is issued for official purposes at the guardian's request.`,
};

export async function generateCertificatePdf(serviceRequestId: string): Promise<string> {
  await connectDb();
  const sr = await ServiceRequest.findById(serviceRequestId).lean();
  if (!sr) throw new Error("Request not found");
  const type = await ServiceRequestType.findById(sr.type).lean();
  const { student } = await studentContext(String(sr.student));
  const ctx = await studentContext(String(sr.student));
  const settings = await Settings.findOne().lean();
  const kind = type?.name ?? "Certificate";
  const docKind = (type?.documentType ?? "bonafide") as string;
  const bodyFn = CERT_BODY[docKind] ?? CERT_BODY.bonafide;

  const buf = await render(
    createElement(CertificatePdf, {
      kind,
      refNo: sr.requestNo,
      body: bodyFn({
        student: student?.name ?? "—",
        className: ctx.className,
        school: env.school.name,
        father: "the guardian",
        dob: student?.dateOfBirth ? formatDate(student.dateOfBirth) : "—",
      }),
      student: student?.name ?? "—",
      issuedOn: new Date(),
      headTeacher: settings?.headTeacher ?? "Head Teacher",
    }),
  );
  const { url } = await uploadPdf(buf, { folder: "certificates", filename: `${sr.requestNo}.pdf` });
  await GeneratedDocument.create({ type: (docKind as "transfer_certificate"), title: `${kind} — ${student?.name}`, url, student: sr.student, relatedId: serviceRequestId });
  return url;
}

void FeeHead;
void Exam;
