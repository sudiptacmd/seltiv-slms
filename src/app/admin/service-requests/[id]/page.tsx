import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, DataRow } from "@/components/ui/primitives";
import { Breadcrumbs, StatusBadge } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { ServiceRequest } from "@/models";
import { formatDate } from "@/lib/utils";
import { ProcessRequest } from "./ProcessRequest";

export const metadata: Metadata = { title: "Process request" };

export default async function AdminServiceRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await connectDb();
  const sr = await ServiceRequest.findById(id)
    .populate("type", "name stages fee documentType")
    .populate("student", "name studentCode")
    .lean();
  if (!sr) notFound();
  const type = sr.type as unknown as { name: string; stages: string[]; documentType?: string };
  const student = sr.student as unknown as { name: string; studentCode: string; _id: unknown };

  return (
    <div>
      <Breadcrumbs items={[{ label: "Service Requests", href: "/admin/service-requests" }, { label: sr.requestNo }]} />
      <PageHeader title={`${type.name} — ${sr.requestNo}`} actions={<StatusBadge status={sr.status} />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Panel title="Request">
            <DataRow k="Student">
              <Link href={`/admin/students/${student._id}`} className="text-accent-700 hover:underline">{student.name}</Link>
            </DataRow>
            <DataRow k="Student ID">{student.studentCode}</DataRow>
            <DataRow k="Type">{type.name}</DataRow>
            <DataRow k="Fee">{type.fee ? `৳${type.fee} · ${sr.feePaid ? "paid" : "unpaid"}` : "Free"}</DataRow>
            <DataRow k="Submitted">{formatDate(sr.createdAt)}</DataRow>
            {sr.reason && <DataRow k="Reason">{sr.reason}</DataRow>}
          </Panel>
          {sr.outputUrl && (
            <Panel title="Generated document">
              <a href={sr.outputUrl} target="_blank" className="text-[13px] font-medium text-accent-700 hover:underline">Open document →</a>
            </Panel>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="Advance the request">
            <ProcessRequest id={id} stages={type.stages} currentStage={sr.currentStage} hasTemplate={Boolean(type.documentType)} />
          </Panel>

          <Panel title="Timeline">
            <ul className="space-y-2 text-[13px]">
              {[...sr.events].reverse().map((e, i) => (
                <li key={i} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <div>
                    <span className="font-medium">{e.stage}</span>
                    <StatusBadge status={e.status} />
                    {e.note && <span className="ml-1 text-muted">— {e.note}</span>}
                  </div>
                  <span className="whitespace-nowrap text-[11px] text-muted">{formatDate(e.at, "short")}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
