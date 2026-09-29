"use client";

import { useActionState, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveExamRecords } from "@/lib/actions/grading";
import type { ActionState } from "@/lib/actions/_common";

type Student = { id: string; name: string; roll: number; workingDays: number | null; present: number | null; late: number | null; remarks: string };
const str = (n: number | null) => (n == null ? "" : String(n));

export function RecordsGrid({ examId, sectionId, locked, students }: { examId: string; sectionId: string; locked: boolean; students: Student[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveExamRecords, {});
  useActionEffect(state);
  const [rows, setRows] = useState(() => Object.fromEntries(students.map((s) => [s.id, { wd: str(s.workingDays), p: str(s.present), l: str(s.late), r: s.remarks }])));
  const [allDays, setAllDays] = useState("");
  const set = (id: string, k: "wd" | "p" | "l" | "r", v: string) => setRows((x) => ({ ...x, [id]: { ...x[id], [k]: v } }));
  const input = "h-8 w-16 rounded border border-line-strong px-1 text-center tabular-nums disabled:bg-panel";

  return (
    <form action={action}>
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <Panel
        title="Attendance & remarks"
        bodyClassName="p-0"
        action={!locked && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-muted">Working days for everyone</span>
            <input value={allDays} onChange={(e) => setAllDays(e.target.value)} inputMode="numeric" className={input} aria-label="Working days for everyone" />
            <button type="button" className="rounded border border-line px-2 py-1 hover:bg-panel"
              onClick={() => setRows((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, { ...v, wd: allDays }])))}>
              Apply
            </button>
          </div>
        )}
      >
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line-strong text-[10px] uppercase tracking-wide text-muted">
                <th className="px-2 py-2 text-left">Roll</th>
                <th className="px-2 py-2 text-left">Student</th>
                <th className="px-2 py-2">Working days</th>
                <th className="px-2 py-2">Present</th>
                <th className="px-2 py-2">Absent</th>
                <th className="px-2 py-2">Late present</th>
                <th className="px-2 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const v = rows[s.id];
                const absent = v.wd !== "" && v.p !== "" ? Number(v.wd) - Number(v.p) : null;
                return (
                  <tr key={s.id} className="border-b border-line">
                    <td className="px-2 py-1 tabular-nums text-muted">{s.roll}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{s.name}</td>
                    <td className="px-2 py-1 text-center"><input name={`wd_${s.id}`} value={v.wd} onChange={(e) => set(s.id, "wd", e.target.value)} disabled={locked} inputMode="numeric" className={input} aria-label={`${s.name} working days`} /></td>
                    <td className="px-2 py-1 text-center"><input name={`p_${s.id}`} value={v.p} onChange={(e) => set(s.id, "p", e.target.value)} disabled={locked} inputMode="numeric" className={input} aria-label={`${s.name} present`} /></td>
                    <td className={`px-2 py-1 text-center tabular-nums ${absent != null && absent < 0 ? "text-danger" : ""}`}>{absent ?? "—"}</td>
                    <td className="px-2 py-1 text-center"><input name={`l_${s.id}`} value={v.l} onChange={(e) => set(s.id, "l", e.target.value)} disabled={locked} inputMode="numeric" className={input} aria-label={`${s.name} late present`} /></td>
                    <td className="px-2 py-1"><input name={`r_${s.id}`} value={v.r} onChange={(e) => set(s.id, "r", e.target.value)} disabled={locked} maxLength={300}
                      placeholder="e.g. The result is satisfactory. Try hard to keep up such progress." aria-label={`${s.name} remarks`}
                      className="h-8 w-full min-w-72 rounded border border-line-strong px-2 disabled:bg-panel" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!locked && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-3">
            <FormMessage result={state} />
            <SubmitButton>Save attendance & remarks</SubmitButton>
          </div>
        )}
      </Panel>
    </form>
  );
}
