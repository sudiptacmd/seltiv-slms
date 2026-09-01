import Link from "next/link";
import { requireRole } from "@/lib/session";
import { Panel } from "@/components/ui/primitives";

export const metadata = { title: "Payment" };

export default async function PaymentDonePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string }>;
}) {
  await requireRole("parent");
  const { status, payment } = await searchParams;
  const ok = status === "completed";

  return (
    <div className="mx-auto max-w-md">
      <Panel>
        <div className="py-4 text-center">
          {ok ? (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-2xl text-ok">✓</div>
              <h1 className="font-serif text-[20px] font-semibold">Payment received</h1>
              <p className="mt-1 text-[13px] text-muted">Your receipt has been generated.</p>
              <div className="mt-4 flex justify-center gap-2">
                {payment && (
                  <a href={`/print/receipt/${payment}`} target="_blank" className="rounded bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-600">
                    View receipt
                  </a>
                )}
                <Link href="/parent/fees" className="rounded border border-line px-3.5 py-2 text-[13px] hover:bg-panel">
                  Back to fees
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-2xl text-danger">!</div>
              <h1 className="font-serif text-[20px] font-semibold">Payment not completed</h1>
              <p className="mt-1 text-[13px] text-muted">The payment was cancelled or failed. Nothing has been charged.</p>
              <Link href="/parent/fees" className="mt-4 inline-block rounded border border-line px-3.5 py-2 text-[13px] hover:bg-panel">
                Try again
              </Link>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
