import { describe, expect, it, beforeEach } from "vitest";
import { clearDraftRun, loadDraftRun, saveDraftRun, type DraftRun } from "./draftRunStorage";

const run: DraftRun = {
  beatSheet: [{ index: 1, pageBudget: 3, title: "A", intent: "x", setups: [] }],
  completedBeats: [{ indices: [1, 2], pages: "PAGES", summary: "recap" }],
  runningSummary: "recap",
  nextBeatIndex: 3,
  targetPages: 100,
  status: "running",
};

describe("draftRunStorage", () => {
  beforeEach(() => clearDraftRun());

  it("round-trips a saved run", () => {
    saveDraftRun(run);
    expect(loadDraftRun()).toEqual(run);
  });

  it("returns null when nothing is stored", () => {
    expect(loadDraftRun()).toBeNull();
  });

  it("returns null and clears storage on corrupt JSON", () => {
    window.localStorage.setItem("plot-goblin-draft-run", "{not json");
    expect(loadDraftRun()).toBeNull();
    expect(window.localStorage.getItem("plot-goblin-draft-run")).toBeNull();
  });
});
