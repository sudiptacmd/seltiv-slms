"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/form";
import { useActionEffect } from "@/components/ui/action-form";
import { saveTimetableEntry } from "@/lib/actions/academics";
import type { ActionState } from "@/lib/actions/_common";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday"] as const;
type Opt = { id: string; name: string };
type Entry = { weekday: string; slotId: string; subjectId: string; teacherId: string };

export function TimetableGrid({
  sectionId,
  slots,
  subjects,
  teachers,
  entries,
}: {
  sectionId: string;
  slots: { id: string; name: string; time: string; isBreak: boolean }[];
  subjects: Opt[];
  teachers: Opt[];
  entries: Entry[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveTimetableEntry, {});
  useActionEffect(state);
  const find = (weekday: string, slotId: string) => entries.find((e) => e.weekday === weekday && e.slotId === slotId);

  return (
    <div>
      <div className="px-4 pt-3"><FormMessage result={state} /></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-[12px]">
          <thead>
            <tr className="border-b border-line-strong">
              <th className="w-32 px-3 py-2 text-left text-muted">Period</th>
              {DAYS.map((d) => (
                <th key={d} className="px-3 py-2 text-left capitalize text-muted">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id} className="border-b border-line">
                <td className="px-3 py-2">
                  <div className="font-medium">{slot.name}</div>
                  <div className="text-[10px] text-muted">{slot.time}</div>
                </td>
                {slot.isBreak
                  ? DAYS.map((d) => <td key={d} className="bg-panel px-3 py-2 text-center text-muted">Break</td>)
                  : DAYS.map((d) => {
                      const e = find(d, slot.id);
                      return (
                        <td key={d} className="px-2 py-1.5">
                          <form action={action} className="flex flex-col gap-1">
                            <input type="hidden" name="sectionId" value={sectionId} />
                            <input type="hidden" name="weekday" value={d} />
                            <input type="hidden" name="slotId" value={slot.id} />
                            <select
                              name="subjectId"
                              defaultValue={e?.subjectId ?? ""}
                              onChange={(ev) => ev.currentTarget.form?.requestSubmit()}
                              className="h-7 rounded border border-line px-1 text-[11px]"
                            >
                              <option value="">—</option>
                              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select
                              name="teacherId"
                              defaultValue={e?.teacherId ?? ""}
                              onChange={(ev) => ev.currentTarget.form?.requestSubmit()}
                              className="h-7 rounded border border-line px-1 text-[11px] text-muted"
                            >
                              <option value="">teacher…</option>
                              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </form>
                        </td>
                      );
                    })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
