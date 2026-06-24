import { describe, expect, it } from "vitest";
import {
  getActiveRooms,
  getComingSoonRooms,
  getScriptReadiness,
  storyRooms,
  structureModes,
} from "./storyRooms";
import { buildScriptBase } from "./guidedSetup";

describe("story room model", () => {
  it("starts with the active writing rooms in flow order", () => {
    expect(getActiveRooms().map((room) => room.slug)).toEqual([
      "premise",
      "characters",
      "theme",
      "beats",
      "scenes",
      "script-parameters",
      "create-script",
    ]);
  });

  it("keeps non-MVP rooms visible as coming soon work rooms", () => {
    expect(getComingSoonRooms().map((room) => room.slug)).toEqual([
      "relationships",
      "world",
      "dialogue",
      "setups-payoffs",
      "revision",
    ]);
  });

  it("uses a hybrid structure: guided defaults without locking the writer into a formula", () => {
    expect(structureModes.default).toBe("guided-three-act");
    expect(structureModes.allowCustomBeats).toBe(true);
    expect(storyRooms.find((room) => room.slug === "beats")?.markdownFile).toBe("beats.md");
  });

  it("blocks Create the Script until Script Parameters has enough drafting rules", () => {
    const readiness = getScriptReadiness({
      premise: completePremise,
      characters: completeCharacters,
      theme: completeTheme,
      beats: completeBeats,
      scenes: completeScenes,
      "script-parameters": "# Script Parameters Room\n\n## Runtime / page target\n[Needs writing] Choose a length.",
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingRoom?.slug).toBe("script-parameters");
    expect(readiness.missingRooms[0]?.reason).toBe("Fill out Length format.");
  });

  it("reports threshold progress for each room Create the Script still needs", () => {
    const readiness = getScriptReadiness({
      premise: "# Premise Room\n\n## Raw idea\nRafa wants a tryout.\n\n## Protagonist\nRafa.\n\n## Surface want\nPitch well.\n\n## Stakes\nHe loses his last chance.",
      characters: completeCharacters,
      theme: completeTheme,
      beats: "# Beats Room\n\n## Opening Image\nRafa tapes a glove.\n\n## Inciting Incident\nA scout calls.",
      scenes: completeScenes,
      "script-parameters": completeScriptParameters,
    });

    expect(readiness.roomProgress.filter((progress) => progress.remaining > 0)).toEqual([
      expect.objectContaining({ completed: 4, percent: 50, remaining: 4, room: expect.objectContaining({ slug: "premise" }), total: 8 }),
      expect.objectContaining({ completed: 2, percent: 29, remaining: 5, room: expect.objectContaining({ slug: "beats" }), total: 7 }),
    ]);
  });

  it("points to the first story room that needs the agreed minimum story spine", () => {
    const readiness = getScriptReadiness({
      premise: "# Premise Room\n\n## Raw idea\nRafa wants a tryout.",
      characters: completeCharacters,
      theme: completeTheme,
      beats: completeBeats,
      scenes: completeScenes,
      "script-parameters": completeScriptParameters,
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingRoom?.slug).toBe("premise");
    expect(readiness.missingRooms[0]?.reason).toBe("Fill out Story promise.");
  });

  it("passes when the minimum Create the Script source rooms are filled out", () => {
    const readiness = getScriptReadiness({
      premise: completePremise,
      characters: completeCharacters,
      theme: completeTheme,
      beats: completeBeats,
      scenes: completeScenes,
      "script-parameters": completeScriptParameters,
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.blockedRooms).toEqual([]);
    expect(readiness.missingRooms).toEqual([]);
  });

  it("keeps Script Parameters in the meter without blocking once enough drafting rules are filled", () => {
    const readiness = getScriptReadiness({
      premise: completePremise,
      characters: completeCharacters,
      theme: completeTheme,
      beats: completeBeats,
      scenes: completeScenes,
      "script-parameters": completeScriptParameters
        .replace("Tone words: Warm, sharp, underdog funny.", "Tone words: [needs your answer]")
        .replace("No-go content: No graphic injury.", "No-go content: [needs your answer]"),
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.missingRooms).toEqual([]);
    expect(readiness.roomProgress.find((progress) => progress.room.slug === "script-parameters")).toEqual(
      expect.objectContaining({
        completed: 17,
        missingRequirements: ["Tone words", "No-go content"],
        percent: 89,
        remaining: 2,
        total: 19,
      }),
    );
  });

  it("reports exact Script Parameter labels still missing after the room is ready enough", () => {
    const readiness = getScriptReadiness({
      premise: completePremise,
      characters: completeCharacters,
      theme: completeTheme,
      beats: completeBeats,
      scenes: completeScenes,
      "script-parameters": completeScriptParameters
        .replace("Length format: Feature film.\n", "")
        .replace("Target page count: 100 pages.\n", ""),
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.missingRooms).toEqual([]);
    expect(readiness.roomProgress.find((progress) => progress.room.slug === "script-parameters")).toEqual(
      expect.objectContaining({
        completed: 17,
        missingRequirements: ["Length format", "Target page count"],
        percent: 89,
        remaining: 2,
        total: 19,
      }),
    );
  });

  it("passes when each Create the Script source room meets its enough-to-draft threshold", () => {
    const readiness = getScriptReadiness({
      premise: completePremise.replace("Can Rafa earn a real shot before pride erases it?", "[needs your answer]"),
      characters: completeCharacters.replace("He needs to accept help without treating it as humiliation.", "[needs your answer]"),
      theme: completeTheme.replace("The ending proves accepting help can be a braver kind of effort.", "[needs your answer]"),
      beats: completeBeats.replace("He tapes the glove with someone beside him.", "[needs your answer]"),
      scenes: completeScenes,
      "script-parameters": completeScriptParameters
        .replace("Tone words: Warm, sharp, underdog funny.", "Tone words: [needs your answer]")
        .replace("No-go content: No graphic injury.", "No-go content: [needs your answer]"),
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.missingRooms).toEqual([]);
    expect(readiness.roomProgress.map((progress) => [progress.room.slug, progress.completed, progress.total])).toEqual([
      ["script-parameters", 17, 19],
      ["premise", 7, 8],
      ["characters", 5, 6],
      ["theme", 2, 3],
      ["beats", 6, 7],
    ]);
    expect(readiness.roomProgress.every((progress) => !progress.blocksDraft)).toBe(true);
  });

  it("blocks rooms that are below the enough-to-draft threshold", () => {
    const readiness = getScriptReadiness({
      premise: completePremise
        .replace("Can Rafa earn a real shot before pride erases it?", "[needs your answer]")
        .replace("Rafa must win a pro tryout before injury, money, and pride erase his last chance.", "[needs your answer]"),
      characters: completeCharacters,
      theme: completeTheme,
      beats: completeBeats,
      scenes: completeScenes,
      "script-parameters": completeScriptParameters
        .replace("Tone words: Warm, sharp, underdog funny.", "Tone words: [needs your answer]")
        .replace("No-go content: No graphic injury.", "No-go content: [needs your answer]")
        .replace("Scene access: Stay close.", "Scene access: [needs your answer]"),
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.missingRooms.map((issue) => [issue.room.slug, issue.reason])).toEqual([
      ["script-parameters", "Fill out Tone words."],
      ["premise", "Fill out Dramatic question."],
    ]);
    expect(readiness.roomProgress.find((progress) => progress.room.slug === "script-parameters")?.blocksDraft).toBe(true);
    expect(readiness.roomProgress.find((progress) => progress.room.slug === "characters")?.blocksDraft).toBe(false);
  });

  it("does not keep Characters in the meter when only the pressure test is blank", () => {
    const readiness = getScriptReadiness({
      premise: completePremise,
      characters: completeCharacters.replace("He gets one televised pitch where effort alone cannot save him.", "[needs your answer]"),
      theme: completeTheme,
      beats: completeBeats,
      scenes: completeScenes,
      "script-parameters": completeScriptParameters,
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.missingRooms).toEqual([]);
    expect(readiness.roomProgress.find((progress) => progress.room.slug === "characters")).toEqual(
      expect.objectContaining({ completed: 6, percent: 100, remaining: 0, total: 6 }),
    );
  });

  it("counts story-specific guided setup guesses as filled character answers", () => {
    const project = buildScriptBase({
      rawIdea: "A one-armed pitcher tries to make the majors.",
      genre: "Comedy",
      audienceFeeling: "hopeful and tense",
      protagonist: "Stubborn one-armed pitcher",
      surfaceWant: "become a professional baseball player",
      stakes: "he loses the only dream he has left",
      falseBelief: "effort alone is enough",
      opposition: "better players who have two arms",
      endingDirection: "He changes and wins",
      structurePreference: "Classic 3-act spine",
    });

    const readiness = getScriptReadiness({
      premise: completePremise,
      characters: project.rooms.characters,
      theme: completeTheme,
      beats: completeBeats,
      scenes: completeScenes,
      "script-parameters": completeScriptParameters,
    });

    expect(readiness.missingRooms.find((issue) => issue.room.slug === "characters")).toBeUndefined();
    expect(readiness.roomProgress.find((progress) => progress.room.slug === "characters")).toEqual(
      expect.objectContaining({ completed: 6, percent: 100, remaining: 0, total: 6 }),
    );
  });

  it("does not require Scenes before Create the Script can draft", () => {
    const readiness = getScriptReadiness({
      premise: completePremise,
      characters: completeCharacters,
      theme: completeTheme,
      beats: completeBeats,
      scenes: "# Scenes Room\n\n[needs your answer]",
      "script-parameters": completeScriptParameters,
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.missingRooms).toEqual([]);
    expect(readiness.roomProgress.map((progress) => progress.room.slug)).not.toContain("scenes");
  });
});

const completePremise = `# Premise Room

## Story promise
A hopeful sports comedy about stubborn pride under pressure.

## Raw idea
A one-armed pitcher chases one last professional tryout.

## Protagonist
Rafa, a stubborn one-armed pitcher.

## Surface want
He wants to make the majors.

## Stakes
Failure costs him the last dream he admits still matters.

## Opposition
Better players, a skeptical coach, and his refusal to ask for help.

## Dramatic question
Can Rafa earn a real shot before pride erases it?

## Polished logline
Rafa must win a pro tryout before injury, money, and pride erase his last chance.
`;

const completeCharacters = `# Characters Room

## Protagonist
Rafa starts proud, funny, and allergic to pity.

### Surface want
He wants a professional baseball contract.

### Deeper need
He needs to accept help without treating it as humiliation.

### False belief
He believes needing help means he is weak.

### Flaw / defense mechanism
He jokes, overtrains, and rejects useful help before it can feel like pity.

### Pressure test
He gets one televised pitch where effort alone cannot save him.

## Antagonist / opposition
A rival pitcher and a coach who believe Rafa is a sentimental risk.
`;

const completeTheme = `# Theme Room

## Theme question
Is adaptation surrender, or is it how a dream survives reality?

## Starting belief
Rafa believes effort alone should be enough.

## Ending statement
The ending proves accepting help can be a braver kind of effort.
`;

const completeBeats = `# Beats Room

## Opening Image
Rafa tapes a battered glove before dawn.

## Inciting Incident
A scout announces one open tryout slot.

## Act One Break
Rafa commits publicly and cannot retreat without humiliation.

## Midpoint
His old pitching approach fails in front of everyone.

## All Is Lost
He loses the tryout slot and the person willing to help him.

## Climax
Rafa asks for help and earns one honest pitch.

## Final Image
He tapes the glove with someone beside him.
`;

const completeScenes = `# Scenes Room

## Scene list
- Tryout opens with Rafa hiding how badly he wants the slot.
`;

const completeScriptParameters = `# Script Parameters Room

## Runtime / page target
Length format: Feature film.
Target page count: 100 pages.
Screen time guess: roughly 100 minutes.

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
