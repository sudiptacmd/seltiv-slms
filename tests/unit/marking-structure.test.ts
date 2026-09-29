import { describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
const find = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/models/marking-structure", () => ({ MarkingStructure: { findById: () => ({ lean: find }) } }));
import { effectiveMarking } from "@/lib/marking-structure";
const exam = { year: new Types.ObjectId(), markingPeriod: "pretest" as const };
const subject = { subject: new Types.ObjectId(), fullMarks: 100 };
describe("effective marking allocation", () => {
  it("uses approved component marks for an unstarted exam", async () => {
    find.mockResolvedValue({ version: 2, allocations: [{ period: "pretest", total: 100, components: [{ key: "diary", marks: 5 }, { key: "exam", marks: 95 }] }] });
    expect(await effectiveMarking(exam, subject)).toEqual({ fullMarks: 100, version: 2, components: [{ key: "diary", marks: 5 }, { key: "exam", marks: 95 }] });
  });
  it("preserves the frozen structure when policy changes", async () => {
    const marking = await effectiveMarking(exam, { ...subject, markingVersion: 1, markingComponents: [{ key: "exam", marks: 100 }] });
    expect(marking).toEqual({ fullMarks: 100, version: 1, components: [{ key: "exam", marks: 100 }] });
  });
  it("keeps legacy single-total exams working", async () => {
    expect(await effectiveMarking({ year: exam.year }, subject)).toEqual({ fullMarks: 100, components: [], version: 0 });
  });
});
