import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { StaffForm } from "../StaffForm";

export const metadata: Metadata = { title: "Add staff" };

export default async function NewStaffPage() {
  await requireRole("admin");
  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ label: "Staff", href: "/admin/staff" }, { label: "Add staff" }]} />
      <PageHeader title="Add staff" />
      <StaffForm />
    </div>
  );
}
