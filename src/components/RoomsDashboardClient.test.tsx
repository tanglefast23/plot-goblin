import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomsDashboardClient } from "./RoomsDashboardClient";
import { buildScriptBase } from "@/lib/guidedSetup";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("RoomsDashboardClient", () => {
  it("labels seeded rooms with editable guesses as needing your answers", async () => {
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

    expect((await screen.findAllByText("Needs your answers")).length).toBeGreaterThan(0);
  });

  it("shows the next draft-blocking room on the dashboard", async () => {
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
    project.rooms["script-parameters"] = "# Script Parameters Room\n\nFeature film. PG-13 sports comedy.";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomsDashboardClient />);

    expect(await screen.findByText("Next best room")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Script Parameters" }).getAttribute("href")).toBe(
      "/rooms/script-parameters",
    );
  });

  it("does not reset the local project when dashboard confirmation is canceled", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({ rawIdea: "Keep me." })));
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<RoomsDashboardClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Reset local script" }));

    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toContain("Keep me.");
  });
});
