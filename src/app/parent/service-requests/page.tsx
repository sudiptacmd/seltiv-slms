import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState, LinkButton } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { ServiceRequest } from "@/models";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Service Requests" };

export default async function ParentServiceRequestsPage() {
  const user = await requireRole("parent");
  await connectDb();
  const requests = await ServiceRequest.find({ requestedBy: user.id })
    .sort({ createdAt: -1 })
    .populate("type", "name")
    .populate("student", "name")
    .lean();

  return (
    <div>
      <PageHeader
        title="Service Requests"
        subtitle="Transfer certificates, testimonials and other documents — requested online and tracked to issue."
        actions={<LinkButton href="/parent/service-requests/new" variant="primary" size="sm">New request</LinkButton>}
      />
      <Panel bodyClassName="p-0">
        {requests.length === 0 ? (
          <div className="p-4"><EmptyState title="No requests yet" hint="Raise a request and follow it here." /></div>
        ) : (
          <Table>
            <TableHeadRow>
              <TH>Request</TH>
              <TH>For</TH>
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
                    <Link href={`/parent/service-requests/${r._id}`} className="text-[12px] text-accent-700 hover:underline">Track</Link>
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
