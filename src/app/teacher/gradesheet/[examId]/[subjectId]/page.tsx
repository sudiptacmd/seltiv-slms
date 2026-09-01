import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { Exam, ExamSubject, Subject, Section, Mark, MarkSubmission } from "@/models";
import { sectionRoster } from "@/lib/teacher";
import { MarksGrid } from "./MarksGrid";

export const metadata: Metadata = { title: "Enter marks" };

export default async function MarksEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string; subjectId: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  await requireRole("teacher");
  const { examId, subjectId } = await params;
  const { section: sectionId } = await searchParams;
  if (!sectionId) notFound();

  await connectDb();
  const [exam, subject, section, es] = await Promise.all([
    Exam.findById(examId).lean(),
    Subject.findById(subjectId).lean(),
    Section.findById(sectionId).populate("klass", "name").lean(),
    ExamSubject.findOne({ exam: examId, subject: subjectId }).lean(),
  ]);
  if (!exam || !subject || !section) notFound();

  const roster = await sectionRoster(sectionId);
  const marks = await Mark.find({ exam: examId, subject: subjectId, student: { $in: roster.map((r) => r.student._id) } }).lean();
  const markMap = new Map(marks.map((m) => [String(m.student), m]));
  const submission = await MarkSubmission.findOne({ exam: examId, section: sectionId, subject: subjectId }).lean();
  const k = section.klass as unknown as { name: string };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Gradesheet", href: "/teacher/gradesheet" },
          { label: `${exam.name} · ${k.name} ${section.name} · ${subject.name}` },
        ]}
      />
      <PageHeader title={`${subject.name} — ${k.name} ${section.name}`} subtitle={exam.name} />
      <div className="max-w-2xl">
        <MarksGrid
          examId={examId}
          sectionId={sectionId}
          subjectId={subjectId}
          fullMarks={es?.fullMarks ?? subject.fullMarks}
          passMarks={es?.passMarks ?? subject.passMarks}
          locked={Boolean(submission?.locked) || exam.resultPublished}
          submitted={Boolean(submission?.submitted)}
          rows={roster.map((r) => {
            const m = markMap.get(String(r.student._id));
            return {
              studentId: String(r.student._id),
              name: r.student.name,
              roll: r.roll,
              obtained: m?.obtained ?? null,
              absent: Boolean(m?.absent),
            };
          })}
        />
      </div>
    </div>
  );
}
