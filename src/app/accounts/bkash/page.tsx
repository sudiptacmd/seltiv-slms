import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { BkashTransaction, Invoice } from "@/models";
import { taka, formatDate } from "@/lib/utils";
import { MatchButton } from "./MatchButton";

export const metadata: Metadata = { title: "bKash Reconciliation" };

export default async function BkashPage() {
  await requireRole("accountant");
  await connectDb();
  const txns = await BkashTransaction.find().sort({ createdAt: -1 }).limit(100).lean();
  const invIds = txns.map((t) => t.matchedInvoice).filter(Boolean);
  const invoices = await Invoice.find({ _id: { $in: invIds } }).populate("student", "name").lean();
  const invMap = new Map(invoices.map((i) => [String(i._id), i]));

  const completed = txns.filter((t) => t.status === "completed");
  const matched = completed.filter((t) => t.matchedPayment);
  const unmatched = completed.filter((t) => !t.matchedPayment);
  const settled = completed.reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <PageHeader title="bKash Reconciliation" subtitle="Incoming bKash transactions matched to fee invoices. In the sandbox, payments auto-match on completion." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={completed.length} label="Completed transactions" />
        <StatTile value={matched.length} label="Auto-matched" tone="ok" />
        <StatTile value={unmatched.length} label="Needs attention" tone={unmatched.length ? "warn" : "ok"} />
        <StatTile value={taka(settled)} label="Total settled" />
      </div>

      {unmatched.length > 0 && (
        <Panel title="Unmatched — completed but no receipt" className="mt-4" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Transaction</TH>
              <TH>From</TH>
              <TH align="right">Amount</TH>
              <TH>Merchant ref</TH>
              <TH></TH>
            </TableHeadRow>
            <tbody>
              {unmatched.map((t) => (
                <TR key={String(t._id)}>
                  <TD className="tabular-nums">{t.trxId ?? t.paymentID}</TD>
                  <TD>{t.senderMsisdn}</TD>
                  <TD align="right" className="tabular-nums">{taka(t.amount)}</TD>
                  <TD className="text-muted">{t.merchantInvoiceNumber ?? "—"}</TD>
                  <TD><MatchButton paymentID={t.paymentID} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}

      <Panel title="All transactions" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Date</TH>
            <TH>Transaction</TH>
            <TH>From</TH>
            <TH>Student</TH>
            <TH align="right">Amount</TH>
            <TH>Status</TH>
          </TableHeadRow>
          <tbody>
            {txns.map((t) => {
              const inv = t.matchedInvoice ? invMap.get(String(t.matchedInvoice)) : null;
              return (
                <TR key={String(t._id)}>
                  <TD className="text-muted">{formatDate(t.createdAt, "short")}</TD>
                  <TD className="tabular-nums">{t.trxId ?? t.paymentID.slice(0, 12)}</TD>
                  <TD>{t.senderMsisdn}</TD>
                  <TD>{(inv?.student as unknown as { name: string })?.name ?? "—"}</TD>
                  <TD align="right" className="tabular-nums">{taka(t.amount)}</TD>
                  <TD>
                    {t.status === "completed" && t.matchedPayment ? (
                      <Tag tone="ok">Reconciled</Tag>
                    ) : t.status === "completed" ? (
                      <Tag tone="warn">Unmatched</Tag>
                    ) : (
                      <Tag tone="neutral">{t.status}</Tag>
                    )}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
