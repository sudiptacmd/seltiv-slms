import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { ImportPanel } from "@/components/ImportPanel";

export const metadata: Metadata = { title: "Import staff" };

export default async function ImportStaffPage() {
  await requireRole("admin");
  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ label: "Staff", href: "/admin/staff" }, { label: "Import" }]} />
      <PageHeader title="Import staff" subtitle="Bulk-add staff from a spreadsheet." />
      <ImportPanel kind="staff" />
    </div>
  );
}
