import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { FeeHead, FeePlan, ClassModel, Discount, Student } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { taka } from "@/lib/utils";
import { FeeHeadForm, FeePlanEditor } from "./forms";

export const metadata: Metadata = { title: "Fee Structure" };

export default async function FeeStructurePage() {
  await requireRole("admin");
  await connectDb();
  const year = await getCurrentYear();
  const [heads, plans, classes, discounts] = await Promise.all([
    FeeHead.find().sort({ order: 1 }).lean(),
    FeePlan.find({ year: year._id }).lean(),
    ClassModel.find().sort({ order: 1 }).lean(),
    Discount.find({ year: year._id, active: true }).populate("student", "name studentCode").lean(),
  ]);
  const planByClass = new Map(plans.map((p) => [String(p.klass), p]));

  return (
    <div>
      <PageHeader title="Fee Structure" subtitle={`Fee heads, per-class plans and student discounts for ${year.name}.`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Fee heads" className="lg:col-span-1" bodyClassName="p-0">
          <Table>
            <TableHeadRow><TH>Name</TH><TH>Code</TH><TH></TH></TableHeadRow>
            <tbody>
              {heads.map((h) => (
                <TR key={String(h._id)}>
                  <TD>{h.name}</TD>
                  <TD className="text-muted">{h.code}</TD>
                  <TD>{h.recurring && <span className="text-[11px] text-muted">monthly</span>}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <div className="border-t border-line p-3"><FeeHeadForm /></div>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          {classes.map((c) => {
            const plan = planByClass.get(String(c._id));
            return (
              <Panel key={String(c._id)} title={`${c.name} — plan`}>
                <FeePlanEditor
                  classId={String(c._id)}
                  className={c.name}
                  heads={heads.filter((h) => h.recurring).map((h) => ({ id: String(h._id), name: h.name }))}
                  plan={
                    plan
                      ? {
                          items: plan.items.map((it) => ({ headId: String(it.head), amount: it.amount })),
                          instalments: plan.instalments,
                          lateFeeRule: plan.lateFeeRule,
                          lateFeeValue: plan.lateFeeValue,
                          graceDays: plan.graceDays,
                          dueDayOfMonth: plan.dueDayOfMonth,
                        }
                      : null
                  }
                />
              </Panel>
            );
          })}
        </div>
      </div>

      <Panel title="Active discounts & waivers" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeadRow><TH>Student</TH><TH>Label</TH><TH align="right">Value</TH></TableHeadRow>
          <tbody>
            {discounts.map((d) => (
              <TR key={String(d._id)}>
                <TD>{(d.student as unknown as { name: string })?.name}</TD>
                <TD>{d.label}</TD>
                <TD align="right">{d.kind === "percent" ? `${d.value}%` : taka(d.value)}</TD>
              </TR>
            ))}
            {discounts.length === 0 && <TR><TD colSpan={3} className="text-muted">No discounts. Add one from a student&apos;s profile.</TD></TR>}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}

void Student;
