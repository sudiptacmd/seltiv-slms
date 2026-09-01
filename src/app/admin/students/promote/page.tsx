import type { Metadata } from "next";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Promotion" };

export default function PromotePage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Students", href: "/admin/students" }, { label: "Promotion" }]} />
      <PageHeader title="Year-end promotion" subtitle="Promote or retain a whole section into next year's class." />
      <Panel>
        <EmptyState
          title="Available once the next academic year is created"
          hint="Create the 2027 year under Academics → Years, then return here to run promotion section by section."
        />
      </Panel>
    </div>
  );
}
