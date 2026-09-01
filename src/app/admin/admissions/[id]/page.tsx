import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, DataRow } from "@/components/ui/primitives";
import { Breadcrumbs, StatusBadge } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { AdmissionApplication } from "@/models";
import { classSectionOptions } from "@/lib/students";
import { formatDate } from "@/lib/utils";
import { ApplicationActions } from "./ApplicationActions";

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await connectDb();
  const app = await AdmissionApplication.findById(id).populate("klass", "name numeric").lean();
  if (!app) notFound();
  const { sections } = await classSectionOptions();
  const klass = app.klass as unknown as { name: string; numeric: number; _id: unknown };
  const forClass = sections.filter((s) => s.classId === String(klass._id));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admissions", href: "/admin/admissions" }, { label: app.studentName }]} />
      <PageHeader
        title={app.studentName}
        subtitle={`${app.applicationNo} · applied for ${klass.name}`}
        actions={<StatusBadge status={app.stage} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Panel title="Applicant">
            <DataRow k="Name">{app.studentName}</DataRow>
            <DataRow k="Gender">{app.gender}</DataRow>
            <DataRow k="Date of birth">{formatDate(app.dateOfBirth, "short")}</DataRow>
            <DataRow k="Birth cert.">{app.birthCertNo ?? "—"}</DataRow>
            <DataRow k="Religion">{app.religion ?? "—"}</DataRow>
            <DataRow k="Address">{app.address ?? "—"}</DataRow>
          </Panel>
          <Panel title="Guardian">
            <DataRow k="Name">{app.guardianName}</DataRow>
            <DataRow k="Relation">{app.guardianRelation}</DataRow>
            <DataRow k="Phone">{app.guardianPhone}</DataRow>
            <DataRow k="Email">{app.guardianEmail ?? "—"}</DataRow>
            <DataRow k="Occupation">{app.guardianOccupation ?? "—"}</DataRow>
          </Panel>
          <Panel title="Previous school">
            <DataRow k="School">{app.previousSchool ?? "—"}</DataRow>
            <DataRow k="Class">{app.previousClass ?? "—"}</DataRow>
            <DataRow k="Result">{app.previousResult ?? "—"}</DataRow>
          </Panel>
          {app.rejectionReason && (
            <Panel title="Rejection reason">
              <p className="text-[13px] text-danger">{app.rejectionReason}</p>
            </Panel>
          )}
        </div>

        <div className="lg:col-span-2">
          {app.enrolledStudent && (
            <Panel title="Enrolled" className="mb-4">
              <Link href={`/admin/students/${app.enrolledStudent}`} className="text-[13px] font-medium text-accent-700 hover:underline">
                View student record →
              </Link>
            </Panel>
          )}
          <ApplicationActions
            id={id}
            stage={app.stage}
            testScore={app.testScore}
            enrolled={Boolean(app.enrolledStudent)}
            documents={app.documents.map((d) => ({ label: d.label, status: d.status, note: d.note }))}
            sections={forClass.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </div>
    </div>
  );
}
