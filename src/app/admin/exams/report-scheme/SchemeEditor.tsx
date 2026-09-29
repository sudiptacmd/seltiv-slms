"use client";

import { useActionState, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveReportScheme } from "@/lib/actions/grading";
import type { ActionState } from "@/lib/actions/_common";
import { CONTINUOUS_FIELDS, EXTRA_FIELDS, FIELD_LABELS, SUMMATIVE_FIELDS, rowFullMarks, type FieldKey, type SchemeRow } from "@/lib/report-card";

const num = "h-8 w-14 rounded border border-line-strong px-1 text-center tabular-nums";

export function SchemeEditor({ klassId, initial, subjects }: { klassId: string; initial: SchemeRow[]; subjects: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveReportScheme, {});
  useActionEffect(state);
  const [rows, setRows] = useState<SchemeRow[]>(initial);
  const update = (i: number, patch: Partial<SchemeRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setMax = (i: number, f: FieldKey, v: string) => update(i, { max: { ...rows[i].max, [f]: v === "" ? 0 : Number(v) } });
  const move = (i: number, d: number) => setRows((r) => { const n = r.slice(); [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const add = (kind: SchemeRow["kind"]) => {
    let k = 1; while (rows.some((r) => r.key === `row${k}`)) k++;
    setRows((r) => [...r, kind === "extra"
      ? { key: `row${k}`, label: "", kind, max: { cw: 20, project: 10, ct: 20 }, summativePct: 100, continuousPct: 100 }
      : { key: `row${k}`, label: "", kind, max: { written: 70, objective: 30, oral: 20, attendance: 5, assignment: 10, ct: 10, diary: 5 }, summativePct: 70, continuousPct: 60 }]);
  };
  const th = "px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted";
  const main = rows.map((r, i) => [r, i] as const).filter(([r]) => r.kind === "main");
  const extra = rows.map((r, i) => [r, i] as const).filter(([r]) => r.kind === "extra");

  const common = (r: SchemeRow, i: number) => (
    <>
      <td className="px-1 py-1 whitespace-nowrap">
        <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="px-1 text-muted disabled:opacity-30" aria-label="Move up">↑</button>
        <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="px-1 text-muted disabled:opacity-30" aria-label="Move down">↓</button>
      </td>
      <td className="px-1 py-1"><input value={r.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Subject / paper" className="h-8 w-60 rounded border border-line-strong px-2" aria-label="Subject name" /></td>
      <td className="px-1 py-1">
        <select value={r.subject ?? ""} onChange={(e) => update(i, { subject: e.target.value || undefined })} className="h-8 w-32 rounded border border-line-strong px-1 text-[12px]" aria-label="Linked subject">
          <option value="">— none —</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>
    </>
  );
  const maxCell = (r: SchemeRow, i: number, f: FieldKey) => (
    <td key={f} className="px-1 py-1 text-center"><input value={r.max[f] ?? 0} onChange={(e) => setMax(i, f, e.target.value)} inputMode="decimal" className={num} aria-label={`${r.label} ${FIELD_LABELS[f]} max`} /></td>
  );
  const tail = (r: SchemeRow, i: number) => (
    <>
      <td className="px-2 py-1 text-center font-medium tabular-nums">{rowFullMarks(r)}</td>
      <td className="px-1 py-1 text-right"><button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="text-[12px] text-danger hover:underline">Remove</button></td>
    </>
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="klassId" value={klassId} />
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />
      <Panel title="Main subjects" bodyClassName="p-0" action={<span className="text-[12px] text-muted">Maximum marks per column · 0 = column not used · counted in grand total and GPA</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <th colSpan={3} />
                <th colSpan={SUMMATIVE_FIELDS.length + 1} className="border-x border-line py-1">Summative</th>
                <th colSpan={CONTINUOUS_FIELDS.length + 1} className="border-r border-line py-1">Continuous</th>
                <th colSpan={2} />
              </tr>
              <tr className="border-b border-line-strong">
                <th /><th className={`${th} text-left`}>Name on card</th><th className={`${th} text-left`}>Subject</th>
                {SUMMATIVE_FIELDS.map((f) => <th key={f} className={th}>{FIELD_LABELS[f]}</th>)}
                <th className={`${th} bg-panel`}>Convert %</th>
                {CONTINUOUS_FIELDS.map((f) => <th key={f} className={th}>{FIELD_LABELS[f]}</th>)}
                <th className={`${th} bg-panel`}>Convert %</th>
                <th className={th}>Full marks</th><th />
              </tr>
            </thead>
            <tbody>
              {main.map(([r, i]) => (
                <tr key={r.key} className="border-b border-line">
                  {common(r, i)}
                  {SUMMATIVE_FIELDS.map((f) => maxCell(r, i, f))}
                  <td className="bg-panel px-1 py-1 text-center"><input value={r.summativePct} onChange={(e) => update(i, { summativePct: Number(e.target.value) })} inputMode="decimal" className={num} aria-label={`${r.label} summative convert percent`} /></td>
                  {CONTINUOUS_FIELDS.map((f) => maxCell(r, i, f))}
                  <td className="bg-panel px-1 py-1 text-center"><input value={r.continuousPct} onChange={(e) => update(i, { continuousPct: Number(e.target.value) })} inputMode="decimal" className={num} aria-label={`${r.label} continuous convert percent`} /></td>
                  {tail(r, i)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line p-2"><button type="button" onClick={() => add("main")} className="text-[12px] font-medium text-accent-700 hover:underline">+ Add subject</button></div>
      </Panel>

      <Panel title="Additional subjects" bodyClassName="p-0" action={<span className="text-[12px] text-muted">Printed in the separate box (e.g. Home Science / Agriculture) · not in grand total or GPA</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line-strong">
                <th /><th className={`${th} text-left`}>Name on card</th><th className={`${th} text-left`}>Subject</th>
                {EXTRA_FIELDS.map((f) => <th key={f} className={th}>{FIELD_LABELS[f]}</th>)}
                <th className={th}>Full marks</th><th />
              </tr>
            </thead>
            <tbody>
              {extra.map(([r, i]) => (
                <tr key={r.key} className="border-b border-line">
                  {common(r, i)}
                  {EXTRA_FIELDS.map((f) => maxCell(r, i, f))}
                  {tail(r, i)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line p-2"><button type="button" onClick={() => add("extra")} className="text-[12px] font-medium text-accent-700 hover:underline">+ Add additional subject</button></div>
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <FormMessage result={state} />
        <SubmitButton>Save layout</SubmitButton>
      </div>
    </form>
  );
}
