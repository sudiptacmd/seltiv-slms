import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { ImportPanel } from "@/components/ImportPanel";
import { connectDb } from "@/lib/db";
import { ImportJob } from "@/models";
import { Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Import students" };

export default async function ImportStudentsPage() {
  await connectDb();
  const jobs = await ImportJob.find({ kind: "students" }).sort({ createdAt: -1 }).limit(5).lean();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Students", href: "/admin/students" }, { label: "Import" }]} />
      <PageHeader title="Import students" subtitle="Bulk-enrol from a spreadsheet. Nothing is saved until you confirm the preview." />
      <div className="max-w-3xl">
        <ImportPanel kind="students" />

        {jobs.length > 0 && (
          <Panel title="Recent imports" className="mt-4" bodyClassName="p-0">
            <Table>
              <TableHeadRow>
                <TH>File</TH>
                <TH align="center">Imported</TH>
                <TH align="center">Skipped</TH>
                <TH>When</TH>
              </TableHeadRow>
              <tbody>
                {jobs.map((j) => (
                  <TR key={String(j._id)}>
                    <TD>{j.fileName}</TD>
                    <TD align="center" className="text-ok">{j.okRows}</TD>
                    <TD align="center" className={j.errorRows ? "text-danger" : "text-muted"}>{j.errorRows}</TD>
                    <TD className="text-muted">{formatDate(j.createdAt, "short")}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Panel>
        )}
      </div>
    </div>
  );
}
