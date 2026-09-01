import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Breadcrumbs, StatusBadge } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Exam, Section, Subject, MarkSubmission, Mark, Enrollment, Staff, SubjectAssignment } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { LockButton } from "./LockButton";

export const metadata: Metadata = { title: "Marks status" };

export default async function MarksStatusPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await connectDb();
  const exam = await Exam.findById(id).lean();
  if (!exam) notFound();
  const year = await getCurrentYear();

  const [sections, subjects, submissions, teachers, assignments] = await Promise.all([
    Section.find({ klass: { $in: exam.classes } }).populate("klass", "name order").lean(),
    Subject.find({ klass: { $in: exam.classes } }).sort({ order: 1 }).lean(),
    MarkSubmission.find({ exam: id }).lean(),
    Staff.find({ type: "teaching" }).lean(),
    SubjectAssignment.find({ year: year._id }).lean(),
  ]);
  const subMap = new Map(submissions.map((s) => [`${s.section}:${s.subject}`, s]));
  const teacherMap = new Map(teachers.map((t) => [String(t._id), t.name]));
  const asgMap = new Map(assignments.map((a) => [`${a.section}:${a.subject}`, String(a.teacher)]));

  const markCounts = await Mark.aggregate<{ _id: { section: string; subject: string }; n: number }>([
    { $match: { exam: exam._id } },
    { $group: { _id: { section: "$section", subject: "$subject" }, n: { $sum: 1 } } },
  ]);
  const mcMap = new Map(markCounts.map((m) => [`${m._id.section}:${m._id.subject}`, m.n]));
  const enrollCounts = await Enrollment.aggregate<{ _id: string; n: number }>([
    { $match: { year: year._id, status: "active", section: { $in: sections.map((s) => s._id) } } },
    { $group: { _id: "$section", n: { $sum: 1 } } },
  ]);
  const ecMap = new Map(enrollCounts.map((e) => [String(e._id), e.n]));

  const sortedSections = sections
    .map((s) => ({ s, k: s.klass as unknown as { name: string; order: number } }))
    .sort((a, b) => a.k.order - b.k.order || a.s.name.localeCompare(b.s.name));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Exams", href: "/admin/exams" }, { label: exam.name, href: "/admin/exams" }, { label: "Marks status" }]} />
      <PageHeader title={`Marks status — ${exam.name}`} subtitle="Which section–subject sheets are still open, submitted or locked." />

      <div className="space-y-4">
        {sortedSections.map(({ s, k }) => {
          const secSubjects = subjects.filter((subj) => String(subj.klass) === String(s.klass));
          const total = ecMap.get(String(s._id)) ?? 0;
          return (
            <Panel key={String(s._id)} title={`${k.name} ${s.name} · ${total} students`} bodyClassName="p-0">
              <Table>
                <TableHeadRow>
                  <TH>Subject</TH>
                  <TH>Teacher</TH>
                  <TH align="center">Entered</TH>
                  <TH>Status</TH>
                  <TH align="right"></TH>
                </TableHeadRow>
                <tbody>
                  {secSubjects.map((subj) => {
                    const sub = subMap.get(`${s._id}:${subj._id}`);
                    const entered = mcMap.get(`${s._id}:${subj._id}`) ?? 0;
                    const tId = asgMap.get(`${s._id}:${subj._id}`);
                    return (
                      <TR key={String(subj._id)}>
                        <TD>{subj.name}</TD>
                        <TD className="text-muted">{tId ? teacherMap.get(tId) ?? "—" : "unassigned"}</TD>
                        <TD align="center" className="tabular-nums">{entered}/{total}</TD>
                        <TD>
                          <StatusBadge status={sub?.locked ? "locked" : sub?.submitted ? "submitted" : "draft"} />
                        </TD>
                        <TD align="right">
                          {sub && sub.submitted && <LockButton id={String(sub._id)} locked={Boolean(sub.locked)} />}
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
