---
status: complete
priority: p2
issue_id: "001"
tags: [code-review, product, ux, architecture]
dependencies: []
---

# Create Script MVP Scope Decision

## Problem Statement

`Create the Script` is modeled as an active room, so it appears beside the six MVP content rooms on the landing page, rooms dashboard, navigation menu, export order, and local project room data. The original review flagged this as a conflict with the README's locked MVP room list.

## Findings

- `README.md` previously listed six active MVP rooms.
- The active room list in `src/lib/storyRooms.ts` includes `create-script` after `script-parameters`.
- Browser review confirmed the landing page and dashboard show seven active rooms, with `Create the Script` presented as room 07.
- Product decision from Joe on 2026-06-23: `Create the Script` is intentionally included in the MVP build.

## Proposed Solutions

1. Move `Create the Script` out of `storyRooms` and expose it as a dedicated action/checkpoint route.
   - Pros: Matches the product brief and clarifies the workflow.
   - Cons: Requires route/nav/dashboard copy updates.
   - Effort: Medium.
   - Risk: Low.

2. Keep the route but mark it with a new non-room status such as `workflow`.
   - Pros: Smaller change while keeping central metadata.
   - Cons: Requires callers to distinguish active content rooms from workflow entries.
   - Effort: Small/Medium.
   - Risk: Low.

## Recommended Action

Keep `Create the Script` active for the MVP build and update the README contract to name it as the intentional draft checkpoint.

## Acceptance Criteria

- README no longer says the active MVP build is limited to the six content rooms.
- `Create the Script` remains active in `storyRooms`.
- The tracked review item is closed as an intentional product decision, not an implementation defect.

## Work Log

### 2026-06-23 - Review Capture

**By:** Codex

**Actions:**
- Compared README product direction with `storyRooms` metadata and browser screenshots.
- Confirmed current UI advertises `Create the Script` as room 07.

**Learnings:**
- The feature is useful, but its current placement blurs the room model.

### 2026-06-23 - Product Decision

**By:** Joe / Codex

**Actions:**
- Confirmed `Create the Script` is intentionally included in the MVP build.
- Updated `README.md` so the active MVP build includes the draft checkpoint.

**Learnings:**
- The site can keep six content rooms plus one MVP draft checkpoint as long as the docs name that distinction clearly.
