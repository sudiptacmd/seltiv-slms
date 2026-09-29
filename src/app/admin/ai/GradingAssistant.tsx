"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowUp, LoaderCircle, Check, PencilLine, ShieldCheck } from "lucide-react";
import { Button, Panel, Tag, LinkButton } from "@/components/ui/primitives";
import { prepareGrading, approveGrading } from "@/lib/actions/ai-grading";
import { COMPONENT_LABELS, PERIOD_LABELS, type Proposal } from "@/lib/ai/grading";

export const EXAMPLE_PROMPT = "science er class 8 er marking change hoise, new marking structure in pretest- out of 100 marks, 5 marks diary, 10 marks attendance, 25 weekly test, 60 marks final exam. test- 100 marks, 100 from  exam, final term- 25 marks weekly test, 75 marks final test. ei change ta kore dao.";
export function GradingAssistant({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [proposal, setProposal] = useState<Proposal>();
  const [stage, setStage] = useState<"request" | "thinking" | "review" | "applying" | "applied">("request");
  const [error, setError] = useState("");
  const pending = stage === "thinking" || stage === "applying";
  async function prepare(e: React.FormEvent) {
    e.preventDefault(); setError(""); setStage("thinking"); setProposal(undefined);
    try {
      const result = await prepareGrading(prompt);
      if (result.proposal) { setProposal(result.proposal); setStage("review"); }
      else { setError(result.error || "Could not prepare the change."); setStage("request"); }
    } catch { setError("The request failed. Check your connection and try again."); setStage("request"); }
  }
  async function approve() {
    if (!proposal || stage !== "review") return;
    setError(""); setStage("applying");
    try {
      const result = await approveGrading(proposal.token);
      if (result.ok) { setStage("applied"); router.refresh(); }
      else { setError(result.error || "Could not apply the change."); setStage("review"); }
    } catch { setError("Approval could not be confirmed. Retry to check and complete it."); setStage("review"); }
  }
  return <div className="max-w-6xl space-y-4">
    <Panel title={<span className="flex items-center gap-2"><Sparkles size={15} /> Academic assistant</span>}
      action={<div className="flex gap-2"><Tag tone={stage === "request" || stage === "thinking" ? "accent" : "neutral"}>1 · Request</Tag><Tag tone={stage === "review" || stage === "applying" ? "accent" : "neutral"}>2 · Review</Tag><Tag tone={stage === "applied" ? "ok" : "neutral"}>3 · Apply</Tag></div>}>
      <div className="mb-4 flex items-center gap-2 text-[12px] text-muted"><ShieldCheck size={15} /> Changes are saved only after you approve.</div>
      {stage === "request" && <form onSubmit={prepare} className="space-y-3">
        <label htmlFor="ai-prompt" className="block font-serif text-xl">What would you like to change?</label>
        <p className="text-[13px] text-muted">Update marking components for Pretest, Test or Final term. Write in English, বাংলা or Banglish.</p>
        <textarea id="ai-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} required minLength={15} maxLength={4000} rows={5}
          className="w-full resize-y rounded border border-line-strong bg-surface p-3 text-[15px] leading-7 focus:border-accent focus:outline-none"
          placeholder="Tell me the class, subject and new marking structure…" />
        <div className="flex items-center justify-between gap-3"><Button type="button" variant="ghost" size="sm" onClick={() => setPrompt(EXAMPLE_PROMPT)}>Try a Class 8 Science example</Button>
          <Button type="submit" variant="primary" disabled={!connected || prompt.trim().length < 15}>Prepare changes <ArrowUp size={15} /></Button></div>
        {!connected && <p className="text-[13px] text-warn">Start Ollama with the configured model, then refresh this page.</p>}
      </form>}
      {stage !== "request" && <div className="mb-4 rounded border border-line bg-panel p-3"><div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Your request</div><p className="whitespace-pre-wrap text-[14px] leading-6">{prompt}</p></div>}
      {stage === "thinking" && <div role="status" className="flex items-start gap-3 rounded border border-accent-100 bg-accent-50 p-5"><LoaderCircle className="mt-1 animate-spin text-accent" size={21} /><div><h2 className="text-lg">Preparing your changes…</h2><p className="mt-1 text-[13px] text-muted">The local model is reading your request. We’ll validate the class, subject and component totals before showing the proposal.</p></div></div>}
      {proposal && <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-serif text-xl">{stage === "applied" ? "Marking structure applied" : "Review proposed changes"}</h2><p className="mt-1 text-[13px] text-muted">{proposal.subjectName} · {proposal.className} · Academic year {proposal.yearName}</p></div><Tag tone={stage === "applied" ? "ok" : "warn"}>{stage === "applied" ? "Approved & saved" : "Awaiting approval"}</Tag></div>
        <div className="grid gap-3 md:grid-cols-3">{proposal.after.map(a => {
          const before = proposal.before.find(b => b.period === a.period);
          return <div key={a.period} className="rounded border border-line p-4" data-testid={`allocation-${a.period}`}>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-serif text-lg">{PERIOD_LABELS[a.period]}</h3><span className="text-[11px] text-muted">{proposal.changed.includes(a.period) ? "Updated" : "Unchanged"}</span></div>
            {a.components.map(c => <div className="my-2 flex justify-between text-[14px]" key={c.key}><span>{COMPONENT_LABELS[c.key]}</span><strong className="tabular-nums">{c.marks}</strong></div>)}
            <div className="mt-3 flex justify-between border-t border-line pt-2 text-[14px] font-semibold text-accent-700"><span>Total</span><span>{a.total}</span></div>
            {stage !== "applied" && <div className="mt-3 border-t border-line pt-2 text-[11px] leading-5 text-muted"><strong>Current: </strong>{before ? before.components.map(c => `${COMPONENT_LABELS[c.key]} ${c.marks}`).join(" · ") : "No component structure configured"}</div>}
          </div>;
        })}</div>
        <p className="mt-3 flex items-center gap-1 text-[12px] text-ok"><Check size={14} /> Component totals validated for every assessment.</p>
        <p className="mt-2 text-[12px] text-muted">Applies to new and unstarted mark sheets using these assessment types. Mark sheets with saved marks keep their original allocation.</p>
        {stage !== "applied" ? <div className="mt-5 flex justify-end gap-2"><Button disabled={pending} onClick={() => { setProposal(undefined); setStage("request"); setError(""); }}><PencilLine size={14} /> Edit request</Button><Button variant="primary" disabled={pending} onClick={approve}>{stage === "applying" ? <><LoaderCircle size={15} className="animate-spin" /> Applying changes…</> : <><Check size={15} /> Approve changes</>}</Button></div>
          : <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-ok/20 bg-ok-bg p-3"><span className="text-[13px] text-ok">Saved successfully. Teacher mark entry will use the approved allocations.</span><div className="flex gap-2"><Button size="sm" onClick={() => { setPrompt(""); setProposal(undefined); setStage("request"); }}>New request</Button><LinkButton size="sm" href="/admin/exams/marking-structure">View saved structure</LinkButton></div></div>}
      </div>}
      {error && <div role="alert" className="mt-4 rounded border border-danger/20 bg-danger-bg p-3 text-[13px] text-danger">{error}</div>}
    </Panel>
  </div>;
}
