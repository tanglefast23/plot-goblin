import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildScriptBase } from "@/lib/guidedSetup";
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
});
