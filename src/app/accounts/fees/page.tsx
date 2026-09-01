import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge, Pagination } from "@/components/ui/misc";
import { FilterBar } from "@/components/FilterBar";
import { feeLedger, classOptions } from "@/lib/accounts";
import { taka } from "@/lib/utils";

export const metadata: Metadata = { title: "Fee Collection" };

export default async function FeeCollectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("accountant");
  const sp = await searchParams;
  const [ledger, classes] = await Promise.all([
    feeLedger({ q: sp.q, classId: sp.classId, status: sp.status, page: sp.page ? Number(sp.page) : 1 }),
    classOptions(),
  ]);
  const qs = (p: number) => {
    const u = new URLSearchParams(sp as Record<string, string>);
    u.set("page", String(p));
    return `/accounts/fees?${u.toString()}`;
  };

  return (
    <div>
      <PageHeader title="Fee Collection" subtitle={`${ledger.total} students`} />
      <FilterBar
        filters={[
          { type: "search", key: "q", placeholder: "Name or student ID…" },
          { type: "select", key: "classId", label: "All classes", options: classes },
          { type: "select", key: "status", label: "Any status", options: [{ value: "overdue", label: "Has dues" }, { value: "paid", label: "Cleared" }] },
        ]}
      />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Student</TH>
            <TH>Class</TH>
            <TH align="right">Billed</TH>
            <TH align="right">Paid</TH>
            <TH align="right">Due</TH>
            <TH>Status</TH>
            <TH></TH>
          </TableHeadRow>
          <tbody>
            {ledger.rows.map((r) => (
              <TR key={r.id}>
                <TD>
                  <Link href={`/accounts/fees/${r.id}`} className="font-medium hover:text-accent-700">{r.name}</Link>
                  <div className="text-[11px] text-muted">{r.code}</div>
                </TD>
                <TD>{r.klass}</TD>
                <TD align="right" className="tabular-nums">{taka(r.billed)}</TD>
                <TD align="right" className="tabular-nums">{taka(r.paid)}</TD>
                <TD align="right" className={`tabular-nums ${r.due > 0 ? "font-medium text-danger" : ""}`}>{taka(r.due)}</TD>
                <TD><StatusBadge status={r.status} /></TD>
                <TD>
                  <Link href={`/accounts/fees/${r.id}`} className="text-[12px] text-accent-700 hover:underline">Ledger</Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Pagination page={ledger.page} pageCount={ledger.pageCount} makeHref={qs} />
    </div>
  );
}
