import "server-only";
import { connectDb } from "./db";
import { Invoice, Payment, FeeHead } from "@/models";
import { getCurrentYear } from "./queries";

export async function studentFeeLedger(studentId: string) {
  await connectDb();
  const year = await getCurrentYear();
  const [invoices, payments, heads] = await Promise.all([
    Invoice.find({ student: studentId, year: year._id }).sort({ period: 1 }).lean(),
    Payment.find({ student: studentId, status: "success" }).sort({ paidAt: -1 }).lean(),
    FeeHead.find().lean(),
  ]);
  void heads;

  const now = new Date();
  const totalBilled = invoices.reduce((s, i) => s + i.netPayable, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = invoices
    .filter((i) => new Date(i.dueDate) <= now)
    .reduce((s, i) => s + Math.max(0, i.netPayable - i.paidAmount), 0);
  const balance = totalBilled - totalPaid;

  return {
    invoices,
    payments,
    totalBilled,
    totalPaid,
    outstanding,
    balance,
    dueInvoices: invoices.filter((i) => i.netPayable - i.paidAmount > 0.5),
  };
}

export async function invoiceForPayment(invoiceId: string) {
  await connectDb();
  return Invoice.findById(invoiceId).lean();
}
