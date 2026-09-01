import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { ClassModel, Section, Subject, Staff, SubjectAssignment } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { AssignmentsEditor } from "./AssignmentsEditor";

export const metadata: Metadata = { title: "Teacher Assignments" };

export default async function AssignmentsPage() {
  await requireRole("admin");
  await connectDb();
  const year = await getCurrentYear();
  const [classes, sections, subjects, teachers, assignments] = await Promise.all([
    ClassModel.find().sort({ order: 1 }).lean(),
    Section.find().populate("classTeacher", "name").lean(),
    Subject.find().sort({ order: 1 }).lean(),
    Staff.find({ type: "teaching", active: true }).sort({ name: 1 }).lean(),
    SubjectAssignment.find({ year: year._id }).lean(),
  ]);

  const asgMap = new Map(assignments.map((a) => [`${a.section}:${a.subject}`, String(a.teacher)]));

  return (
    <div>
      <PageHeader title="Teacher Assignments" subtitle="Class teacher per section and a subject teacher for each section–subject." />
      <div className="space-y-4">
        {sections
          .map((s) => ({ s, k: classes.find((c) => String(c._id) === String(s.klass)) }))
          .filter((x) => x.k)
          .sort((a, b) => (a.k!.order - b.k!.order) || a.s.name.localeCompare(b.s.name))
          .map(({ s, k }) => (
            <Panel key={String(s._id)} title={`${k!.name} ${s.name}`}>
              <AssignmentsEditor
                sectionId={String(s._id)}
                classTeacherId={s.classTeacher ? String((s.classTeacher as unknown as { _id: unknown })._id) : ""}
                subjects={subjects
                  .filter((subj) => String(subj.klass) === String(s.klass))
                  .map((subj) => ({
                    id: String(subj._id),
                    name: subj.name,
                    teacherId: asgMap.get(`${s._id}:${subj._id}`) ?? "",
                  }))}
                teachers={teachers.map((t) => ({ id: String(t._id), name: t.name }))}
              />
            </Panel>
          ))}
      </div>
    </div>
  );
}
