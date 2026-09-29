import { describe, it, expect } from "vitest";
import { requestSchema, mergeAllocations, componentTotal, type Allocation } from "@/lib/ai/grading";
import { signProposal, verifyProposal, type ProposalPayload } from "@/lib/ai/proposal-token";
const pretest: Allocation = { period: "pretest", total: 100, components: [{ key: "diary", marks: 5 }, { key: "attendance", marks: 10 }, { key: "weekly_test", marks: 25 }, { key: "final_exam", marks: 60 }] };
const test: Allocation = { period: "test", total: 100, components: [{ key: "exam", marks: 100 }] };
const final: Allocation = { period: "final_term", total: 100, components: [{ key: "weekly_test", marks: 25 }, { key: "final_test", marks: 75 }] };
const req = { classNumber: 8, subjectName: "Science", allocations: [pretest, test, final] };
describe("marking proposals", () => {
  it("accepts the requested three allocations", () => expect(requestSchema.parse(req)).toEqual(req));
  it("rejects incorrect totals, duplicate components/periods, and negative marks", () => {
    for (const allocation of [ { ...pretest, total: 99 }, { ...test, components: [{ key: "exam", marks: -5 }] }, { ...test, components: [{ key: "exam", marks: 50 }, { key: "exam", marks: 50 }] } ])
      expect(requestSchema.safeParse({ ...req, allocations: [allocation] }).success).toBe(false);
    expect(requestSchema.safeParse({ ...req, allocations: [test, test] }).success).toBe(false);
  });
  it("rejects unknown mutation fields and unsupported components", () => {
    expect(requestSchema.safeParse({ ...req, deleteStudents: true }).success).toBe(false);
    expect(requestSchema.safeParse({ ...req, allocations: [{ ...test, components: [{ key: "delete", marks: 100 }] }] }).success).toBe(false);
  });
  it("preserves periods omitted from an update", () => expect(mergeAllocations([pretest, test], [final])).toEqual([pretest, test, final]));
});
describe("component mark entry", () => {
  it("sums complete marks and accepts zero", () => expect(componentTotal(pretest.components, { diary: 0, attendance: 10, weekly_test: 20, final_exam: 50 })).toBe(80));
  it("keeps partial drafts incomplete", () => expect(componentTotal(pretest.components, { diary: 5 })).toBeNull());
  it("rejects out-of-range and non-finite values even in incomplete drafts", () => {
    for (const diary of [6, -1, "NaN", Infinity]) expect(() => componentTotal(pretest.components, { diary })).toThrow();
  });
});
describe("approval integrity", () => {
  const payload: ProposalPayload = { id: "97d1f0dd-0be1-4fe1-9e7b-704af93d20a3", actor: "admin", year: "a".repeat(24), klass: "b".repeat(24), subject: "c".repeat(24), version: 2, after: req.allocations, expires: 1000 };
  const token = signProposal(payload, "test-secret");
  it("accepts the original reviewed payload", () => expect(verifyProposal(token, "test-secret", "admin", 999)).toEqual(payload));
  it("rejects tampered marks, different actors, expired and malformed tokens", () => {
    const [body, signature] = token.split(".");
    const changed = JSON.parse(Buffer.from(body, "base64url").toString()); changed.version = 5;
    const tampered = Buffer.from(JSON.stringify(changed)).toString("base64url") + "." + signature;
    expect(() => verifyProposal(tampered, "test-secret", "admin", 999)).toThrow();
    expect(() => verifyProposal(token, "test-secret", "teacher", 999)).toThrow();
    expect(() => verifyProposal(token, "test-secret", "admin", 1001)).toThrow();
    expect(() => verifyProposal("x.y", "test-secret", "admin", 999)).toThrow();
  });
});
