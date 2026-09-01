"use client";

import { useActionState } from "react";
import { Panel, Button } from "@/components/ui/primitives";
import { Field, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { validateImport, commitImport, type ImportPreview } from "@/lib/actions/import";
import type { ActionState } from "@/lib/actions/_common";
import type { ImportKind } from "@/lib/import-templates";

export function ImportPanel({ kind }: { kind: ImportKind }) {
  const [vState, vAction] = useActionState<ActionState & { preview?: ImportPreview }, FormData>(validateImport, {});
  const [cState, cAction] = useActionState<ActionState, FormData>(commitImport, {});
  useActionEffect(cState);

  const preview = vState.preview;

  return (
    <div className="space-y-4">
      <Panel title={`Step 1 — download & fill the template`}>
        <p className="mb-3 text-[13px] text-muted">
          Grab the blank spreadsheet, add one {kind === "guardians" ? "guardian" : kind.replace(/s$/, "")} per row, and save it.
        </p>
        <a
          href={`/templates/${kind}.xlsx`}
          className="inline-flex rounded bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-600"
        >
          Download {kind} template (.xlsx)
        </a>
      </Panel>

      <Panel title="Step 2 — upload & check">
        <FormMessage result={vState} />
        <form action={vAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="kind" value={kind} />
          <Field label="Filled spreadsheet">
            <input
              type="file"
              name="file"
              accept=".xlsx"
              required
              className="text-[13px] file:mr-3 file:rounded file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-[13px]"
            />
          </Field>
          <SubmitButton variant="secondary">Check file</SubmitButton>
        </form>
      </Panel>

      {preview && (
        <Panel
          title={`Step 3 — review (${preview.okCount} ok · ${preview.errorCount} to skip)`}
          bodyClassName="p-0"
        >
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeadRow>
                <TH align="center">Row</TH>
                <TH>Preview</TH>
                <TH>Result</TH>
              </TableHeadRow>
              <tbody>
                {preview.rows.map((r) => (
                  <TR key={r.row} className={r.ok ? "" : "bg-danger-bg/40"}>
                    <TD align="center" className="tabular-nums text-muted">{r.row}</TD>
                    <TD>{r.preview}</TD>
                    <TD className={r.ok ? "text-ok" : "text-danger"}>{r.ok ? "Ready" : r.message}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line p-3">
            <FormMessage result={cState} />
            <form action={cAction}>
              <input type="hidden" name="kind" value={preview.kind} />
              <input type="hidden" name="fileName" value={preview.fileName} />
              <input type="hidden" name="fileB64" value={preview.fileB64} />
              <SubmitButton disabled={preview.okCount === 0}>
                Import {preview.okCount} row{preview.okCount === 1 ? "" : "s"}
              </SubmitButton>
            </form>
          </div>
        </Panel>
      )}

      {cState.ok && (
        <Button variant="secondary" onClick={() => location.reload()}>
          Done — reload
        </Button>
      )}
    </div>
  );
}
