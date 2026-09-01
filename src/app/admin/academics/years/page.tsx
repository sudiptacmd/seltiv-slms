import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { AcademicYear } from "@/models";
import { formatDate } from "@/lib/utils";
import { YearForm } from "./YearForm";

export const metadata: Metadata = { title: "Academic Years" };

export default async function YearsPage() {
  await requireRole("admin");
  await connectDb();
  const years = await AcademicYear.find().sort({ name: -1 }).lean();

  return (
    <div>
      <PageHeader title="Academic Years" subtitle="One year is marked current; new enrolments, invoices and exams attach to it." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Add / edit a year" className="lg:col-span-1">
          <YearForm />
        </Panel>
        <Panel className="lg:col-span-2" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Year</TH>
              <TH>Start</TH>
              <TH>End</TH>
              <TH></TH>
            </TableHeadRow>
            <tbody>
              {years.map((y) => (
                <TR key={String(y._id)}>
                  <TD className="font-medium">
                    {y.name} {y.isCurrent && <Tag tone="accent" className="ml-1">Current</Tag>}
                    {y.closed && <Tag tone="neutral" className="ml-1">Closed</Tag>}
                  </TD>
                  <TD className="text-muted">{formatDate(y.startDate, "short")}</TD>
                  <TD className="text-muted">{formatDate(y.endDate, "short")}</TD>
                  <TD></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
