import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, LinkButton, EmptyState } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { FilterBar } from "@/components/FilterBar";
import { connectDb } from "@/lib/db";
import { AdmissionApplication } from "@/models";
import { admissionsPipeline } from "@/lib/admin";
import { classSectionOptions } from "@/lib/students";
import { formatDate } from "@/lib/utils";
import { APPLICATION_STAGE } from "@/models/types";

export const metadata: Metadata = { title: "Admissions" };

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  await connectDb();
  const [pipeline, { classes }] = await Promise.all([admissionsPipeline(), classSectionOptions()]);

  const q: Record<string, unknown> = pipeline.session ? { session: pipeline.session._id } : {};
  if (sp.stage) q.stage = sp.stage;
  if (sp.classId) q.klass = sp.classId;
  if (sp.q) q.studentName = { $regex: sp.q, $options: "i" };
  const apps = await AdmissionApplication.find(q).populate("klass", "name").sort({ createdAt: -1 }).limit(100).lean();

  return (
    <div>
      <PageHeader
        title={pipeline.session?.name ?? "Admissions"}
        subtitle={
          pipeline.session
            ? `Applications ${pipeline.session.isOpen ? "open" : "closed"} · closes ${formatDate(pipeline.session.closesAt, "short")}`
            : "No admission session configured"
        }
        actions={
          <>
            <LinkButton href="/admin/admissions/tests" variant="secondary" size="sm">Entrance tests</LinkButton>
            <LinkButton href="/admin/admissions/settings" variant="secondary" size="sm">Session settings</LinkButton>
          </>
        }
      />

      {!pipeline.session ? (
        <EmptyState
          title="Set up an admission session"
          hint="Configure the open/close dates, classes and required documents to start accepting applications."
          action={<LinkButton href="/admin/admissions/settings" variant="primary" size="sm">Configure</LinkButton>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile value={pipeline.total} label="Applications" />
            <StatTile value={pipeline.testScheduled} label="Test scheduled" />
            <StatTile value={pipeline.seatsTotal || "—"} label="Seats available" />
            <StatTile value={pipeline.enrolled} label="Enrolment confirmed" tone="ok" />
          </div>

          <div className="mt-4">
            <FilterBar
              filters={[
                { type: "search", key: "q", placeholder: "Applicant name…" },
                { type: "select", key: "stage", label: "Any stage", options: APPLICATION_STAGE.map((s) => ({ value: s, label: s.replace(/_/g, " ") })) },
                { type: "select", key: "classId", label: "Any class", options: classes.map((c) => ({ value: c.id, label: c.name })) },
              ]}
            />
            <Panel bodyClassName="p-0">
              <Table>
                <TableHeadRow>
                  <TH>Applicant</TH>
                  <TH>Class</TH>
                  <TH>Guardian</TH>
                  <TH>Documents</TH>
                  <TH>Stage</TH>
                  <TH></TH>
                </TableHeadRow>
                <tbody>
                  {apps.map((a) => {
                    const verified = a.documents.filter((d) => d.status === "verified").length;
                    return (
                      <TR key={String(a._id)}>
                        <TD>
                          <Link href={`/admin/admissions/${a._id}`} className="font-medium hover:text-accent-700">{a.studentName}</Link>
                          <div className="text-[11px] text-muted">{a.applicationNo}</div>
                        </TD>
                        <TD>{(a.klass as unknown as { name: string })?.name}</TD>
                        <TD className="text-muted">{a.guardianName}<div className="text-[11px]">{a.guardianPhone}</div></TD>
                        <TD className="text-muted">{verified}/{a.documents.length} verified</TD>
                        <TD><StatusBadge status={a.stage} /></TD>
                        <TD>
                          <Link href={`/admin/admissions/${a._id}`} className="text-[12px] text-accent-700 hover:underline">Open</Link>
                        </TD>
                      </TR>
                    );
                  })}
                  {apps.length === 0 && <TR><TD colSpan={6} className="text-muted">No applications match.</TD></TR>}
                </tbody>
              </Table>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
