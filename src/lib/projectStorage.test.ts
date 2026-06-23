import { afterEach, describe, expect, it } from "vitest";
import { buildScriptBase } from "./guidedSetup";
import { ensureProject, PROJECT_STORAGE_KEY } from "./projectStorage";

afterEach(() => {
  window.localStorage.clear();
});

describe("project storage", () => {
  it("migrates legacy room starter prompts to needs-writing markers", () => {
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
    project.rooms.beats = project.rooms.beats.replace(
      "[Needs writing] Why they hesitate, dodge, rationalize, or choose badly.",
      "Why they hesitate, dodge, rationalize, or choose badly.",
    );
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    const migrated = ensureProject();
    const persisted = window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "";

    expect(migrated.rooms.beats).toContain("[Needs writing] Why they hesitate, dodge, rationalize, or choose badly.");
    expect(migrated.rooms.beats).toContain(
      "## Setup\nEstablish the world, the want (become a professional baseball player), the lie (asking for help makes him weak)",
    );
    expect(persisted).toContain("[Needs writing] Why they hesitate, dodge, rationalize, or choose badly.");
  });

  it("does not duplicate migrated scene prompts on later loads", () => {
    const project = buildScriptBase({});
    project.rooms.scenes = project.rooms.scenes.replace(
      "[Needs writing] Who is in the scene, and who has the most pressure on them?",
      "Who is in the scene, and who has the most pressure on them?",
    );
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    ensureProject();
    const migratedAgain = ensureProject();

    expect(
      migratedAgain.rooms.scenes.match(/\[Needs writing\] Who is in the scene, and who has the most pressure on them\?/g),
    ).toHaveLength(1);
  });
});
