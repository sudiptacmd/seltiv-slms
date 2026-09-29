"use client";

import { useActionState } from "react";
import { Select, FormMessage } from "@/components/ui/form";
import { Tag } from "@/components/ui/primitives";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { promoteOne } from "@/lib/actions/promotion";
import type { ActionState } from "@/lib/actions/_common";
import type { NotPromoted } from "@/lib/promotion";

function StudentRow({ s, sections }: { s: NotPromoted["students"][number]; sections: NotPromoted["sections"] }) {
  const [state, action] = useActionState<ActionState, FormData>(promoteOne, {});
  useActionEffect(state);
  const options = sections.filter((x) => x.classId === s.nextClassId || x.classId === s.classId);
  // A student who failed defaults to repeating their class; everyone else to the next one.
  const first = sections.find((x) => x.classId === (s.result?.failed ? s.classId : s.nextClassId) && x.placed < x.capacity);
  return (
    <TR>
      <TD>
        <div className="font-medium">{s.name}</div>
        <div className="text-[11px] text-muted">{s.code}</div>
      </TD>
      <TD>{s.className} {s.section} · roll {s.roll}</TD>
      <TD>
        {s.result ? (s.result.failed ? <Tag tone="danger">Failed</Tag> : <Tag tone="ok">Passed · GPA {s.result.gpa.toFixed(2)}</Tag>) : <span className="text-muted">—</span>}
      </TD>
      <TD>
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="studentId" value={s.id} />
          <Select name="sectionId" defaultValue={first?.id ?? ""} className="h-8 w-56" aria-label={`Place ${s.name}`}>
            <option value="" disabled>Choose class & section</option>
            {[s.nextClassId, s.classId].filter((v, i, a) => a.indexOf(v) === i).map((cid) => (
              <optgroup key={cid} label={cid === s.classId ? `Keep in ${s.className}` : `Promote to ${options.find((o) => o.classId === cid)?.className ?? ""}`}>
                {options.filter((o) => o.classId === cid).map((o) => (
                  <option key={o.id} value={o.id} disabled={o.placed >= o.capacity}>
                    {o.className} {o.name} — {o.placed}/{o.capacity}{o.placed >= o.capacity ? " (full)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <SubmitButton size="sm" variant="primary">Place</SubmitButton>
        </form>
        {state.error && <FormMessage result={state} />}
      </TD>
    </TR>
  );
}

export function PendingList({ data }: { data: NotPromoted }) {
  return (
    <Table>
      <TableHeadRow>
        <TH>Student</TH>
        <TH>This year</TH>
        <TH>Last result</TH>
        <TH>Place in {data.nextYearName}</TH>
      </TableHeadRow>
      <tbody>
        {data.students.map((s) => <StudentRow key={s.id} s={s} sections={data.sections} />)}
      </tbody>
    </Table>
  );
}
