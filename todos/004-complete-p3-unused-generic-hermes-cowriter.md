---
status: complete
priority: p3
issue_id: "004"
tags: [code-review, cleanup, ai, frontend]
dependencies: []
---

# Unused Generic Hermes Cowriter

## Problem Statement

`HermesCowriter` remains in the codebase, but the current room UI uses specialized field and beat suggestion controls instead. This creates a second AI interaction pattern in code that is not visible in the website, increasing confusion about which AI surface is canonical.

## Findings

- `src/components/HermesCowriter.tsx` defines a generic co-writer panel with its own access-key input and choice handling.
- Repository search found no current imports of `HermesCowriter`.
- The active UI now calls `/api/hermes-cowriter` directly from room-specific controls.

## Proposed Solutions

1. Delete the unused component and associated dead CSS if no longer planned.
   - Pros: Reduces feature clutter and duplicate access-key UX.
   - Cons: Loses a generic panel if it was intended for near-term reuse.
   - Effort: Small.
   - Risk: Low.

2. Reintegrate it as the canonical AI panel and have specialized controls compose it.
   - Pros: Keeps one AI access pattern.
   - Cons: More work and may not match current per-field UX.
   - Effort: Medium.
   - Risk: Medium.

## Recommended Action

Completed.

## Acceptance Criteria

- There is one clear canonical AI interaction pattern in the codebase.
- Unused component/CSS paths are removed or intentionally documented.
- Access-key UI does not appear in multiple disconnected implementations.

## Work Log

### 2026-06-23 - Review Capture

**By:** Codex

**Actions:**
- Searched for `HermesCowriter` imports and reviewed current AI controls in the editor.

**Learnings:**
- The current product prefers contextual suggestions, so generic AI UI should either compose that pattern or leave.

### 2026-06-23 - Fix

**By:** Codex

**Actions:**
- Deleted unused `src/components/HermesCowriter.tsx`.
- Removed the matching dead `workspace.module.css` selectors.
- Confirmed no live imports or references remain.

**Verification:**
- `npm test`
- `npm run lint`
- `npm run build`
- Production browser pass on the main routes with no console errors.
