import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { Student } from "@/models";
import { classSectionOptions } from "@/lib/students";
import { formatDate } from "@/lib/utils";
import { StudentForm } from "../../StudentForm";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDb();
  const s = await Student.findById(id).lean();
  if (!s) notFound();
  const { sections } = await classSectionOptions();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Students", href: "/admin/students" }, { label: s.name, href: `/admin/students/${id}` }, { label: "Edit" }]} />
      <PageHeader title={`Edit — ${s.name}`} />
      <div className="max-w-3xl">
        <StudentForm
          sections={sections}
          draft={{
            id,
            name: s.name,
            gender: s.gender,
            dateOfBirth: s.dateOfBirth ? formatDate(s.dateOfBirth, "iso") : undefined,
            bloodGroup: s.bloodGroup,
            religion: s.religion,
            address: s.address,
            birthCertNo: s.birthCertNo,
            photoUrl: s.photoUrl,
            medicalNotes: s.medicalNotes,
          }}
        />
      </div>
    </div>
  );
}
