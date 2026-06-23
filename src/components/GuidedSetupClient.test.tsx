import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GuidedSetupClient } from "./GuidedSetupClient";
import { guidedSetupQuestions } from "@/lib/guidedSetup";

afterEach(() => cleanup());

describe("GuidedSetupClient", () => {
  it("lets the movie kind step combine multiple choices into one hybrid answer", () => {
    render(<GuidedSetupClient />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Horror" }));
    fireEvent.click(screen.getByRole("button", { name: "Romance" }));

    const answerBox = screen.getByRole("textbox", { name: /your answer/i }) as HTMLTextAreaElement;

    expect(answerBox.value).toBe("Horror, Romance");
    expect(screen.getByRole("button", { name: "Horror" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Romance" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("marks the polished logline button as the visual attention target", () => {
    render(<GuidedSetupClient />);

    for (let questionIndex = 0; questionIndex < guidedSetupQuestions.length; questionIndex += 1) {
      fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    }

    const loglineButton = screen.getByRole("button", { name: /make it sound less/i });

    expect(loglineButton.className).toContain("attentionButton");
  });
});
