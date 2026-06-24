# Two Goblin Buttons in the Scenes Room — Design

Date: 2026-06-24
Room: Scenes (`scenes.md`)
Status: Approved for planning

## Problem

The Scenes room's right-hand **GOBLIN GUIDANCE** panel has a single
"Ask the goblin to populate scenes" button. It silently bulk-dumps every
answered beat into the timeline, and when no beats are answered it just greys
out with no explanation. Two issues:

1. The writer expected to be asked *which* beat to populate, and to be told
   "populate the beat sheet first" when there is nothing to work from.
2. There is no way for the goblin to *suggest* a missing scene where the story
   is thin.

## Goal

Replace the single button with two clearly-scoped buttons, both in the right
GOBLIN GUIDANCE panel:

- **Populate from beat sheet** — pick one answered beat; the goblin builds that
  one scene from *only that beat's text*.
- **Goblin suggestion** — the goblin reads a stripped, site-wide summary, judges
  where the script is light, and suggests one new scene placed where it belongs.

Both buttons load their result into the **center scene editor** for review.

## Locked Decisions

- Both buttons live in the right GOBLIN GUIDANCE panel (`ScenePopulationGuidance`).
- The suggestion result appears in the **center editor** (`SceneBoard`), reusing
  the existing scene fields.
- The goblin judges "where it's light" **freely** (no fixed thirds) from the
  summary it is given.
- Summary/context building is **client-side, no extra LLM call** — same approach
  already used by the draft flow (`buildDraftContextMarkdown`).

## Button 1 — Populate from beat sheet

### Behavior
- Click opens a picker listing **answered beats not already in the timeline**
  (matched by scene title vs beat heading).
- Picking a beat triggers an LLM build that fills the 8 scene fields into the
  center editor as a draft. The writer reviews, then **Save** (existing save).
- No Suggest-another / Delete here — it is a direct beat → scene build.

### Empty states (replaces silent grey-out)
- No answered beats: "Populate the beat sheet first — the goblin has no answered
  beats to work from."
- All answered beats already placed: "All answered beats are already in the
  timeline."

### LLM context — beat only
The existing `scene` mode currently sends the **full** script markdown alongside
the beat (`hermesCowriter.ts`). New rule: beat → scene builds feed the LLM **only
the picked beat's text** (no full script, no writing style). This change applies
to the existing center "Build this scene from a beat" too, so both routes to a
beat-build behave identically (single beat-only path). This is an approved change
to existing `scene` mode behavior.

## Button 2 — Goblin suggestion

### Behavior
- Click calls a new `scene-suggest` LLM mode.
- The goblin returns the 8 scene fields **plus a 9th "Placement" line** (e.g.
  "after scene 7" or "start").
- The suggestion loads into the center editor as a draft with three actions:
  - **Save** — insert the scene at the goblin's chosen slot (not appended to end).
  - **Suggest another** — re-run `scene-suggest`, replace the draft.
  - **Delete** — discard the suggestion, clear the draft.

### LLM context — stripped site-wide summary (client-side)
A new helper (`buildSuggestionContextMarkdown`, sibling of
`buildDraftContextMarkdown`) builds the context with **no LLM call**:
- Each room field condensed to **one sentence** (premise, protagonist, want,
  stakes, false belief, theme, etc.).
- Beats compressed to **one line each** (heading + first sentence).
- The **current scene list** as a numbered list of titles/sluglines (reuse the
  existing `compactScenesMarkdown` pattern) so the goblin can see where it is thin.
- **No** writing style, **no** full context md.

## Architecture / Wiring

The trigger (right panel) and the result (center editor) are sibling components.
Bridge them with a minimal imperative handle — no lifting of the whole scene
draft.

- `SceneBoard` exposes `suggestScene()` and the Button-1 build via
  `useImperativeHandle`. All suggestion state (draft, suggest-another, delete,
  save-at-index) lives inside `SceneBoard` where the draft state already is.
- `ScenePopulationGuidance` (right panel): Button 1 is a self-contained picker
  (it only touches scenes markdown); Button 2 calls the `SceneBoard` ref.
- `RoomEditorClient` owns the ref and passes it to both components.

### File-level changes
- `src/lib/hermesCowriter.ts`
  - Add `"scene-suggest"` to the `CowriterRequest` mode union.
  - Add optional `sceneList` field (numbered current scenes) for the suggest mode.
  - New `scene-suggest` prompt block: input = stripped summary + scene list;
    output = 8 fields + a "Placement" line.
  - Strip full-script markdown out of the existing `scene` prompt (beat-only).
- `src/app/api/hermes-cowriter/route.ts`
  - Allow `"scene-suggest"` in `isCowriterRequest`.
  - Validate `sceneList` (optional string, capped).
- `src/lib/guidedSetup.ts`
  - Add `buildSuggestionContextMarkdown(rooms)` (one-sentence-per-field summary).
- `src/components/room-editor/RoomEditorSupport.tsx`
  - `parseSuggestedPlacement(output, sceneCount)` → insert index (0..count).
  - Insert-at-index helper for saving a suggested scene.
- `src/components/room-editor/RoomEditors.tsx`
  - `SceneBoard`: `useImperativeHandle` (`suggestScene`, beat build), suggestion
    mode + Save/Suggest-another/Delete, save-at-index.
  - `ScenePopulationGuidance`: Button 1 picker + empty states; Button 2 triggers
    the ref.
- `src/components/RoomEditorClient.tsx`
  - Create and pass the `SceneBoard` ref to both components.

## Error / Edge Handling
- Goblin returns empty or unparseable placement → insert at the end, no crash
  (mirrors existing `buildSceneFromBeat` failure handling).
- Suggestion on an empty timeline → goblin suggests an opening scene at the start.
- Picker with a beat whose title collides with an existing scene → filtered out
  of the list (treated as already placed).

## Testing
- `buildSuggestionContextMarkdown`: one sentence per field, one line per beat,
  numbered scene list, no writing style / full md.
- `parseSuggestedPlacement`: "after scene N", "start", junk → correct index.
- Insert-at-index save places the scene in the right slot.
- Button 1 picker: empty-state messages; picked beat feeds beat-only context.
- `scene-suggest` prompt: includes summary + scene list, excludes writing style.
- Existing `scene` mode no longer includes full-script markdown.
