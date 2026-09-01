import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, DataRow } from "@/components/ui/primitives";
import { Breadcrumbs, StatusBadge } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { ServiceRequest } from "@/models";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Request" };

export default async function ParentServiceRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("parent");
  const { id } = await params;
  await connectDb();
  const sr = await ServiceRequest.findById(id).populate("type", "name stages fee documentType").populate("student", "name").lean();
  if (!sr || String(sr.requestedBy) !== user.id) notFound();
  const type = sr.type as unknown as { name: string; stages: string[]; documentType?: string };

  const stageIndex = type.stages.indexOf(sr.currentStage);

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs items={[{ label: "Service Requests", href: "/parent/service-requests" }, { label: sr.requestNo }]} />
      <PageHeader title={type.name} subtitle={`${sr.requestNo} · for ${(sr.student as unknown as { name: string }).name}`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Status">
          <DataRow k="Current stage">{sr.currentStage}</DataRow>
          <DataRow k="Status"><StatusBadge status={sr.status} /></DataRow>
          <DataRow k="Submitted">{formatDate(sr.createdAt)}</DataRow>
          {sr.reason && <DataRow k="Reason">{sr.reason}</DataRow>}
          {sr.status === "ready" && sr.outputUrl && (
            <a
              href={sr.outputUrl}
              target="_blank"
              className="mt-3 inline-flex rounded bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-600"
            >
              Download document
            </a>
          )}
        </Panel>

        <Panel title="Progress">
          <ol className="space-y-3">
            {type.stages.map((stage, i) => {
              const done = i < stageIndex || sr.status === "closed" || sr.status === "collected";
              const current = i === stageIndex;
              return (
                <li key={stage} className="flex items-start gap-2 text-[13px]">
                  <span
                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      done ? "bg-ok text-white" : current ? "bg-accent text-white" : "border border-line-strong text-muted"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={current ? "font-medium" : done ? "text-muted" : "text-muted"}>{stage}</span>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      <Panel title="Timeline" className="mt-4">
        <ul className="space-y-2 text-[13px]">
          {[...sr.events].reverse().map((e, i) => (
            <li key={i} className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0">
              <div>
                <span className="font-medium">{e.stage}</span>
                {e.note && <span className="text-muted"> — {e.note}</span>}
              </div>
              <span className="whitespace-nowrap text-[11px] text-muted">{formatDate(e.at, "short")}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
