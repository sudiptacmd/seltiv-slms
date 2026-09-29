import { beforeEach, describe, expect, it, vi } from "vitest";
import { signProposal, type ProposalPayload } from "@/lib/ai/proposal-token";
const mock = vi.hoisted(() => ({ guard: vi.fn(), current: vi.fn(), update: vi.fn(), subject: vi.fn(), year: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions/_common", () => ({ guard: mock.guard, revalidate: vi.fn() }));
vi.mock("@/lib/db", () => ({ connectDb: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { authSecret: "secret" } }));
vi.mock("@/lib/queries", () => ({ getCurrentYear: mock.year }));
vi.mock("@/lib/ai/ollama", () => ({ aiModel: () => "local", interpretGrading: vi.fn() }));
vi.mock("@/models", () => ({ ClassModel: {}, Subject: { findOne: () => ({ lean: mock.subject }) } }));
vi.mock("@/models/marking-structure", () => ({ MarkingStructure: { findById: () => ({ lean: mock.current }), findOneAndUpdate: mock.update } }));
import { approveGrading } from "@/lib/actions/ai-grading";
const payload: ProposalPayload = { id: "97d1f0dd-0be1-4fe1-9e7b-704af93d20a3", actor: "admin", year: "a".repeat(24), klass: "b".repeat(24), subject: "c".repeat(24), version: 0, after: [{ period: "test", total: 100, components: [{ key: "exam", marks: 100 }] }], expires: Date.now() + 60000 };
const token = () => signProposal(payload, "secret");
beforeEach(() => {
  vi.clearAllMocks();
  mock.guard.mockResolvedValue({ user: { id: "admin", personName: "Admin" }, deny: null });
  mock.year.mockResolvedValue({ _id: payload.year, closed: false }); mock.subject.mockResolvedValue({ passMarks: 33 });
  mock.current.mockResolvedValue(null);mock.update.mockResolvedValue({ version: 1 });
});
describe("server-side approval", () => {
  it("atomically saves every reviewed allocation and its audit record", async () => {
    expect(await approveGrading(token())).toEqual({ ok: true });
    expect(mock.update).toHaveBeenCalledTimes(1);
    const [filter, update] = mock.update.mock.calls[0];
    expect(filter.version).toBe(0);expect(update.$set.allocations).toEqual(payload.after);
    expect(update.$push.history.proposalId).toBe(payload.id);expect(update.$push.history.actor).toBe("admin");
  });
  it("rejects non-admin callers without changing data", async () => {
    mock.guard.mockResolvedValue({ deny: { error: "Forbidden" } });
    expect((await approveGrading(token())).error).toBe("Forbidden");expect(mock.update).not.toHaveBeenCalled();
  });
  it("rejects stale proposals", async () => {
    mock.current.mockResolvedValue({ version: 1, history: [] });
    expect((await approveGrading(token())).error).toMatch(/changed since/);expect(mock.update).not.toHaveBeenCalled();
  });
  it("treats approval retry as success without applying twice", async () => {
    mock.current.mockResolvedValue({ version: 1, history: [{ proposalId: payload.id }] });
    expect(await approveGrading(token())).toEqual({ ok: true });expect(mock.update).not.toHaveBeenCalled();
  });
  it("rejects a closed year and changed subject", async () => {
    mock.year.mockResolvedValue({ _id: payload.year, closed: true });
    expect((await approveGrading(token())).error).toMatch(/closed/);expect(mock.update).not.toHaveBeenCalled();
    mock.year.mockResolvedValue({ _id: payload.year, closed: false });mock.subject.mockResolvedValue(null);
    expect((await approveGrading(token())).error).toMatch(/subject or class changed/);expect(mock.update).not.toHaveBeenCalled();
  });
  it("handles concurrent updates without claiming success", async () => {
    mock.update.mockResolvedValue(null);expect((await approveGrading(token())).error).toMatch(/Another administrator/);
    mock.update.mockRejectedValue({ code: 11000 });expect((await approveGrading(token())).error).toMatch(/Another administrator/);
  });
});
