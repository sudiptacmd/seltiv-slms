"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Panel, Tag } from "@/components/ui/primitives";
import { Input, Select, Checkbox, FormMessage } from "@/components/ui/form";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { confirmPromotion } from "@/lib/actions/promotion";
import type { ActionState } from "@/lib/actions/_common";
import type { PromotionPlan } from "@/lib/promotion";

type Sec = { key: string; id?: string; name: string; capacity: number; placed: number };
type Row = PromotionPlan["candidates"][number] & { include: boolean; sectionKey: string };

export function PromotionPlanner({ plan }: { plan: PromotionPlan }) {
  const router = useRouter();
  const [sections, setSections] = useState<Sec[]>(plan.sections.map((s) => ({ ...s, key: s.id, id: s.id })));
  const [rows, setRows] = useState<Row[]>(plan.candidates.map((c) => ({ ...c, include: !c.result?.failed, sectionKey: "" })));
  const [allSize, setAllSize] = useState("");
  const [res, setRes] = useState<ActionState>();
  const [saving, start] = useTransition();

  const included = rows.filter((r) => r.include);
  const placedCount = included.filter((r) => r.sectionKey).length;
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of included) if (r.sectionKey) m.set(r.sectionKey, (m.get(r.sectionKey) ?? 0) + 1);
    return m;
  }, [included]);
  const seatsLeft = sections.reduce((n, s) => n + Math.max(0, s.capacity - s.placed), 0);

  const setSection = (key: string, patch: Partial<Sec>) => setSections((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const addSection = () =>
    setSections((all) => {
      const last = all[all.length - 1];
      const letter = last ? String.fromCharCode(last.name.toUpperCase().charCodeAt(0) + 1) : "A";
      return [...all, { key: `new-${all.length}`, name: letter, capacity: last?.capacity ?? 40, placed: 0 }];
    });
  const applyAll = () => {
    const n = Math.floor(Number(allSize));
    if (n > 0) setSections((all) => all.map((s) => ({ ...s, capacity: n })));
  };
  const distribute = () =>
    setRows((all) => {
      const room = new Map(sections.map((s) => [s.key, Math.max(0, s.capacity - s.placed)]));
      let i = 0;
      return all.map((r) => {
        if (!r.include) return { ...r, sectionKey: "" };
        while (i < sections.length && (room.get(sections[i].key) ?? 0) <= 0) i++;
        if (i >= sections.length) return { ...r, sectionKey: "" };
        room.set(sections[i].key, room.get(sections[i].key)! - 1);
        return { ...r, sectionKey: sections[i].key };
      });
    });
  const patchRow = (key: string, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const overfull = sections.filter((s) => s.placed + (counts.get(s.key) ?? 0) > s.capacity);
  const unplaced = included.length - placedCount;
  const canConfirm = included.length > 0 && unplaced === 0 && overfull.length === 0 && !saving;

  const confirm = () =>
    start(async () => {
      const r = await confirmPromotion({
        classId: plan.target.id,
        sections: sections.map((s) => ({ key: s.key, id: s.id, name: s.name, capacity: s.capacity })),
        rows: included.map((x) => ({ kind: x.kind, id: x.id, sectionKey: x.sectionKey })),
      });
      setRes(r);
      if (r.ok) router.push("/admin/students/promote");
    });

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <Panel
        title={`Students · ${included.length} of ${rows.length} ticked`}
        bodyClassName="p-0"
        action={unplaced > 0 && included.length > 0 ? <Tag tone="warn">{unplaced} without a section</Tag> : <Tag tone="ok">{placedCount} placed</Tag>}
      >
        <Table>
          <TableHeadRow>
            <TH className="w-10" />
            <TH>Student</TH>
            <TH>Coming from</TH>
            <TH>Last result</TH>
            <TH>Section</TH>
          </TableHeadRow>
          <tbody>
            {rows.map((r) => (
              <TR key={r.key} className={r.include ? "" : "bg-panel/60 text-muted"}>
                <TD>
                  <Checkbox
                    aria-label={`Promote ${r.name}`}
                    checked={r.include}
                    onChange={(e) => patchRow(r.key, { include: e.target.checked, sectionKey: "" })}
                  />
                </TD>
                <TD>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-[11px] text-muted">{r.code}</div>
                </TD>
                <TD>{r.kind === "applicant" ? <Tag tone="accent2">New admission</Tag> : r.from}</TD>
                <TD>
                  {r.result ? (
                    r.result.failed ? <Tag tone="danger">Failed</Tag> : <Tag tone="ok">Passed · GPA {r.result.gpa.toFixed(2)}</Tag>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </TD>
                <TD>
                  {r.include ? (
                    <Select
                      aria-label={`Section for ${r.name}`}
                      value={r.sectionKey}
                      onChange={(e) => patchRow(r.key, { sectionKey: e.target.value })}
                      className="h-8 w-28"
                    >
                      <option value="">—</option>
                      {sections.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                    </Select>
                  ) : (
                    <span className="text-[12px]">Stays for now</span>
                  )}
                </TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR><TD colSpan={5} className="py-10 text-center text-muted">Nobody is waiting for {plan.target.name}.</TD></TR>
            )}
          </tbody>
        </Table>
      </Panel>

      <div className="space-y-4 lg:sticky lg:top-4">
        <Panel title={`Sections in ${plan.nextYearName}`}>
          <div className="mb-3 flex items-end gap-2">
            <label className="flex-1 text-[12px] font-medium text-muted">
              Students per section
              <Input
                type="number"
                min={1}
                className="mt-1 h-8"
                placeholder="e.g. 10"
                value={allSize}
                onChange={(e) => setAllSize(e.target.value)}
              />
            </label>
            <Button size="sm" onClick={applyAll} disabled={!Number(allSize)}>Apply to all</Button>
          </div>

          <div className="divide-y divide-line rounded border border-line">
            {sections.map((s) => {
              const n = counts.get(s.key) ?? 0;
              const over = s.placed + n > s.capacity;
              return (
                <div key={s.key} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                  {s.id ? (
                    <span className="w-14 font-medium">{plan.target.name.replace("Class ", "")}-{s.name}</span>
                  ) : (
                    <Input
                      aria-label="New section name"
                      value={s.name}
                      maxLength={3}
                      onChange={(e) => setSection(s.key, { name: e.target.value })}
                      className="h-8 w-14 px-2"
                    />
                  )}
                  <Input
                    aria-label={`Size of section ${s.name}`}
                    type="number"
                    min={1}
                    value={s.capacity || ""}
                    onChange={(e) => setSection(s.key, { capacity: Math.floor(Number(e.target.value)) || 0 })}
                    className="h-8 w-16 px-2"
                  />
                  <span className={over ? "ml-auto text-danger" : "ml-auto text-muted"}>
                    {s.placed + n}/{s.capacity}
                  </span>
                  {!s.id && <Tag tone="accent">New</Tag>}
                </div>
              );
            })}
            {sections.length === 0 && <div className="px-3 py-3 text-[12px] text-muted">No sections yet — add one.</div>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={addSection}>+ Add section</Button>
            <Button size="sm" variant="primary" onClick={distribute} disabled={included.length === 0}>Fill sections in order</Button>
          </div>
          {included.length > seatsLeft && (
            <p className="mt-3 rounded bg-warn-bg px-3 py-2 text-[12px] text-warn">
              {included.length} students but only {seatsLeft} seats — add a section or raise the sizes.
            </p>
          )}
        </Panel>

        <Panel>
          <FormMessage result={res} />
          <Button variant="primary" className="w-full" disabled={!canConfirm} onClick={confirm}>
            {saving ? "Working…" : `Promote ${included.length} students to ${plan.target.name}`}
          </Button>
          <p className="mt-2 text-[11px] text-muted">
            Unticked students stay in {plan.fromName ?? "their class"} and appear under “Not promoted yet” for later.
          </p>
        </Panel>
      </div>
    </div>
  );
}
