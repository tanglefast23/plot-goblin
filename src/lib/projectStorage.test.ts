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

    expect(migrated.rooms.beats).toContain("[needs your answer] Stubborn one-armed pitcher hesitates");
    expect(migrated.rooms.beats).toContain(
      "## Setup\nEstablish the world, the want (become a professional baseball player), the lie (asking for help makes him weak)",
    );
    expect(persisted).toContain("[needs your answer] Stubborn one-armed pitcher hesitates");
  });

  it("does not duplicate migrated scene prompts on later loads", () => {
    const project = buildScriptBase({});
    project.rooms.scenes = project.rooms.scenes.replace(
      "[needs your answer] a protagonist whose want exposes the wound they keep protecting, plus whoever can apply the most pressure in this moment.",
      "Who is in the scene, and who has the most pressure on them?",
    );
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    ensureProject();
    const migratedAgain = ensureProject();

    expect(
      migratedAgain.rooms.scenes.match(/\[Needs writing\] Who is in the scene, and who has the most pressure on them\?/g),
    ).toHaveLength(1);
  });

  it("migrates legacy needs-answer sections to editable goblin guesses", () => {
    const project = buildScriptBase({
      rawIdea: "A one-armed pitcher tries to make the majors.",
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      protagonist: "Stubborn one-armed pitcher",
      surfaceWant: "become a professional baseball player",
      stakes: "he loses the only dream he has left",
      falseBelief: "effort is all that is needed to become a baseball player in the professional league",
      opposition: "better players who have two arms",
      endingDirection: "He changes and wins",
      structurePreference: "Classic 3-act spine",
    });
    project.rooms.characters = project.rooms.characters
      .replace(/\n### Deeper need\n[^\n]+/, "\n### Deeper need\n[Needs answer]")
      .replace(/\n### Flaw \/ defense mechanism\n[^\n]+/, "\n### Flaw / defense mechanism\n[Needs answer]")
      .replace(/\n### Pressure test\n[^\n]+/, "\n### Pressure test\n[Needs answer]")
      .replace(/\n### Why are they right from their point of view\?\n[^\n]+/, "\n### Why are they right from their point of view?\n[Needs answer]");
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    const migrated = ensureProject();

    expect(migrated.rooms.characters).toContain(
      "### Deeper need\n[needs your answer] They may need to accept that effort alone is not enough",
    );
    expect(migrated.rooms.characters).toContain("### Flaw / defense mechanism\n[needs your answer]");
    expect(migrated.rooms.characters).not.toContain("[Needs answer]");
  });

  it("adds newly introduced active rooms to existing saved projects", () => {
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
    });
    delete project.rooms["script-parameters"];
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    const migrated = ensureProject();
    const persisted = window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "";

    expect(migrated.rooms["script-parameters"]).toContain("# Script Parameters Room");
    expect(migrated.rooms["create-script"]).toContain("# Create the Script Room");
    expect(migrated.rooms["script-parameters"]).toContain("Current genre: Comedy.");
    expect(persisted).toContain("create-script");
    expect(persisted).toContain("script-parameters");
  });
});
