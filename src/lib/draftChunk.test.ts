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

  it("parses the optional continuity ledger section", () => {
    const raw = [
      "PLOT_GOBLIN_PAGES:",
      "pages",
      "PLOT_GOBLIN_SUMMARY:",
      "recap",
      "PLOT_GOBLIN_SETUPS:",
      "NONE",
      "PLOT_GOBLIN_LEDGER:",
      "PEOPLE:",
      "- Joe Kaplan | protagonist",
      "OBJECTS:",
      "- Brenda | Joe's pitching machine",
      "LOCATIONS:",
      "- busted batting cage | recurring practice spot",
      "EVENTS:",
      "- River Dogs open tryout | this Saturday",
      "WARNINGS:",
      "- Duplicate tryout flyer avoided.",
    ].join("\n");

    const result = parseChunkResult(raw);

    expect(result?.setups).toEqual([]);
    expect(result?.ledger.people).toEqual([{ name: "Joe Kaplan", note: "protagonist", source: "generated" }]);
    expect(result?.ledger.objects).toEqual([{ name: "Brenda", note: "Joe's pitching machine", source: "generated" }]);
    expect(result?.ledger.locations).toEqual([
      { name: "busted batting cage", note: "recurring practice spot", source: "generated" },
    ]);
    expect(result?.ledger.events).toEqual([
      { name: "River Dogs open tryout", note: "this Saturday", source: "generated" },
    ]);
    expect(result?.ledger.warnings).toEqual(["Duplicate tryout flyer avoided."]);
  });

  it("skips malformed setup lines", () => {
    const raw = "PLOT_GOBLIN_PAGES:\np\nPLOT_GOBLIN_SUMMARY:\ns\nPLOT_GOBLIN_SETUPS:\n- garbage with no beat\n- beat 3 | valid";
    expect(parseChunkResult(raw)?.setups).toEqual([{ beatIndex: 3, note: "valid" }]);
  });
});
