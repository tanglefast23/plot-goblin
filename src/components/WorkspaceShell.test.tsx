import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildExportMarkdown, buildScriptBase } from "@/lib/guidedSetup";
import { ACCESS_KEY_STORAGE_KEY, ACCESS_MODE_STORAGE_KEY } from "@/lib/cowriterAccess";
import { DRAFT_STORAGE_KEY } from "@/lib/draftStorage";
import { PROJECT_STORAGE_KEY, saveProject } from "@/lib/projectStorage";
import { WorkspaceShell } from "./WorkspaceShell";

const completedSetupAnswers = {
  rawIdea: "",
  genre: "",
  audienceFeeling: "",
  protagonist: "",
  surfaceWant: "",
  stakes: "",
  falseBelief: "",
  opposition: "",
  endingDirection: "",
  structurePreference: "Classic 3-act spine",
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("WorkspaceShell", () => {
  it("shows the local-save status beside the Plot Goblin brand", async () => {
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        ...buildScriptBase(completedSetupAnswers),
        updatedAt: "2026-06-24T05:39:11.000Z",
      }),
    );

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    const brandStatus = await screen.findByLabelText("Plot Goblin save status");
    expect(brandStatus.textContent).toContain("Plot Goblin");
    expect(brandStatus.textContent).toContain("Saved locally");
    expect(brandStatus.textContent).toContain("last update");
  });

  it("shows the guided setup shortcut before a script has been started", async () => {
    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    expect(await screen.findByRole("link", { name: /guided setup/i })).toBeDefined();
  });

  it("shows room links in the topbar and keeps Home as the far-right navigation button", async () => {
    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    const navigation = screen.getByRole("navigation", { name: "Plot Goblin navigation" });
    expect(within(navigation).getByRole("link", { name: "Premise" }).getAttribute("href")).toBe("/rooms/premise");
    expect((await within(navigation).findByRole("link", { name: "Home" })).getAttribute("href")).toBe("/rooms");
    expect(within(navigation).queryByRole("button", { name: "Rooms" })).toBeNull();
    expect(navigation.lastElementChild?.textContent).toBe("Home");
  });

  it("keeps the guided setup shortcut for an auto-created blank rooms project", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({})));

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    expect(await screen.findByRole("link", { name: /guided setup/i })).toBeDefined();
  });

  it("hides the guided setup shortcut after guided setup has been completed", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase(completedSetupAnswers)));

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /guided setup/i })).toBeNull();
    });
  });

  it("hides the guided setup shortcut when setup saves a project in the current tab", async () => {
    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    expect(await screen.findByRole("link", { name: /guided setup/i })).toBeDefined();

    saveProject(buildScriptBase(completedSetupAnswers));

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /guided setup/i })).toBeNull();
    });
  });

  it("resets saved script data without clearing AI access", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase(completedSetupAnswers)));
    window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, "friend-key");
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "public");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reset saved script" }));

    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBe("friend-key");
    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBe("public");
  });

  it("keeps saved script data when the reset confirmation is canceled", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase(completedSetupAnswers)));
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reset saved script" }));

    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toBeTruthy();
  });

  it("resets AI access without clearing saved script data", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase(completedSetupAnswers)));
    window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, "friend-key");
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "public");

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reset AI access" }));

    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBeNull();
  });

  it("shows the current AI access mode in settings", async () => {
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "local");

    const { rerender } = render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByText("Current: Local")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, "friend-key");
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "public");

    rerender(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByText("Current: Bridge key")).toBeTruthy();
  });

  it("tests and saves a bridge access key from settings", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(await screen.findByLabelText("Bridge access key"), {
      target: { value: "friend-public-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test and save bridge key" }));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/hermes-cowriter",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "x-plot-goblin-key": "friend-public-key" }),
      }),
    );
    await waitFor(() => {
      expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBe("friend-public-key");
      expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBe("public");
      expect(screen.getByRole("button", { name: "Bridge key saved" })).toBeTruthy();
      expect(screen.getByText("Bridge key saved.")).toBeTruthy();
    });
  });

  it("shows bridge key failure on the settings save button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Enter the Plot Goblin access key to ask the public Hermes bridge." }),
      }),
    );

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(await screen.findByLabelText("Bridge access key"), {
      target: { value: "wrong-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test and save bridge key" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Bridge key failed" })).toBeTruthy();
      expect(screen.getByText("Enter the Plot Goblin access key to ask the public Hermes bridge.")).toBeTruthy();
    });
    expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBeNull();
  });

  it("switches AI access back to local from settings", async () => {
    window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, "friend-key");
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "public");

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("button", { name: "Use local" }));

    expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBe("local");
    expect(screen.getByText("Local AI access selected.")).toBeTruthy();
  });

  it("exports all saved drafts only after a screenplay format is selected", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify([
        {
          body: "Title: Love, Cursed\n\nINT. WEDDING VENUE - DAY\nMilo raises his camera.",
          createdAt: "2026-06-24T02:00:00.000Z",
          id: "draft-1",
          title: "Love, Cursed",
          updatedAt: "2026-06-24T02:00:00.000Z",
        },
        {
          body: "Title: Moon Murder\n\nEXT. LUNAR RIDGE - NIGHT\nBootprints cross the dust.",
          createdAt: "2026-06-24T03:00:00.000Z",
          id: "draft-2",
          title: "Moon Murder",
          updatedAt: "2026-06-24T03:00:00.000Z",
        },
      ]),
    );
    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByRole("button", { name: "Export screenplay" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export Fountain" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Export screenplay" }));

    expect(await screen.findByRole("button", { name: "Export all drafts" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export all formats" })).toBeNull();
    expect(screen.getByRole("button", { name: "Export Fountain" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Final Draft" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Word" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export RTF" })).toBeTruthy();

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:plot-goblin");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole("button", { name: "Export all drafts" }));

    expect(clickSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Select a format before exporting all drafts.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Export Fountain" }));
    fireEvent.click(screen.getByRole("button", { name: "Export all drafts" }));

    expect(clickSpy).toHaveBeenCalledTimes(3);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(3);
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(3);
  });

  it("imports an exported markdown bundle from topbar settings", async () => {
    const project = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    project.rooms.premise = "# Premise Room\n\n## Stakes\nMoon murder evidence melts at sunrise.";
    const exported = buildExportMarkdown(project.rooms);

    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const file = new File([exported], "plot-goblin-export.md", { type: "text/markdown" });
    Object.defineProperty(file, "text", { value: async () => exported });
    fireEvent.change(await screen.findByLabelText("Import Plot Goblin markdown"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.premise).toBe(project.rooms.premise);
    });
  });
});
