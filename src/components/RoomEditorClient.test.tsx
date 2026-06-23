import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomEditorClient } from "./RoomEditorClient";
import { buildScriptBase } from "@/lib/guidedSetup";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";

const routeState = vi.hoisted(() => ({ slug: "premise" }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: routeState.slug }),
}));

afterEach(() => {
  cleanup();
  routeState.slug = "premise";
  window.localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RoomEditorClient", () => {
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
    expect(openingImage.value).not.toContain("[needs your answer]");
    expect(openingImage.value).toMatch(/^Describe the first visual snapshot/);
    expect(setup.value).not.toContain("[needs your answer]");
    expect(setup.value).toContain("Establish the ordinary world");

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

  it("populates ordered scene cards from the beat sheet", async () => {
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

## Midpoint
A scout offers one private pitch, but only if Rafa admits he needs a catcher.

## Final Image
Rafa takes the mound with Mina beside him and throws without hiding the sling.
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Scene cards" });
    expect(screen.getByRole("img", { name: "Large scene goblin mascot" })).toBeTruthy();
    expect(
      screen.getByText(/auto-populates scene cards from your Beats page, if any/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ask the goblin to populate scenes" }));

    const openingScene = await screen.findByRole("button", { name: /Opening Image/ });
    const midpointScene = screen.getByRole("button", { name: /Midpoint/ });
    const finalScene = screen.getByRole("button", { name: /Final Image/ });

    expect(openingScene.compareDocumentPosition(midpointScene) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(midpointScene.compareDocumentPosition(finalScene) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      expect(storedProject.rooms.scenes.indexOf("### Scene: Opening Image")).toBeLessThan(
        storedProject.rooms.scenes.indexOf("### Scene: Midpoint"),
      );
      expect(storedProject.rooms.scenes.indexOf("### Scene: Midpoint")).toBeLessThan(
        storedProject.rooms.scenes.indexOf("### Scene: Final Image"),
      );
      expect(storedProject.rooms.scenes).toContain("Make the scene want concrete from this beat: Rafa tapes");
      expect(storedProject.rooms.scenes).toContain("**Purpose:**\nBeat: Opening Image");
      expect(storedProject.rooms.scenes).toContain("- Opening Image\n- Midpoint\n- Final Image");
    });
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

    fireEvent.click(screen.getByRole("button", { name: "Please Oh Mighty Goblin. Write a draft." }));

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
    project.rooms["script-parameters"] =
      "# Script Parameters Room\n\n## Runtime / page target\nScreen time guess: roughly 100 minutes.\n\n## Genre / movie promise\nCurrent genre: Sports comedy.\nAudience feeling: Hopeful and tense.\nTone words: Warm, sharp, underdog funny.\n\n## Structure and pacing\nStructure mode: Classic 3-act spine.\nPacing bias: Lean and fast.\nScene length rule: Short and punchy.\n\n## Format rules\nFormat: Standard spec screenplay format.\nDialogue density: Naturalistic.\nVoiceover / narration: No voiceover.\n\n## Rating and boundaries\nTarget rating: PG-13.\nNo-go content: No graphic gore.\n\n## Production constraints\nCast size: 6 major speaking roles.\nLocation limits: Baseball fields, diner, tiny apartment.\nTime period / setting rules: Modern day minor-league town.\nBudget reality: Cheap.\n\n## Point of view\nPrimary POV: Rafa.\nScene access: Stay close.\n";
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Create the Script draft gate" });

    expect(screen.getByText("89%")).toBeTruthy();
    expect(screen.getByText("17 filled / 2 to go")).toBeTruthy();
    expect(screen.getByText("Still needs: Length format, Target page count")).toBeTruthy();
  });
});
