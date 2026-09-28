import { getCurrentUser } from "@/lib/session";
import { connectDb } from "@/lib/db";
import { Payment, Payslip, GeneratedDocument, Student, ServiceRequest, Invoice } from "@/models";
import { assertChildOfParent } from "@/lib/parent";
import {
  generateAndStoreReceipt,
  generateInvoicePdf,
  generatePayslipPdf,
  generateReportCardPdf,
  generateCertificatePdf,
} from "@/lib/documents";
import { signPdfUrl } from "@/lib/adapters/storage";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ docType: string; id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  await connectDb();

  const { docType, id } = await params;
  const url = new URL(req.url);
  const examId = url.searchParams.get("exam") ?? undefined;

  try {
    let pdfUrl: string;

    switch (docType) {
      case "receipt": {
        const payment = await Payment.findById(id).lean();
        if (!payment) return new Response("Not found", { status: 404 });
        await ensureStudentAccess(user, String(payment.student));
        pdfUrl = payment.receiptUrl ?? (await generateAndStoreReceipt(id));
        break;
      }
      case "invoice": {
        const invoice = await Invoice.findById(id).lean();
        if (!invoice) return new Response("Not found", { status: 404 });
        await ensureStudentAccess(user, String(invoice.student));
        pdfUrl = await generateInvoicePdf(id);
        break;
      }
      case "payslip": {
        const payslip = await Payslip.findById(id).lean();
        if (!payslip) return new Response("Not found", { status: 404 });
        if (!user.roles.includes("admin") && !user.roles.includes("accountant") && String(payslip.staff) !== user.staffId) {
          return new Response("Forbidden", { status: 403 });
        }
        pdfUrl = payslip.pdfUrl ?? (await generatePayslipPdf(id));
        break;
      }
      case "report_card":
      case "gradesheet": {
        await ensureStudentAccess(user, id);
        pdfUrl = await generateReportCardPdf(id, examId);
        break;
      }
      case "transfer_certificate":
      case "testimonial":
      case "bonafide": {
        const sr = await ServiceRequest.findById(id).lean();
        if (!sr) return new Response("Not found", { status: 404 });
        await ensureStudentAccess(user, String(sr.student));
        pdfUrl = sr.outputUrl ?? (await generateCertificatePdf(id));
        break;
      }
      default:
        return new Response("Unknown document", { status: 404 });
    }

    // local fallback URLs are relative — fetch and stream so the browser opens it inline
    if (pdfUrl.startsWith("/api/files/")) {
      const abs = new URL(pdfUrl, url.origin);
      const res = await fetch(abs, { headers: { cookie: req.headers.get("cookie") ?? "" } });
      return new Response(res.body, {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline" },
      });
    }
    // refresh a signed URL for supabase-hosted PDFs
    const signed = pdfUrl.includes("supabase") ? await signPdfUrl(pdfUrl.split("/").slice(-2).join("/")) : pdfUrl;
    return Response.redirect(signed, 302);
  } catch (e) {
    return new Response(`Could not generate document: ${e instanceof Error ? e.message : "error"}`, { status: 500 });
  }
}

async function ensureStudentAccess(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  studentId: string,
) {
  if (user.roles.includes("admin") || user.roles.includes("accountant") || user.roles.includes("teacher")) return;
  if (user.roles.includes("parent")) {
    const ok = await assertChildOfParent(user, studentId);
    if (ok) return;
  }
  throw Object.assign(new Error("Forbidden"), { status: 403 });
}

void Student;void GeneratedDocument;
