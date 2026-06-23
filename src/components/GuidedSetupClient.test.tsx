import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GuidedSetupClient } from "./GuidedSetupClient";
import { guidedSetupQuestions } from "@/lib/guidedSetup";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("GuidedSetupClient", () => {
  it("lets the writer go back and revise the previous answer", async () => {
    render(<GuidedSetupClient />);

    fireEvent.change(screen.getByRole("textbox", { name: /your answer/i }), {
      target: { value: "A one armed man dreams of playing professional baseball." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByRole("heading", { name: "What's the movie idea, badly explained?" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /your answer/i })).toHaveProperty(
      "value",
      "A one armed man dreams of playing professional baseball.",
    );

    fireEvent.change(screen.getByRole("textbox", { name: /your answer/i }), {
      target: { value: "A one armed pitcher gets one last shot at the majors." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("textbox", { name: /your answer/i })).toHaveProperty(
      "value",
      "A one armed pitcher gets one last shot at the majors.",
    );
  });

  it("shows an answer path that can jump back to an earlier setup answer", async () => {
    render(<GuidedSetupClient />);

    fireEvent.change(screen.getByRole("textbox", { name: /your answer/i }), {
      target: { value: "A one armed man dreams of playing professional baseball." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Horror" }));

    fireEvent.click(screen.getByRole("button", { name: /^go to answer 1:/i }));

    expect(await screen.findByRole("heading", { name: "What's the movie idea, badly explained?" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /your answer/i })).toHaveProperty(
      "value",
      "A one armed man dreams of playing professional baseball.",
    );

    fireEvent.click(screen.getByRole("button", { name: /^go to answer 2:/i }));

    expect(await screen.findByRole("heading", { name: "What kind of movie is this?" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /your answer/i })).toHaveProperty("value", "Horror");
  });

  it("advances to the next setup question when the writer presses Enter in the answer box", async () => {
    render(<GuidedSetupClient />);

    const answerBox = screen.getByRole("textbox", { name: /your answer/i });

    fireEvent.change(answerBox, { target: { value: "A one armed man dreams of playing professional baseball." } });
    fireEvent.keyDown(answerBox, { key: "Enter", code: "Enter" });

    await screen.findByRole("heading", { name: "What kind of movie is this?" });
  });

  it("keeps the answer box focused as the writer moves through onboarding", async () => {
    render(<GuidedSetupClient />);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: /your answer/i }));
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: /your answer/i }));
    });

    const horrorButton = screen.getByRole("button", { name: "Horror" });

    horrorButton.focus();
    fireEvent.click(horrorButton);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: /your answer/i }));
    });
  });

  it("returns focus to the answer box after single-choice option selections", async () => {
    render(<GuidedSetupClient />);

    for (let questionIndex = 0; questionIndex < 8; questionIndex += 1) {
      fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    }

    const endingOption = screen.getByRole("button", { name: "I don't know yet" });

    endingOption.focus();
    fireEvent.click(endingOption);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: /your answer/i }));
    });
  });

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

  it("shows a saved logline confirmation after accepting a suggestion", () => {
    render(<GuidedSetupClient />);

    for (let questionIndex = 0; questionIndex < guidedSetupQuestions.length; questionIndex += 1) {
      fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    }

    fireEvent.click(screen.getByRole("button", { name: /make it sound less/i }));
    const suggestion = screen.getByText(/When a protagonist whose want exposes/i).textContent ?? "";

    fireEvent.click(screen.getAllByRole("button", { name: "Accept this one" })[0]);

    expect(screen.getByText("Accepted logline")).toBeTruthy();
    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toContain(suggestion);
  });

  it("lets a later accepted suggestion replace the saved logline", async () => {
    render(<GuidedSetupClient />);

    for (let questionIndex = 0; questionIndex < guidedSetupQuestions.length; questionIndex += 1) {
      fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    }

    fireEvent.click(screen.getByRole("button", { name: /make it sound less/i }));
    const suggestions = [
      screen.getByText(/When a protagonist whose want exposes/i).textContent ?? "",
      screen.getByText(/^a protagonist whose want exposes/i).textContent ?? "",
    ];

    fireEvent.click(screen.getAllByRole("button", { name: "Accept this one" })[0]);
    await screen.findByText("Accepted logline");

    fireEvent.click(screen.getAllByRole("button", { name: "Accept this one" })[0]);

    await waitFor(() => {
      expect(screen.getByText("Accepted logline").parentElement?.textContent).toContain(suggestions[1]);
      expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toContain(suggestions[1]);
    });
  });
});
