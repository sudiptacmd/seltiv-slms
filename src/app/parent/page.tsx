import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, EmptyState, LinkButton } from "@/components/ui/primitives";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { resolveChild, parentDashboard } from "@/lib/parent";
import { taka, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ParentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const user = await requireRole("parent");
  const { child, children } = await resolveChild(user, (await searchParams).child);

  if (!child) {
    return (
      <div>
        <PageHeader title="Parent Portal" />
        <EmptyState
          title="No child linked to your account yet"
          hint="Link your child under 'My Children', or ask the school office to connect your number."
          action={<LinkButton href="/parent/children" variant="primary" size="sm">Link a child</LinkButton>}
        />
      </div>
    );
  }

  const data = await parentDashboard(user, child.id);
  if (!data) return <EmptyState title="Could not load your child's record" />;
  const { profile, nextDue, latestExam, unreadNotices } = data;
  const latestGpa = profile.termGpas[profile.termGpas.length - 1];

  return (
    <div>
      <PageHeader title={`${child.name.split(" ")[0]}'s overview`} subtitle="This month at a glance" />
      <ChildSwitcher children={children} activeId={child.id} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          value={profile.attendance.pct == null ? "—" : `${profile.attendance.pct}%`}
          label="Attendance"
          hint={`${profile.attendance.attended}/${profile.attendance.total} days`}
        />
        <StatTile
          value={nextDue ? taka(nextDue.netPayable - nextDue.paidAmount) : "৳0"}
          label="Next fee due"
          hint={nextDue ? formatDate(nextDue.dueDate, "short") : "All clear"}
          tone={profile.outstanding > 0 ? "danger" : nextDue ? "warn" : "ok"}
        />
        <StatTile value={unreadNotices} label="Notices" tone={unreadNotices ? "accent" : "ink"} />
        <StatTile
          value={latestGpa ? latestGpa.gpa.toFixed(2) : "—"}
          label={latestExam ? "Latest GPA" : "Exam results"}
          hint={latestExam?.name ?? "not published"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Quick actions" className="lg:col-span-1">
          <div className="flex flex-col gap-2">
            <LinkButton href="/parent/fees" variant="primary" size="sm" className="justify-start">Pay fees</LinkButton>
            <LinkButton href="/parent/child/gradesheet" variant="secondary" size="sm" className="justify-start">View gradesheet</LinkButton>
            <LinkButton href="/parent/child/attendance" variant="secondary" size="sm" className="justify-start">Attendance calendar</LinkButton>
            <LinkButton href="/parent/service-requests/new" variant="secondary" size="sm" className="justify-start">Request a certificate</LinkButton>
          </div>
        </Panel>

        <Panel title="Academic progress" className="lg:col-span-2" bodyClassName="p-0">
          {profile.termGpas.length === 0 ? (
            <p className="p-4 text-[13px] text-muted">No results published yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {profile.termGpas.map((t) => (
                <li key={t.exam} className="flex items-center justify-between px-4 py-2 text-[13px]">
                  <span>{t.exam}</span>
                  <span className="tabular-nums">
                    GPA {t.gpa.toFixed(2)} · {t.grade} · rank {t.sectionRank || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {nextDue && (
        <Panel title="Upcoming fee" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px]">
              <div className="font-medium">{nextDue.title}</div>
              <div className="text-muted">
                {taka(nextDue.netPayable - nextDue.paidAmount)} · due {formatDate(nextDue.dueDate, "short")}
              </div>
            </div>
            <Link
              href={`/parent/fees/pay/${nextDue._id}`}
              className="rounded bg-accent2 px-3.5 py-2 text-[13px] font-medium text-white hover:opacity-90"
            >
              Pay with bKash
            </Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
