import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

  it("offers screenplay export formats from topbar settings", async () => {
    render(
      <WorkspaceShell>
        <p>Workspace content</p>
      </WorkspaceShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByRole("button", { name: "Export Fountain" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Final Draft" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Word" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export RTF" })).toBeTruthy();
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
