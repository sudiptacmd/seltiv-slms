import { notFound, redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { BkashTransaction, Invoice } from "@/models";
import { completeBkashPayment } from "@/lib/actions/payments";
import { env } from "@/lib/env";
import { taka } from "@/lib/utils";

export const metadata = { title: "bKash Checkout" };

/**
 * Mock bKash checkout page (stands in for the hosted bKash page). Two buttons —
 * pay / cancel — call the completion action and bounce back to `redirect`.
 */
export default async function MockCheckout({
  params,
  searchParams,
}: {
  params: Promise<{ paymentID: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { paymentID } = await params;
  const { redirect: back } = await searchParams;
  await connectDb();
  const txn = await BkashTransaction.findOne({ paymentID }).lean();
  if (!txn) notFound();
  const invoice = txn.matchedInvoice ? await Invoice.findById(txn.matchedInvoice).lean() : null;
  const returnTo = back && back.startsWith("/") ? back : "/parent/fees";

  async function finish(formData: FormData) {
    "use server";
    const outcome = formData.get("outcome") === "success" ? "success" : "failure";
    const r = await completeBkashPayment(paymentID, outcome);
    redirect(`${returnTo}?status=${r.status}${r.ok && r.paymentId ? `&payment=${r.paymentId}` : ""}`);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[#e2136e] px-4 py-10">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-bold text-[#e2136e]">bKash</span>
          <span className="text-[11px] text-neutral-400">SANDBOX</span>
        </div>
        <p className="text-[13px] text-neutral-500">Merchant</p>
        <p className="mb-3 font-medium">{env.school.name}</p>
        <p className="text-[13px] text-neutral-500">Bill</p>
        <p className="mb-1 font-medium">{invoice?.title ?? "School fee"}</p>
        <p className="mb-4 text-2xl font-bold">{taka(txn.amount)}</p>
        <p className="mb-4 text-[12px] text-neutral-400">
          Paying from {txn.senderMsisdn} · Ref {txn.merchantInvoiceNumber}
        </p>

        {txn.status === "completed" ? (
          <p className="rounded bg-green-50 px-3 py-2 text-[13px] text-green-700">
            Payment already completed. <a href={returnTo} className="underline">Return</a>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <form action={finish}>
              <input type="hidden" name="outcome" value="success" />
              <button className="w-full rounded bg-[#e2136e] py-2.5 text-[14px] font-semibold text-white hover:opacity-90">
                Confirm payment
              </button>
            </form>
            <form action={finish}>
              <input type="hidden" name="outcome" value="failure" />
              <button className="w-full rounded border border-neutral-300 py-2 text-[13px] text-neutral-600 hover:bg-neutral-50">
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
