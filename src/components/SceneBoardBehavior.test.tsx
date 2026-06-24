import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomEditorClient } from "./RoomEditorClient";
import { buildScriptBase } from "@/lib/guidedSetup";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";

const routeState = vi.hoisted(() => ({ slug: "scenes" }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: routeState.slug }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

function projectWithSetupBeat() {
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

## Setup
Joe lives at the batting cages before sunrise, taping his only arm with his teeth.
`;
  return project;
}

const SCENE_OUTPUT = `PLOT_GOBLIN_FINAL:
1. Scene title: Dawn Cage
2. Location / time: EXT. BATTING CAGE - DAWN
3. Characters: Joe, Mo (most pressure)
4. Scene want: Joe wants one clean swing before anyone wakes up.
5. Opposition: His shoulder is shaking and the machine keeps jamming.
6. Turn: Joe admits, just to himself, that he cannot do this alone.
7. Button: He leaves one ball sitting in the dirt.
8. Purpose: Character / setup`;

describe("SceneBoard goblin builder", () => {
  it("fills the scene form from the chosen beat using the LLM", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: SCENE_OUTPUT }) });
    vi.stubGlobal("fetch", fetchSpy);
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectWithSetupBeat()));

    render(<RoomEditorClient />);

    const beatSelect = await screen.findByRole("combobox", { name: "Beat for the goblin to build" });
    fireEvent.change(beatSelect, { target: { value: "Setup" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask the goblin to build this scene from a beat" }));

    const titleField = (await screen.findByRole("textbox", { name: "Scene title" })) as HTMLInputElement;
    await waitFor(() => expect(titleField.value).toBe("Dawn Cage"));
    expect((screen.getByRole("textbox", { name: "Location / time" }) as HTMLInputElement).value).toBe(
      "EXT. BATTING CAGE - DAWN",
    );
    expect((screen.getByRole("textbox", { name: "Characters" }) as HTMLTextAreaElement).value).toBe(
      "Joe, Mo (most pressure)",
    );
    expect((screen.getByRole("textbox", { name: "Turn" }) as HTMLTextAreaElement).value).toContain(
      "cannot do this alone",
    );

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as {
      mode: string;
      beat: string;
    };
    expect(body.mode).toBe("scene");
    expect(body.beat).toBe("Setup");
  });

  it("re-asks the goblin on another attempt and reverts the draft on close", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: SCENE_OUTPUT }) });
    vi.stubGlobal("fetch", fetchSpy);
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectWithSetupBeat()));

    render(<RoomEditorClient />);

    const beatSelect = await screen.findByRole("combobox", { name: "Beat for the goblin to build" });
    fireEvent.change(beatSelect, { target: { value: "Setup" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask the goblin to build this scene from a beat" }));

    const titleField = (await screen.findByRole("textbox", { name: "Scene title" })) as HTMLInputElement;
    await waitFor(() => expect(titleField.value).toBe("Dawn Cage"));

    fireEvent.click(screen.getByRole("button", { name: "Ask the goblin for another scene attempt" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "Discard the goblin scene draft" }));
    await waitFor(() => expect(titleField.value).toBe(""));
  });
});

describe("SceneBoard behavior", () => {
  it("treats guided scene template prompts as helper text for every story field", async () => {
    const project = buildScriptBase({
      rawIdea: "A one-armed pitcher tries to make the majors.",
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      protagonist: "",
      surfaceWant: "",
      stakes: "They lose the chance to get what they want and have to face what that dream was protecting.",
      falseBelief: "",
      opposition: "",
      endingDirection: "He changes and wins",
      structurePreference: "Classic 3-act spine",
    });
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Scene cards" });

    const helperFields = [
      ["Characters", "a protagonist whose want exposes the wound"],
      ["Scene want", "wants a concrete step"],
      ["Opposition", "blocks the scene goal"],
      ["Turn", "By the end, power, emotion"],
    ] as const;

    for (const [fieldName, placeholderText] of helperFields) {
      const field = screen.getByRole("textbox", { name: fieldName });
      expect((field as HTMLInputElement | HTMLTextAreaElement).value).toBe("");
      expect(field.getAttribute("placeholder")).toContain(placeholderText);
    }
  });

  it("shows populated scene prompts as hidden-on-focus helper text", async () => {
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

## Midpoint
A scout offers one private pitch, but only if Rafa admits he needs a catcher.
`;
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<RoomEditorClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Ask the goblin to populate scenes" }));
    fireEvent.click(await screen.findByRole("button", { name: /Midpoint/ }));

    const charactersField = await screen.findByRole("textbox", { name: "Characters" });
    expect((charactersField as HTMLTextAreaElement).value).toBe("");
    expect(charactersField.getAttribute("placeholder")).toBe(
      "Who is in this beat's scene, and who can apply the most pressure?",
    );

    fireEvent.focus(charactersField);
    expect(charactersField.getAttribute("placeholder")).toBe("");

    fireEvent.blur(charactersField);
    const sceneWantField = screen.getByRole("textbox", { name: "Scene want" });
    expect((sceneWantField as HTMLTextAreaElement).value).toBe("");
    expect(sceneWantField.getAttribute("placeholder")).toContain("Make the scene want concrete from this beat");
  });

  it("moves scene form focus to the next field when Enter is pressed", async () => {
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

    const titleField = await screen.findByRole("textbox", { name: "Scene title" });
    const locationField = screen.getByRole("textbox", { name: "Location / time" });
    const charactersField = screen.getByRole("textbox", { name: "Characters" });

    fireEvent.change(titleField, { target: { value: "Tryout Opens" } });
    fireEvent.keyDown(titleField, { code: "Enter", key: "Enter" });
    expect(document.activeElement).toBe(locationField);

    fireEvent.change(locationField, { target: { value: "EXT. SANDLOT - DAY" } });
    fireEvent.keyDown(locationField, { code: "Enter", key: "Enter" });
    expect(document.activeElement).toBe(charactersField);
  });
});
