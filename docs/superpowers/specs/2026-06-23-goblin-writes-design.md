---
title: Goblin Writes Readiness Gate
date: 2026-06-23
status: draft
project: Plot Goblin
---

# Goblin Writes Readiness Gate

## Goal

Add a seventh active room called **Goblin Writes**. It should tempt the writer to request a draft, then block that request until the first six rooms contain enough usable story material for a tailored screenplay draft.

The feature should preserve Plot Goblin's personality: funny, structurally useful, and helpfully annoying before it is magical.

## Room Placement

- Add **Goblin Writes** as active room 7 on the rooms dashboard.
- The card should read like the drafting threshold, not another blank notes room.
- Tapping the card opens `/rooms/goblin-writes`.
- The room should feature a large goblin image or silhouette as the main visual signal.
- Primary CTA copy: **Please Oh Mighty Goblin. Write a draft.**

## Readiness Rule

The draft button runs a readiness check before any draft generation.

Script Parameters must be fully filled out because it controls the drafting contract:

- Runtime / page target
- Genre / movie promise
- Structure and pacing
- Dialogue density and voiceover/narration rule
- Rating and no-go content
- Cast size, location limits, time period, budget reality
- Primary POV and scene access

The other rooms need enough base information, but not equal completion:

- **Premise:** must be strong. Require core promise/logline-level material, protagonist, want, stakes, opposition, and dramatic question.
- **Characters:** must be strong. Require protagonist, surface want, deeper need, false belief, flaw/defense, and active opposition.
- **Theme:** must be clear enough. Require theme question, starting belief, and ending statement.
- **Beats:** must be mostly mapped. Require Opening Image, Inciting Incident, Act One Break, Midpoint, All Is Lost, Climax, and Final Image.
- **Scenes:** may be lighter. Require at least one usable scene list item, first scene, or a small set of scene cards.

Completion should be judged by the absence of placeholder markers such as `[Needs writing]`, `[needs your answer]`, and legacy variants in the required fields. The implementation may also reject fields that are blank after removing placeholder text.

## Blocked State

If the draft button is pressed before the story is ready:

- Pick the first or highest-priority missing room.
- Show one random goblin response from the approved copy set.
- Interpolate the missing room name into the response.
- Show a beautiful animated button labeled **{ROOM NAME} - TAKE ME THERE**.
- The button navigates to that room.
- Repeating the draft request should keep checking readiness and may show a different random response.

Approved blocked responses:

1. "I would love to write your screenplay, truly, but right now you have handed me fog in a hat. Feed me the **{room}** room first."
2. "Magnificent. A draft request with the structural density of soup steam. The goblin requires **{room}** before committing crimes against cinema."
3. "I checked the story pantry and found vibes, lint, and one frightened adjective. Go fill out **{room}** so this can become a movie instead of a haunted shrug."
4. "Your confidence is adorable. Unfortunately, the screenplay machine runs on choices, consequences, and **{room}**, not wishing noises."
5. "I can write nonsense immediately. I am gifted that way. But for a halfway decent script, the goblin demands **{room}**."

## Ready State

When the readiness check passes, the button should move into a ready-to-draft state. For this design, draft generation itself can be a follow-on behavior if the AI screenplay drafting endpoint is not already available.

Acceptable MVP ready behavior:

- Show a success message that the goblin has enough material to draft.
- Preserve the same primary button affordance for future draft generation.
- Do not silently rewrite or mutate the first six rooms.

## Components And Data Flow

- Extend the room registry with a new active `goblin-writes` room.
- Add a readiness utility in `src/lib` so the rules are testable without React.
- The utility accepts project room markdown and returns:
  - `ready: boolean`
  - missing room slug/title
  - missing reason or field group
- The Goblin Writes room UI calls that utility when the CTA is pressed.
- If blocked, it stores a local blocked message and link target in component state.
- If ready, it stores a ready message in component state.

## Visual Direction

- Stay in the existing pale green editorial poster style.
- Use the existing goblin palette: `#313e3f`, `#567554`, `#9abd85`, `#e2e8e3`, `#e7ce7c`.
- Reuse the existing animated attention button pattern where possible.
- The "take me there" button should feel like a gold quest marker, but remain readable and accessible.

## Testing And Verification

Add focused tests for:

- The active room list includes Goblin Writes as room 7.
- Readiness fails when Script Parameters has any required placeholder.
- Readiness fails with the correct missing room for incomplete Premise, Characters, Theme, Beats, or Scenes.
- Readiness passes for a minimally complete six-room project.
- The Goblin Writes UI shows a blocked message and room navigation button when not ready.
- The button label includes the missing room title.

Run the project verification commands after implementation:

```bash
npm test
npm run lint
npm run build
```

Then browser-check the local app and inspect console errors before calling the feature done.
