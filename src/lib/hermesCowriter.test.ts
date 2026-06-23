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
});
