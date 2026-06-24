import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRAFT_STORAGE_KEY } from "@/lib/draftStorage";
import { buildScriptBase } from "@/lib/guidedSetup";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";
import { RoomsDashboardClient } from "./RoomsDashboardClient";
import { WorkspaceShell } from "./WorkspaceShell";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  pushMock.mockClear();
  vi.restoreAllMocks();
});

describe("RoomsDashboardClient", () => {
  it("does not duplicate the shared local-save status inside the dashboard hero", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({ rawIdea: "A haunted lighthouse." })));

    render(
      <WorkspaceShell>
        <RoomsDashboardClient />
      </WorkspaceShell>,
    );

    expect(await screen.findByText(/Saved locally/)).toBeTruthy();
    expect(screen.getAllByText(/Saved locally/)).toHaveLength(1);
  });

  it("labels the guided setup action as a rerun after setup has already been completed", async () => {
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify(
        buildScriptBase({
          rawIdea: "A one-armed pitcher gets one last shot at the majors.",
          genre: "Sports drama",
          audienceFeeling: "Hope and pressure",
          protagonist: "Joe, a proud pitcher who refuses help.",
          surfaceWant: "Earn a contract at an open tryout.",
          stakes: "He loses his home and the last proof that he still belongs.",
          falseBelief: "Needing help means he is weak.",
          opposition: "Two gifted rival players and his own stubborn pride.",
          endingDirection: "They change and win",
          structurePreference: "Classic 3-act spine",
        }),
      ),
    );

    render(<RoomsDashboardClient />);

    expect((await screen.findByRole("link", { name: "Run guided setup again" })).getAttribute("href")).toBe(
      "/guided-setup",
    );
    expect(screen.queryByRole("link", { name: "Run guided setup" })).toBeNull();
  });

  it("keeps the first-run label before setup has been completed", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({ rawIdea: "A haunted lighthouse." })));

    render(<RoomsDashboardClient />);

    expect((await screen.findByRole("link", { name: "Run guided setup" })).getAttribute("href")).toBe("/guided-setup");
  });

  it("removes the dashboard markdown export action", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({ rawIdea: "A haunted lighthouse." })));

    render(<RoomsDashboardClient />);

    expect(await screen.findByRole("button", { name: "Start a new project" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export one giant .md" })).toBeNull();
  });

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
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify([{ body: "INT. KITCHEN - NIGHT", createdAt: "now", id: "draft-1", title: "Keep draft", updatedAt: "now" }]),
    );
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<RoomsDashboardClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Start a new project" }));

    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toContain("Keep me.");
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toContain("Keep draft");
    expect(screen.queryByRole("dialog", { name: "Script wiped" })).toBeNull();
  });

  it("wipes the local script and saved drafts before offering guided setup", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({ rawIdea: "Wipe me." })));
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify([{ body: "INT. ATTIC - NIGHT", createdAt: "now", id: "draft-1", title: "Old draft", updatedAt: "now" }]),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<RoomsDashboardClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Start a new project" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Start a new project? This will wipe all information for this script from this browser, including saved drafts. It cannot be retrieved again.",
    );
    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    const dialog = screen.getByRole("dialog", { name: "Script wiped" });
    expect(within(dialog).getByText("All information for this script has been wiped from this browser.")).toBeTruthy();
    expect(within(dialog).getByText("Would you like to run the guided setup again?")).toBeTruthy();
  });

  it("starts guided setup from the post-wipe dialog when the writer chooses yes", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({ rawIdea: "Begin again." })));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<RoomsDashboardClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Start a new project" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Script wiped" })).getByRole("button", { name: "Yes" }));

    expect(pushMock).toHaveBeenCalledWith("/guided-setup");
  });

  it("closes the post-wipe dialog and stays put when the writer chooses no", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({ rawIdea: "Stay here." })));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<RoomsDashboardClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Start a new project" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Script wiped" })).getByRole("button", { name: "No" }));

    expect(screen.queryByRole("dialog", { name: "Script wiped" })).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
