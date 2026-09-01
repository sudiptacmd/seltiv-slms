import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { resolveChild } from "@/lib/parent";
import { connectDb } from "@/lib/db";
import { GeneratedDocument } from "@/models";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };

export default async function ParentCertificatesPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const user = await requireRole("parent");
  const { child, children } = await resolveChild(user, (await searchParams).child);
  if (!child) return <EmptyState title="No child linked" />;

  await connectDb();
  const docs = await GeneratedDocument.find({
    student: child.id,
    type: { $in: ["transfer_certificate", "testimonial", "bonafide", "id_card", "report_card", "gradesheet"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div>
      <PageHeader title="Certificates & documents" subtitle="Documents the school has issued for your child." />
      <ChildSwitcher children={children} activeId={child.id} />
      <Panel bodyClassName="p-0">
        {docs.length === 0 ? (
          <div className="p-4"><EmptyState title="No documents issued yet" hint="Request a certificate under Service Requests." /></div>
        ) : (
          <Table>
            <TableHeadRow>
              <TH>Document</TH>
              <TH>Issued</TH>
              <TH align="right"></TH>
            </TableHeadRow>
            <tbody>
              {docs.map((d) => (
                <TR key={String(d._id)}>
                  <TD className="capitalize">{d.title}</TD>
                  <TD className="text-muted">{formatDate(d.createdAt, "short")}</TD>
                  <TD align="right">
                    <a href={d.url} target="_blank" className="text-[12px] font-medium text-accent-700 hover:underline">Download</a>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
