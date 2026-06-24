---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, maintainability, architecture, frontend]
dependencies: []
---

# Room Editor Monolith

## Problem Statement

`RoomEditorClient.tsx` has become the central owner of markdown parsing, autosave, AI suggestion state, audio effects, guided fields, beat board UI, scene board UI, script parameter forms, and draft readiness. The current behavior works, but future changes are increasingly likely to create regressions because unrelated room concepts live in one large file.

## Findings

- The file is over 2,000 lines and contains several separate feature areas.
- `RoomEditorClient` conditionally switches between beats, scenes, script parameters, create-script, guided rooms, and raw markdown editing.
- Helper parsing/formatting code for scenes, beats, guided fields, and script parameters is mixed with React UI code.

## Proposed Solutions

1. Extract room-specific editors and pure markdown helpers into focused modules.
   - Pros: Easier testing, smaller diffs, clearer ownership by room concept.
   - Cons: Requires careful, behavior-preserving movement.
   - Effort: Medium.
   - Risk: Medium.

2. Start by extracting only pure parser/formatter helpers and leaving UI in place.
   - Pros: Lower-risk first step with immediate testability gains.
   - Cons: UI component remains large for now.
   - Effort: Small/Medium.
   - Risk: Low.

## Recommended Action

Completed.

## Acceptance Criteria

- Beat, scene, guided-room, and script-parameter parsing helpers live outside the main editor component.
- Existing tests still pass without behavior changes.
- New helper tests cover at least scene formatting, beat parsing, and script parameter parsing.
- Future room additions do not require editing the same large component for every concern.

## Work Log

### 2026-06-23 - Review Capture

**By:** Codex

**Actions:**
- Reviewed the full editor component and verified the browser flows it owns.
- Identified the file as the main maintainability risk after feature accretion.

**Learnings:**
- The product concepts are good; the implementation boundary is what needs tidying.

### 2026-06-23 - Fix

**By:** Codex

**Actions:**
- Split shared markdown parsing, formatting, suggestion state, and audio helpers into `src/components/room-editor/RoomEditorSupport.tsx`.
- Moved room-specific editors into `src/components/room-editor/RoomEditors.tsx`.
- Reduced `RoomEditorClient.tsx` to routing, loading, autosave, and editor selection.

**Verification:**
- `npm test`
- `npm run lint`
- `npm run build`
- Production browser pass on the main routes with no console errors.
