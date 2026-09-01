import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, LinkButton, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { Notice } from "@/models";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Notices" };

export default async function AdminNoticesPage() {
  await requireRole("admin");
  await connectDb();
  const notices = await Notice.find().sort({ createdAt: -1 }).limit(60).lean();

  return (
    <div>
      <PageHeader
        title="Notices"
        subtitle="Write once — publishes to the portal and, if selected, goes out by SMS."
        actions={
          <>
            <LinkButton href="/admin/notices/templates" variant="secondary" size="sm">Templates</LinkButton>
            <LinkButton href="/admin/notices/new" variant="primary" size="sm">New notice</LinkButton>
          </>
        }
      />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Title</TH>
            <TH>Audience</TH>
            <TH>Channels</TH>
            <TH align="center">Sent</TH>
            <TH align="center">Delivered</TH>
            <TH>Status</TH>
            <TH align="right">When</TH>
          </TableHeadRow>
          <tbody>
            {notices.map((n) => (
              <TR key={String(n._id)}>
                <TD>
                  <Link href={`/admin/notices/${n._id}`} className="font-medium hover:text-accent-700">{n.title}</Link>
                </TD>
                <TD className="text-muted capitalize">{n.audience.kind.replace(/_/g, " ")}</TD>
                <TD>
                  {n.channels.map((c) => <Tag key={c} tone="neutral" className="mr-1 capitalize">{c}</Tag>)}
                </TD>
                <TD align="center" className="tabular-nums">{n.smsSent || "—"}</TD>
                <TD align="center" className="tabular-nums">{n.smsDelivered || "—"}</TD>
                <TD><StatusBadge status={n.status} /></TD>
                <TD align="right" className="text-muted">{formatDate(n.publishedAt ?? n.scheduledFor ?? n.createdAt, "short")}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
