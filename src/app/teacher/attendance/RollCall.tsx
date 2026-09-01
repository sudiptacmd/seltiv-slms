"use client";

import { useActionState, useState } from "react";
import { Panel, Button } from "@/components/ui/primitives";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveRollCall } from "@/lib/actions/attendance";
import type { ActionState } from "@/lib/actions/_common";
import { cn } from "@/lib/utils";

type RosterEntry = { studentId: string; name: string; roll: number; current?: string };
const OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: "present", label: "P", cls: "bg-ok text-white" },
  { value: "absent", label: "A", cls: "bg-danger text-white" },
  { value: "late", label: "L", cls: "bg-warn text-white" },
  { value: "leave", label: "Lv", cls: "bg-accent text-white" },
];

export function RollCall({
  sectionId,
  sectionName,
  date,
  period,
  roster,
  locked,
}: {
  sectionId: string;
  sectionName: string;
  date: string;
  period?: string;
  roster: RosterEntry[];
  locked: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveRollCall, {});
  useActionEffect(state);
  const [marks, setMarks] = useState<Record<string, string>>(
    () => Object.fromEntries(roster.map((r) => [r.studentId, r.current ?? "present"])),
  );

  const counts = {
    present: Object.values(marks).filter((v) => v === "present").length,
    absent: Object.values(marks).filter((v) => v === "absent").length,
    late: Object.values(marks).filter((v) => v === "late").length,
    leave: Object.values(marks).filter((v) => v === "leave").length,
  };

  function setAll(v: string) {
    setMarks(Object.fromEntries(roster.map((r) => [r.studentId, v])));
  }

  return (
    <form action={action}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="date" value={date} />
      {period && <input type="hidden" name="period" value={period} />}
      {roster.map((r) => (
        <input key={r.studentId} type="hidden" name={`s_${r.studentId}`} value={marks[r.studentId] ?? "present"} />
      ))}

      <Panel
        title={`${sectionName} · ${date}${period ? ` · ${period}` : ""}`}
        action={
          <div className="flex gap-3 text-[12px] text-muted">
            <span>Present {counts.present}</span>
            <span>Absent {counts.absent}</span>
            <span>Late {counts.late}</span>
          </div>
        }
        bodyClassName="p-0"
      >
        {locked && (
          <p className="border-b border-line bg-warn-bg px-4 py-2 text-[12px] text-warn">
            This roll call is locked. Contact the office to make corrections.
          </p>
        )}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[12px]">
          <span className="text-muted">Mark all:</span>
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={locked}
              onClick={() => setAll(o.value)}
              className="rounded border border-line px-2 py-0.5 hover:bg-panel disabled:opacity-40"
            >
              {o.label === "P" ? "Present" : o.label === "A" ? "Absent" : o.label === "L" ? "Late" : "Leave"}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-line">
          {roster.map((r) => (
            <li key={r.studentId} className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="text-[13px]">
                <span className="tabular-nums text-muted">{r.roll}</span> · {r.name}
              </span>
              <div className="flex gap-1">
                {OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    disabled={locked}
                    onClick={() => setMarks((m) => ({ ...m, [r.studentId]: o.value }))}
                    className={cn(
                      "h-7 w-8 rounded border text-[12px] font-semibold transition-colors disabled:opacity-40",
                      marks[r.studentId] === o.value ? o.cls + " border-transparent" : "border-line-strong text-muted hover:bg-panel",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-line p-3">
          <div className="text-[12px] text-muted">
            {counts.absent > 0 && `${counts.absent} guardian${counts.absent === 1 ? "" : "s"} will get an SMS alert.`}
          </div>
          <div className="flex items-center gap-3">
            <FormMessage result={state} />
            {!locked && <SubmitButton>Save Roll Call</SubmitButton>}
          </div>
        </div>
      </Panel>
    </form>
  );
}
