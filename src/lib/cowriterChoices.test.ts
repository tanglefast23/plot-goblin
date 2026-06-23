import { describe, expect, it } from "vitest";
import { applyCowriterChoice, extractCowriterNotes, parseCowriterChoices } from "./cowriterChoices";

describe("cowriter choices", () => {
  it("parses numbered section choices from Hermes output", () => {
    const choices = parseCowriterChoices(`1. Surface want: Win a televised open tryout in 30 days.

2. Stakes: Every failure risks permanent damage to his remaining arm.

Pointed follow-up: Is pride the real antagonist?`);

    expect(choices).toEqual([
      {
        number: 1,
        target: "Surface want",
        text: "Win a televised open tryout in 30 days.",
      },
      {
        number: 2,
        target: "Stakes",
        text: "Every failure risks permanent damage to his remaining arm.",
      },
    ]);
    expect(extractCowriterNotes(`1. Surface want: Win a televised open tryout in 30 days.

2. Stakes: Every failure risks permanent damage to his remaining arm.

Pointed follow-up: Is pride the real antagonist?`)).toBe("Pointed follow-up: Is pride the real antagonist?");
  });

  it("replaces the matching markdown section when a choice names one", () => {
    const markdown = `# Premise Room

## Surface want
Become a professional baseball player.

## Stakes
He loses the only dream he has left.
`;

    const updated = applyCowriterChoice(markdown, {
      number: 2,
      target: "Stakes",
      text: "Every failure risks permanent damage to his remaining arm.",
    });

    expect(updated).toContain("## Surface want\nBecome a professional baseball player.");
    expect(updated).toContain("## Stakes\nEvery failure risks permanent damage to his remaining arm.");
    expect(updated).not.toContain("He loses the only dream he has left.");
  });
});
