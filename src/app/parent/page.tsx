import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, EmptyState, LinkButton, Tag } from "@/components/ui/primitives";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { resolveChild, parentDashboard } from "@/lib/parent";
import { taka, formatDate } from "@/lib/utils";
import { connectDb } from "@/lib/db";
import { Result, Subject } from "@/models";

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
  await connectDb();
  const results = await Result.find({ student: child.id })
    .populate("exam", "name resultPublished")
    .sort({ createdAt: 1 })
    .lean();
  const publishedResults = results.filter((r) => (r.exam as unknown as { resultPublished?: boolean })?.resultPublished);
  const subjectIds = Array.from(new Set(publishedResults.flatMap((r) => r.subjects.filter((s) => s.subject).map((s) => String(s.subject)))));
  const subjectMap = new Map((await Subject.find({ _id: { $in: subjectIds } }).sort({ order: 1 }).lean()).map((s) => [String(s._id), s]));
  const progressRows = subjectIds.map((subjectId) => {
    const subject = subjectMap.get(subjectId);
    const scores = publishedResults.map((r) => {
      // A subject may be printed as several papers (Bangla 1st/2nd) — combine them.
      const lines = r.subjects.filter((s) => String(s.subject) === subjectId && s.obtained != null);
      const full = lines.reduce((t, l) => t + l.fullMarks, 0);
      return full ? Math.round((lines.reduce((t, l) => t + l.obtained!, 0) / full) * 100) : null;
    });
    const valid = scores.filter((s): s is number => s != null);
    return { subjectId, name: subject?.name ?? "Subject", scores, change: valid.length > 1 ? valid.at(-1)! - valid.at(-2)! : 0 };
  });

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

      <Panel
        title="Subject-wise progress — all assessments"
        className="mt-4"
        action={<Tag tone="ok">Live academic record</Tag>}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-[.04em] text-muted">
                <th className="px-4 py-2.5">Subject</th>
                {publishedResults.map((r) => <th key={String(r._id)} className="px-3 py-2.5 text-center">{(r.exam as unknown as { name: string }).name.replace(" Examination 2026", "")}</th>)}
                <th className="px-4 py-2.5">Progress</th>
              </tr>
            </thead>
            <tbody>
              {progressRows.map((row) => {
                const latest = row.scores.filter((s): s is number => s != null).at(-1) ?? 0;
                return (
                  <tr key={row.subjectId} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-medium">{row.name}</td>
                    {row.scores.map((score, i) => <td key={i} className="px-3 py-2.5 text-center tabular-nums">{score == null ? "—" : `${score}%`}</td>)}
                    <td className="min-w-44 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel"><div className="h-full rounded-full bg-accent" style={{ width: `${latest}%` }} /></div>
                        <span className={row.change >= 0 ? "text-ok" : "text-danger"}>{row.change >= 0 ? "+" : ""}{row.change}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel/50 px-4 py-3 text-[12px] text-muted">
          <span>Attendance: <strong className="text-ink">{profile.attendance.pct ?? "—"}%</strong> · {profile.attendance.present} present · {profile.attendance.late} late · {profile.attendance.absent} absent</span>
          <div className="flex gap-3"><Link href="/parent/child/attendance" className="text-accent-700 hover:underline">Attendance calendar →</Link><Link href="/parent/child/gradesheet" className="text-accent-700 hover:underline">Full gradesheets →</Link></div>
        </div>
      </Panel>

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
