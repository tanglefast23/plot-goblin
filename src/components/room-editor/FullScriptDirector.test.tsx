import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { FullScriptDirector } from "./FullScriptDirector";
import type { DraftRun } from "@/lib/draftRunStorage";
import { draftWaitingMessageDelayMs, draftWaitingMessages } from "./RoomEditorSupport";

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

  it("animates the full-script button while the movie plan is being prepared", () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValueOnce(0.99);

    render(
      <FullScriptDirector
        run={null}
        statusLine="Planning the whole movie…"
        error={null}
        stitched={null}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Goblin is writing..." }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByLabelText("Animated writing ellipsis")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(draftWaitingMessageDelayMs);
    });

    expect(screen.getByRole("button", { name: `${draftWaitingMessages.at(-1)}...` }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(randomSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
