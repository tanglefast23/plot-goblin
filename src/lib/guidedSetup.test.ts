import { describe, expect, it } from "vitest";
import {
  NEEDS_ANSWER,
  buildExportMarkdown,
  buildScriptBase,
  createLoglineSuggestions,
  guidedSetupQuestions,
} from "./guidedSetup";

describe("guided setup model", () => {
  it("uses the locked nine-question setup with skip-friendly answers", () => {
    expect(guidedSetupQuestions.map((question) => question.id)).toEqual([
      "rawIdea",
      "genre",
      "audienceFeeling",
      "protagonist",
      "surfaceWant",
      "stakes",
      "falseBelief",
      "opposition",
      "endingDirection",
      "structurePreference",
    ]);
    expect(guidedSetupQuestions.every((question) => question.allowSkip)).toBe(true);
  });

  it("seeds all MVP room markdown and marks skipped answers as needing answers", () => {
    const base = buildScriptBase({
      rawIdea: "A chef has to save a haunted diner before sunrise.",
      protagonist: "Mina, an exhausted line cook",
      surfaceWant: "Save the diner",
      stakes: "She loses the only place that ever felt like home.",
    });

    expect(base.rooms.premise).toContain("A chef has to save a haunted diner before sunrise.");
    expect(base.rooms.characters).toContain("Mina, an exhausted line cook");
    expect(base.rooms.theme).toContain(NEEDS_ANSWER);
    expect(base.rooms.beats).toContain("## Opening Image");
    expect(base.rooms.scenes).toContain("## Scene list");
    expect(base.summary.needsAnswerCount).toBeGreaterThan(0);
  });

  it("creates two user-confirmed logline suggestions without editing room markdown", () => {
    const suggestions = createLoglineSuggestions({
      protagonist: "Mina, an exhausted line cook",
      surfaceWant: "save a haunted diner",
      stakes: "losing the only place that ever felt like home",
      opposition: "a landlord who wants the building condemned",
      falseBelief: "if she needs help, she has failed",
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toContain("Mina");
    expect(suggestions[0]).toContain("save a haunted diner");
    expect(suggestions[1]).toContain("if she needs help, she has failed");
  });

  it("exports all rooms into one markdown document", () => {
    const base = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    const exported = buildExportMarkdown(base.rooms);

    expect(exported).toContain("# Plot Goblin Export");
    expect(exported).toContain("## premise.md");
    expect(exported).toContain("## scenes.md");
    expect(exported).toContain("A detective investigates a murder on the moon.");
  });
});
