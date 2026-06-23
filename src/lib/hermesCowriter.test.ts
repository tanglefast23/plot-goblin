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
    expect(prompt).toContain("Premise");
  });

  it("can ask one helpfully annoying follow-up question", () => {
    const prompt = buildCowriterPrompt({
      mode: "followup",
      answers: { rawIdea: "A guy changes" },
    });

    expect(prompt).toContain("Ask exactly one follow-up question");
    expect(prompt).toContain("helpfully annoying");
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
