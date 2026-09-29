"use client";

import { useActionState, useEffect, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveGradeRow } from "@/lib/actions/grading";
import type { ActionState } from "@/lib/actions/_common";
import { CONTINUOUS_FIELDS, FIELD_LABELS, SUMMATIVE_FIELDS, activeFields, computeRow, type FieldKey, type RowValues, type SchemeRow } from "@/lib/report-card";

type Student = { id: string; name: string; roll: number; values: RowValues; absent: boolean };
type Scale = Parameters<typeof computeRow>[3];

const fmt = (n: number | null) => (n == null ? "—" : String(Math.round(n * 100) / 100));

/** Enter / ↓ moves down a column, Shift+Enter / ↑ moves up — fast column-by-column entry. */
function moveFocus(e: React.KeyboardEvent<HTMLInputElement>) {
  const down = (e.key === "Enter" && !e.shiftKey) || e.key === "ArrowDown";
  const up = (e.key === "Enter" && e.shiftKey) || e.key === "ArrowUp";
  if (!down && !up) return;
  e.preventDefault();
  const [r, c] = (e.currentTarget.dataset.cell ?? "").split(":").map(Number);
  const next = document.querySelector<HTMLInputElement>(`[data-cell="${r + (down ? 1 : -1)}:${c}"]`);
  next?.focus();
  next?.select();
}

export function GradeRowGrid({
  examId,
  sectionId,
  row,
  fullMarks,
  scale,
  locked,
  students,
}: {
  examId: string;
  sectionId: string;
  row: SchemeRow;
  fullMarks: number;
  scale: Scale;
  locked: boolean;
  students: Student[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveGradeRow, {});
  useActionEffect(state);
  const fields = activeFields(row);
  const summ = fields.filter((f) => (SUMMATIVE_FIELDS as readonly FieldKey[]).includes(f));
  const cont = fields.filter((f) => (CONTINUOUS_FIELDS as readonly FieldKey[]).includes(f));
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(students.map((s) => [s.id, Object.fromEntries(fields.map((f) => [f, s.values[f] == null ? "" : String(s.values[f])]))])),
  );
  const [absent, setAbsent] = useState<Record<string, boolean>>(() => Object.fromEntries(students.map((s) => [s.id, s.absent])));
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const parsed = (sid: string): RowValues =>
    Object.fromEntries(fields.map((f) => [f, values[sid][f] === "" ? null : Number(values[sid][f])]));
  const computed = students.map((s) => computeRow(row, parsed(s.id), absent[s.id], scale));
  const complete = computed.filter((c) => c.complete).length;
  const totals = computed.map((c) => c.total).filter((t): t is number => t != null && !Number.isNaN(t));
  const highest = totals.length ? Math.max(...totals) : null;

  const cellInput = (s: Student, f: FieldKey, rIdx: number) => {
    const raw = values[s.id][f];
    const max = row.max[f] ?? 0;
    const bad = raw !== "" && (Number.isNaN(Number(raw)) || Number(raw) < 0 || Number(raw) > max);
    return (
      <td key={f} className="px-1 py-1 text-center">
        <input
          type="number" min={0} max={max} step="0.01" inputMode="decimal"
          name={`v_${s.id}_${f}`}
          aria-label={`${s.name} ${FIELD_LABELS[f]}`}
          data-cell={`${rIdx}:${fields.indexOf(f)}`}
          value={absent[s.id] ? "" : raw}
          disabled={locked || absent[s.id]}
          onKeyDown={moveFocus}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => { setDirty(true); setValues((v) => ({ ...v, [s.id]: { ...v[s.id], [f]: e.target.value } })); }}
          className={`h-8 w-16 rounded border px-1 text-center tabular-nums disabled:bg-panel ${bad ? "border-danger bg-danger-bg text-danger" : "border-line-strong"}`}
        />
      </td>
    );
  };
  const th = "px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted";

  return (
    <form action={action} onSubmit={() => setDirty(false)}>
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="row" value={row.key} />
      <Panel
        title={`${row.label} · full marks ${fullMarks}`}
        action={<span className="text-[12px] text-muted">{complete}/{students.length} complete · highest {fmt(highest)}</span>}
        bodyClassName="p-0"
      >
        <p className="border-b border-line bg-accent-50 px-4 py-2 text-[12px] text-accent-900">
          {row.kind === "extra"
            ? `${fields.map((f) => `${FIELD_LABELS[f]} ${row.max[f]}`).join(" + ")} = ${fullMarks}`
            : `Summative ${summ.map((f) => `${FIELD_LABELS[f]} ${row.max[f]}`).join(" + ")} × ${row.summativePct}% = (a)  ·  Continuous ${cont.map((f) => `${FIELD_LABELS[f]} ${row.max[f]}`).join(" + ")} × ${row.continuousPct}% = (b)  ·  Total = (a) + (b)`}
          <span className="ml-2 text-muted">Enter moves down the column.</span>
        </p>
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-surface">
              {row.kind === "main" && (
                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                  <th colSpan={2} />
                  <th colSpan={summ.length + 1} className="border-x border-line px-1 py-1">Summative assessment</th>
                  <th colSpan={cont.length + 1} className="border-r border-line px-1 py-1">Continuous assessment</th>
                  <th colSpan={4} />
                </tr>
              )}
              <tr className="border-b border-line-strong">
                <th className={`${th} text-left`}>Roll</th>
                <th className={`${th} text-left`}>Student</th>
                {row.kind === "extra"
                  ? fields.map((f) => <th key={f} className={th}>{FIELD_LABELS[f]}<br />/{row.max[f]}</th>)
                  : <>
                      {summ.map((f) => <th key={f} className={th}>{FIELD_LABELS[f]}<br />/{row.max[f]}</th>)}
                      <th className={`${th} bg-panel`}>(a)<br />{row.summativePct}%</th>
                      {cont.map((f) => <th key={f} className={th}>{FIELD_LABELS[f]}<br />/{row.max[f]}</th>)}
                      <th className={`${th} bg-panel`}>(b)<br />{row.continuousPct}%</th>
                    </>}
                <th className={th}>Total<br />/{fullMarks}</th>
                <th className={th}>Grade</th>
                <th className={th}>GP</th>
                <th className={th}>Absent</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const c = computed[i];
                return (
                  <tr key={s.id} className="border-b border-line hover:bg-panel/50">
                    <td className="px-2 py-1 tabular-nums text-muted">{s.roll}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{s.name}</td>
                    {row.kind === "extra"
                      ? fields.map((f) => cellInput(s, f, i))
                      : <>
                          {summ.map((f) => cellInput(s, f, i))}
                          <td className="bg-panel px-2 py-1 text-center tabular-nums">{fmt(c.summativeConverted)}</td>
                          {cont.map((f) => cellInput(s, f, i))}
                          <td className="bg-panel px-2 py-1 text-center tabular-nums">{fmt(c.continuousConverted)}</td>
                        </>}
                    <td className={`px-2 py-1 text-center font-medium tabular-nums ${c.failed ? "text-danger" : ""}`}>{c.absent ? "Abs" : fmt(c.total)}</td>
                    <td className={`px-2 py-1 text-center ${c.failed ? "text-danger" : ""}`}>{c.grade || "—"}</td>
                    <td className="px-2 py-1 text-center tabular-nums">{c.total == null && !c.absent ? "—" : c.gp.toFixed(2)}</td>
                    <td className="px-2 py-1 text-center">
                      <input type="checkbox" name={`a_${s.id}`} checked={absent[s.id]} disabled={locked}
                        aria-label={`${s.name} absent`}
                        onChange={(e) => { setDirty(true); setAbsent((a) => ({ ...a, [s.id]: e.target.checked })); }}
                        className="h-4 w-4 accent-accent" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!locked && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-3">
            <div className="text-[12px]">{dirty ? <span className="text-warn">Unsaved changes</span> : <FormMessage result={state} />}</div>
            <SubmitButton>Save {row.label}</SubmitButton>
          </div>
        )}
      </Panel>
    </form>
  );
}
