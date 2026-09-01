import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { Student, Enrollment } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { classSectionOptions } from "@/lib/students";
import { ComposeNotice } from "./ComposeNotice";

export const metadata: Metadata = { title: "New notice" };

export default async function NewNoticePage() {
  await requireRole("admin");
  await connectDb();
  const year = await getCurrentYear();
  const [{ classes, sections }, enrs] = await Promise.all([
    classSectionOptions(),
    Enrollment.find({ year: year._id, status: "active" }).select("student").lean(),
  ]);
  const students = await Student.find({ _id: { $in: enrs.map((e) => e.student) } }).select("name").sort({ name: 1 }).lean();

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: "Notices", href: "/admin/notices" }, { label: "New" }]} />
      <PageHeader title="New notice" />
      <ComposeNotice
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        sections={sections.map((s) => ({ id: s.id, name: s.name }))}
        students={students.map((s) => ({ id: String(s._id), name: s.name }))}
      />
    </div>
  );
}
