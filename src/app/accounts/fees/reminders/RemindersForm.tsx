"use client";

import { useActionState, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { sendFeeReminders } from "@/lib/actions/reminders";
import { taka, formatDate } from "@/lib/utils";
import type { ActionState } from "@/lib/actions/_common";

type Row = {
  invoiceId: string;
  invoiceNo: string;
  student: string;
  period: string;
  due: number;
  dueDate: string;
  reminded: boolean;
};

export function RemindersForm({ rows }: { rows: Row[] }) {
  const [state, action] = useActionState<ActionState, FormData>(sendFeeReminders, {});
  useActionEffect(state);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.invoiceId));

  return (
    <form action={action}>
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="invoiceId" value={id} />
      ))}
      <Panel
        title={`${rows.length} overdue invoices`}
        action={
          <div className="flex items-center gap-3">
            <FormMessage result={state} />
            <SubmitButton size="sm" disabled={selected.size === 0}>
              Send {selected.size} reminder{selected.size === 1 ? "" : "s"}
            </SubmitButton>
          </div>
        }
        bodyClassName="p-0"
      >
        <Table>
          <TableHeadRow>
            <TH>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.invoiceId)) : new Set())}
                className="h-4 w-4 accent-accent"
              />
            </TH>
            <TH>Student</TH>
            <TH>Invoice</TH>
            <TH align="right">Due</TH>
            <TH>Due date</TH>
            <TH>Last reminder</TH>
          </TableHeadRow>
          <tbody>
            {rows.map((r) => (
              <TR key={r.invoiceId}>
                <TD>
                  <input
                    type="checkbox"
                    checked={selected.has(r.invoiceId)}
                    onChange={() => toggle(r.invoiceId)}
                    className="h-4 w-4 accent-accent"
                  />
                </TD>
                <TD className="font-medium">{r.student}</TD>
                <TD className="text-muted">{r.period}<div className="text-[11px]">{r.invoiceNo}</div></TD>
                <TD align="right" className="tabular-nums font-medium text-danger">{taka(r.due)}</TD>
                <TD className="text-muted">{formatDate(r.dueDate, "short")}</TD>
                <TD className="text-muted">{r.reminded ? "Sent" : "—"}</TD>
              </TR>
            ))}
            {rows.length === 0 && (
              <TR><TD colSpan={6} className="text-muted">No overdue invoices — everyone is up to date.</TD></TR>
            )}
          </tbody>
        </Table>
      </Panel>
    </form>
  );
}
