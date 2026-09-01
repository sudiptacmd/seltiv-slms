"use client";

import { useActionState, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveMarks } from "@/lib/actions/marks";
import type { ActionState } from "@/lib/actions/_common";

type Row = { studentId: string; name: string; roll: number; obtained: number | null; absent: boolean };

export function MarksGrid({
  examId,
  sectionId,
  subjectId,
  fullMarks,
  passMarks,
  rows,
  locked,
  submitted,
}: {
  examId: string;
  sectionId: string;
  subjectId: string;
  fullMarks: number;
  passMarks: number;
  rows: Row[];
  locked: boolean;
  submitted: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveMarks, {});
  useActionEffect(state);
  const [values, setValues] = useState<Record<string, { m: string; a: boolean }>>(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, { m: r.obtained == null ? "" : String(r.obtained), a: r.absent }])),
  );
  const readOnly = locked || submitted;

  const entered = Object.values(values).filter((v) => v.a || v.m !== "").length;

  return (
    <form action={action}>
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="subjectId" value={subjectId} />

      <Panel
        title={`Marks · full ${fullMarks} · pass ${passMarks}`}
        action={<span className="text-[12px] text-muted">{entered}/{rows.length} entered</span>}
        bodyClassName="p-0"
      >
        {readOnly && (
          <p className="border-b border-line bg-panel px-4 py-2 text-[12px] text-muted">
            {locked ? "Locked by the office." : "Submitted — ask the office to unlock for edits."}
          </p>
        )}
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line-strong">
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted">Roll</th>
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted">Student</th>
                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wide text-muted">Marks</th>
                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wide text-muted">Absent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const v = values[r.studentId];
                const num = v.m === "" ? null : Number(v.m);
                const failing = !v.a && num != null && num < passMarks;
                return (
                  <tr key={r.studentId} className="border-b border-line">
                    <td className="px-3 py-1.5 tabular-nums text-muted">{r.roll}</td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        name={`m_${r.studentId}`}
                        value={v.a ? "" : v.m}
                        disabled={readOnly || v.a}
                        onChange={(e) => setValues((s) => ({ ...s, [r.studentId]: { ...s[r.studentId], m: e.target.value } }))}
                        inputMode="decimal"
                        className={`h-8 w-20 rounded border px-2 text-center tabular-nums ${
                          failing ? "border-danger text-danger" : "border-line-strong"
                        } disabled:bg-panel`}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        name={`a_${r.studentId}`}
                        checked={v.a}
                        disabled={readOnly}
                        onChange={(e) => setValues((s) => ({ ...s, [r.studentId]: { ...s[r.studentId], a: e.target.checked } }))}
                        className="h-4 w-4 accent-accent"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!readOnly && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-3">
            <FormMessage result={state} />
            <div className="flex gap-2">
              <SubmitButton variant="secondary" name="submit" value="false">Save draft</SubmitButton>
              <SubmitButton name="submit" value="true">Submit</SubmitButton>
            </div>
          </div>
        )}
      </Panel>
    </form>
  );
}
