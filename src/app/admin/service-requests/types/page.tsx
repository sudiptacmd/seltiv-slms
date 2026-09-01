import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { ServiceRequestType } from "@/models";
import { taka } from "@/lib/utils";
import { RequestTypeForm } from "./RequestTypeForm";

export const metadata: Metadata = { title: "Request types" };

export default async function RequestTypesPage() {
  await requireRole("admin");
  await connectDb();
  const types = await ServiceRequestType.find().sort({ name: 1 }).lean();

  return (
    <div>
      <PageHeader title="Service request types" subtitle="What guardians can request, the fee, workflow stages and the document template used." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Add a type" className="lg:col-span-1"><RequestTypeForm /></Panel>
        <Panel className="lg:col-span-2" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Name</TH>
              <TH align="right">Fee</TH>
              <TH>Stages</TH>
              <TH>Document</TH>
            </TableHeadRow>
            <tbody>
              {types.map((t) => (
                <TR key={String(t._id)}>
                  <TD className="font-medium">
                    {t.name} {!t.active && <Tag tone="neutral">inactive</Tag>}
                  </TD>
                  <TD align="right">{t.fee ? taka(t.fee) : "Free"}</TD>
                  <TD className="text-[12px] text-muted">{t.stages.join(" → ")}</TD>
                  <TD className="text-muted">{t.documentType ?? "—"}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
