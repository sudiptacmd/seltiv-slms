import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { getPromotionPlan } from "@/lib/promotion";
import { PromotionPlanner } from "./PromotionPlanner";

export const metadata: Metadata = { title: "Plan promotion" };

export default async function PlanPage({ params }: { params: Promise<{ classId: string }> }) {
  await requireRole("admin");
  const { classId } = await params;
  const plan = await getPromotionPlan(classId).catch(() => null);
  if (!plan) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Students", href: "/admin/students" }, { label: "Promotion", href: "/admin/students/promote" }, { label: plan.target.name }]} />
      <PageHeader
        title={`${plan.target.name} · ${plan.nextYearName}`}
        subtitle={`${plan.fromName ? `Students from ${plan.fromName} (${plan.currentYearName})` : "New admissions"}${plan.fromName ? " and new admissions" : ""} — set the size of each section, add sections if you need them, then place everyone.`}
      />
      <PromotionPlanner plan={plan} />
    </div>
  );
}
