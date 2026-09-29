import "server-only";
import { MarkingStructure } from "@/models/marking-structure";
import type { IExam, IExamSubject } from "@/models/exam";
import type { Component } from "@/lib/ai/grading";

/** An exam subject freezes its allocation on the first save of marks. Later policy updates affect unstarted mark sheets only. */
export async function effectiveMarking(exam: Pick<IExam, "year" | "markingPeriod">, es: Pick<IExamSubject, "subject" | "fullMarks" | "markingComponents" | "markingVersion">) {
  if (es.markingVersion != null) return { fullMarks: es.fullMarks, components: es.markingComponents ?? [], version: es.markingVersion };
  if (!exam.markingPeriod) return { fullMarks: es.fullMarks, components: [] as Component[], version: 0 };
  const policy = await MarkingStructure.findById(`${exam.year}:${es.subject}`).lean();
  const allocation = policy?.allocations.find(a => a.period === exam.markingPeriod);
  return allocation ? { fullMarks: allocation.total, components: allocation.components, version: policy!.version }
    : { fullMarks: es.fullMarks, components: [] as Component[], version: 0 };
}
