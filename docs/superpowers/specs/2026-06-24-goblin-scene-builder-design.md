# Goblin Scene Builder — Design

**Date:** 2026-06-24
**Branch:** fix/goblin-suggest-concrete-examples

## Problem

"Ask the goblin to populate scenes" is fully deterministic. `populateScenesFromBeats()` →
`sceneCardsFromBeats()` → `beatSceneCard()` stamps a fixed template per beat: it dumps raw
beat text into "Scene want" and "Turn" (with prefixes like *"Make the scene want concrete
from this beat:"*) and leaves Location/time, Characters, Opposition, and Button as literal
`[needs writing]` placeholders. The writer sees generic filler even though their beats are
fully written.

## Goal

Let the goblin use the LLM (existing Hermes bridge) to read one answered beat plus the full
script context and write a concrete, playable scene into all 8 scene fields, which the writer
can save, regenerate, or discard.

## User flow

1. Scene editor shows a **beat dropdown** ("Pick a beat for the goblin to build…") listing
   answered beats by heading. If the open scene's title matches a beat heading, that beat is
   pre-selected.
2. Writer picks a beat and clicks **"Ask the goblin to build this scene."** Loading shows the
   existing squash animation + `SuggestionGoblin` mascot.
3. The LLM returns all 8 fields; they fill the scene draft form directly (writer can edit).
4. Writer chooses **Save scene** (existing footer button), **Another attempt** (re-call), or
   **Close** (revert the draft to its pre-fill snapshot, clear the goblin state).

The existing deterministic "Ask the goblin to populate scenes" button is unchanged — it stays
as the seed step that creates one card per beat. Scenes are then rebuilt one at a time on
demand (one cheap LLM call each, reviewable).

## Changes

### LLM bridge — new `"scene"` mode
- `CowriterRequest.mode` gains `"scene"`; `isCowriterRequest()` in the route accepts it.
- `buildCowriterPrompt()` adds a `scene` branch: reuses `sharedRules`, supplies `beat`
  (heading), `beatMarkdown` (beat body), and `markdown` (full script). Instructs the model to
  return EXACTLY 8 numbered lines, one per field, format `N. <Field>: <text>`, using the exact
  field labels so `parseCowriterChoices()` can split target/text. Field labels and order:
  Scene title, Location / time, Characters, Scene want, Opposition, Turn, Button, Purpose.
  Location/time must be a proper INT./EXT. slugline; Characters named people; invented
  specifics tagged "(assumed)".

### Helpers (RoomEditorSupport.tsx)
- `answeredBeatSections(beatsMarkdown): BeatSection[]` — the dropdown source. Same filters as
  the current `sceneCardsFromBeats` (drop "custom beats", drop `beatNeedsAnswer`, drop empty
  cleaned text). `sceneCardsFromBeats` is refactored to reuse it.
- `sceneDraftValuesFromChoices(choices): Partial<SceneDraftValues>` — maps the 8 returned
  `target: text` choices onto scene fields by normalized label, with a positional fallback
  (choices in order → the 8 fields) when no labels match.

### SceneBoard (RoomEditors.tsx)
- Gains a `project: ScriptBase | null` prop (mirrors `BeatsCorkBoard`), passed from
  `RoomEditorClient`. Used to read `project.rooms.beats` for the dropdown and to build full
  export markdown (`buildExportMarkdown`) + `answers` for the prompt.
- New goblin-fill row above the scene-question form: the beat `<select>`, the build button,
  and (after a successful fill) "Another attempt" + "Close". Loading/mascot/error state via
  `useSuggestionStates()` (single index). A local snapshot of the pre-fill draft enables Close
  to revert.

## Testing

- `answeredBeatSections` — filters answered vs. needs-answer/empty/custom beats.
- `sceneDraftValuesFromChoices` — labeled mapping + positional fallback + partial output.
- `buildCowriterPrompt("scene")` — includes beat heading, beat body, full markdown, and the
  8-field instruction.
- Route: `"scene"` is an accepted mode.
- SceneBoard behavior (mocked fetch): pick beat → build → fields populate; Another attempt
  re-calls; Close reverts to snapshot.

## Out of scope

- Batch-filling all scenes via LLM (rate limit + latency).
- Changing the deterministic seed button's output.
