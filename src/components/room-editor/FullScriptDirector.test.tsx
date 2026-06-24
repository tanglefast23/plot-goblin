import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FullScriptDirector } from "./FullScriptDirector";
import type { DraftRun } from "@/lib/draftRunStorage";

const run: DraftRun = {
  beatSheet: [
    { index: 1, pageBudget: 3, title: "A", intent: "x", setups: [] },
    { index: 2, pageBudget: 3, title: "B", intent: "y", setups: [] },
  ],
  completedBeats: [{ indices: [1, 2], pages: "PAGES", summary: "Mara escapes the lot." }],
  runningSummary: "Mara escapes the lot.",
  nextBeatIndex: 3,
  targetPages: 100,
  status: "running",
};

describe("FullScriptDirector", () => {
  it("shows finished beats with their summaries and the status line", () => {
    render(
      <FullScriptDirector
        run={run}
        statusLine="Working on beats 3 and 4 now — please wait."
        error={null}
        stitched={null}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText(/Mara escapes the lot\./)).toBeTruthy();
    expect(screen.getByText(/Working on beats 3 and 4 now/)).toBeTruthy();
  });

  it("shows Retry / Skip / Stop controls when paused with an error", () => {
    render(
      <FullScriptDirector
        run={{ ...run, status: "paused" }}
        statusLine=""
        error="Beat 3 stalled."
        stitched={null}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText(/Beat 3 stalled\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
  });
});
