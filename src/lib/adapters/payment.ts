import "server-only";
import crypto from "node:crypto";
import { connectDb } from "../db";
import { BkashTransaction, Invoice } from "@/models";
import { env } from "../env";

/**
 * Mock bKash adapter. Mirrors the real "tokenised checkout" shape:
 *   createPayment()  → { paymentID, redirectURL }
 *   executePayment() → completes / fails, records a BkashTransaction
 * A real integration later swaps the internals; callers and the DB stay the same.
 */

export type CreatePaymentInput = {
  invoiceId: string;
  amount: number;
  payerReference: string; // guardian phone / student code
  callbackUrl: string;
};

export type CreatePaymentResult = {
  paymentID: string;
  redirectURL: string;
  amount: number;
};

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  await connectDb();
  const invoice = await Invoice.findById(input.invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  const paymentID = "MOCK" + crypto.randomBytes(8).toString("hex").toUpperCase();
  await BkashTransaction.create({
    paymentID,
    amount: input.amount,
    senderMsisdn: input.payerReference,
    merchantInvoiceNumber: invoice.invoiceNo,
    status: "initiated",
    matchedInvoice: invoice._id,
    raw: { input },
  });

  const redirectURL = `${env.appUrl}/pay/checkout/${paymentID}?redirect=${encodeURIComponent(input.callbackUrl)}`;
  return { paymentID, redirectURL, amount: input.amount };
}

export async function executePayment(
  paymentID: string,
  outcome: "success" | "failure" = "success",
): Promise<{ status: string; trxId?: string; amount?: number; invoiceId?: string }> {
  await connectDb();
  const txn = await BkashTransaction.findOne({ paymentID });
  if (!txn) throw new Error("Unknown paymentID");
  if (txn.status === "completed") {
    return { status: "completed", trxId: txn.trxId, amount: txn.amount, invoiceId: String(txn.matchedInvoice) };
  }

  if (outcome === "failure") {
    txn.status = "failed";
    await txn.save();
    return { status: "failed" };
  }

  txn.trxId = "TRX" + crypto.randomBytes(6).toString("hex").toUpperCase();
  txn.status = "completed";
  await txn.save();
  return {
    status: "completed",
    trxId: txn.trxId,
    amount: txn.amount,
    invoiceId: String(txn.matchedInvoice),
  };
}

export async function queryPayment(paymentID: string) {
  await connectDb();
  const txn = await BkashTransaction.findOne({ paymentID }).lean();
  return txn;
}

export const paymentStatus = () => env.payment.provider;
