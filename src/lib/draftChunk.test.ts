import { describe, expect, it } from "vitest";
import { parseChunkResult } from "./draftChunk";

const sample = [
  "PLOT_GOBLIN_PAGES:",
  "INT. IMPOUND LOT - NIGHT",
  "Mara pries the lock.",
  "PLOT_GOBLIN_SUMMARY:",
  "Mara breaks into the lot and meets Cole.",
  "PLOT_GOBLIN_SETUPS:",
  "- beat 14 | the cellar door is left unlocked",
  "- beat 9 | running joke: Dana mispronounces espresso",
].join("\n");

describe("parseChunkResult", () => {
  it("splits the three labeled sections", () => {
    const result = parseChunkResult(sample);
    expect(result).not.toBeNull();
    expect(result?.pages).toContain("INT. IMPOUND LOT - NIGHT");
    expect(result?.pages).not.toContain("PLOT_GOBLIN_SUMMARY");
    expect(result?.summary).toBe("Mara breaks into the lot and meets Cole.");
    expect(result?.setups).toEqual([
      { beatIndex: 14, note: "the cellar door is left unlocked" },
      { beatIndex: 9, note: "running joke: Dana mispronounces espresso" },
    ]);
  });

  it("treats a missing pages or summary section as unparseable (null)", () => {
    expect(parseChunkResult("PLOT_GOBLIN_SUMMARY:\nonly a summary")).toBeNull();
    expect(parseChunkResult("PLOT_GOBLIN_PAGES:\nonly pages")).toBeNull();
  });

  it("returns an empty setups list when the setups section is absent", () => {
    const result = parseChunkResult("PLOT_GOBLIN_PAGES:\npages\nPLOT_GOBLIN_SUMMARY:\nrecap");
    expect(result?.setups).toEqual([]);
  });

  it("skips malformed setup lines", () => {
    const raw = "PLOT_GOBLIN_PAGES:\np\nPLOT_GOBLIN_SUMMARY:\ns\nPLOT_GOBLIN_SETUPS:\n- garbage with no beat\n- beat 3 | valid";
    expect(parseChunkResult(raw)?.setups).toEqual([{ beatIndex: 3, note: "valid" }]);
  });
});
