import { describe, expect, it } from "vitest";
import {
  NEEDS_ANSWER,
  buildDraftContextMarkdown,
  buildExportMarkdown,
  buildSampleContextMarkdown,
  buildScriptBase,
  buildSuggestionContextMarkdown,
  createLoglineSuggestions,
  guidedSetupQuestions,
  parseExportMarkdown,
} from "./guidedSetup";

describe("buildSuggestionContextMarkdown", () => {
  it("condenses each room section to a single sentence", () => {
    const context = buildSuggestionContextMarkdown({
      premise: "# Premise Room\n\n## Logline\nA one-armed pitcher claws toward the majors. He refuses every offer of help.",
      beats:
        "# Beats Room\n\n## Opening Image\nJoe tapes his arm at dawn. Then he throws a hundred pitches alone. Nobody watches.",
    });

    expect(context).toContain("Logline: A one-armed pitcher claws toward the majors.");
    expect(context).not.toContain("He refuses every offer of help");
    expect(context).toContain("Opening Image: Joe tapes his arm at dawn.");
    expect(context).not.toContain("Nobody watches");
  });

  it("skips rooms that have no markdown", () => {
    const context = buildSuggestionContextMarkdown({ premise: "# Premise Room\n\n## Logline\nA quiet heist.", beats: "" });

    expect(context).toContain("Logline: A quiet heist.");
    expect(context).not.toContain("beats.md");
  });
});

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
    expect(base.rooms.beats).toContain(
      `## Debate / Refusal\n${needsYourAnswer} Show why the protagonist hesitates, rationalizes, or tries the wrong safer path.`,
    );
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

  it("uses beat-purpose prompts instead of repeating setup answers on beat stickies", () => {
    const storyFacts = {
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      protagonist: "Joe, a determined one-armed pitcher",
      surfaceWant: "become a professional baseball player",
      stakes: "he loses the only dream he has left",
      falseBelief: "determination and hard work is enough to be a pro baseball player",
      opposition: "the fact that they only have one arm and baseball needs 2",
      endingDirection: "He changes and wins",
    };
    const base = buildScriptBase({
      rawIdea: "A one-armed pitcher tries to make the majors.",
      ...storyFacts,
      structurePreference: "Classic 3-act spine",
    });

    expect(base.rooms.beats).toContain(
      "## Opening Image\n[needs your answer] Describe the first visual snapshot: who, where, and what feels normal before the story applies pressure.",
    );
    expect(base.rooms.beats).toContain(
      "## Bad Guys Close In\n[needs your answer] Let pressure pile up from rivals, flaws, consequences, and the clock until escape routes close and the protagonist cannot dodge the lie anymore.",
    );
    for (const fact of Object.values(storyFacts)) {
      expect(base.rooms.beats).not.toContain(fact);
    }
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
      "[needs your answer] Write the sequence that proves the movie's core promise: the fun, dread, longing, awe, or tension the audience came for.",
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

  it("turns user-entered sentences into lower-case logline fragments", () => {
    const suggestions = createLoglineSuggestions({
      protagonist: "Joe starts full of hope but slowly breaks down.",
      surfaceWant: "Become a professional baseball player.",
      stakes: "They lose their other arm because they don't have the money to pay for surgery.",
      opposition: "They only have one arm, which is not enough to be a pro baseball player.",
      falseBelief: "That determination and hard work is enough to be a pro baseball player.",
    });

    expect(suggestions[0]).toBe(
      "When Joe starts full of hope but slowly breaks down, they must become a professional baseball player, they only have one arm, which is not enough to be a pro baseball player forces them to act before they lose their other arm because they don't have the money to pay for surgery.",
    );
    expect(suggestions[1]).toBe(
      "Joe starts full of hope but slowly breaks down, and must become a professional baseball player before they lose their other arm because they don't have the money to pay for surgery, but winning means confronting the lie that that determination and hard work is enough to be a pro baseball player.",
    );
  });

  it("exports all rooms into one markdown document", () => {
    const base = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    const exported = buildExportMarkdown(base.rooms);

    expect(exported).toContain("# Plot Goblin Export");
    expect(exported).toContain("<!-- plot-goblin-room: premise -->");
    expect(exported).toContain("## premise.md");
    expect(exported).toContain("## scenes.md");
    expect(exported).toContain("## script-parameters.md");
    expect(exported).toContain("## create-script.md");
    expect(exported).toContain("A detective investigates a murder on the moon.");
  });

  it("builds a compact draft context without create-script and with capped scenes", () => {
    const base = buildScriptBase({
      rawIdea: "A chef has to save a haunted diner before sunrise.",
      protagonist: "Mina",
      surfaceWant: "save the diner",
      stakes: "she loses the only home she has",
      falseBelief: "asking for help means failure",
      opposition: "a landlord hiding a ghost problem",
      structurePreference: "Classic 3-act spine",
    });
    base.rooms["create-script"] = "# Create the Script Room\n\nOld draft output that should not feed the next draft.";
    base.rooms.scenes = `# Scenes Room

## Saved scenes

### Scene: First Haunting

**Location / time:** INT. DINER - NIGHT

**Characters:**
Mina, The Landlord

**Scene want:**
Mina wants the landlord to admit what happened.

**Opposition:**
${"The landlord dodges the truth. ".repeat(120)}

**Turn:**
Mina hears the freezer answer.
`;

    const compact = buildDraftContextMarkdown(base.rooms);

    expect(compact.length).toBeLessThan(buildExportMarkdown(base.rooms).length);
    expect(compact).toContain("## premise.md");
    expect(compact).toContain("## scenes.md");
    expect(compact).toContain("First Haunting");
    expect(compact).toContain("Mina wants the landlord");
    expect(compact).not.toContain("create-script.md");
    expect(compact).not.toContain("Old draft output");
    expect(compact).not.toContain("The landlord dodges the truth. ".repeat(20));
  });

  it("builds the draft context from every saved source room markdown", () => {
    const base = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    base.rooms.premise = "# Premise Room\n\nPremise saved from local markdown.";
    base.rooms.characters = "# Characters Room\n\nCharacter saved from local markdown.";
    base.rooms.theme = "# Theme Room\n\nTheme saved from local markdown.";
    base.rooms.beats = "# Beats Room\n\nBeats saved from local markdown.";
    base.rooms.scenes = "# Scenes Room\n\nScenes saved from local markdown.";
    base.rooms["script-parameters"] = "# Script Parameters Room\n\nParameters saved from local markdown.";
    base.rooms["create-script"] = "# Create the Script Room\n\nOld generated draft should stay out.";
    base.rooms.drafts = "# Drafts Room\n\nOld saved draft shelf should stay out.";

    const compact = buildDraftContextMarkdown(base.rooms);

    expect(compact).toContain("## premise.md");
    expect(compact).toContain("Premise saved from local markdown.");
    expect(compact).toContain("## characters.md");
    expect(compact).toContain("Character saved from local markdown.");
    expect(compact).toContain("## theme.md");
    expect(compact).toContain("Theme saved from local markdown.");
    expect(compact).toContain("## beats.md");
    expect(compact).toContain("Beats saved from local markdown.");
    expect(compact).toContain("## scenes.md");
    expect(compact).toContain("Scenes saved from local markdown.");
    expect(compact).toContain("## script-parameters.md");
    expect(compact).toContain("Parameters saved from local markdown.");
    expect(compact).not.toContain("create-script.md");
    expect(compact).not.toContain("Old generated draft should stay out.");
    expect(compact).not.toContain("drafts.md");
    expect(compact).not.toContain("Old saved draft shelf should stay out.");
  });

  it("caps the complete draft context so blueprint requests stay under the API prompt limit", () => {
    const base = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    base.rooms.premise = `# Premise Room\n\n${"Premise detail. ".repeat(2_000)}`;
    base.rooms.characters = `# Characters Room\n\n${"Character detail. ".repeat(2_000)}`;
    base.rooms.theme = `# Theme Room\n\n${"Theme detail. ".repeat(2_000)}`;
    base.rooms.beats = `# Beats Room\n\n${"Beat detail. ".repeat(2_000)}`;
    base.rooms.scenes = `# Scenes Room\n\n${"Scene detail. ".repeat(2_000)}`;
    base.rooms["script-parameters"] = `# Script Parameters Room\n\n${"Parameter detail. ".repeat(2_000)}`;

    const compact = buildDraftContextMarkdown(base.rooms);

    expect(compact.length).toBeLessThanOrEqual(28_000);
    expect(compact).toContain("[...capped for draft prompt]");
  });

  it("builds sample context from core rooms plus only early beats and scenes", () => {
    const base = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    base.rooms.premise = "# Premise Room\n\nA moon detective chases the killer before sunrise.";
    base.rooms.characters = "# Characters Room\n\nMara wants proof but refuses backup.";
    base.rooms.theme = "# Theme Room\n\nIsolation is not strength.";
    base.rooms["script-parameters"] = "# Script Parameters Room\n\nCurrent genre: Thriller.\nTarget page count: 100 pages.";
    base.rooms.beats = [
      "# Beats Room",
      "## Opening Image\nMara crosses a quiet crater.",
      "## Setup\nMara hides evidence from her partner.",
      "## Inciting Incident\nThe corpse transmits one last clue.",
      "## Act One Break\nMara steals a rover.",
      "## Promise of the Premise\nThe chase crosses the mining domes.",
      "## Midpoint\nMara learns the killer is inside command.",
      "## Final Image\nMara watches Earth rise with the case solved.",
    ].join("\n\n");
    base.rooms.scenes = [
      "# Scenes Room",
      "## Saved scenes",
      ...Array.from({ length: 10 }, (_, index) =>
        [
          `### Scene: Scene ${index + 1}`,
          "**Location / time:**",
          `Dome ${index + 1} - Night`,
          "**Scene want:**",
          `Mara wants clue ${index + 1}.`,
        ].join("\n"),
      ),
    ].join("\n\n");

    const compact = buildSampleContextMarkdown(base.rooms);

    expect(compact).toContain("## premise.md");
    expect(compact).toContain("## Opening Image");
    expect(compact).toContain("## Midpoint");
    expect(compact).not.toContain("## Final Image");
    expect(compact).toContain("1. Scene 1");
    expect(compact).toContain("8. Scene 8");
    expect(compact).not.toContain("10. Scene 10");
    expect(compact.length).toBeLessThanOrEqual(16_000);
  });

  it("imports the same room markdown that export writes", () => {
    const base = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    base.rooms.premise = "# Premise Room\n\n## Stakes\nMoon murder evidence melts at sunrise.";
    base.rooms.scenes = "# Scenes Room\n\n## Saved scenes\n\n### Scene: crater chase";

    const exported = buildExportMarkdown(base.rooms);
    const imported = parseExportMarkdown(exported);

    expect(imported.rooms.premise).toBe(base.rooms.premise);
    expect(imported.rooms.scenes).toBe(base.rooms.scenes);
  });
});
