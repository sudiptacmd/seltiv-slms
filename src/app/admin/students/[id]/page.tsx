import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudentProfile } from "@/lib/students";
import { StudentProfileView } from "@/components/StudentProfileView";
import { Breadcrumbs } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/primitives";
import { StudentActions } from "./StudentActions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getStudentProfile(id);
  return { title: p ? p.student.name : "Student" };
}

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getStudentProfile(id);
  if (!profile) notFound();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Breadcrumbs items={[{ label: "Students", href: "/admin/students" }, { label: profile.student.name }]} />
        <div className="flex gap-2">
          <a
            href={`/print/report_card/${id}`}
            target="_blank"
            className="rounded border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-medium hover:bg-panel"
          >
            Download Report
          </a>
          <LinkButton href={`/admin/students/${id}/edit`} variant="secondary" size="sm">Edit</LinkButton>
        </div>
      </div>

      <StudentProfileView profile={profile} variant="admin" />

      <div className="mt-4">
        <StudentActions
          studentId={id}
          studentName={profile.student.name}
          status={profile.student.status}
          currentSectionId={profile.enrollment ? String(profile.enrollment.section && (profile.enrollment.section as unknown as { _id: unknown })._id) : null}
        />
      </div>
    </div>
  );
}
