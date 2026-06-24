import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuidedSetupClient } from "./GuidedSetupClient";
import { guidedSetupQuestions } from "@/lib/guidedSetup";
import { ACCESS_KEY_STORAGE_KEY } from "@/lib/cowriterAccess";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

function completeSetupWithAnswers() {
  const answers = [
    "A one-armed pitcher gets one last shot at the majors.",
    "Sports drama",
    "Hope and pressure",
    "Joe, a proud pitcher who refuses help.",
    "Earn a contract at an open tryout.",
    "He loses his home and the last proof that he still belongs.",
    "Needing help means he is weak.",
    "Two gifted rival players and his own stubborn pride.",
    "They change and win",
    "Classic 3-act spine",
  ];

  answers.forEach((answer, index) => {
    fireEvent.change(screen.getByRole("textbox", { name: /your answer/i }), { target: { value: answer } });
    fireEvent.click(screen.getByRole("button", { name: index === answers.length - 1 ? "Create script base" : "Next" }));
  });
}

describe("GuidedSetupClient", () => {
  it("prefills saved setup answers when the writer runs guided setup again", async () => {
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        answers: {
          rawIdea: "A one-armed pitcher gets one last shot at the majors.",
          genre: "Sports drama",
          audienceFeeling: "Hope and pressure",
          protagonist: "Joe, a proud pitcher who refuses help.",
          surfaceWant: "Earn a contract at an open tryout.",
          stakes: "He loses his home and the last proof that he still belongs.",
          falseBelief: "Needing help means he is weak.",
          opposition: "Two gifted rival players and his own stubborn pride.",
          endingDirection: "They change and win",
          structurePreference: "Classic 3-act spine",
        },
        rooms: {},
        summary: { strongestKnownPieces: [], goblinWarnings: [], needsAnswerCount: 0 },
        createdAt: "2026-06-24T00:00:00.000Z",
        updatedAt: "2026-06-24T00:00:00.000Z",
      }),
    );

    render(<GuidedSetupClient />);

    expect(await screen.findByRole("heading", { name: "What's the movie idea, badly explained?" })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /your answer/i })).toHaveProperty(
        "value",
        "A one-armed pitcher gets one last shot at the majors.",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("heading", { name: "What kind of movie is this?" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /your answer/i })).toHaveProperty("value", "Sports drama");
  });

  it("places Back before Next once the writer can return to a previous question", () => {
    render(<GuidedSetupClient />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const backButton = screen.getByRole("button", { name: "Back" });
    const nextButton = screen.getByRole("button", { name: "Next" });

    expect(backButton.compareDocumentPosition(nextButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

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

  it("uses the room-style goblin button for polished logline suggestions", () => {
    render(<GuidedSetupClient />);

    for (let questionIndex = 0; questionIndex < guidedSetupQuestions.length; questionIndex += 1) {
      fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    }

    const loglineButton = screen.getByRole("button", { name: /annoy the goblin for logline/i });

    expect(loglineButton.className).toContain("goblinSuggestButton");
  });

  it("asks Hermes to draft a succinct logline from the strongest known setup pieces", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output:
          "When proud one-armed pitcher Joe gets one last shot at the majors, two gifted rivals force him to accept help before he loses his home and his dream.",
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, "public-key");
    render(<GuidedSetupClient />);

    completeSetupWithAnswers();
    fireEvent.click(await screen.findByRole("button", { name: /annoy the goblin for logline/i }));

    expect(
      await screen.findByText(
        "When proud one-armed pitcher Joe gets one last shot at the majors, two gifted rivals force him to accept help before he loses his home and his dream.",
      ),
    ).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/hermes-cowriter",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-plot-goblin-key": "public-key",
        }),
      }),
    );

    const request = JSON.parse(fetchSpy.mock.calls[0][1].body as string) as {
      answers: Record<string, string>;
      mode: string;
      summary: { strongestKnownPieces: string[] };
    };
    expect(request.mode).toBe("logline");
    expect(request.answers.rawIdea).toBe("A one-armed pitcher gets one last shot at the majors.");
    expect(request.summary.strongestKnownPieces).toContain("Joe, a proud pitcher who refuses help.");
    expect(request.summary.strongestKnownPieces).toContain("Earn a contract at an open tryout.");
  });

  it("shows a saved logline confirmation after accepting a suggestion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ output: "When a protagonist whose want exposes the wound must win, pressure makes the cost visible." }),
      }),
    );
    render(<GuidedSetupClient />);

    for (let questionIndex = 0; questionIndex < guidedSetupQuestions.length; questionIndex += 1) {
      fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    }

    fireEvent.click(screen.getByRole("button", { name: /annoy the goblin for logline/i }));
    const suggestion = (await screen.findByText(/When a protagonist whose want exposes/i)).textContent ?? "";

    fireEvent.click(screen.getByRole("button", { name: "Use suggestion" }));

    expect(screen.getByText("Accepted logline")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Use suggestion" })).toBeNull();
    expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toContain(suggestion);
  });

  it("starts the guided setup over from the completed summary with saved answers ready to revise", async () => {
    render(<GuidedSetupClient />);

    completeSetupWithAnswers();

    await screen.findByRole("heading", { name: "Here is what the goblin thinks your movie is." });

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(await screen.findByRole("heading", { name: "What's the movie idea, badly explained?" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Here is what the goblin thinks your movie is." })).toBeNull();
    expect(screen.getByRole("textbox", { name: /your answer/i })).toHaveProperty(
      "value",
      "A one-armed pitcher gets one last shot at the majors.",
    );
  });

  it("lets a later accepted suggestion replace the saved logline", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ output: "When a protagonist whose want exposes the wound must win, pressure makes the cost visible." }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            output:
              "A protagonist whose want exposes the wound must risk visible failure before the opposition turns the dream into a trap.",
          }),
        }),
    );
    render(<GuidedSetupClient />);

    for (let questionIndex = 0; questionIndex < guidedSetupQuestions.length; questionIndex += 1) {
      fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    }

    fireEvent.click(screen.getByRole("button", { name: /annoy the goblin for logline/i }));
    const firstSuggestion = (await screen.findByText(/When a protagonist whose want exposes/i)).textContent ?? "";

    fireEvent.click(screen.getByRole("button", { name: "Use suggestion" }));
    await screen.findByText("Accepted logline");

    fireEvent.click(screen.getByRole("button", { name: /annoy the goblin for logline/i }));
    const secondSuggestion =
      (await screen.findByText(/^A protagonist whose want exposes/i)).textContent ?? "";

    expect(secondSuggestion).not.toBe(firstSuggestion);

    fireEvent.click(screen.getByRole("button", { name: "Use suggestion" }));

    await waitFor(() => {
      expect(screen.getByText("Accepted logline").parentElement?.textContent).toContain(secondSuggestion);
      expect(window.localStorage.getItem(PROJECT_STORAGE_KEY)).toContain(secondSuggestion);
    });
  });
});
