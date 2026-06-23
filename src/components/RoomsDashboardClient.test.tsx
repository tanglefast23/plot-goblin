import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoomsDashboardClient } from "./RoomsDashboardClient";
import { buildScriptBase } from "@/lib/guidedSetup";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("RoomsDashboardClient", () => {
  it("labels seeded rooms with unfinished prompts as needing writing", async () => {
    const project = buildScriptBase({
      rawIdea: "A one-armed pitcher tries to make the majors.",
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      protagonist: "Stubborn one-armed pitcher",
      surfaceWant: "become a professional baseball player",
      stakes: "he loses the only dream he has left",
      falseBelief: "asking for help makes him weak",
      opposition: "better players who have two arms",
      endingDirection: "He changes and wins",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomsDashboardClient />);

    expect((await screen.findAllByText("Needs writing")).length).toBeGreaterThan(0);
  });
});
