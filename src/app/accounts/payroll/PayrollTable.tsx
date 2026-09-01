"use client";

import { Fragment, useActionState, useState } from "react";
import { Panel, Button } from "@/components/ui/primitives";
import { Field, Input, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { updatePayslip, markPayslipPaid, generateAllPayslips } from "@/lib/actions/payroll";
import { taka } from "@/lib/utils";
import type { ActionState } from "@/lib/actions/_common";

type Slip = {
  id: string;
  staff: string;
  designation: string;
  gross: number;
  net: number;
  lopDays: number;
  status: string;
};

export function PayrollTable({ runId, month, status, slips }: { runId: string; month: string; status: string; slips: Slip[] }) {
  const [genState, genAction] = useActionState<ActionState, FormData>(generateAllPayslips, {});
  useActionEffect(genState);
  const [editing, setEditing] = useState<string | null>(null);

  const total = slips.reduce((s, x) => s + x.net, 0);
  const paid = slips.filter((s) => s.status === "paid").length;

  return (
    <Panel
      title={`Payroll — ${month}`}
      action={
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-muted">{paid}/{slips.length} paid · net {taka(total)}</span>
          <FormMessage result={genState} />
          {status !== "finalised" && (
            <form action={genAction}>
              <input type="hidden" name="runId" value={runId} />
              <SubmitButton size="sm">Generate Payslips</SubmitButton>
            </form>
          )}
        </div>
      }
      bodyClassName="p-0"
    >
      <Table>
        <TableHeadRow>
          <TH>Staff</TH>
          <TH>Role</TH>
          <TH align="right">Gross</TH>
          <TH align="right">Net</TH>
          <TH>Status</TH>
          <TH align="right"></TH>
        </TableHeadRow>
        <tbody>
          {slips.map((s) => (
            <Fragment key={s.id}>
              <TR>
                <TD className="font-medium">{s.staff}</TD>
                <TD className="text-muted">{s.designation}</TD>
                <TD align="right" className="tabular-nums">{taka(s.gross)}</TD>
                <TD align="right" className="tabular-nums font-medium">{taka(s.net)}</TD>
                <TD><StatusBadge status={s.status} /></TD>
                <TD align="right">
                  <div className="flex justify-end gap-2">
                    {s.status !== "paid" && (
                      <button onClick={() => setEditing(editing === s.id ? null : s.id)} className="text-[12px] text-accent-700 hover:underline">
                        Adjust
                      </button>
                    )}
                    {s.status === "paid" ? (
                      <a href={`/print/payslip/${s.id}`} target="_blank" className="text-[12px] text-muted hover:underline">Payslip</a>
                    ) : (
                      <PayRow id={s.id} />
                    )}
                  </div>
                </TD>
              </TR>
              {editing === s.id && (
                <TR>
                  <TD colSpan={6} className="bg-panel">
                    <AdjustRow id={s.id} lopDays={s.lopDays} onDone={() => setEditing(null)} />
                  </TD>
                </TR>
              )}
            </Fragment>
          ))}
        </tbody>
      </Table>
    </Panel>
  );
}

function PayRow({ id }: { id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(markPayslipPaid, {});
  useActionEffect(state);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="secondary">Mark paid</SubmitButton>
    </form>
  );
}

function AdjustRow({ id, lopDays, onDone }: { id: string; lopDays: number; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(updatePayslip, {});
  useActionEffect(state, { onOk: onDone });
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 py-1">
      <input type="hidden" name="id" value={id} />
      <Field label="Loss-of-pay days" className="w-32"><Input name="lopDays" type="number" min={0} defaultValue={lopDays} /></Field>
      <Field label="Bonus / adjustment" className="w-40"><Input name="bonus" type="number" defaultValue={0} /></Field>
      <SubmitButton size="sm">Apply</SubmitButton>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      <FormMessage result={state} />
    </form>
  );
}
