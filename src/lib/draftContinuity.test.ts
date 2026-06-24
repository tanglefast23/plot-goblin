import { describe, expect, it } from "vitest";
import { estimatePageCount, shouldTopUp } from "./draftContinuity";

describe("estimatePageCount", () => {
  it("estimates ~1 page per 250 words", () => {
    const text = Array.from({ length: 500 }, () => "word").join(" ");
    expect(estimatePageCount(text)).toBe(2);
  });

  it("returns 0 for empty text", () => {
    expect(estimatePageCount("   ")).toBe(0);
  });
});

describe("shouldTopUp", () => {
  it("flags a draft that lands under 90% of target", () => {
    expect(shouldTopUp(80, 100)).toBe(true);
    expect(shouldTopUp(95, 100)).toBe(false);
    expect(shouldTopUp(120, 100)).toBe(false);
  });
});
