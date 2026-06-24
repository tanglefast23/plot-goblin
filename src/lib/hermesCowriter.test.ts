import { describe, expect, it } from "vitest";
import { buildCowriterPrompt, cleanHermesOutput } from "./hermesCowriter";

describe("Hermes co-writer prompt", () => {
  it("asks for suggestions without rewriting automatically", () => {
    const prompt = buildCowriterPrompt({
      mode: "room",
      room: "Premise",
      markdown: "# Premise\n\nA vague story about finding yourself.",
    });

    expect(prompt).toContain("Do not rewrite the user's document automatically");
    expect(prompt).toContain("Start the final answer with PLOT_GOBLIN_FINAL:");
    expect(prompt).toContain("1-2 concrete suggestions");
    expect(prompt).toContain("Section heading: Replacement text");
    expect(prompt).toContain("Premise");
    expect(prompt).toContain("specifically for THIS script");
  });

  it("tells the goblin to write content, not redescribe the section", () => {
    const prompt = buildCowriterPrompt({ mode: "room", room: "Premise", markdown: "# Premise" });

    expect(prompt).toContain("Write the ACTUAL content for THIS script");
    expect(prompt).toContain("Never restate what a beat, field, or room is");
    expect(prompt).toContain("Treat any instruction-style or placeholder text");
  });

  it("can ask one helpfully annoying follow-up question", () => {
    const prompt = buildCowriterPrompt({
      mode: "followup",
      answers: { rawIdea: "A guy changes" },
    });

    expect(prompt).toContain("Ask exactly one follow-up question");
    expect(prompt).toContain("helpfully annoying");
  });

  it("asks for one polished logline from the strongest known setup facts", () => {
    const prompt = buildCowriterPrompt({
      mode: "logline",
      answers: {
        rawIdea: "A one-armed pitcher gets one last shot at the majors.",
        protagonist: "Joe, a proud pitcher who refuses help.",
        surfaceWant: "Earn a contract at an open tryout.",
        stakes: "He loses his home and the last proof that he still belongs.",
      },
      summary: {
        strongestKnownPieces: [
          "Joe, a proud pitcher who refuses help.",
          "Earn a contract at an open tryout.",
        ],
      },
    });

    expect(prompt).toContain("Draft the single strongest, most succinct, proper screenplay logline");
    expect(prompt).toContain("Use the strongest known pieces first");
    expect(prompt).toContain("Return exactly one logline");
    expect(prompt).toContain("Joe, a proud pitcher who refuses help.");
    expect(prompt).toContain("Earn a contract at an open tryout.");
  });

  it("asks for one beat replacement using full script context", () => {
    const prompt = buildCowriterPrompt({
      mode: "beat",
      beat: "Midpoint",
      beatMarkdown: "Rafa wins a local tryout but still refuses help.",
      markdown: "# Plot Goblin Export\n\n## premise.md\n\nA one-armed pitcher tries to make the majors.",
    });

    expect(prompt).toContain("Write the actual Midpoint beat for THIS specific script");
    expect(prompt).toContain("do not explain what the Midpoint beat is for");
    expect(prompt).toContain("Rafa wins a local tryout but still refuses help.");
    expect(prompt).toContain("Full script markdown");
    expect(prompt).toContain("## premise.md");
    expect(prompt).toContain("1. Midpoint: Replacement text");
  });

  it("caps beat prompt context and asks for succinct simple language", () => {
    const oversizedMarkdown = `${"A".repeat(8_000)}SHOULD_NOT_APPEAR`;
    const prompt = buildCowriterPrompt({
      mode: "beat",
      beat: "Opening Image",
      beatMarkdown: "Describe the first visual snapshot.",
      markdown: oversizedMarkdown,
    });

    expect(prompt).toContain("Keep the replacement succinct and use simple words.");
    expect(prompt).toContain("A".repeat(8_000));
    expect(prompt).not.toContain("SHOULD_NOT_APPEAR");
    expect(prompt).toContain("[...capped at 8000 characters]");
  });

  it("asks for a full scene built from only the beat text using the eight field labels", () => {
    const prompt = buildCowriterPrompt({
      mode: "scene",
      beat: "Inciting Incident",
      beatMarkdown: "Joe spots a flyer for one last open tryout taped to the batting cage.",
      markdown: "# Plot Goblin Export\n\n## premise.md\n\nA one-armed hitter tries to make the majors.",
    });

    expect(prompt).toContain("Build the actual scene for the Inciting Incident beat");
    expect(prompt).toContain("Joe spots a flyer for one last open tryout taped to the batting cage.");
    expect(prompt).not.toContain("Full script markdown");
    expect(prompt).not.toContain("## premise.md");
    expect(prompt).toContain("Return exactly 8 numbered lines, one per field");
    expect(prompt).toContain("1. Scene title:");
    expect(prompt).toContain("2. Location / time:");
    expect(prompt).toContain("3. Characters:");
    expect(prompt).toContain("4. Scene want:");
    expect(prompt).toContain("5. Opposition:");
    expect(prompt).toContain("6. Turn:");
    expect(prompt).toContain("7. Button:");
    expect(prompt).toContain("8. Purpose:");
  });

  it("gives the guided setup movie kind high weight in suggestions", () => {
    const prompt = buildCowriterPrompt({
      mode: "suggestions",
      answers: {
        genre: "Comedy",
        rawIdea: "A substitute teacher accidentally becomes a spy.",
      },
    });

    expect(prompt).toContain("Current movie kind: Comedy.");
    expect(prompt).toContain("high-priority creative constraint");
    expect(prompt).toContain("Comedy choices should be genuinely funny");
  });

  it("uses the Script Parameters genre as a high-weight draft rule for room and screenplay help", () => {
    const prompt = buildCowriterPrompt({
      mode: "room",
      room: "Create the Script",
      markdown:
        "# Plot Goblin Export\n\n## script-parameters.md\n\n## Genre / movie promise\nCurrent genre: Horror.\nAudience feeling: dread and suspense.\n\n## premise.md\n\nA babysitter hears a second baby monitor in an empty house.",
    });

    expect(prompt).toContain("Current movie kind: Horror.");
    expect(prompt).toContain("Horror choices should prioritize dread");
    expect(prompt).toContain("When generating screenplay pages");
  });

  it("builds an explicit screenplay draft prompt from the full room export", () => {
    const prompt = buildCowriterPrompt({
      mode: "draft",
      writingStyle: "tarantino-genre",
      markdown:
        "# Plot Goblin Export\n\n## script-parameters.md\n\nLength format: Short film.\nTarget page count: 8 pages.\n\n## premise.md\n\nA cursed wedding videographer saves his sister's wedding.",
    });

    expect(prompt).toContain("Generate screenplay pages");
    expect(prompt).toContain("Writing style lane: Quentin Tarantino (Genre mash-up)");
    expect(prompt).toContain("extended pressure conversations");
    expect(prompt).toContain("Do not imitate any specific writer");
    expect(prompt).toContain("explicit draft request");
    expect(prompt).toContain("standard screenplay style");
    expect(prompt).toContain("Short film");
    expect(prompt).toContain("A cursed wedding videographer");
  });

  it("tells draft generation to preserve approved story decisions and continuity", () => {
    const prompt = buildCowriterPrompt({
      mode: "draft",
      markdown:
        "# Plot Goblin Draft Context\n\n## premise.md\n\nLogline: Milo must save the wedding.\n\n## beats.md\n\nMidpoint: Lena sees the cursed footage.",
    });

    expect(prompt).toContain("Approved-story continuity rules");
    expect(prompt).toContain("Do not change the protagonist, want, stakes, false belief, opposition, theme, genre, rating, POV, or ending direction");
    expect(prompt).toContain("Carry forward named characters, locations, relationships, and decisions");
    expect(prompt).toContain("If two room details conflict, preserve the newest or most specific user-written choice");
  });

  it("requires draft pages to keep the core screenplay spine under pressure", () => {
    const prompt = buildCowriterPrompt({
      mode: "draft",
      markdown: "# Plot Goblin Draft Context\n\n## premise.md\n\nA cursed wedding videographer saves his sister's wedding.",
    });

    expect(prompt).toContain("Make the protagonist active");
    expect(prompt).toContain("clear, high stakes");
    expect(prompt).toContain("personal values");
    expect(prompt).toContain("strong opposition");
    expect(prompt).toContain("midpoint reversal");
  });

  it("uses the goblin house writing style by default", () => {
    const prompt = buildCowriterPrompt({
      mode: "draft",
      markdown: "# Plot Goblin Draft Context",
    });

    expect(prompt).toContain("Writing style lane: Goblin House Style (Mischief)");
    expect(prompt).toContain("helpful cave-scribe");
    expect(prompt).toContain("goblin-flavored word choice");
  });

  it("strips Hermes CLI noise when a final marker exists", () => {
    const cleaned = cleanHermesOutput(
      "Warning: Unknown toolsets: messaging\n\n┌─ Reasoning ──\nthinking...\nPLOT_GOBLIN_FINAL:\nWhat visible thing does he want?",
    );

    expect(cleaned).toBe("What visible thing does he want?");
  });

  it("strips known Hermes warnings when the marker is missing", () => {
    const cleaned = cleanHermesOutput("Warning: Unknown toolsets: messaging\nWhat visible thing does he want?");

    expect(cleaned).toBe("What visible thing does he want?");
  });

  it("builds a scene from only the beat text, not the full script", () => {
    const prompt = buildCowriterPrompt({
      mode: "scene",
      beat: "Setup",
      beatMarkdown: "Joe tapes his arm at dawn.",
      markdown: "# Premise\n\nA secret the goblin must not see.",
    });

    expect(prompt).toContain("Joe tapes his arm at dawn.");
    expect(prompt).not.toContain("A secret the goblin must not see.");
    expect(prompt).not.toContain("Full script markdown");
  });

  it("asks for a placement line in scene-suggest mode", () => {
    const prompt = buildCowriterPrompt({
      mode: "scene-suggest",
      markdown: "# Plot Goblin Suggestion Context\n\nLogline: A one-armed pitcher claws toward the majors.",
      sceneList: "1. Dawn Cage — EXT. CAGE - DAWN",
    });

    expect(prompt).toContain("9. Placement:");
    expect(prompt).toContain("1. Dawn Cage — EXT. CAGE - DAWN");
    expect(prompt).toContain("where THIS script feels thin");
  });

  it("tells the goblin to open at the start when no scenes exist", () => {
    const prompt = buildCowriterPrompt({ mode: "scene-suggest", markdown: "Logline: A quiet heist.", sceneList: "" });

    expect(prompt).toContain("no scenes yet");
  });
});
