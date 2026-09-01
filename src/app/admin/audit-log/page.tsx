import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { Pagination } from "@/components/ui/misc";
import { FilterBar } from "@/components/FilterBar";
import { connectDb } from "@/lib/db";
import { AuditLog } from "@/models";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  await connectDb();
  const perPage = 40;
  const page = Math.max(1, Number(sp.page ?? 1));

  const q: Record<string, unknown> = {};
  if (sp.entity) q.entity = sp.entity;
  if (sp.q) q.$or = [{ actorName: { $regex: sp.q, $options: "i" } }, { action: { $regex: sp.q, $options: "i" } }];

  const [logs, total, entities] = await Promise.all([
    AuditLog.find(q).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    AuditLog.countDocuments(q),
    AuditLog.distinct("entity"),
  ]);

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Every grade edit, fee change, permission change and publish action." />
      <FilterBar
        filters={[
          { type: "search", key: "q", placeholder: "Actor or action…" },
          { type: "select", key: "entity", label: "Any entity", options: entities.map((e) => ({ value: e as string, label: e as string })) },
        ]}
      />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>When</TH>
            <TH>Actor</TH>
            <TH>Action</TH>
            <TH>Entity</TH>
            <TH>Change</TH>
          </TableHeadRow>
          <tbody>
            {logs.map((l) => (
              <TR key={String(l._id)}>
                <TD className="whitespace-nowrap text-muted">{formatDate(l.createdAt, "short")}</TD>
                <TD className="font-medium">{l.actorName}</TD>
                <TD className="text-muted">{l.action.replace(/\./g, " ")}</TD>
                <TD className="text-muted">{l.entity}{l.entityId ? ` · ${String(l.entityId).slice(-6)}` : ""}</TD>
                <TD className="max-w-xs truncate text-[11px] text-muted">
                  {l.before || l.after ? (
                    <span title={JSON.stringify({ before: l.before, after: l.after })}>
                      {l.after ? JSON.stringify(l.after).slice(0, 80) : ""}
                    </span>
                  ) : l.meta ? (
                    JSON.stringify(l.meta).slice(0, 80)
                  ) : (
                    "—"
                  )}
                </TD>
              </TR>
            ))}
            {logs.length === 0 && <TR><TD colSpan={5} className="text-muted">No matching entries.</TD></TR>}
          </tbody>
        </Table>
      </Panel>
      <Pagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / perPage))}
        makeHref={(p) => {
          const u = new URLSearchParams(sp as Record<string, string>);
          u.set("page", String(p));
          return `/admin/audit-log?${u.toString()}`;
        }}
      />
    </div>
  );
}
