"use server";

import { redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { Invoice, Payment, BkashTransaction, Student, Guardian, nextSeq } from "@/models";
import { invoiceStatusFor } from "@/lib/fees";
import { createPayment, executePayment } from "@/lib/adapters/payment";
import { generateAndStoreReceipt } from "@/lib/documents";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { guardAction, revalidate, type ActionState } from "./_common";

/** Start a bKash payment for an invoice; returns the redirect URL. */
export async function startBkashPayment(invoiceId: string, payerRef: string, returnTo: string) {
  await connectDb();
  const invoice = await Invoice.findById(invoiceId).lean();
  if (!invoice) throw new Error("Invoice not found");
  const remaining = invoice.netPayable - invoice.paidAmount;
  if (remaining <= 0) throw new Error("This invoice is already paid.");

  const { redirectURL } = await createPayment({
    invoiceId,
    amount: remaining,
    payerReference: payerRef,
    callbackUrl: returnTo,
  });
  return redirectURL;
}

/** Called by the mock checkout page / webhook once the user "pays". */
export async function completeBkashPayment(paymentID: string, outcome: "success" | "failure") {
  await connectDb();
  const result = await executePayment(paymentID, outcome);
  if (result.status !== "completed" || !result.invoiceId) {
    return { ok: false, status: result.status };
  }

  const invoice = await Invoice.findById(result.invoiceId);
  if (!invoice) return { ok: false, status: "no-invoice" };

  // idempotency: one Payment per bkash txn
  const txn = await BkashTransaction.findOne({ paymentID });
  const already = txn?.matchedPayment && (await Payment.findById(txn.matchedPayment));
  if (already) return { ok: true, status: "completed", paymentId: String(already._id), receiptUrl: already.receiptUrl };

  const seq = await nextSeq(`receipt-${invoice.period}`);
  const payment = await Payment.create({
    receiptNo: `RCP-${invoice.period}-${String(seq).padStart(4, "0")}`,
    invoice: invoice._id,
    student: invoice.student,
    amount: result.amount,
    method: "bkash",
    status: "success",
    reference: result.trxId,
    bkashTransaction: txn?._id,
    paidAt: new Date(),
  });

  invoice.paidAmount += result.amount ?? 0;
  invoice.status = invoiceStatusFor(invoice.netPayable, invoice.paidAmount, invoice.dueDate) as typeof invoice.status;
  await invoice.save();

  if (txn) {
    txn.matchedPayment = payment._id;
    txn.matchedInvoice = invoice._id;
    await txn.save();
  }

  const receiptUrl = await generateAndStoreReceipt(String(payment._id));
  payment.receiptUrl = receiptUrl;
  await payment.save();

  await recordAudit({ action: "fee.payment", entity: "Payment", entityId: String(payment._id), after: { amount: result.amount, method: "bkash", invoice: invoice.invoiceNo } });
  revalidate("/parent/fees", "/accounts/fees", "/accounts/bkash", "/admin/finance");

  return { ok: true, status: "completed", paymentId: String(payment._id), receiptUrl };
}

/** Accountant records a cash / offline payment. */
export async function recordCashPayment(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guardAction("payment.collect", "accountant");
  if (deny || !user) return deny ?? { error: "Not allowed." };
  await connectDb();

  const invoiceId = String(form.get("invoiceId") ?? "");
  const amount = Number(form.get("amount") ?? 0);
  const method = String(form.get("method") ?? "cash") as "cash" | "bank" | "adjustment";
  const reference = String(form.get("reference") ?? "").trim() || undefined;
  const note = String(form.get("note") ?? "").trim() || undefined;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return { error: "Invoice not found." };
  const remaining = invoice.netPayable - invoice.paidAmount;
  if (amount <= 0 || amount > remaining + 0.01) return { error: `Amount must be between ৳1 and ৳${remaining}.` };

  const seq = await nextSeq(`receipt-${invoice.period}`);
  const payment = await Payment.create({
    receiptNo: `RCP-${invoice.period}-${String(seq).padStart(4, "0")}`,
    invoice: invoice._id,
    student: invoice.student,
    amount,
    method,
    status: "success",
    reference,
    note,
    receivedBy: user.staffId,
    paidAt: new Date(),
  });
  invoice.paidAmount += amount;
  invoice.status = invoiceStatusFor(invoice.netPayable, invoice.paidAmount, invoice.dueDate) as typeof invoice.status;
  await invoice.save();

  const receiptUrl = await generateAndStoreReceipt(String(payment._id));
  payment.receiptUrl = receiptUrl;
  await payment.save();

  await recordAudit({ actor: user, action: "fee.payment", entity: "Payment", entityId: String(payment._id), after: { amount, method, invoice: invoice.invoiceNo } });
  revalidate("/accounts/fees", `/accounts/fees/${invoice.student}`, "/admin/finance", "/parent/fees");
  return { ok: true, message: `Receipt ${payment.receiptNo} issued for ৳${amount}.` };
}

export async function goToBkash(invoiceId: string, payerRef: string, returnTo: string) {
  const url = await startBkashPayment(invoiceId, payerRef, returnTo);
  redirect(url);
}

/** Accountant manually matches a completed bKash txn to its invoice. */
export async function matchBkashTxn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || (!user.roles.includes("accountant") && !user.roles.includes("admin"))) return { error: "Not allowed." };
  const paymentID = String(form.get("paymentID") ?? "");
  const r = await completeBkashPayment(paymentID, "success");
  return r.ok ? { ok: true, message: "Matched — receipt generated." } : { error: "Could not match this transaction." };
}

void env;
