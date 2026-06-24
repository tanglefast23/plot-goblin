import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildExportMarkdown, buildScriptBase } from "@/lib/guidedSetup";
import { ACCESS_KEY_STORAGE_KEY, ACCESS_MODE_STORAGE_KEY } from "@/lib/cowriterAccess";
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
  it("shows the guided setup shortcut before a script has been started", async () => {
    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    expect(await screen.findByRole("link", { name: /guided setup/i })).toBeDefined();
  });

  it("shows Home as a topbar button next to the rooms dropdown", async () => {
    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    const navigation = screen.getByRole("navigation", { name: "Plot Goblin navigation" });
    expect((await within(navigation).findByRole("link", { name: "Home" })).getAttribute("href")).toBe("/rooms");
    expect(within(navigation).getByRole("button", { name: "Rooms" })).toBeTruthy();
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
      expect(screen.getByText("Bridge key saved.")).toBeTruthy();
    });
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

  it("opens screenplay export choices and downloads every format from the all option", async () => {
    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByRole("button", { name: "Export screenplay" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export Fountain" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Export screenplay" }));

    expect(await screen.findByRole("button", { name: "Export all formats" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Fountain" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Final Draft" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Word" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export RTF" })).toBeTruthy();

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:plot-goblin");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole("button", { name: "Export all formats" }));

    expect(clickSpy).toHaveBeenCalledTimes(5);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(5);
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(5);
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
