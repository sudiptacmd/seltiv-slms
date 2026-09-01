import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, LinkButton } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { FilterBar } from "@/components/FilterBar";
import { connectDb } from "@/lib/db";
import { ServiceRequest, ServiceRequestType } from "@/models";
import { formatDate } from "@/lib/utils";
import { SR_STATUS } from "@/models/types";

export const metadata: Metadata = { title: "Service Requests" };

export default async function AdminServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  await connectDb();
  const types = await ServiceRequestType.find().lean();

  const q: Record<string, unknown> = {};
  if (sp.status) q.status = sp.status;
  if (sp.typeId) q.type = sp.typeId;
  const requests = await ServiceRequest.find(q)
    .populate("type", "name")
    .populate("student", "name")
    .sort({ createdAt: -1 })
    .limit(120)
    .lean();

  const open = requests.filter((r) => !["collected", "closed", "rejected"].includes(r.status)).length;

  return (
    <div>
      <PageHeader
        title="Service Requests"
        subtitle="Transfer certificates, testimonials and other documents requested by guardians."
        actions={<LinkButton href="/admin/service-requests/types" variant="secondary" size="sm">Request types</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={requests.length} label="Total" />
        <StatTile value={open} label="Open" tone={open ? "warn" : "ok"} />
        <StatTile value={requests.filter((r) => r.status === "ready").length} label="Ready to collect" tone="ok" />
        <StatTile value={types.filter((t) => t.active).length} label="Request types" />
      </div>

      <div className="mt-4">
        <FilterBar
          filters={[
            { type: "select", key: "status", label: "Any status", options: SR_STATUS.map((s) => ({ value: s, label: s.replace(/_/g, " ") })) },
            { type: "select", key: "typeId", label: "Any type", options: types.map((t) => ({ value: String(t._id), label: t.name })) },
          ]}
        />
        <Panel bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Request</TH>
              <TH>Student</TH>
              <TH>Submitted</TH>
              <TH>Stage</TH>
              <TH>Status</TH>
              <TH></TH>
            </TableHeadRow>
            <tbody>
              {requests.map((r) => (
                <TR key={String(r._id)}>
                  <TD>
                    <div className="font-medium">{(r.type as unknown as { name: string })?.name}</div>
                    <div className="text-[11px] text-muted">{r.requestNo}</div>
                  </TD>
                  <TD>{(r.student as unknown as { name: string })?.name}</TD>
                  <TD className="text-muted">{formatDate(r.createdAt, "short")}</TD>
                  <TD>{r.currentStage}</TD>
                  <TD><StatusBadge status={r.status} /></TD>
                  <TD>
                    <Link href={`/admin/service-requests/${r._id}`} className="text-[12px] text-accent-700 hover:underline">Process</Link>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
