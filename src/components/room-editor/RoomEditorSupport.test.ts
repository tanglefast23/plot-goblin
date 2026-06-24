import { describe, expect, it } from "vitest";
import {
  answeredBeatSections,
  formatSceneDraftValues,
  numberedSceneList,
  parseSuggestedPlacement,
  sceneDraftValuesFromChoices,
} from "./RoomEditorSupport";

describe("numberedSceneList", () => {
  function sceneCard(title: string, locationTime: string) {
    return formatSceneDraftValues({
      title,
      locationTime,
      characters: "Joe",
      sceneWant: "Win.",
      opposition: "Doubt.",
      turn: "He changes.",
      button: "He leaves.",
      purpose: "Setup",
    });
  }

  it("numbers scenes with their title and location", () => {
    const cards = [sceneCard("Dawn Cage", "EXT. CAGE - DAWN"), sceneCard("Gym Argument", "INT. GYM - DAY")];

    expect(numberedSceneList(cards)).toBe("1. Dawn Cage — EXT. CAGE - DAWN\n2. Gym Argument — INT. GYM - DAY");
  });

  it("returns an empty string when there are no scenes", () => {
    expect(numberedSceneList([])).toBe("");
  });
});

describe("parseSuggestedPlacement", () => {
  it("reads an 'after scene N' placement line as the insert index", () => {
    expect(parseSuggestedPlacement("9. Placement: after scene 1", 3)).toBe(1);
  });

  it("treats 'start' as the very beginning", () => {
    expect(parseSuggestedPlacement("9. Placement: start", 3)).toBe(0);
  });

  it("reads a 'before scene N' placement as the slot before it", () => {
    expect(parseSuggestedPlacement("Placement: before scene 3", 5)).toBe(2);
  });

  it("clamps an out-of-range scene number to the end", () => {
    expect(parseSuggestedPlacement("Placement: after scene 99", 4)).toBe(4);
  });

  it("falls back to the end when there is no usable placement line", () => {
    expect(parseSuggestedPlacement("no placement here", 6)).toBe(6);
  });
});

describe("answeredBeatSections", () => {
  it("keeps written beats and drops needs-answer, empty, and custom-beats sections", () => {
    const beatsMarkdown = `# Beats Room

## Setup
Joe lives at the batting cages before sunrise, taping his only arm with his teeth.

## Inciting Incident
[needs your answer] What specific event forces the protagonist toward the want?

## Midpoint

## Custom beats
Add custom beats.`;

    const sections = answeredBeatSections(beatsMarkdown);

    expect(sections.map((section) => section.heading)).toEqual(["Setup"]);
    expect(sections[0].body).toContain("batting cages before sunrise");
  });
});

describe("sceneDraftValuesFromChoices", () => {
  it("maps labeled field choices onto the matching scene draft values", () => {
    const values = sceneDraftValuesFromChoices([
      { number: 1, target: "Scene title", text: "Last Tryout" },
      { number: 2, target: "Location / time", text: "EXT. SANDLOT - DAWN" },
      { number: 3, target: "Characters", text: "Joe, Mo (most pressure)" },
      { number: 4, target: "Scene want", text: "Joe wants the scout to watch one pitch." },
      { number: 5, target: "Opposition", text: "The scout is already leaving." },
      { number: 6, target: "Turn", text: "Joe admits he needs a catcher." },
      { number: 7, target: "Button", text: "He drops the ball into Mo's glove." },
      { number: 8, target: "Purpose", text: "Character / tension" },
    ]);

    expect(values).toEqual({
      title: "Last Tryout",
      locationTime: "EXT. SANDLOT - DAWN",
      characters: "Joe, Mo (most pressure)",
      sceneWant: "Joe wants the scout to watch one pitch.",
      opposition: "The scout is already leaving.",
      turn: "Joe admits he needs a catcher.",
      button: "He drops the ball into Mo's glove.",
      purpose: "Character / tension",
    });
  });

  it("only fills the fields that came back labeled", () => {
    const values = sceneDraftValuesFromChoices([
      { number: 1, target: "Scene title", text: "Last Tryout" },
      { number: 2, target: "Scene want", text: "Joe wants one pitch." },
    ]);

    expect(values).toEqual({ title: "Last Tryout", sceneWant: "Joe wants one pitch." });
  });

  it("falls back to field order when the goblin returns no usable labels", () => {
    const values = sceneDraftValuesFromChoices([
      { number: 1, text: "Last Tryout" },
      { number: 2, text: "EXT. SANDLOT - DAWN" },
      { number: 3, text: "Joe, Mo" },
    ]);

    expect(values).toEqual({
      title: "Last Tryout",
      locationTime: "EXT. SANDLOT - DAWN",
      characters: "Joe, Mo",
    });
  });
});
