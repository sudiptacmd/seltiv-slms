import { describe, it, expect } from "vitest";
import { countSegments, isUnicode, renderTemplate, normalizeMsisdn } from "@/lib/sms-util";
import { taka } from "@/lib/utils";

describe("countSegments", () => {
  it("1 GSM-7 segment up to 160 chars", () => {
    expect(countSegments("a".repeat(160))).toEqual({ segments: 1, unicode: false });
    expect(countSegments("a".repeat(161))).toEqual({ segments: 2, unicode: false });
  });
  it("unicode (Bangla) drops to 70 chars per segment", () => {
    const bangla = "পরীক্ষা";
    expect(isUnicode(bangla)).toBe(true);
    expect(countSegments(bangla.repeat(10)).segments).toBe(1);
    expect(countSegments(bangla.repeat(20)).unicode).toBe(true);
  });
});

describe("renderTemplate", () => {
  it("substitutes {placeholders}", () => {
    expect(
      renderTemplate("Dear Guardian, {student} owes {amount} due {due}.", {
        student: "Nabila Rahman",
        amount: "৳3,000",
        due: "5 Sep",
      }),
    ).toBe("Dear Guardian, Nabila Rahman owes ৳3,000 due 5 Sep.");
  });
  it("leaves unknown placeholders intact", () => {
    expect(renderTemplate("{x} {y}", { x: "1" })).toBe("1 {y}");
  });
});

describe("normalizeMsisdn", () => {
  it("normalises BD numbers to +8801…", () => {
    expect(normalizeMsisdn("01700000000")).toBe("+8801700000000");
    expect(normalizeMsisdn("+8801700000000")).toBe("+8801700000000");
    expect(normalizeMsisdn("8801700000000")).toBe("+8801700000000");
    expect(normalizeMsisdn("017-0000-0000")).toBe("+8801700000000");
  });
});

describe("taka formatter", () => {
  it("uses Indian digit grouping", () => {
    expect(taka(3000)).toBe("৳3,000");
    expect(taka(150000)).toBe("৳1,50,000");
    expect(taka(600000)).toBe("৳6,00,000");
  });
});
