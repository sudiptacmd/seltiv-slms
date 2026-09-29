import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { getNotPromoted } from "@/lib/promotion";
import { PendingList } from "./PendingList";

export const metadata: Metadata = { title: "Not promoted yet" };

export default async function PendingPage() {
  await requireRole("admin");
  const data = await getNotPromoted();
  return (
    <div>
      <Breadcrumbs items={[{ label: "Students", href: "/admin/students" }, { label: "Promotion", href: "/admin/students/promote" }, { label: "Not promoted yet" }]} />
      <PageHeader
        title="Not promoted yet"
        subtitle={data ? `Students without a seat in ${data.nextYearName}. Promote each one when ready, or keep them in their class.` : undefined}
      />
      <Panel bodyClassName="p-0">
        {!data ? (
          <EmptyState title="Next academic year not created" hint="Return to Promotion to create it." />
        ) : data.students.length === 0 ? (
          <EmptyState title="Everyone has a seat" hint={`All students are placed for ${data.nextYearName}.`} />
        ) : (
          <PendingList data={data} />
        )}
      </Panel>
    </div>
  );
}
