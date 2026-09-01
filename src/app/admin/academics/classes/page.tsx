import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { ClassModel, Section, Staff, Enrollment } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { ClassesEditor } from "./ClassesEditor";

export const metadata: Metadata = { title: "Classes & Sections" };

export default async function ClassesPage() {
  await requireRole("admin");
  await connectDb();
  const year = await getCurrentYear();
  const [classes, sections, teachers, enrollCounts] = await Promise.all([
    ClassModel.find().sort({ order: 1 }).lean(),
    Section.find().populate("classTeacher", "name").lean(),
    Staff.find({ type: "teaching", active: true }).sort({ name: 1 }).lean(),
    Enrollment.aggregate<{ _id: string; n: number }>([
      { $match: { year: year._id, status: "active" } },
      { $group: { _id: "$section", n: { $sum: 1 } } },
    ]),
  ]);
  const countMap = new Map(enrollCounts.map((c) => [String(c._id), c.n]));

  return (
    <div>
      <PageHeader title="Classes & Sections" subtitle="Define the classes this school runs and their sections." />
      <Panel bodyClassName="p-0">
        <ClassesEditor
          classes={classes.map((c) => ({ id: String(c._id), name: c.name, numeric: c.numeric }))}
          sections={sections.map((s) => ({
            id: String(s._id),
            classId: String(s.klass),
            name: s.name,
            capacity: s.capacity,
            room: s.room,
            classTeacher: (s.classTeacher as unknown as { name: string })?.name,
            enrolled: countMap.get(String(s._id)) ?? 0,
          }))}
          teachers={teachers.map((t) => ({ id: String(t._id), name: t.name }))}
        />
      </Panel>
    </div>
  );
}
