import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile } from "@/components/ui/primitives";
import { Breadcrumbs, StatusBadge } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Notice, NoticeRecipient } from "@/models";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Notice" };

export default async function AdminNoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await connectDb();
  const notice = await Notice.findById(id).lean();
  if (!notice) notFound();
  const recipients = await NoticeRecipient.find({ notice: id })
    .populate("guardian", "name phone")
    .populate("student", "name")
    .limit(300)
    .lean();
  const read = recipients.filter((r) => r.readAt).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Notices", href: "/admin/notices" }, { label: notice.title }]} />
      <PageHeader title={notice.title} actions={<StatusBadge status={notice.status} />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Message" className="lg:col-span-2">
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{notice.body}</div>
          <p className="mt-3 text-[12px] text-muted">
            {formatDate(notice.publishedAt ?? notice.createdAt)} · audience: {notice.audience.kind.replace(/_/g, " ")} · channels: {notice.channels.join(", ")}
          </p>
        </Panel>
        <div className="space-y-3">
          <StatTile value={notice.recipientCount} label="Recipients" />
          <StatTile value={notice.smsSent} label="SMS sent" />
          <StatTile value={notice.smsDelivered} label="SMS delivered" tone="ok" />
          <StatTile value={`${read}/${recipients.length}`} label="Read in portal" />
        </div>
      </div>

      <Panel title="Delivery report" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Guardian</TH>
            <TH>Student</TH>
            <TH>Phone</TH>
            <TH>SMS</TH>
            <TH>Read</TH>
          </TableHeadRow>
          <tbody>
            {recipients.map((r) => (
              <TR key={String(r._id)}>
                <TD>{(r.guardian as unknown as { name: string })?.name ?? "—"}</TD>
                <TD className="text-muted">{(r.student as unknown as { name: string })?.name ?? "—"}</TD>
                <TD className="text-muted">{(r.guardian as unknown as { phone: string })?.phone ?? "—"}</TD>
                <TD className="capitalize">{r.smsStatus ?? "—"}</TD>
                <TD>{r.readAt ? formatDate(r.readAt, "short") : "—"}</TD>
              </TR>
            ))}
            {recipients.length === 0 && <TR><TD colSpan={5} className="text-muted">No recipient rows (draft or scheduled).</TD></TR>}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
