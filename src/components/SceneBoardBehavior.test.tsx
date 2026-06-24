import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomEditorClient } from "./RoomEditorClient";
import { buildScriptBase } from "@/lib/guidedSetup";
import { PROJECT_STORAGE_KEY } from "@/lib/projectStorage";
import { formatScenesMarkdown, formatSceneDraftValues } from "./room-editor/RoomEditorSupport";

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

function projectWithSceneCards() {
  const project = projectWithSetupBeat();
  project.rooms.scenes = formatScenesMarkdown(project.rooms.scenes, [
    formatSceneDraftValues({
      button: "He pockets the cracked ball.",
      characters: "Joe, Mo",
      locationTime: "EXT. BATTING CAGE - DAWN",
      opposition: "The pitching machine keeps jamming.",
      purpose: "Character / setup",
      sceneWant: "Joe wants one clean swing before anyone sees him.",
      title: "Dawn Cage",
      turn: "Joe realizes the problem is bigger than pride.",
    }),
    formatSceneDraftValues({
      button: "Mo leaves the clipboard on the fence.",
      characters: "Joe, Mo",
      locationTime: "INT. GYM - MORNING",
      opposition: "Mo refuses to sign the tryout form.",
      purpose: "Pressure / relationship",
      sceneWant: "Joe wants Mo to clear him for tryouts.",
      title: "Gym Argument",
      turn: "Joe has to ask for help out loud.",
    }),
  ]);
  return project;
}

describe("SceneBoard selected scene panel", () => {
  it("does not duplicate the beat population controls inside the scene editor", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectWithSetupBeat()));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Scene cards" });

    expect(screen.getByRole("button", { name: "Populate from beat sheet" })).toBeTruthy();
    expect(screen.queryByText("Build this scene from a beat")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Beat for the goblin to build" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ask the goblin to build this scene from a beat" })).toBeNull();
  });
});

describe("SceneBoard behavior", () => {
  it("deletes the selected scene from the footer and selects the next scene", async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectWithSceneCards()));

    render(<RoomEditorClient />);

    fireEvent.click(await screen.findByRole("button", { name: /Dawn Cage/ }));
    expect((await screen.findByRole("textbox", { name: "Scene title" }) as HTMLInputElement).value).toBe("Dawn Cage");

    fireEvent.click(screen.getByRole("button", { name: "Delete selected scene" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Dawn Cage/ })).toBeNull();
    });
    expect((screen.getByRole("textbox", { name: "Scene title" }) as HTMLInputElement).value).toBe("Gym Argument");
  });

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

  it("suggests a scene, then saves it into the timeline at the goblin's placement", async () => {
    const suggestOutput = `PLOT_GOBLIN_FINAL:
1. Scene title: Locker Room Bargain
2. Location / time: INT. LOCKER ROOM - NIGHT
3. Characters: Joe, Mo (most pressure)
4. Scene want: Joe wants Mo to forge the medical clearance.
5. Opposition: Mo will lose his job if anyone finds out.
6. Turn: Joe realizes he is asking a friend to lie for him.
7. Button: Mo slides the unsigned form back across the bench.
8. Purpose: Pressure / relationship
9. Placement: after scene 1`;
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: suggestOutput }) });
    vi.stubGlobal("fetch", fetchSpy);
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectWithSceneCards()));

    render(<RoomEditorClient />);

    await screen.findByRole("region", { name: "Scene cards" });
    fireEvent.click(screen.getByRole("button", { name: "Goblin suggestion" }));

    const titleField = (await screen.findByRole("textbox", { name: "Scene title" })) as HTMLInputElement;
    await waitFor(() => expect(titleField.value).toBe("Locker Room Bargain"));

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string) as {
      mode: string;
      sceneList?: string;
    };
    expect(body.mode).toBe("scene-suggest");
    expect(body.sceneList).toContain("1. Dawn Cage");

    fireEvent.click(screen.getByRole("button", { name: "Save the suggested scene" }));

    await waitFor(() => {
      const storedProject = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) ?? "{}");
      const scenes = storedProject.rooms.scenes as string;
      expect(scenes.indexOf("### Scene: Dawn Cage")).toBeLessThan(scenes.indexOf("### Scene: Locker Room Bargain"));
      expect(scenes.indexOf("### Scene: Locker Room Bargain")).toBeLessThan(scenes.indexOf("### Scene: Gym Argument"));
    });
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
