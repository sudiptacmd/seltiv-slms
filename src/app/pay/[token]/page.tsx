import { notFound, redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { Invoice, Student } from "@/models";
import { startBkashPayment } from "@/lib/actions/payments";
import { env } from "@/lib/env";
import { taka, formatDate } from "@/lib/utils";

export const metadata = { title: "Pay school fee" };

/** Public, tokenised pay-by-link (from an SMS reminder) — no login. */
export default async function PayByLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  await connectDb();
  const invoice = await Invoice.findOne({ payToken: token }).lean();
  if (!invoice) notFound();
  const student = await Student.findById(invoice.student).lean();
  const remaining = invoice.netPayable - invoice.paidAmount;

  async function pay() {
    "use server";
    const url = await startBkashPayment(String(invoice!._id), student?.studentCode ?? "public", `/pay/${token}`);
    redirect(url);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-panel px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-card">
        <div className="mb-4 text-center">
          <div className="font-serif text-[18px] font-semibold">{env.school.name}</div>
          <div className="text-[12px] text-muted">Fee payment</div>
        </div>

        {status === "completed" ? (
          <p className="rounded bg-ok-bg px-3 py-2 text-center text-[13px] text-ok">
            Payment received. A receipt has been sent to the school records. You may close this page.
          </p>
        ) : remaining <= 0 ? (
          <p className="rounded bg-ok-bg px-3 py-2 text-center text-[13px] text-ok">This invoice is already paid.</p>
        ) : (
          <>
            <p className="text-[13px]"><span className="text-muted">Student:</span> {student?.name}</p>
            <p className="text-[13px]"><span className="text-muted">Invoice:</span> {invoice.title}</p>
            <p className="text-[13px]"><span className="text-muted">Due:</span> {formatDate(invoice.dueDate)}</p>
            <p className="mt-3 text-center font-serif text-[24px] font-semibold">{taka(remaining)}</p>
            <form action={pay} className="mt-4">
              <button className="w-full rounded bg-accent2 px-4 py-2.5 text-[14px] font-medium text-white hover:opacity-90">
                Pay with bKash
              </button>
            </form>
          </>
        )}
        <p className="mt-4 text-center text-[10px] text-muted">Seltiv SLMS · sandbox payment</p>
      </div>
    </div>
  );
}
