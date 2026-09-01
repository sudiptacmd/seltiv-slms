import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { classSectionOptions } from "@/lib/students";
import { StudentForm } from "../StudentForm";

export const metadata: Metadata = { title: "Add student" };

export default async function NewStudentPage() {
  const { sections } = await classSectionOptions();
  return (
    <div>
      <Breadcrumbs items={[{ label: "Students", href: "/admin/students" }, { label: "Add student" }]} />
      <PageHeader title="Add student" subtitle="Manual enrolment. For applicants, enrol from the admissions pipeline instead." />
      <div className="max-w-3xl">
        <StudentForm sections={sections} />
      </div>
    </div>
  );
}
