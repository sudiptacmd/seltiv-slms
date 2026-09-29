import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { connectDb } from "@/lib/db";
import { getCurrentYear } from "@/lib/queries";
import { MarkingStructure } from "@/models/marking-structure";
import { ClassModel, Subject } from "@/models";
import { PageHeader, Panel, LinkButton, Tag } from "@/components/ui/primitives";
import { COMPONENT_LABELS, PERIOD_LABELS } from "@/lib/ai/grading";
export const metadata: Metadata = { title: "Marking structures" };
export default async function MarkingPage() {
  await requireRole("admin"); await connectDb();
  const year = await getCurrentYear();
  const [structures, classes, subjects] = await Promise.all([
    MarkingStructure.find({ year: year._id }).sort({ updatedAt: -1 }).lean(), ClassModel.find().lean(), Subject.find().lean(),
  ]);
  return <div><PageHeader title="Marking structures" subtitle={`Approved component allocations · Academic year ${year.name}`} actions={<LinkButton href="/admin/ai" variant="primary" size="sm">Update with Seltiv AI</LinkButton>} />
    <p className="mb-4 text-[13px] text-muted">Choose an assessment type when scheduling an exam to use these allocations. Existing mark sheets keep the structure in use when marks were first saved.</p>
    <div className="space-y-4">{structures.map(s => <Panel key={s._id} title={`${subjects.find(x => String(x._id) === String(s.subject))?.name} · ${classes.find(x => String(x._id) === String(s.klass))?.name}`} action={<Tag tone="ok">Applied · Revision {s.version}</Tag>}>
      <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted"><th className="py-2 pr-4">Assessment</th><th className="py-2 pr-4">Marking components</th><th className="py-2">Total</th></tr></thead><tbody>{s.allocations.map(a => <tr key={a.period} className="border-b border-line"><td className="py-4 pr-4 font-medium">{PERIOD_LABELS[a.period]}</td><td className="py-4 pr-4">{a.components.map(c => `${COMPONENT_LABELS[c.key]} ${c.marks}`).join(" · ")}</td><td className="py-4 tabular-nums">{a.total}</td></tr>)}</tbody></table></div>
      <details className="mt-4 text-[12px] text-muted"><summary className="cursor-pointer">Approval history ({s.history.length})</summary><ul className="mt-3 space-y-2">{s.history.toReversed().map(h => <li key={h.proposalId} className="border-t border-line pt-2"><strong>{h.actorName}</strong> · {new Date(h.approvedAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}<div className="mt-1">{h.after.map(a => `${PERIOD_LABELS[a.period]}: ${a.components.map(c => `${COMPONENT_LABELS[c.key]} ${c.marks}`).join(", ")}`).join("; ")}</div></li>)}</ul></details>
    </Panel>)}{!structures.length && <Panel><p className="text-[13px] text-muted">No component marking structures yet. Prepare a change in Seltiv AI to get started.</p></Panel>}</div>
  </div>;
}
