"use server";
import { randomUUID } from "node:crypto";
import { ClassModel, Subject } from "@/models";
import { MarkingStructure } from "@/models/marking-structure";
import { connectDb } from "@/lib/db";
import { getCurrentYear } from "@/lib/queries";
import { env } from "@/lib/env";
import { aiModel, interpretGrading } from "@/lib/ai/ollama";
import { mergeAllocations, type Allocation, type Proposal } from "@/lib/ai/grading";
import { signProposal, verifyProposal } from "@/lib/ai/proposal-token";
import { guard, revalidate } from "./_common";

export async function prepareGrading(prompt: string): Promise<{ proposal?: Proposal; error?: string }> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  if (typeof prompt !== "string" || prompt.trim().length < 15 || prompt.length > 4000) return { error: "Enter a marking change between 15 and 4,000 characters." };
  try {
    await connectDb();
    const year = await getCurrentYear();
    if (year.closed) return { error: "The current academic year is closed." };
    const [classes, subjects] = await Promise.all([ClassModel.find().lean(), Subject.find().lean()]);
    const extracted = await interpretGrading(prompt, classes.map(c => ({ classNumber: c.numeric, subjects: subjects.filter(s => String(s.klass) === String(c._id)).map(s => s.name) })));
    const matches = classes.filter(c => c.numeric === extracted.classNumber);
    const klass = matches.length === 1 ? matches[0] : null;
    const candidates = subjects.filter(s => String(s.klass) === String(klass?._id) && s.name.toLowerCase() === extracted.subjectName.toLowerCase());
    if (!klass || candidates.length !== 1) return { error: "The class and subject could not be matched uniquely. Use their names from Academics → Subjects." };
    const subject = candidates[0];
    const current = await MarkingStructure.findById(`${year._id}:${subject._id}`).lean();
    const before: Allocation[] = current?.allocations.map(a => ({ period: a.period, total: a.total, components: a.components.map(c => ({ key: c.key, marks: c.marks })) })) ?? [];
    const after = mergeAllocations(before, extracted.allocations);
    if (after.some(a => a.total < subject.passMarks)) return { error: `Each total must be at least the subject's pass mark (${subject.passMarks}).` };
    const changed = extracted.allocations.filter(a => {
      const old = before.find(b => b.period === a.period);
      return !old || old.total !== a.total || old.components.length !== a.components.length || a.components.some(c => old.components.find(b => b.key === c.key)?.marks !== c.marks);
    }).map(a => a.period);
    if (!changed.length) return { error: "The saved marking structure already matches this request. No changes are needed." };
    const version = current?.version ?? 0;
    const token = signProposal({ id: randomUUID(), actor: user!.id, year: String(year._id), klass: String(klass._id), subject: String(subject._id), version, after, expires: Date.now() + 30 * 60_000 }, env.authSecret);
    return { proposal: { token, className: klass.name, subjectName: subject.name, yearName: year.name, before, after,
      changed, model: aiModel(), version } };
  } catch (e) { return { error: e instanceof Error ? e.message : "Could not prepare the changes." }; }
}

export async function approveGrading(token: string): Promise<{ ok?: boolean; error?: string }> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  try {
    if (typeof token !== "string") throw new Error("Invalid proposal.");
    const p = verifyProposal(token, env.authSecret, user!.id);
    await connectDb();
    const year = await getCurrentYear();
    if (String(year._id) !== p.year || year.closed) throw new Error("The academic year changed or closed. Prepare a new proposal.");
    const subject = await Subject.findOne({ _id: p.subject, klass: p.klass }).lean();
    if (!subject) throw new Error("The subject or class changed. Prepare a new proposal.");
    if (p.after.some(a => a.total < subject.passMarks)) throw new Error("The pass mark changed. Prepare a new proposal.");
    const id = `${p.year}:${p.subject}`;
    const current = await MarkingStructure.findById(id).lean();
    if (current?.history.some(h => h.proposalId === p.id)) return { ok: true };
    if ((current?.version ?? 0) !== p.version) throw new Error("The marking structure changed since your review. Prepare a new proposal.");
    // One atomic document update commits every period and its audit entry together.
    const updated = await MarkingStructure.findOneAndUpdate({ _id: id, version: p.version }, {
      $set: { year: p.year, klass: p.klass, subject: p.subject, allocations: p.after },
      $inc: { version: 1 },
      $push: { history: { proposalId: p.id, actor: user!.id, actorName: user!.personName, approvedAt: new Date(), before: current?.allocations ?? [], after: p.after } },
    }, { upsert: !current, new: true, runValidators: true });
    if (!updated) throw new Error("Another administrator updated this structure. Prepare a new proposal.");
    revalidate("/admin/ai", "/admin/exams/marking-structure");
    return { ok: true };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000) return { error: "Another administrator updated this structure. Prepare a new proposal." };
    return { error: e instanceof Error ? e.message : "Could not apply the changes." };
  }
}
