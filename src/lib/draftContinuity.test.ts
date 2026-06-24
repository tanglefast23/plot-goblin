import { describe, expect, it } from "vitest";
import { estimatePageCount, shouldTopUp, assembleChunkContext } from "./draftContinuity";

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

describe("assembleChunkContext", () => {
  const base = {
    beatSheetText: "BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x",
    currentBeatsText: "BEAT 4 | PAGES: 5 | TITLE: D",
    runningSummary: "So far: Mara escaped.",
    previousTail: "FADE OUT.",
    roomExport: "# Premise\nA heist.",
    storyBrief: "",
    maxChars: 36_000,
  };

  it("includes every section when under budget", () => {
    const out = assembleChunkContext(base);
    expect(out).toContain("BEAT 1 | PAGES: 3");
    expect(out).toContain("BEAT 4 | PAGES: 5 | TITLE: D");
    expect(out).toContain("So far: Mara escaped.");
    expect(out).toContain("FADE OUT.");
    expect(out).toContain("A heist.");
  });

  it("uses the saved story brief instead of resending room exports after planning", () => {
    const out = assembleChunkContext({
      ...base,
      roomExport: "# Premise\nLong source room export.",
      storyBrief: "premise: haunted heist; characters: Mara vs Landlord",
    });

    expect(out).toContain("premise: haunted heist");
    expect(out).not.toContain("Long source room export");
  });

  it("drops the running summary first when over budget, keeping the beat sheet and current beats", () => {
    const huge = "x".repeat(40_000);
    const out = assembleChunkContext({ ...base, runningSummary: huge, maxChars: 5_000 });
    expect(out.length).toBeLessThanOrEqual(5_000);
    expect(out).toContain("BEAT 4 | PAGES: 5 | TITLE: D");
    expect(out).not.toContain(huge);
  });
});
