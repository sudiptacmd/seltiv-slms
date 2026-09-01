import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { GradingScale } from "@/models";
import { DEFAULT_GRADE_BANDS } from "@/lib/academic";
import { GradingScaleForm } from "./GradingScaleForm";

export const metadata: Metadata = { title: "Grading Scale" };

export default async function GradingScalePage() {
  await requireRole("admin");
  await connectDb();
  const scale = await GradingScale.findOne({ isDefault: true }).lean();
  const bands = scale?.bands?.length ? scale.bands : DEFAULT_GRADE_BANDS;

  return (
    <div className="max-w-xl">
      <PageHeader title="Grading Scale" subtitle="Percentage boundaries → letter grade and grade point. Used everywhere results are computed." />
      <Panel>
        <GradingScaleForm
          bands={bands.map((b) => ({ grade: b.grade, minPercent: b.minPercent, gpa: b.gpa }))}
          failGrade={scale?.failGrade ?? "F"}
        />
      </Panel>
    </div>
  );
}
