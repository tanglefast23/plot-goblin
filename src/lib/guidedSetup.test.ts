import { describe, expect, it } from "vitest";
import {
  NEEDS_ANSWER,
  buildExportMarkdown,
  buildScriptBase,
  createLoglineSuggestions,
  guidedSetupQuestions,
} from "./guidedSetup";

describe("guided setup model", () => {
  const needsYourAnswer = "[needs your answer]";

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
    expect(base.rooms["script-parameters"]).toContain("## Runtime / page target");
    expect(base.summary.needsAnswerCount).toBeGreaterThan(0);
  });

  it("seeds script parameters with genre, length, and strict AI drafting rules", () => {
    const base = buildScriptBase({
      genre: "Horror, Romance",
      audienceFeeling: "dread and longing",
      structurePreference: "Loose beat map",
    });

    expect(base.rooms["script-parameters"]).toContain("# Script Parameters Room");
    expect(base.rooms["script-parameters"]).toContain("Short film: roughly 5-30 pages");
    expect(base.rooms["script-parameters"]).toContain("Feature film: roughly 90-110 pages");
    expect(base.rooms["script-parameters"]).toContain("Current genre: Horror / Romance hybrid.");
    expect(base.rooms["script-parameters"]).toContain("Audience feeling: dread and longing.");
    expect(base.rooms["script-parameters"]).toContain("Structure mode: Loose beat map.");
    expect(base.rooms["script-parameters"]).toContain("Treat these as strict rules when generating script pages");
  });

  it("marks unfinished room prompts as editable goblin guesses", () => {
    const base = buildScriptBase({
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

    expect(base.rooms.premise).toContain(`## Polished logline\n${needsYourAnswer} When Stubborn one-armed pitcher must`);
    expect(base.rooms.characters).toContain(`### Deeper need\n${needsYourAnswer}`);
    expect(base.rooms.theme).toContain(`## Story proof\n${needsYourAnswer}`);
    expect(base.rooms.beats).toContain(`## Debate / Refusal\n${needsYourAnswer} Stubborn one-armed pitcher hesitates`);
    expect(base.rooms.scenes).toContain(`**Scene want:**\n${needsYourAnswer}`);
    expect(base.rooms.beats).not.toContain(`## Setup\n${needsYourAnswer}`);
    expect(base.summary.needsAnswerCount).toBeGreaterThan(0);
  });

  it("autofills unfinished room slots with editable goblin guesses", () => {
    const base = buildScriptBase({
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

    expect(base.rooms.characters).toContain(
      "### Deeper need\n[needs your answer] They may need to accept that effort alone is not enough",
    );
    expect(base.rooms.characters).toContain("### Flaw / defense mechanism\n[needs your answer]");
    expect(base.rooms.characters).toContain("### Pressure test\n[needs your answer]");
    expect(base.rooms.characters).toContain("### Why are they right from their point of view?\n[needs your answer]");
    expect(Object.values(base.rooms).join("\n")).not.toContain("[Needs answer]");
  });

  it("treats multiple movie kinds as a hybrid promise", () => {
    const genreQuestion = guidedSetupQuestions.find((question) => question.id === "genre");
    const base = buildScriptBase({
      genre: "Horror, Romance",
      audienceFeeling: "dread and longing",
    });

    expect(genreQuestion?.multiple).toBe(true);
    expect(base.rooms.premise).toContain("A horror / romance hybrid built to make the audience feel dread and longing.");
    expect(base.rooms.beats).toContain(
      "[needs your answer] Build a sequence that delivers the Horror / Romance hybrid promise and makes the audience feel dread and longing.",
    );
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
    expect(exported).toContain("## script-parameters.md");
    expect(exported).toContain("## create-script.md");
    expect(exported).toContain("A detective investigates a murder on the moon.");
  });
});
