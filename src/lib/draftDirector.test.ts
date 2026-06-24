import { describe, expect, it } from "vitest";
import { advanceDraft, nextBeatPair, stitchDraft } from "./draftDirector";
import type { DraftRun } from "./draftRunStorage";

function baseRun(): DraftRun {
  return {
    beatSheet: [
      { index: 1, pageBudget: 3, title: "A", intent: "x", setups: [] },
      { index: 2, pageBudget: 3, title: "B", intent: "y", setups: [] },
      { index: 3, pageBudget: 3, title: "C", intent: "z", setups: [] },
    ],
    completedBeats: [],
    runningSummary: "",
    nextBeatIndex: 1,
    targetPages: 9,
    status: "running",
  };
}

describe("nextBeatPair", () => {
  it("returns the next two beats from nextBeatIndex", () => {
    const pair = nextBeatPair(baseRun());
    expect(pair.map((b) => b.index)).toEqual([1, 2]);
  });

  it("returns the final single beat when only one remains", () => {
    const run = { ...baseRun(), nextBeatIndex: 3 };
    expect(nextBeatPair(run).map((b) => b.index)).toEqual([3]);
  });

  it("returns an empty array when finished", () => {
    const run = { ...baseRun(), nextBeatIndex: 4 };
    expect(nextBeatPair(run)).toEqual([]);
  });
});

describe("advanceDraft", () => {
  it("records the chunk, merges setups, grows the summary, and bumps the index", () => {
    const run = baseRun();
    const next = advanceDraft(run, [run.beatSheet[0], run.beatSheet[1]], {
      pages: "PAGES 1-2",
      summary: "Mara escapes.",
      setups: [{ beatIndex: 3, note: "keycard pocketed" }],
    });

    expect(next.completedBeats).toEqual([{ indices: [1, 2], pages: "PAGES 1-2", summary: "Mara escapes." }]);
    expect(next.runningSummary).toContain("Mara escapes.");
    expect(next.beatSheet[2].setups).toEqual(["keycard pocketed"]);
    expect(next.nextBeatIndex).toBe(3);
    expect(next.status).toBe("running");
  });

  it("marks the run done when the last beat is consumed", () => {
    const run = { ...baseRun(), nextBeatIndex: 3 };
    const next = advanceDraft(run, [run.beatSheet[2]], { pages: "PAGES 3", summary: "End.", setups: [] });
    expect(next.nextBeatIndex).toBe(4);
    expect(next.status).toBe("done");
  });
});

describe("stitchDraft", () => {
  it("joins completed pages in order with scene spacing", () => {
    const run: DraftRun = {
      ...baseRun(),
      completedBeats: [
        { indices: [1, 2], pages: "PAGES 1-2", summary: "a" },
        { indices: [3], pages: "PAGES 3", summary: "b" },
      ],
    };
    expect(stitchDraft(run)).toBe("PAGES 1-2\n\nPAGES 3");
  });
});
