import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState, StatTile, LinkButton, Tag } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { getPromotionOverview } from "@/lib/promotion";
import { CreateYearButton } from "./CreateYearButton";

export const metadata: Metadata = { title: "Promotion" };

export default async function PromotePage() {
  await requireRole("admin");
  const o = await getPromotionOverview();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Students", href: "/admin/students" }, { label: "Promotion" }]} />
      <PageHeader
        title="Year-end promotion"
        subtitle={
          o.nextYear
            ? `Move ${o.currentYear.name} students and the new admissions into ${o.nextYear.name} — one class at a time.`
            : "Promote students into next year's classes and seat the new admissions."
        }
      />
      {!o.nextYear ? (
        <Panel>
          <EmptyState
            title={`${o.currentYear.name} is the latest academic year`}
            hint="Open the next year first. Promotion places students into it; the current year stays untouched until you switch."
            action={<CreateYearButton />}
          />
        </Panel>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile value={o.rows.reduce((n, r) => n + r.eligible, 0)} label="Ready to promote" hint="Passed, no seat yet" tone="accent" />
            <StatTile value={o.rows.reduce((n, r) => n + r.failed, 0)} label="Need review" hint="Failed the last exam" tone="warn" />
            <StatTile value={o.rows.reduce((n, r) => n + r.newcomers, 0)} label="New admissions" hint="Offered a seat" tone="accent" />
            <StatTile value={o.promotedSoFar} label={`Seated for ${o.nextYear.name}`} tone="ok" />
          </div>

          <Panel title={`${o.nextYear.name} classes`} bodyClassName="p-0">
            <Table>
              <TableHeadRow>
                <TH>Class in {o.nextYear.name}</TH>
                <TH>Coming from</TH>
                <TH align="right">Promoting</TH>
                <TH align="right">New</TH>
                <TH>Sections</TH>
                <TH align="right">Seated</TH>
                <TH />
              </TableHeadRow>
              <tbody>
                {o.rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="text-muted">{r.fromName ?? "New intake only"}</TD>
                    <TD align="right">
                      {r.eligible}
                      {r.failed > 0 && <span className="ml-1 text-warn">+{r.failed}</span>}
                    </TD>
                    <TD align="right">{r.newcomers}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {r.sections.map((s) => (
                          <Tag key={s.name}>{s.name} · {s.placed}/{s.capacity}</Tag>
                        ))}
                      </div>
                    </TD>
                    <TD align="right">{r.placed > 0 ? <Tag tone="ok">{r.placed}</Tag> : <span className="text-muted">—</span>}</TD>
                    <TD align="right">
                      {r.eligible + r.failed + r.newcomers > 0 ? (
                        <LinkButton href={`/admin/students/promote/${r.id}`} size="sm" variant="primary">Plan {r.name}</LinkButton>
                      ) : (
                        <span className="text-[12px] text-muted">Nothing waiting</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Panel>

          <Panel
            className="mt-5"
            title="Not promoted yet"
            action={<LinkButton href="/admin/students/promote/pending" size="sm">Promote manually</LinkButton>}
          >
            <p className="text-[13px] text-muted">
              <span className="font-serif text-[20px] text-ink">{o.notPromoted}</span> students were left out of a class plan and have no seat in {o.nextYear.name} yet.
              They wait here — promote them one by one whenever their result is settled.
              {o.graduating > 0 && ` ${o.graduating} in ${o.topName} are graduating.`}
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}
