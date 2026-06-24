import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomEditorClient } from "./RoomEditorClient";
import { buildScriptBase } from "@/lib/guidedSetup";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";
import {
  draftWaitingMessageDelayMs,
  draftWaitingMessages,
  randomDraftWaitingMessageIndex,
} from "./room-editor/RoomEditors";

const DRAFT_STORAGE_KEY = "plot-goblin-saved-drafts";

const routeState = vi.hoisted(() => ({ slug: "premise" }));

const completePremiseMarkdown = `# Premise Room

## Story promise
A scrappy sports comedy about pride, help, and one impossible tryout.

## Raw idea
Rafa wants to pitch professionally after losing an arm.

## Protagonist
Rafa, a stubborn one-armed pitcher.

## Surface want
He wants to win a professional baseball tryout.

## Stakes
If he fails, he loses his last shot and the people backing him lose faith.

## Opposition
A scout, stronger players, and Rafa's own pride.

## Dramatic question
Can Rafa earn a real shot before pride erases it?

## Polished logline
When a stubborn one-armed pitcher gets one final tryout, he must accept help before pride costs him the dream.
`;

const completeCharactersMarkdown = `# Characters Room

## Protagonist
Rafa, a stubborn one-armed pitcher.

### Surface want
He wants to become a professional baseball player.

### Deeper need
He needs to accept help without treating it as humiliation.

### False belief
He believes asking for help makes him weak.

### Flaw / defense mechanism
He turns every kindness into an insult.

### Antagonist / opposition
A scout and better players who think he is a novelty act.
`;

const completeThemeMarkdown = `# Theme Room

## Theme question
Is asking for help weakness, or the price of doing hard things honestly?

## Starting belief
Rafa believes effort alone should be enough.

## Ending statement
The ending proves accepting help can be a braver kind of effort.
`;

const completeBeatsMarkdown = `# Beats Room

## Opening Image
Rafa tapes a glove alone before dawn.

## Inciting Incident
A scout offers one public tryout.

## Act One Break
Rafa accepts the tryout and refuses help.

## Midpoint
He gets attention for the wrong reason.

## All Is Lost
His pride costs him the one person who could catch for him.

## Climax
He chooses trust during the final pitch.

## Final Image
He tapes the glove with someone beside him.
`;

const completeScriptParametersMarkdown = `# Script Parameters Room

## Runtime / page target
Length format: Feature film.
Target page count: 100 pages.

## Genre / movie promise
Current genre: Sports comedy.
Audience feeling: Hopeful and tense.
Tone words: Warm, sharp, underdog funny.

## Structure and pacing
Structure mode: Classic 3-act spine.
Pacing bias: Lean and fast.
Scene length rule: Short and punchy.

## Format rules
Format: Standard spec screenplay format.
Dialogue density: Naturalistic.
Voiceover / narration: No voiceover.

## Rating and boundaries
Target rating: PG-13.
No-go content: No graphic injury.

## Production constraints
Cast size: 6 major speaking roles.
Location limits: Baseball fields, diner, tiny apartment.
Time period / setting rules: Modern day minor-league town.
Budget reality: Cheap.

## Point of view
Primary POV: Rafa.
Scene access: Stay close.
`;

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: routeState.slug }),
}));

afterEach(() => {
  cleanup();
  routeState.slug = "premise";
  window.localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("RoomEditorClient", () => {
  it("does not keep autosaving when loaded room markdown is unchanged", async () => {
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const projectWrites = setItemSpy.mock.calls.filter(([key]) => key === PROJECT_STORAGE_KEY);
    expect(projectWrites).toHaveLength(1);
  });

  it("does not show a back-to-rooms link in room guidance", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("heading", { name: "Goblin guidance" });
    expect(screen.queryByRole("link", { name: "Back to rooms" })).toBeNull();
  });

  it("does not render the old bottom room-wide suggestion button", async () => {
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    expect(screen.queryByRole("textbox", { name: "Premise markdown" })).toBeNull();
    expect(screen.getByRole("button", { name: "Goblin Suggest for Stakes" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Suggest improvements, don't rewrite" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Ask the Hermes goblin" })).toBeNull();
  });

  it("shows the next suggested room at the bottom until every tracked room is complete", async () => {
    const project = buildScriptBase({
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
    project.rooms.premise = completePremiseMarkdown;
    project.rooms.characters = "# Characters Room\n\n## Protagonist\nRafa.";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    const nextSuggestedRoom = screen.getByRole("navigation", { name: "Next suggested room" });
    expect(within(nextSuggestedRoom).getByText("Next suggested room:")).toBeTruthy();
    expect(within(nextSuggestedRoom).getByRole("link", { name: "Characters" }).getAttribute("href")).toBe("/rooms/characters");
  });

  it("suggests Create the Script at the bottom once every tracked room is complete", async () => {
    const project = buildScriptBase({
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
    project.rooms.premise = completePremiseMarkdown;
    project.rooms.characters = completeCharactersMarkdown;
    project.rooms.theme = completeThemeMarkdown;
    project.rooms.beats = completeBeatsMarkdown;
    project.rooms["script-parameters"] = completeScriptParametersMarkdown;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    const nextSuggestedRoom = screen.getByRole("navigation", { name: "Next suggested room" });
    expect(within(nextSuggestedRoom).getByText("Next suggested room:")).toBeTruthy();
    expect(within(nextSuggestedRoom).getByRole("link", { name: "Create the Script" }).getAttribute("href")).toBe(
      "/rooms/create-script",
    );
  });

  it("places guided field suggest buttons directly above their text boxes", async () => {
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    const heading = screen.getByRole("heading", { name: "Stakes" });
    const suggestButton = screen.getByRole("button", { name: "Goblin Suggest for Stakes" });
    const textBox = screen.getByRole("textbox", { name: "Stakes" });

    expect(heading.compareDocumentPosition(suggestButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(suggestButton.compareDocumentPosition(textBox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("treats unanswered guided room text as hidden-on-focus helper text", async () => {
    const project = buildScriptBase({
      rawIdea: "",
      genre: "Drama",
      audienceFeeling: "hopeful and tense",
      protagonist: "",
      surfaceWant: "",
      stakes: "",
      falseBelief: "",
      opposition: "",
      endingDirection: "He changes and wins",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    const rawIdeaField = screen.getByRole("textbox", { name: "Raw idea" }) as HTMLTextAreaElement;
    const storyPromiseField = screen.getByRole("textbox", { name: "Story promise" }) as HTMLTextAreaElement;

    expect(rawIdeaField.value).toBe("");
    expect(rawIdeaField.getAttribute("placeholder")).toContain("the protagonist chases get what they want");
    expect(rawIdeaField.className).toContain("guidedPlaceholderField");

    fireEvent.focus(rawIdeaField);
    expect(rawIdeaField.getAttribute("placeholder")).toBe("");

    fireEvent.keyDown(rawIdeaField, { code: "Enter", key: "Enter" });
    expect(document.activeElement).toBe(storyPromiseField);
  });

  it("places beat suggest buttons directly above their text boxes", async () => {
    routeState.slug = "beats";
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Beat cork board" });
    const titleInput = screen.getByRole("textbox", { name: "Beat title for Opening Image" });
    const suggestButton = screen.getByRole("button", { name: "Goblin Suggest for Opening Image" });
    const textBox = screen.getByRole("textbox", { name: "Opening Image beat" });

    expect(titleInput.compareDocumentPosition(suggestButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(suggestButton.compareDocumentPosition(textBox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("asks Hermes for one guided room field and applies the suggestion", async () => {
    const project = buildScriptBase({
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
    project.rooms.characters += "\n## Mentor\nMina knows Rafa is hiding the repaired glove.\n";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: "1. Stakes: If Rafa fails, he loses his last shot at pitching and has to admit the dream is still alive.",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: "1. Stakes: Failure costs Rafa the tryout, his scholarship lead, and the lie that he never needed help.",
        }),
      });
    vi.stubGlobal("fetch", fetchSpy);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    fireEvent.click(await screen.findByRole("button", { name: "Goblin Suggest for Stakes" }));

    await screen.findByText(/loses his last shot at pitching/i);
    expect(screen.getByRole("button", { name: "Use suggestion for Stakes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Another suggestion for Stakes" })).toBeTruthy();

    const requestBody = JSON.parse((fetchSpy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(requestBody.mode).toBe("room");
    expect(requestBody.room).toContain("Premise");
    expect(requestBody.room).toContain("Stakes");
    expect(requestBody.markdown).toContain("## Stakes");
    expect(requestBody.markdown).toContain("he loses the only dream he has left");
    expect(requestBody.markdown).toContain("## characters.md");
    expect(requestBody.markdown).toContain("Mina knows Rafa is hiding the repaired glove.");

    fireEvent.click(screen.getByRole("button", { name: "Another suggestion for Stakes" }));
    await screen.findByText(/scholarship lead/i);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Use suggestion for Stakes" }));

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.premise).toContain(
        "## Stakes\nFailure costs Rafa the tryout, his scholarship lead, and the lie that he never needed help.",
      );
    });
    expect(screen.queryByRole("button", { name: "Use suggestion for Stakes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Another suggestion for Stakes" })).toBeNull();
  });

  it("shows the goblin thinking beside a guided field button, then pops away happy after the suggestion arrives", async () => {
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    let resolveFetch: (response: { ok: boolean; json: () => Promise<{ output: string }> }) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Goblin Suggest for Stakes" }));

    const thinkingGoblin = screen.getByRole("img", { name: "Goblin is thinking for Stakes" });
    expect(thinkingGoblin).toBeTruthy();
    expect(thinkingGoblin.querySelector('[data-mascot-part="glasses"]')).toBeTruthy();
    expect(thinkingGoblin.querySelector('[data-mascot-part="fang"]')).toBeTruthy();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          output: "1. Stakes: If Rafa fails, he loses his last shot at pitching and has to admit the dream is still alive.",
        }),
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/loses his last shot at pitching/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Goblin is happy about Stakes" })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole("img", { name: /Goblin is .* Stakes/ })).toBeNull();
  });

  it("plays a generated squash sound for goblin suggestion presses", async () => {
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            output: "1. Stakes: If Rafa fails, the whole team loses its only scholarship lead.",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            output: "1. Stakes: If Rafa fails, Mina loses trust in him and the tryout door closes.",
          }),
        }),
    );

    const oscillatorStart = vi.fn();
    const bufferStart = vi.fn();
    const audioNode = {
      connect: vi.fn(),
      gain: {
        exponentialRampToValueAtTime: vi.fn(),
        setValueAtTime: vi.fn(),
      },
    };
    const audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
      createBiquadFilter: vi.fn(() => ({
        connect: vi.fn(),
        frequency: {
          exponentialRampToValueAtTime: vi.fn(),
          setValueAtTime: vi.fn(),
        },
        type: "lowpass",
      })),
      createBuffer: vi.fn((_channels: number, length: number) => ({
        getChannelData: () => new Float32Array(length),
      })),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: bufferStart,
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => audioNode),
      createOscillator: vi.fn(() => ({
        connect: vi.fn(),
        frequency: {
          exponentialRampToValueAtTime: vi.fn(),
          setValueAtTime: vi.fn(),
        },
        start: oscillatorStart,
        stop: vi.fn(),
        type: "triangle",
      })),
      currentTime: 0,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      sampleRate: 44100,
      state: "running",
    };
    const AudioContextMock = vi.fn(function AudioContextMock() {
      return audioContext;
    });
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: AudioContextMock,
    });

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    const stakesSuggestButton = await screen.findByRole("button", { name: "Goblin Suggest for Stakes" });
    fireEvent.click(stakesSuggestButton);

    expect(stakesSuggestButton.className).toContain("goblinSuggestButtonSquashed");
    expect(AudioContextMock).toHaveBeenCalledTimes(1);
    expect(oscillatorStart).toHaveBeenCalledTimes(1);
    expect(bufferStart).toHaveBeenCalledTimes(1);
    await screen.findByText(/whole team loses/i);

    fireEvent.click(screen.getByRole("button", { name: "Another suggestion for Stakes" }));

    expect(AudioContextMock).toHaveBeenCalledTimes(2);
    expect(oscillatorStart).toHaveBeenCalledTimes(2);
    expect(bufferStart).toHaveBeenCalledTimes(2);
    await screen.findByText(/tryout door closes/i);
  });

  it("edits character room fields while saving markdown in the background", async () => {
    routeState.slug = "characters";
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Characters questions" });
    expect(screen.queryByRole("textbox", { name: "Characters markdown" })).toBeNull();
    expect(screen.getByRole("button", { name: "Goblin Suggest for False belief" })).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox", { name: "False belief" }), {
      target: { value: "He thinks help means pity." },
    });

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.characters).toContain("### False belief\nHe thinks help means pity.");
    });
  });

  it("treats generated character-room guidance as hidden-on-focus helper text", async () => {
    routeState.slug = "characters";
    const project = buildScriptBase({
      rawIdea: "",
      genre: "Drama",
      audienceFeeling: "hopeful and tense",
      protagonist: "",
      surfaceWant: "",
      stakes: "",
      falseBelief: "",
      opposition: "",
      endingDirection: "",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Characters questions" });
    const arcField = screen.getByRole("textbox", { name: "Arc" }) as HTMLTextAreaElement;
    const supportingCharactersField = screen.getByRole("textbox", {
      name: "Key supporting characters",
    }) as HTMLTextAreaElement;

    expect(arcField.value).toBe("");
    expect(arcField.getAttribute("placeholder")).toContain("Start: getting the visible goal");
    expect(arcField.className).toContain("guidedPlaceholderField");
    expect(supportingCharactersField.value).toBe("");
    expect(supportingCharactersField.getAttribute("placeholder")).toContain("Name a helper, rival, or mirror");

    fireEvent.focus(arcField);
    expect(arcField.getAttribute("placeholder")).toBe("");
  });

  it("shows specific character-room guesses as editable answer text", async () => {
    routeState.slug = "characters";
    const project = buildScriptBase({
      rawIdea: "A one-armed pitcher tries to make the majors.",
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      protagonist: "Stubborn one-armed pitcher",
      surfaceWant: "become a professional baseball player",
      stakes: "they lose their other arm because they don't have enough money for surgery",
      falseBelief: "effort alone is enough",
      opposition: "better players who have two arms",
      endingDirection: "He changes and wins",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Characters questions" });
    const deeperNeedField = screen.getByRole("textbox", { name: "Deeper need" }) as HTMLTextAreaElement;

    expect(deeperNeedField.value).toContain("They may need to accept that effort alone is not enough");
    expect(deeperNeedField.getAttribute("placeholder")).toBe("");
    expect(deeperNeedField.className).not.toContain("guidedPlaceholderField");
  });

  it("shows story-specific guided guesses as real text and keeps section instructions as placeholders", async () => {
    routeState.slug = "characters";
    const project = buildScriptBase({
      rawIdea: "A one-armed pitcher tries to make the majors.",
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      protagonist: "Stubborn one-armed pitcher",
      surfaceWant: "become a professional baseball player",
      stakes: "they lose their other arm because they don't have enough money for surgery",
      falseBelief: "effort alone is enough",
      opposition: "better players who have two arms",
      endingDirection: "He changes and wins",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Characters questions" });
    const flawField = screen.getByRole("textbox", { name: "Flaw / defense mechanism" }) as HTMLTextAreaElement;
    const pressureTestField = screen.getByRole("textbox", { name: "Pressure test" }) as HTMLTextAreaElement;
    const oppositionArgumentField = screen.getByRole("textbox", {
      name: "Why are they right from their point of view?",
    }) as HTMLTextAreaElement;
    const supportingCharactersField = screen.getByRole("textbox", {
      name: "Key supporting characters",
    }) as HTMLTextAreaElement;

    expect(flawField.value).toContain("They double down on effort");
    expect(flawField.getAttribute("placeholder")).toBe("");
    expect(flawField.className).not.toContain("guidedPlaceholderField");
    expect(oppositionArgumentField.value).toContain("better players who have two arms may be right");
    expect(oppositionArgumentField.getAttribute("placeholder")).toBe("");

    expect(pressureTestField.value).toBe("");
    expect(pressureTestField.getAttribute("placeholder")).toContain("Force them into a moment");
    expect(pressureTestField.className).toContain("guidedPlaceholderField");
    expect(supportingCharactersField.value).toBe("");
    expect(supportingCharactersField.getAttribute("placeholder")).toContain("Name a helper");

    fireEvent.focus(pressureTestField);
    expect(pressureTestField.getAttribute("placeholder")).toBe("");
  });

  it("shows generated premise loglines as real text while keeping generic missing answers faded", async () => {
    const project = buildScriptBase({
      rawIdea: "A one-armed pitcher tries to make the majors.",
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      protagonist: "Stubborn one-armed pitcher",
      surfaceWant: "become a professional baseball player",
      stakes: "they lose their other arm because they don't have enough money for surgery",
      falseBelief: "effort alone is enough",
      opposition: "better players who have two arms",
      endingDirection: "He changes and wins",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Premise questions" });
    const loglineField = screen.getByRole("textbox", { name: "Polished logline" }) as HTMLTextAreaElement;

    expect(loglineField.value).toContain("When Stubborn one-armed pitcher");
    expect(loglineField.getAttribute("placeholder")).toBe("");
    expect(loglineField.className).not.toContain("guidedPlaceholderField");
  });

  it("edits theme room fields while saving markdown in the background", async () => {
    routeState.slug = "theme";
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Theme questions" });
    expect(screen.queryByRole("textbox", { name: "Theme markdown" })).toBeNull();
    expect(screen.getByRole("button", { name: "Goblin Suggest for Story proof" })).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox", { name: "Story proof" }), {
      target: { value: "Rafa keeps choosing control until teamwork costs him something real." },
    });

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.theme).toContain(
        "## Story proof\nRafa keeps choosing control until teamwork costs him something real.",
      );
    });
  });

  it("shows beats as writable sticky notes with linear connectors", async () => {
    routeState.slug = "beats";
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    const { container } = render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Beat cork board" });
    const openingImage = await screen.findByRole("textbox", { name: "Opening Image beat" });
    expect(screen.getByRole("textbox", { name: "Setup beat" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Final Image beat" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Custom beats beat" })).toBeTruthy();

    const beatNotes = screen.getAllByRole("textbox", { name: / beat$/i });
    expect(container.querySelectorAll('[data-testid="beat-connector"]')).toHaveLength(beatNotes.length - 1);

    fireEvent.change(openingImage, { target: { value: "A locker room wall of tryout flyers." } });

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.beats).toContain("## Opening Image\nA locker room wall of tryout flyers.");
      expect(storedProject.rooms.beats).toContain("## Setup\nEstablish the ordinary world");
    });
  });

  it("gives long beat notes at least fifty percent more visible rows", async () => {
    routeState.slug = "beats";
    const project = buildScriptBase({
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
    project.rooms.beats = project.rooms.beats.replace(
      /\n## Setup\n[^\n]+/,
      "\n## Setup\nJoe shows up before dawn to a cracked public baseball diamond, taping a bat to his one good hand and running drills alone while two-armed high school players jog past and snicker. He tells his little brother John that scouts only care who works hardest, then proves it by diving for a grounder until his old stump sling bleeds.",
    );
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    const setup = (await screen.findByRole("textbox", { name: "Setup beat" })) as HTMLTextAreaElement;

    expect(setup.rows).toBe(17);
  });

  it("shows needs-your-answer beat markers as tags instead of textarea text", async () => {
    routeState.slug = "beats";
    const project = buildScriptBase({
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
    project.rooms.beats = project.rooms.beats
      .replace(
        /\n## All Is Lost\n[^\n]+/,
        "\n## All Is Lost\nThe cost becomes personal, public, moral, or irreversible: they dont have enough money for surgery to fix their other arm",
      )
      .replace(
        /\n## Dark Night of the Soul\n[^\n]+/,
        "\n## Dark Night of the Soul\nThe protagonist confronts the lie: That effort is all that is needed to become a baseball player in the professional league",
      )
      .replace(/\n## Climax\n[^\n]+/, "\n## Climax\nThe protagonist must choose under maximum pressure.")
      .replace(/\n## Final Image\n[^\n]+/, "\n## Final Image\nA visual answer to the opening image.");
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    const openingImage = (await screen.findByRole("textbox", { name: "Opening Image beat" })) as HTMLTextAreaElement;
    const setup = screen.getByRole("textbox", { name: "Setup beat" }) as HTMLTextAreaElement;

    expect(screen.getByLabelText("Opening Image needs your answer").textContent).toContain("Needs your answer");
    expect(screen.getByLabelText("Setup needs your answer").textContent).toContain("Needs your answer");
    expect(screen.getByLabelText("Act One Break needs your answer").textContent).toContain("Needs your answer");
    expect(screen.getByLabelText("All Is Lost needs your answer").textContent).toContain("Needs your answer");
    expect(screen.getByLabelText("Dark Night of the Soul needs your answer").textContent).toContain(
      "Needs your answer",
    );
    expect(screen.getByLabelText("Climax needs your answer").textContent).toContain("Needs your answer");
    expect(screen.getByLabelText("Final Image needs your answer").textContent).toContain("Needs your answer");
    expect(openingImage.value).toBe("");
    expect(openingImage.getAttribute("placeholder")).toMatch(/^Describe the first visual snapshot/);
    expect(openingImage.className).toContain("beatStickyPlaceholderTextarea");
    expect(setup.value).toBe("");
    expect(setup.getAttribute("placeholder")).toContain("Establish the ordinary world");

    fireEvent.focus(openingImage);
    expect(openingImage.getAttribute("placeholder")).toBe("");

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.beats).toContain(
        "## Opening Image\n[needs your answer] Describe the first visual snapshot",
      );
    });

    fireEvent.change(openingImage, { target: { value: "A locker room wall of tryout flyers." } });

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.beats).toContain("## Opening Image\nA locker room wall of tryout flyers.");
    });
    expect(screen.queryByLabelText("Opening Image needs your answer")).toBeNull();
  });

  it("adds custom beats as separate writable stickies that can be renamed", async () => {
    routeState.slug = "beats";
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Beat cork board" });
    fireEvent.click(screen.getByRole("button", { name: "Add custom beat" }));

    const customBeat = (await screen.findByRole("textbox", { name: "Custom Beat 1 beat" })) as HTMLTextAreaElement;
    fireEvent.change(screen.getByRole("textbox", { name: "Beat title for Custom Beat 1" }), {
      target: { value: "Public Tryout Disaster" },
    });
    fireEvent.change(customBeat, {
      target: { value: "Rafa gets one televised pitch and throws it into the mascot tunnel." },
    });

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.beats).toContain(
        "## Public Tryout Disaster\nRafa gets one televised pitch and throws it into the mascot tunnel.",
      );
      expect(storedProject.rooms.beats).toContain("## Custom beats");
    });
  });

  it("asks Hermes for one beat using every room markdown file and applies the suggestion", async () => {
    routeState.slug = "beats";
    const project = buildScriptBase({
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
    project.rooms.characters += "\n## Mirror character\nMina pushes Rafa to ask for help.\n";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: "1. Opening Image: Rafa hides a torn tryout flyer under his glove before anyone can see he still wants it.",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: "1. Opening Image: Rafa fingers a repaired glove while the tryout gates open without him.",
        }),
      });
    vi.stubGlobal("fetch", fetchSpy);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Beat cork board" });
    fireEvent.click(await screen.findByRole("button", { name: "Goblin Suggest for Opening Image" }));

    await screen.findByText(/Rafa hides a torn tryout flyer/i);
    expect(screen.getByRole("button", { name: "Use suggestion for Opening Image" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Another suggestion for Opening Image" })).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/hermes-cowriter",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    );

    const requestBody = JSON.parse((fetchSpy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(requestBody.mode).toBe("beat");
    expect(requestBody.beat).toBe("Opening Image");
    expect(requestBody.beatMarkdown).toContain("Describe the first visual snapshot");
    expect(requestBody.markdown).toContain("## premise.md");
    expect(requestBody.markdown).toContain("## characters.md");
    expect(requestBody.markdown).toContain("## beats.md");
    expect(requestBody.markdown).toContain("## script-parameters.md");
    expect(requestBody.markdown).toContain("Mina pushes Rafa to ask for help.");

    fireEvent.click(screen.getByRole("button", { name: "Another suggestion for Opening Image" }));
    await screen.findByText(/Rafa fingers a repaired glove/i);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Use suggestion for Opening Image" }));

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.beats).toContain(
        "## Opening Image\nRafa fingers a repaired glove while the tryout gates open without him.",
      );
    });
    expect(screen.queryByRole("button", { name: "Use suggestion for Opening Image" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Another suggestion for Opening Image" })).toBeNull();
    expect(screen.queryByLabelText("Opening Image needs your answer")).toBeNull();
  });

  it("shows the goblin thinking beside a beat button, then pops away happy after the suggestion arrives", async () => {
    routeState.slug = "beats";
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    let resolveFetch: (response: { ok: boolean; json: () => Promise<{ output: string }> }) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Beat cork board" });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Goblin Suggest for Opening Image" }));

    expect(screen.getByRole("img", { name: "Goblin is thinking for Opening Image" })).toBeTruthy();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          output: "1. Opening Image: Rafa hides a torn tryout flyer under his glove before anyone can see he still wants it.",
        }),
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/Rafa hides a torn tryout flyer/i)).toBeTruthy();
    expect(screen.getByRole("img", { name: "Goblin is happy about Opening Image" })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole("img", { name: /Goblin is .* Opening Image/ })).toBeNull();
  });

  it("saves scene drafts into clickable mini scene cards", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({
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
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Start new scene" }));
    expect(screen.queryByRole("textbox", { name: "Scene card markdown" })).toBeNull();

    fireEvent.change(await screen.findByRole("textbox", { name: "Scene title" }), {
      target: { value: "Tryout Opens" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Location / time" }), {
      target: { value: "EXT. SANDLOT - DAY" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Characters" }), {
      target: { value: "Rafa, Coach Bell" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Scene want" }), {
      target: { value: "Rafa wants one clean pitch." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Opposition" }), {
      target: { value: "The coach has already decided he is a novelty act." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Turn" }), {
      target: { value: "Rafa earns one more pitch." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Button" }), {
      target: { value: "The ball cracks the catcher's mitt." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Purpose" }), {
      target: { value: "Plot / character" },
    });

    fireEvent.click(await screen.findByRole("button", { name: "Save scene" }));

    const savedCard = await screen.findByRole("button", { name: /Tryout Opens[\s\S]*EXT\. SANDLOT - DAY[\s\S]*Rafa, Coach Bell/ });
    expect(savedCard).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start new scene" }));
    expect((screen.getByRole("textbox", { name: "Scene title" }) as HTMLInputElement).value).toBe("");

    fireEvent.click(savedCard);
    expect((screen.getByRole("textbox", { name: "Scene title" }) as HTMLInputElement).value).toBe("Tryout Opens");
    expect((screen.getByRole("textbox", { name: "Turn" }) as HTMLTextAreaElement).value).toBe(
      "Rafa earns one more pitch.",
    );

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.scenes).toContain("## Saved scenes");
      expect(storedProject.rooms.scenes).toContain("### Scene: Tryout Opens");
      expect(storedProject.rooms.scenes).toContain("- Tryout Opens");
    });
  });

  it("builds one scene in the editor from a picked beat using only that beat", async () => {
    routeState.slug = "scenes";
    const sceneOutput = `PLOT_GOBLIN_FINAL:
1. Scene title: Dawn At The Cage
2. Location / time: EXT. BATTING CAGE - DAWN
3. Characters: Rafa (most pressure)
4. Scene want: Rafa wants one clean swing before anyone wakes up.
5. Opposition: His taped glove keeps slipping.
6. Turn: He admits the cracked glove is a problem.
7. Button: He leaves the cracked ball in the dirt.
8. Purpose: Character / setup`;
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: sceneOutput }) });
    vi.stubGlobal("fetch", fetchSpy);

    const project = buildScriptBase({
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
    project.rooms.beats = `# Beats Room

## Opening Image
Rafa tapes a cracked glove to his one good hand before the gates open.
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Scene cards" });

    fireEvent.click(screen.getByRole("button", { name: "Populate from beat sheet" }));
    const beatPicker = await screen.findByRole("combobox", { name: "Beat to populate from the beat sheet" });
    fireEvent.change(beatPicker, { target: { value: "Opening Image" } });

    const titleField = (await screen.findByRole("textbox", { name: "Scene title" })) as HTMLInputElement;
    await waitFor(() => expect(titleField.value).toBe("Dawn At The Cage"));

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as {
      mode: string;
      beat: string;
      markdown?: string;
    };
    expect(body.mode).toBe("scene");
    expect(body.beat).toBe("Opening Image");
    expect(body.markdown).toBeUndefined();
  });

  it("shows the picked beat above a populated scene draft with save and close actions", async () => {
    routeState.slug = "scenes";
    const sceneOutput = `PLOT_GOBLIN_FINAL:
1. Scene title: Ceremony Truth
2. Location / time: INT. WEDDING VENUE - NIGHT
3. Characters: Milo, Lena, Celeste
4. Scene want: Milo wants Lena to hear the truth before she signs the lie.
5. Opposition: Celeste controls the room and everyone wants the wedding to continue.
6. Turn: Lena stops defending the perfect story.
7. Button: Milo lowers the camera.
8. Purpose: Climax`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: sceneOutput }) }));

    const project = buildScriptBase({
      rawIdea: "A wedding videographer exposes a curse.",
      genre: "Comedy mystery",
      audienceFeeling: "funny and tense",
      protagonist: "Milo",
      surfaceWant: "make a perfect wedding video",
      stakes: "the couple builds a marriage on a lie",
      falseBelief: "truth ruins love",
      opposition: "Celeste",
      endingDirection: "The truth saves the wedding",
      structurePreference: "Classic 3-act spine",
    });
    project.rooms.beats = `# Beats Room

## Climax
Milo interrupts the ceremony with the truth.
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Scene cards" });

    fireEvent.click(screen.getByRole("button", { name: "Populate from beat sheet" }));
    const beatPicker = await screen.findByRole("combobox", { name: "Beat to populate from the beat sheet" });
    fireEvent.change(beatPicker, { target: { value: "Climax" } });

    const titleField = (await screen.findByRole("textbox", { name: "Scene title" })) as HTMLInputElement;
    await waitFor(() => expect(titleField.value).toBe("Ceremony Truth"));

    expect(screen.getByText("Climax")).toBeTruthy();
    const headerActions = screen.getByLabelText("Beat-built scene actions");
    expect(within(headerActions).getByRole("button", { name: "Ask the goblin for another scene attempt" })).toBeTruthy();
    expect(within(headerActions).getByRole("button", { name: "Save beat-built scene" })).toBeTruthy();
    expect(within(headerActions).getByRole("button", { name: "Close beat-built scene draft" })).toBeTruthy();

    fireEvent.click(within(headerActions).getByRole("button", { name: "Save beat-built scene" }));

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.scenes).toContain("### Scene: Ceremony Truth");
    });
  });

  it("only offers answered beats in the populate picker", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({
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
    project.rooms.beats = `# Beats Room

## Opening Image
Rafa tapes a cracked glove to his one good hand before the gates open.

## Setup
[needs your answer] Establish the ordinary world, core want, false belief, relationships, and cost of staying the same.

## Midpoint
A scout offers one private pitch, but only if Rafa admits he needs a catcher.
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Scene cards" });

    fireEvent.click(screen.getByRole("button", { name: "Populate from beat sheet" }));
    const beatPicker = await screen.findByRole("combobox", { name: "Beat to populate from the beat sheet" });
    const options = within(beatPicker).getAllByRole("option").map((option) => (option as HTMLOptionElement).value);

    expect(options).toContain("Opening Image");
    expect(options).toContain("Midpoint");
    expect(options).not.toContain("Setup");
  });

  it("tells the writer to populate the beat sheet first when no beats are answered", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({
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
    project.rooms.beats = `# Beats Room

## Opening Image
[needs your answer] Establish the world.
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Scene cards" });

    expect(screen.getByText(/Populate the beat sheet first/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Populate from beat sheet" })).toBeNull();
  });

  it("reorders saved scene cards by drag and drop", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({});
    project.rooms.scenes = `# Scenes Room

## Scene card template

### Scene: [Short title]

**Location / time:** INT./EXT. PLACE - DAY/NIGHT

**Characters:**
[Needs writing] Who is in the scene, and who has the most pressure on them?

**Scene want:**
[Needs writing] What does the active character want in this scene?

**Opposition:**
[Needs writing] What blocks them?

**Turn:**
[Needs writing] What changes by the end?

**Button:**
[Needs writing] What is the last image, line, or action?

**Purpose:**
Plot / character / theme / tension / setup / payoff

## Saved scenes

### Scene: First Pitch

**Location / time:** EXT. FIELD - DAY

**Characters:**
Rafa, Scout

**Scene want:**
Rafa wants attention.

---

### Scene: Locker Room

**Location / time:** INT. LOCKER ROOM - NIGHT

**Characters:**
Rafa, Mina

**Scene want:**
Rafa wants to hide the injury.

## Scene list
- First Pitch
- Locker Room
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    const firstPitch = await screen.findByRole("button", { name: /First Pitch/ });
    const lockerRoom = await screen.findByRole("button", { name: /Locker Room/ });

    fireEvent.dragStart(lockerRoom);
    fireEvent.dragOver(firstPitch);
    fireEvent.drop(firstPitch);

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.scenes.indexOf("### Scene: Locker Room")).toBeLessThan(
        storedProject.rooms.scenes.indexOf("### Scene: First Pitch"),
      );
      expect(storedProject.rooms.scenes).toContain("- Locker Room\n- First Pitch");
    });
  });

  it("moves saved scene cards with explicit order controls", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({});
    project.rooms.scenes = `# Scenes Room

## Saved scenes

### Scene: First Pitch

**Location / time:** EXT. FIELD - DAY

**Characters:**
Rafa, Scout

**Scene want:**
Rafa wants attention.

---

### Scene: Locker Room

**Location / time:** INT. LOCKER ROOM - NIGHT

**Characters:**
Rafa, Mina

**Scene want:**
Rafa wants to hide the injury.

## Scene list
- First Pitch
- Locker Room
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    const rail = await screen.findByRole("navigation", { name: "Scene timeline" });
    expect(within(rail).getAllByText("Drag")).toHaveLength(2);
    const moveEarlierButton = within(rail).getByRole("button", { name: "Move scene 2 earlier" });
    const moveLaterButton = within(rail).getByRole("button", { name: "Move scene 1 later" });
    expect(moveEarlierButton.textContent?.trim()).toBe("");
    expect(moveLaterButton.textContent?.trim()).toBe("");
    expect(moveEarlierButton.querySelector("svg")).not.toBeNull();
    expect(moveLaterButton.querySelector("svg")).not.toBeNull();

    fireEvent.click(moveEarlierButton);

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.scenes.indexOf("### Scene: Locker Room")).toBeLessThan(
        storedProject.rooms.scenes.indexOf("### Scene: First Pitch"),
      );
      expect(storedProject.rooms.scenes).toContain("- Locker Room\n- First Pitch");
    });
  });

  it("renders saved scenes in a vertical rail with the add tile first", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({});
    project.rooms.scenes = `# Scenes Room

## Scene card template

### Scene: [Short title]

**Location / time:** INT./EXT. PLACE - DAY/NIGHT

**Characters:**
[Needs writing] Who is in the scene, and who has the most pressure on them?

**Scene want:**
[Needs writing] What does the active character want in this scene?

**Opposition:**
[Needs writing] What blocks them?

**Turn:**
[Needs writing] What changes by the end?

**Button:**
[Needs writing] What is the last image, line, or action?

**Purpose:**
Plot / character / theme / tension / setup / payoff

## Saved scenes

### Scene: First Pitch

**Location / time:** EXT. FIELD - DAY

**Characters:**
Rafa, Scout

**Scene want:**
Rafa wants attention.

---

### Scene: Locker Room

**Location / time:** INT. LOCKER ROOM - NIGHT

**Characters:**
Rafa, Mina

**Scene want:**
Rafa wants to hide the injury.

## Scene list
- First Pitch
- Locker Room
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    const rail = await screen.findByRole("navigation", { name: "Scene timeline" });
    expect(within(rail).getByRole("button", { name: "Use compact scene rail" })).toBeTruthy();
    expect(within(rail).getByRole("button", { name: "Start new scene" })).toBeTruthy();
    expect(within(rail).getByRole("button", { name: /First Pitch/ })).toBeTruthy();
    expect(within(rail).getByRole("button", { name: /Locker Room/ })).toBeTruthy();
  });

  it("toggles the scene rail between readable and compact modes without changing selection", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({});
    project.rooms.scenes = `# Scenes Room

## Scene card template

### Scene: [Short title]

**Location / time:** INT./EXT. PLACE - DAY/NIGHT

**Characters:**
[Needs writing] Who is in the scene, and who has the most pressure on them?

**Scene want:**
[Needs writing] What does the active character want in this scene?

**Opposition:**
[Needs writing] What blocks them?

**Turn:**
[Needs writing] What changes by the end?

**Button:**
[Needs writing] What is the last image, line, or action?

**Purpose:**
Plot / character / theme / tension / setup / payoff

## Saved scenes

### Scene: First Pitch

**Location / time:** EXT. FIELD - DAY

**Characters:**
Rafa, Scout

**Scene want:**
Rafa wants attention.

---

### Scene: Locker Room

**Location / time:** INT. LOCKER ROOM - NIGHT

**Characters:**
Rafa, Mina

**Scene want:**
Rafa wants to hide the injury.

## Scene list
- First Pitch
- Locker Room
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    fireEvent.click(await screen.findByRole("button", { name: /Locker Room/ }));
    expect((screen.getByRole("textbox", { name: "Scene title" }) as HTMLInputElement).value).toBe("Locker Room");

    fireEvent.click(screen.getByRole("button", { name: "Use compact scene rail" }));

    expect(screen.getByRole("navigation", { name: "Scene timeline" }).className).toContain("sceneRailCompact");
    expect(screen.getByRole("button", { name: "Use readable scene rail" })).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Scene title" }) as HTMLInputElement).value).toBe("Locker Room");

    fireEvent.click(screen.getByRole("button", { name: "Use readable scene rail" }));

    expect(screen.getByRole("navigation", { name: "Scene timeline" }).className).not.toContain("sceneRailCompact");
    expect((screen.getByRole("textbox", { name: "Scene title" }) as HTMLInputElement).value).toBe("Locker Room");
  });

  it("deletes a saved scene card when it is dropped on the trash target", async () => {
    routeState.slug = "scenes";
    const project = buildScriptBase({});
    project.rooms.scenes = `# Scenes Room

## Scene card template

### Scene: [Short title]

**Location / time:** INT./EXT. PLACE - DAY/NIGHT

**Characters:**
[Needs writing] Who is in the scene, and who has the most pressure on them?

**Scene want:**
[Needs writing] What does the active character want in this scene?

**Opposition:**
[Needs writing] What blocks them?

**Turn:**
[Needs writing] What changes by the end?

**Button:**
[Needs writing] What is the last image, line, or action?

**Purpose:**
Plot / character / theme / tension / setup / payoff

## Saved scenes

### Scene: First Pitch

**Location / time:** EXT. FIELD - DAY

**Characters:**
Rafa, Scout

**Scene want:**
Rafa wants attention.

---

### Scene: Locker Room

**Location / time:** INT. LOCKER ROOM - NIGHT

**Characters:**
Rafa, Mina

**Scene want:**
Rafa wants to hide the injury.

## Scene list
- First Pitch
- Locker Room
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    expect(screen.queryByRole("button", { name: "Delete dragged scene" })).toBeNull();

    const lockerRoom = await screen.findByRole("button", { name: /Locker Room/ });
    fireEvent.dragStart(lockerRoom);

    const trashTarget = await screen.findByRole("button", { name: "Delete dragged scene" });
    fireEvent.dragOver(trashTarget);
    fireEvent.drop(trashTarget);

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.scenes).toContain("### Scene: First Pitch");
      expect(storedProject.rooms.scenes).not.toContain("### Scene: Locker Room");
      expect(storedProject.rooms.scenes).toContain("- First Pitch");
      expect(storedProject.rooms.scenes).not.toContain("- Locker Room");
    });
  });

  it("edits script parameters through form controls while saving markdown in the background", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });

    expect(screen.queryByRole("textbox", { name: "Script Parameters markdown" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Feature film" }));
    fireEvent.change(screen.getByRole("slider", { name: "Target page count" }), { target: { value: "105" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Genre / movie promise" }), {
      target: { value: "Sports comedy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "PG-13" }));
    fireEvent.change(screen.getByRole("textbox", { name: "No-go content" }), {
      target: { value: "No graphic gore." },
    });

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      const parameters = storedProject.rooms["script-parameters"];

      expect(parameters).toContain("## Runtime / page target");
      expect(parameters).toContain("Length format: Feature film.");
      expect(parameters).toContain("Target page count: 105 pages.");
      expect(parameters).toContain("Current genre: Sports comedy.");
      expect(parameters).toContain("Target rating: PG-13.");
      expect(parameters).toContain("No-go content: No graphic gore.");
    });
  });

  it("labels the budget reality choice buttons", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });
    const budgetChoices = screen.getByRole("group", { name: "Budget reality" });

    expect(within(budgetChoices).getByRole("button", { name: "Cheap" })).toBeTruthy();
    expect(within(budgetChoices).getByRole("button", { name: "Impossible dream" })).toBeTruthy();
  });

  it("hides script-parameter placeholder examples while a field is focused", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      structurePreference: "Classic 3-act spine",
    });
    project.rooms["script-parameters"] =
      "# Script Parameters Room\n\n## Genre / movie promise\nCurrent genre: [needs your answer]\nAudience feeling: [needs your answer]\nTone words: [needs your answer]\n\n## Rating and boundaries\nNo-go content: [needs your answer]";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });
    const genreField = screen.getByRole("textbox", { name: "Genre / movie promise" }) as HTMLInputElement;
    const noGoField = screen.getByRole("textbox", { name: "No-go content" }) as HTMLTextAreaElement;

    expect(genreField.value).toBe("");
    expect(genreField.getAttribute("placeholder")).toBe("Sports comedy, horror romance, contained thriller...");
    fireEvent.focus(genreField);
    expect(genreField.getAttribute("placeholder")).toBe("");
    fireEvent.blur(genreField);
    expect(genreField.getAttribute("placeholder")).toBe("Sports comedy, horror romance, contained thriller...");

    expect(noGoField.value).toBe("");
    expect(noGoField.getAttribute("placeholder")).toBe("Anything the AI should avoid inventing or showing.");
    fireEvent.focus(noGoField);
    expect(noGoField.getAttribute("placeholder")).toBe("");
  });

  it("preserves spaces while typing tone words", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });
    const toneWordsField = screen.getByRole("textbox", { name: "Tone words" }) as HTMLInputElement;

    fireEvent.focus(toneWordsField);
    fireEvent.change(toneWordsField, { target: { value: "hope " } });

    expect(toneWordsField.value).toBe("hope ");
  });

  it("preserves spaces while typing no-go content", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });
    const noGoField = screen.getByRole("textbox", { name: "No-go content" }) as HTMLTextAreaElement;

    fireEvent.focus(noGoField);
    fireEvent.change(noGoField, { target: { value: "no " } });

    expect(noGoField.value).toBe("no ");
  });

  it("preserves spaces while typing primary POV", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });
    const primaryPovField = screen.getByRole("textbox", { name: "Primary POV" }) as HTMLInputElement;

    fireEvent.focus(primaryPovField);
    fireEvent.change(primaryPovField, { target: { value: "main " } });

    expect(primaryPovField.value).toBe("main ");
  });

  it("uses length format choices as page count presets", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });
    const pageSlider = screen.getByRole("slider", { name: "Target page count" }) as HTMLInputElement;

    expect(screen.queryByRole("button", { name: "Exact page count" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Short film" }));
    expect(pageSlider.value).toBe("15");

    fireEvent.click(screen.getByRole("button", { name: "Feature film" }));
    expect(pageSlider.value).toBe("100");

    fireEvent.click(screen.getByRole("button", { name: "Really long feature" }));
    expect(pageSlider.value).toBe("135");

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      const parameters = storedProject.rooms["script-parameters"];

      expect(parameters).toContain("Length format: Really long feature.");
      expect(parameters).toContain("Target page count: 135 pages.");
    });
  });

  it("labels page style pill rows", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });

    expect(screen.getByText("Dialogue density")).toBeTruthy();
    expect(screen.getByText("Voiceover / narration")).toBeTruthy();
  });

  it("explains each page movement choice row", async () => {
    routeState.slug = "script-parameters";
    const project = buildScriptBase({
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Script parameter questions" });

    expect(screen.getByText("Structure")).toBeTruthy();
    expect(screen.getByText("The big organizing pattern for the draft.")).toBeTruthy();
    expect(screen.getByText("Rhythm")).toBeTruthy();
    expect(screen.getByText("How momentum should feel from sequence to sequence.")).toBeTruthy();
    expect(screen.getByText("Scene length")).toBeTruthy();
    expect(screen.getByText("How much room each scene gets on the page.")).toBeTruthy();
  });

  it("gates Create the Script and points writers back to the first room it still needs", async () => {
    routeState.slug = "create-script";
    const project = buildScriptBase({
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
    project.rooms.premise = "# Premise Room\n\n## Stakes\nRafa loses the tryout.\n[needs your answer] What gets worse?";
    project.rooms.characters = "# Characters Room\n\nRafa protects pride until Mina pressures him to ask for help.";
    project.rooms.theme = "# Theme Room\n\nPressure proves adaptation is not surrender.";
    project.rooms.beats = "# Beats Room\n\nOpening image, midpoint, all is lost, climax, final image.";
    project.rooms.scenes = "# Scenes Room\n\n### Scene: Tryout Opens\nRafa wants one clean pitch.";
    project.rooms["script-parameters"] = "# Script Parameters Room\n\nFeature film. PG-13 sports comedy.";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });
    expect(screen.getByRole("heading", { name: "Create the Script" })).toBeTruthy();
    const draftGoblin = screen.getByRole("img", { name: "Huge Create the Script goblin" });
    expect(draftGoblin).toBeTruthy();
    expect(draftGoblin.querySelector('[data-mascot-part="glasses"]')).toBeTruthy();
    expect(draftGoblin.querySelector('[data-mascot-part="fang"]')).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Write a Quick Sample" }));

    const scriptParametersLinks = (await screen.findAllByRole("link", {
      name: /Script Parameters - take me there/i,
    })) as HTMLAnchorElement[];
    expect(scriptParametersLinks.some((link) => link.getAttribute("href") === "/rooms/script-parameters")).toBe(true);
    expect(screen.queryByRole("textbox", { name: "Create the Script markdown" })).toBeNull();
  });

  it("shows readiness meters and take-me-there buttons for unfinished Create the Script source rooms", async () => {
    routeState.slug = "create-script";
    const project = buildScriptBase({
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
    project.rooms.premise =
      "# Premise Room\n\n## Raw idea\nRafa wants a tryout.\n\n## Protagonist\nRafa.\n\n## Surface want\nPitch well.\n\n## Stakes\nHe loses his last chance.";
    project.rooms.characters =
      "# Characters Room\n\n## Protagonist\nRafa.\n\n### Surface want\nPitch well.\n\n### Deeper need\nAccept help.\n\n### False belief\nHelp means weakness.\n\n### Flaw / defense mechanism\nHe jokes.\n\n### Pressure test\nHe gets one pitch.\n\n## Antagonist / opposition\nA skeptical coach.";
    project.rooms.theme =
      "# Theme Room\n\n## Theme question\nIs help weakness?\n\n## Starting belief\nRafa thinks it is.\n\n## Ending statement\nHelp is courage.";
    project.rooms.beats =
      "# Beats Room\n\n## Opening Image\nRafa tapes a glove.\n\n## Inciting Incident\nA scout calls.";
    project.rooms.scenes = "# Scenes Room\n\n## Scene list\n- Tryout opens.";
    project.rooms["script-parameters"] =
      "# Script Parameters Room\n\n## Runtime / page target\nLength format: Feature film.\nTarget page count: 100 pages.\n";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });

    expect(screen.getByRole("progressbar", { name: "Premise readiness" }).getAttribute("aria-valuenow")).toBe("4");
    expect(screen.getByText("4 filled / 4 to go")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Premise - take me there" }).getAttribute("href")).toBe("/rooms/premise");

    expect(screen.getByRole("progressbar", { name: "Beats readiness" }).getAttribute("aria-valuenow")).toBe("2");
    expect(screen.getByText("2 filled / 5 to go")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Beats - take me there" }).getAttribute("href")).toBe("/rooms/beats");

    expect(screen.getByRole("progressbar", { name: "Script Parameters readiness" }).getAttribute("aria-valuenow")).toBe(
      "2",
    );
    expect(screen.getByText("2 filled / 17 to go")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Script Parameters - take me there" }).getAttribute("href")).toBe(
      "/rooms/script-parameters",
    );
  });

  it("removes Script Parameters from guidance once required drafting rules are filled", async () => {
    routeState.slug = "create-script";
    const project = buildScriptBase({
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
    project.rooms.premise =
      "# Premise Room\n\n## Raw idea\nRafa wants a tryout.\n\n## Protagonist\nRafa.\n\n## Surface want\nPitch well.\n\n## Stakes\nHe loses his last chance.";
    project.rooms["script-parameters"] =
      "# Script Parameters Room\n\n## Runtime / page target\nLength format: Feature film.\nTarget page count: 100 pages.\n\n## Genre / movie promise\nCurrent genre: Sports comedy.\nAudience feeling: Hopeful and tense.\nTone words: Warm, sharp, underdog funny.\n\n## Structure and pacing\nStructure mode: Classic 3-act spine.\nPacing bias: Lean and fast.\nScene length rule: Short and punchy.\n\n## Format rules\nFormat: Standard spec screenplay format.\nDialogue density: Naturalistic.\nVoiceover / narration: No voiceover.\n\n## Rating and boundaries\nTarget rating: PG-13.\nNo-go content: No graphic gore.\n\n## Production constraints\nCast size: 6 major speaking roles.\nLocation limits: Baseball fields, diner, tiny apartment.\nTime period / setting rules: Modern day minor-league town.\nBudget reality: Cheap.\n\n## Point of view\nPrimary POV: Rafa.\nScene access: Stay close.\n";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });

    expect(screen.queryByRole("link", { name: "Script Parameters - take me there" })).toBeNull();
    expect(screen.getByRole("link", { name: "Premise - take me there" }).getAttribute("href")).toBe("/rooms/premise");
  });

  it("asks Hermes to draft screenplay pages when all required source rooms are ready", async () => {
    routeState.slug = "create-script";
    const project = buildScriptBase({
      rawIdea: "A cursed wedding videographer must save his sister's wedding.",
      genre: "Comedy, Mystery",
      audienceFeeling: "funny and tense",
      protagonist: "Milo Voss",
      surfaceWant: "save Lena's wedding",
      stakes: "his family business dies and Lena's marriage collapses",
      falseBelief: "staying detached keeps everyone safe",
      opposition: "a celebrity planner hiding the truth",
      endingDirection: "Milo steps in front of the camera and tells the truth",
      structurePreference: "Classic 3-act spine",
    });
    project.rooms.premise =
      "# Premise Room\n\n## Story promise\nA comedy mystery about cursed wedding videos.\n\n## Raw idea\nA cursed wedding videographer must save his sister's wedding.\n\n## Protagonist\nMilo Voss.\n\n## Surface want\nSave Lena's wedding.\n\n## Stakes\nThe family business dies and Lena's marriage collapses.\n\n## Opposition\nCeleste hides the truth.\n\n## Dramatic question\nCan Milo stop hiding behind the camera?\n\n## Polished logline\nA cursed wedding videographer must expose a fake-perfect planner to save his sister's wedding.";
    project.rooms.characters =
      "# Characters Room\n\n## Protagonist\nMilo Voss.\n\n### Surface want\nSave Lena's wedding.\n\n### Deeper need\nTell the truth even when it costs him.\n\n### False belief\nDetachment keeps people safe.\n\n### Flaw / defense mechanism\nHe turns pain into jokes and footage.\n\n## Antagonist / opposition\nCeleste Vale, a planner selling perfect lies.";
    project.rooms.theme =
      "# Theme Room\n\n## Theme question\nIs safety worth it if it requires dishonesty?\n\n## Starting belief\nMilo believes distance protects everyone.\n\n## Ending statement\nLove requires choosing the messy truth.";
    project.rooms.beats =
      "# Beats Room\n\n## Opening Image\nMilo films a smiling couple seconds before they split.\n\n## Inciting Incident\nLena hires Milo for her wedding despite the curse.\n\n## Act One Break\nMilo finds proof Celeste is staging perfect lies.\n\n## Midpoint\nThe curse hits the rehearsal dinner live.\n\n## All Is Lost\nLena sees Milo's hidden footage and fires him.\n\n## Climax\nMilo interrupts the ceremony with the truth.\n\n## Final Image\nMilo films himself apologizing instead of hiding.";
    project.rooms.scenes = `# Scenes Room

## Saved scenes

### Scene: Rehearsal Curse

**Location / time:** INT. WEDDING VENUE - NIGHT

**Characters:**
Milo, Lena, Celeste

**Scene want:**
Milo wants to prove the video curse is real.

**Opposition:**
${"Celeste smiles and blocks every honest answer. ".repeat(120)}

**Turn:**
Lena sees a frame that should not exist.
`;
    project.rooms["script-parameters"] =
      "# Script Parameters Room\n\n## Runtime / page target\nLength format: Short film.\nTarget page count: 8 pages.\n\n## Genre / movie promise\nCurrent genre: Comedy mystery.\nAudience feeling: Funny and tense.\nTone words: Fast, heartfelt, anxious.\n\n## Structure and pacing\nStructure mode: Classic 3-act spine.\nPacing bias: Lean and fast.\nScene length rule: Short and punchy.\n\n## Format rules\nFormat: Standard spec screenplay format.\nDialogue density: Snappy.\nVoiceover / narration: No voiceover.\n\n## Rating and boundaries\nTarget rating: PG-13.\nNo-go content: No cruelty to animals.\n\n## Production constraints\nCast size: 6 major speaking roles.\nLocation limits: Wedding venue only.\nTime period / setting rules: Modern day.\nBudget reality: Cheap.\n\n## Point of view\nPrimary POV: Milo.\nScene access: Stay close to Milo.";
    project.rooms["create-script"] = "# Create the Script Room\n\nOld generated screenplay draft should not be sent again.";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    let resolveDraft: (response: { ok: true; json: () => Promise<{ output: string }> }) => void = () => {};
    const fetchSpy = vi.fn().mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDraft = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });
    const writingStyleSelect = screen.getByRole("combobox", {
      name: "Writing style (choose one)",
    }) as HTMLSelectElement;
    expect(writingStyleSelect.value).toBe("fey-comedy");
    fireEvent.change(writingStyleSelect, { target: { value: "sorkin-legal" } });
    vi.useFakeTimers();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Write a Quick Sample" }));
    });

    expect(screen.getByRole("button", { name: "Goblin is writing..." })).toBeTruthy();
    expect(screen.getByLabelText("Animated writing ellipsis")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Mini goblin running while the draft is written" })).toBeTruthy();
    expect(draftWaitingMessages).toHaveLength(26);
    expect(randomDraftWaitingMessageIndex(0, 0.99)).toBe(draftWaitingMessages.length - 1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("button", { name: "Goblin is writing..." })).toBeTruthy();

    const randomSpy = vi.spyOn(Math, "random").mockReturnValueOnce(0.99);
    act(() => {
      vi.advanceTimersByTime(draftWaitingMessageDelayMs - 5000);
    });
    expect(screen.getByRole("button", { name: "Emergency semicolon meeting in progress..." })).toBeTruthy();
    expect(randomSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    resolveDraft({
      ok: true,
      json: async () => ({ output: "TITLE: LOVE, CURSED\n\nINT. WEDDING VENUE - DAY\nMilo raises his camera." }),
    });
    await screen.findByText(/The goblin wrote a draft/i);
    expect((screen.getByRole("textbox", { name: "Create the Script markdown" }) as HTMLTextAreaElement).value).toContain(
      "INT. WEDDING VENUE - DAY",
    );

    const requestBody = JSON.parse((fetchSpy.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(requestBody.mode).toBe("sample");
    expect(requestBody.room).toBe("Create the Script");
    expect(requestBody.writingStyle).toBe("sorkin-legal");
    expect(requestBody.markdown).toContain("## premise.md");
    expect(requestBody.markdown).toContain("A cursed wedding videographer");
    expect(requestBody.markdown).toContain("## scenes.md");
    expect(requestBody.markdown).toContain("Rehearsal Curse");
    expect(requestBody.markdown).toContain("Lena sees a frame");
    expect(requestBody.markdown).toContain("## script-parameters.md");
    expect(requestBody.markdown).not.toContain("create-script.md");
    expect(requestBody.markdown).not.toContain("Old generated screenplay draft");
    expect(requestBody.markdown).not.toContain("Celeste smiles and blocks every honest answer. ".repeat(20));
  });

  it("defaults drama-comedy scripts to a genre writer instead of the goblin", async () => {
    routeState.slug = "create-script";
    const project = completedDraftableProject();
    project.answers.genre = "Drama, Comedy";
    project.rooms["script-parameters"] =
      "# Script Parameters Room\n\n## Runtime / page target\nLength format: Feature film.\nTarget page count: 100 pages.\n\n## Genre / movie promise\nCurrent genre: Drama comedy.\nAudience feeling: Funny and cathartic.\nTone words: Honest, sharp, humane.\n\n## Structure and pacing\nStructure mode: Classic 3-act spine.\nPacing bias: Lean and fast.\nScene length rule: Short and punchy.\n\n## Format rules\nFormat: Standard spec screenplay format.\nDialogue density: Snappy.\nVoiceover / narration: No voiceover.\n\n## Rating and boundaries\nTarget rating: PG-13.\nNo-go content: No graphic injury.\n\n## Production constraints\nCast size: 6 major speaking roles.\nLocation limits: Wedding venue only.\nTime period / setting rules: Modern day.\nBudget reality: Cheap.\n\n## Point of view\nPrimary POV: Milo.\nScene access: Stay close to Milo.";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });
    const writingStyleSelect = screen.getByRole("combobox", {
      name: "Writing style (choose one)",
    }) as HTMLSelectElement;

    expect(writingStyleSelect.value).not.toBe("goblin-house");
    expect(["simon-tv-drama", "fey-comedy"]).toContain(writingStyleSelect.value);
  });

  it("automatically saves generated screenplay pages into the Drafts room", async () => {
    routeState.slug = "create-script";
    const project = completedDraftableProject();
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    const fetchSpy = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: "TITLE: LOVE, CURSED\n\nINT. WEDDING VENUE - DAY\nMilo raises his camera." }),
      });
    vi.stubGlobal("fetch", fetchSpy);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });
    fireEvent.click(screen.getByRole("button", { name: "Write a Quick Sample" }));

    await screen.findByText(/The goblin wrote a draft/i);
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).mode).toBe("sample");

    const savedDrafts = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "[]");
    expect(savedDrafts).toHaveLength(1);
    expect(savedDrafts[0]).toEqual(
      expect.objectContaining({
        title: "LOVE, CURSED",
        body: expect.stringContaining("INT. WEDDING VENUE - DAY"),
      }),
    );
    expect(screen.getByText("Draft automatically tucked into the Drafts room.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Take me there" }).getAttribute("href")).toBe("/rooms/drafts");
  });

  it("shows the shared running goblin and lower wait-copy pill while the full script is planning", async () => {
    routeState.slug = "create-script";
    const project = completedDraftableProject();
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(new Promise(() => undefined)),
    );

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });
    vi.useFakeTimers();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Write the full script" }));
    });

    expect(screen.getByRole("img", { name: "Mini goblin running while the draft is written" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Goblin is writing..." })).toHaveLength(2);

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    act(() => {
      vi.advanceTimersByTime(draftWaitingMessageDelayMs);
    });

    expect(screen.getAllByRole("button", { name: "Emergency semicolon meeting in progress..." })).toHaveLength(2);
    expect(randomSpy).toHaveBeenCalled();
  });

  it("keeps an existing generated draft when another-draft confirmation is canceled", async () => {
    routeState.slug = "create-script";
    const project = completedDraftableProject();
    project.rooms["create-script"] =
      "# Create the Script Room\n\n## Generated screenplay draft\nTITLE: OLD DRAFT\n\nINT. VENUE - DAY\nMilo waits.";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });
    fireEvent.click(screen.getByRole("button", { name: "Goblin, make me another." }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect((screen.getByRole("textbox", { name: "Create the Script markdown" }) as HTMLTextAreaElement).value).toContain(
      "TITLE: OLD DRAFT",
    );
  });

  it("keeps a generated draft when delete confirmation is canceled", async () => {
    routeState.slug = "create-script";
    const project = completedDraftableProject();
    project.rooms["create-script"] =
      "# Create the Script Room\n\n## Generated screenplay draft\nTITLE: OLD DRAFT\n\nINT. VENUE - DAY\nMilo waits.";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });
    fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));

    expect((screen.getByRole("textbox", { name: "Create the Script markdown" }) as HTMLTextAreaElement).value).toContain(
      "TITLE: OLD DRAFT",
    );
  });

  it("offers export choices after a draft is written and exports saved drafts after a format is selected", async () => {
    routeState.slug = "create-script";
    const project = completedDraftableProject();
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output: "TITLE: LOVE, CURSED\n\nINT. WEDDING VENUE - DAY\nMilo raises his camera." }),
      }),
    );
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:plot-goblin");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });
    fireEvent.click(screen.getByRole("button", { name: "Write a Quick Sample" }));
    await screen.findByRole("button", { name: "Export draft" });

    fireEvent.click(screen.getByRole("button", { name: "Export draft" }));
    expect(await screen.findByRole("button", { name: "Export all drafts" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export all formats" })).toBeNull();
    expect(screen.getByRole("button", { name: "Export Fountain" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Final Draft" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Word" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export RTF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export all drafts" }).parentElement?.parentElement).toBe(
      document.body,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export all drafts" }));

    expect(clickSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Select a format before exporting all drafts.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Export Fountain" }));
    fireEvent.click(screen.getByRole("button", { name: "Export all drafts" }));

    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:plot-goblin");
  });

  it("opens saved drafts for editing, saving, backing out, and deletion", async () => {
    routeState.slug = "drafts";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({})));
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify([
        {
          id: "draft-1",
          title: "Love, Cursed",
          body: "INT. WEDDING VENUE - DAY\nMilo raises his camera.",
          createdAt: "2026-06-24T02:00:00.000Z",
          updatedAt: "2026-06-24T02:00:00.000Z",
        },
      ]),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Saved screenplay drafts" });
    fireEvent.click(screen.getByRole("button", { name: "Edit Love, Cursed" }));

    const draftBody = screen.getByRole("textbox", { name: "Draft body" }) as HTMLTextAreaElement;
    fireEvent.change(draftBody, { target: { value: "INT. WEDDING VENUE - NIGHT\nMilo stops hiding." } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft edits" }));

    let savedDrafts = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "[]");
    expect(savedDrafts[0].body).toContain("Milo stops hiding");

    fireEvent.click(screen.getByRole("button", { name: "Back to drafts" }));
    expect(screen.queryByRole("textbox", { name: "Draft body" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Delete Love, Cursed" }));
    savedDrafts = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "[]");
    expect(savedDrafts).toHaveLength(0);
  });

  it("exports one saved draft from the Drafts room after a format is picked", async () => {
    routeState.slug = "drafts";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({})));
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify([
        {
          id: "draft-1",
          title: "Love, Cursed",
          body: "TITLE: LOVE, CURSED\n\nINT. WEDDING VENUE - DAY\nMilo raises his camera.",
          createdAt: "2026-06-24T02:00:00.000Z",
          updatedAt: "2026-06-24T02:00:00.000Z",
        },
        {
          id: "draft-2",
          title: "Moon Dust",
          body: "TITLE: MOON DUST\n\nINT. MOON BASE - NIGHT\nAda checks the airlock.",
          createdAt: "2026-06-24T03:00:00.000Z",
          updatedAt: "2026-06-24T03:00:00.000Z",
        },
      ]),
    );
    let downloadedFilename = "";
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:plot-goblin");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Saved screenplay drafts" });
    fireEvent.click(screen.getByRole("button", { name: "Export Love, Cursed" }));

    expect(await screen.findByRole("button", { name: "Export Love, Cursed as Fountain" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Love, Cursed as Final Draft" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Love, Cursed as PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Love, Cursed as Word" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Love, Cursed as RTF" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Export Love, Cursed as Fountain" }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(downloadedFilename).toBe("plot-goblin-draft-love-cursed.fountain");
    expect(await (createObjectUrlSpy.mock.calls[0][0] as Blob).text()).toContain("Title: LOVE, CURSED");
    expect(await (createObjectUrlSpy.mock.calls[0][0] as Blob).text()).not.toContain("MOON DUST");
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:plot-goblin");
    expect(screen.getByText("Exported Love, Cursed as Fountain.")).toBeTruthy();
  });

  it("keeps a saved draft when saved-draft deletion is canceled", async () => {
    routeState.slug = "drafts";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(buildScriptBase({})));
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify([
        {
          id: "draft-1",
          title: "Love, Cursed",
          body: "INT. WEDDING VENUE - DAY\nMilo raises his camera.",
          createdAt: "2026-06-24T02:00:00.000Z",
          updatedAt: "2026-06-24T02:00:00.000Z",
        },
      ]),
    );
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Saved screenplay drafts" });
    fireEvent.click(screen.getByRole("button", { name: "Delete Love, Cursed" }));

    const savedDrafts = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "[]");
    expect(savedDrafts).toHaveLength(1);
  });

  it("names the exact Script Parameter fields still missing at eighty-nine percent", async () => {
    routeState.slug = "create-script";
    const project = buildScriptBase({
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
    project.rooms.beats =
      "# Beats Room\n\n## Opening Image\nRafa tapes a glove.\n\n## Inciting Incident\nA scout calls.\n\n## Act One Break\nRafa commits.\n\n## Midpoint\nHis old approach fails.\n\n## All Is Lost\nHe loses the slot.\n\n## Climax\nRafa asks for help.\n\n## Final Image\n[needs your answer]";
    project.rooms["script-parameters"] =
      "# Script Parameters Room\n\n## Runtime / page target\nScreen time guess: roughly 100 minutes.\n\n## Genre / movie promise\nCurrent genre: Sports comedy.\nAudience feeling: Hopeful and tense.\nTone words: Warm, sharp, underdog funny.\n\n## Structure and pacing\nStructure mode: Classic 3-act spine.\nPacing bias: Lean and fast.\nScene length rule: Short and punchy.\n\n## Format rules\nFormat: Standard spec screenplay format.\nDialogue density: Naturalistic.\nVoiceover / narration: No voiceover.\n\n## Rating and boundaries\nTarget rating: PG-13.\nNo-go content: No graphic gore.\n\n## Production constraints\nCast size: 6 major speaking roles.\nLocation limits: Baseball fields, diner, tiny apartment.\nTime period / setting rules: Modern day minor-league town.\nBudget reality: Cheap.\n\n## Point of view\nPrimary POV: Rafa.\nScene access: Stay close.\n";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });

    expect(screen.getByText(/Ready enough to draft/i)).toBeTruthy();
    expect(screen.getByText("89%")).toBeTruthy();
    expect(screen.getByText("17 filled / 2 to go")).toBeTruthy();
    expect(screen.getByText("Still needs: Length format, Target page count")).toBeTruthy();
  });
});

function completedDraftableProject() {
  const project = buildScriptBase({
    rawIdea: "A cursed wedding videographer must save his sister's wedding.",
    genre: "Comedy, Mystery",
    audienceFeeling: "funny and tense",
    protagonist: "Milo Voss",
    surfaceWant: "save Lena's wedding",
    stakes: "his family business dies and Lena's marriage collapses",
    falseBelief: "staying detached keeps everyone safe",
    opposition: "a celebrity planner hiding the truth",
    endingDirection: "Milo steps in front of the camera and tells the truth",
    structurePreference: "Classic 3-act spine",
  });
  project.rooms.premise =
    "# Premise Room\n\n## Story promise\nA comedy mystery about cursed wedding videos.\n\n## Raw idea\nA cursed wedding videographer must save his sister's wedding.\n\n## Protagonist\nMilo Voss.\n\n## Surface want\nSave Lena's wedding.\n\n## Stakes\nThe family business dies and Lena's marriage collapses.\n\n## Opposition\nCeleste hides the truth.\n\n## Dramatic question\nCan Milo stop hiding behind the camera?\n\n## Polished logline\nA cursed wedding videographer must expose a fake-perfect planner to save his sister's wedding.";
  project.rooms.characters =
    "# Characters Room\n\n## Protagonist\nMilo Voss.\n\n### Surface want\nSave Lena's wedding.\n\n### Deeper need\nTell the truth even when it costs him.\n\n### False belief\nDetachment keeps people safe.\n\n### Flaw / defense mechanism\nHe turns pain into jokes and footage.\n\n## Antagonist / opposition\nCeleste Vale, a planner selling perfect lies.";
  project.rooms.theme =
    "# Theme Room\n\n## Theme question\nIs safety worth it if it requires dishonesty?\n\n## Starting belief\nMilo believes distance protects everyone.\n\n## Ending statement\nLove requires choosing the messy truth.";
  project.rooms.beats =
    "# Beats Room\n\n## Opening Image\nMilo films a smiling couple seconds before they split.\n\n## Inciting Incident\nLena hires Milo for her wedding despite the curse.\n\n## Act One Break\nMilo finds proof Celeste is staging perfect lies.\n\n## Midpoint\nThe curse hits the rehearsal dinner live.\n\n## All Is Lost\nLena sees Milo's hidden footage and fires him.\n\n## Climax\nMilo interrupts the ceremony with the truth.\n\n## Final Image\nMilo films himself apologizing instead of hiding.";
  project.rooms["script-parameters"] =
    "# Script Parameters Room\n\n## Runtime / page target\nLength format: Short film.\nTarget page count: 8 pages.\n\n## Genre / movie promise\nCurrent genre: Comedy mystery.\nAudience feeling: Funny and tense.\nTone words: Fast, heartfelt, anxious.\n\n## Structure and pacing\nStructure mode: Classic 3-act spine.\nPacing bias: Lean and fast.\nScene length rule: Short and punchy.\n\n## Format rules\nFormat: Standard spec screenplay format.\nDialogue density: Snappy.\nVoiceover / narration: No voiceover.\n\n## Rating and boundaries\nTarget rating: PG-13.\nNo-go content: No graphic injury.\n\n## Production constraints\nCast size: 6 major speaking roles.\nLocation limits: Wedding venue only.\nTime period / setting rules: Modern day.\nBudget reality: Cheap.\n\n## Point of view\nPrimary POV: Milo.\nScene access: Stay close to Milo.";

  return project;
}
