# Scenes Vertical Rail Design

Date: 2026-06-23
Status: approved design

## Context

The Scenes room currently shows saved scene cards in a horizontal strip. After only a few cards, most of the sequence is hidden behind horizontal scrolling. This makes it hard for a writer to understand the scene order at a glance.

The room has unused horizontal space to the left of the scene editor area. The approved direction uses that space for a vertical scene rail.

## Goals

- Show saved scenes chronologically from top to bottom.
- Keep the new-scene action visible above the saved scenes.
- Avoid horizontal scrolling for the scene sequence.
- Preserve the existing scene editor behavior: selecting, editing, saving, reordering, and deleting saved scene cards.
- Keep the markdown-backed storage/export model unchanged.

## Chosen Layout

The default layout is a slightly rectangular vertical rail on the left side of the scene editor.

Rail order:

1. View toggle.
2. `+` tile for starting a new scene.
3. Saved scene cards in chronological order.

Each default scene tile should be the same shape and size. It should show:

- Scene number.
- Scene title.
- A short secondary line, such as location/time, when there is room.

The selected scene tile uses the existing gold active treatment so the writer can see which scene is open in the editor.

## Compact Toggle

A small toggle sits above the `+` tile. Tapping it changes only the rail density.

- Default state: slightly rectangular rail, readable labels.
- Compact state: thin square rail, same chronological order, shorter labels.
- Tapping again returns to the default rail.

The selected scene and unsaved editor draft should remain stable when the rail mode changes. The toggle is a visual preference, not a content operation.

## Behavior

Selecting a scene opens that scene in the editor.

Clicking the `+` tile starts a new scene draft using the current scene template.

Drag-to-reorder should still work vertically. Dropping a scene onto another saved scene moves it to that chronological position.

The existing transient delete target can remain, but it should adapt to the vertical rail layout. It should not add permanent delete buttons to every tile.

The rail can scroll vertically when there are more scenes than fit in the viewport. The editor should remain usable while the rail scrolls.

## Responsive Behavior

On desktop and tablet widths, the rail sits to the left of the scene editor.

On narrow mobile widths, prefer a compact top rail or single-column vertical stack that still exposes chronological order. Do not recreate the current wide hidden horizontal strip. The implementation should choose the simplest responsive rule that keeps the editor readable and the scene order accessible.

## Data Flow

No data model change is required.

The existing markdown parsing and formatting remain the source of truth:

- `parseSavedSceneCards(markdown)` continues to produce saved scene cards.
- `formatScenesMarkdown(markdown, sceneCards)` continues to write reordered or edited cards back to markdown.
- The rail mode should be local UI state. It does not need to be exported in markdown.

## Testing

Add focused component coverage for:

- The scene rail renders the `+` tile before saved scenes.
- Saved scenes render in chronological vertical order.
- The default rail shows rectangular-style scene tiles.
- The toggle switches to compact square-style tiles and back.
- Selecting a scene remains stable across toggle changes.
- Reordering still writes the new scene order to markdown.

Run the standard project checks before implementation is called complete:

```bash
npm test
npm run lint
npm run build
```

Then browser-check `/rooms/scenes` locally and inspect console errors.

## Out Of Scope

- Grouping scenes by act or beat lane.
- Adding a new persistent scene data model.
- Replacing the markdown export format.
- Adding AI behavior changes.
