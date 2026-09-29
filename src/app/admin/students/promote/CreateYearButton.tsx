"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { FormMessage } from "@/components/ui/form";
import { createNextYear } from "@/lib/actions/promotion";
import type { ActionState } from "@/lib/actions/_common";

export function CreateYearButton() {
  const [res, setRes] = useState<ActionState>();
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <FormMessage result={res} />
      <Button
        variant="primary"
        disabled={pending}
        onClick={() => start(async () => { const r = await createNextYear(); setRes(r); if (r.ok) router.refresh(); })}
      >
        {pending ? "Working…" : "Create next academic year"}
      </Button>
    </div>
  );
}
