# Chunked Feature Drafting — "100 means 100"

**Date:** 2026-06-24
**Status:** Approved design, ready for implementation planning
**Room affected:** Create the Script

## Problem

When a writer presses **Write a draft** with a 100-page target, the app makes a single
Hermes call and saves whatever comes back ([RoomEditors.tsx:1724](../../../src/components/room-editor/RoomEditors.tsx)).
The draft prompt explicitly tells the model that for a feature it should write only the
first 6-8 pages plus a continuation map ([hermesCowriter.ts:269](../../../src/lib/hermesCowriter.ts)).
So the writer asks for 100 pages and gets ~17. The button promises a full script; the
prompt delivers an opening packet.

A single LLM call cannot reliably produce 100 quality pages: models emit only a few
thousand words of good output per call before they rush or summarize, and across a very
long generation they lose track of their own earlier choices. The fix is to generate the
script in chunks, each call staying inside the model's quality zone, with the app
orchestrating and stitching the pieces.

## Goals

- Pressing the full-script button produces a screenplay close to the target page count
  ("100 means 100", realistically 95-105).
- The script stays internally consistent across its whole length — names, setups, and
  payoffs survive from page 12 to page 80.
- The writer sees continuous progress during a 10-30 minute run, never a frozen screen.
- A failure or closed tab does not lose finished work.
- Works for a friend running it over the public Hermes bridge, not only locally.

## Non-goals

- Exact page counts (we estimate pages, not measure typeset output).
- Multiple friends drafting at the same time (v1 assumes ~1 concurrent run on the shared Mac).
- Editing/approving the blueprint before generation (explicitly out — the run is fully automatic).

## Architecture overview

Two phases driven by a new client-side orchestrator:

1. **Planning call** (new `plan` mode) — expand the writer's sparse input into a dense,
   complete blueprint: the **unified beat sheet**.
2. **Generation loop** (new `chunk` mode) — walk the beat sheet two beats at a time,
   generating real screenplay pages, persisting each chunk, accumulating continuity, and
   stitching everything into one script at the end.

The unified beat sheet is the spine fed into every generation call. It is a **living
blueprint**: setups planted during generation are written back onto the relevant beat so
later beats can pay them off.

## New cowriter modes

Add to `CowriterRequest.mode` ([hermesCowriter.ts:4](../../../src/lib/hermesCowriter.ts)):

### `plan`

- **Input:** the 7 structural beats, all scene cards that exist (0 to ~40), the premise /
  characters / theme / script-parameters MDs, and the target page count.
- **Behavior:** the model decides how many beats a real, award-worthy version of this movie
  needs (likely 15-30). If the writer already has many scenes, the model mostly organizes;
  with 0 scenes it builds the spine from the structural beats and premise. Beat count is an
  output, not a fixed number.
- **Output:** the unified beat sheet (see data contract below), with page budgets that sum
  to the target.

### `chunk`

- **Input:** the current (living) unified beat sheet, the running story-so-far summary, the
  prose tail of the previous chunk, and the room MDs — all assembled and **capped to fit
  under the route's 36,000-character prompt limit** ([route.ts:13](../../../src/app/api/hermes-cowriter/route.ts)).
- **Output:** three labeled sections — pages, summary, setups (see data contract).

## Data contracts

Both contracts use strict text markers, not JSON. Small local models botch JSON; the app
already strips Hermes noise with the `PLOT_GOBLIN_FINAL:` marker convention
([hermesCowriter.ts:93](../../../src/lib/hermesCowriter.ts)), so we extend that style.

### Planning output → `UnifiedBeatSheet`

Each beat is a labeled block:

```
BEAT 1 | PAGES: 3 | TITLE: Cold open at the impound lot
INTENT: <one line of what concretely happens in this beat>
---
BEAT 2 | PAGES: 5 | TITLE: ...
INTENT: ...
---
```

Parsed into:

```ts
type Beat = {
  index: number;        // 1-based
  pageBudget: number;   // pages allocated; all budgets sum to ~target
  title: string;
  intent: string;
  setups: string[];     // starts empty; filled by the loop (living blueprint)
};
type UnifiedBeatSheet = Beat[];
```

### Chunk output → `ChunkResult`

```
PLOT_GOBLIN_PAGES:
<actual screenplay pages for these two beats>
PLOT_GOBLIN_SUMMARY:
<2-3 sentence recap of what happened in these beats>
PLOT_GOBLIN_SETUPS:
- beat 14 | the cellar door is left unlocked
- beat 9  | running joke: Dana mispronounces "espresso"
```

Parsed into:

```ts
type PlantedSetup = { beatIndex: number; note: string };
type ChunkResult = {
  pages: string;
  summary: string;
  setups: PlantedSetup[];
};
```

If a section is missing or unparseable, the chunk is treated as a failed call (triggers the
retry path), so a malformed response never silently corrupts the stitched script.

## The living beat sheet (setup/payoff ledger)

When a chunk returns `beat 14 | cellar door unlocked`, the app appends that note to
`beat[14].setups`. Every later prompt that includes the beat sheet now shows the planted
note on beat 14, so the payoff can land there. This automates the index-card setup/payoff
tracking screenwriters do by hand (Chekhov's gun).

## The orchestrator (loop)

A new client-side controller (e.g. `useDraftDirector` hook + a pure `draftDirector` module
for the testable logic):

1. Call `plan`; parse and store the `UnifiedBeatSheet`. **Generation starts immediately —
   no approval step.**
2. For each successive pair of beats:
   a. Assemble the chunk prompt: living beat sheet + running summary + previous chunk tail +
      room MDs, trimmed to fit 36k chars (drop oldest summary detail first, never the beat
      sheet or current beats).
   b. Call `chunk`; parse into `ChunkResult`.
   c. Persist the chunk to localStorage (see persistence).
   d. Merge `setups` into the beat sheet; append `summary` to the running story-so-far.
3. **End-check:** estimate total pages (≈ 55 lines / ≈ 250 words per page). If the total is
   well under target, run a top-up pass on the thinnest-vs-budget beats.
4. **Stitch** all chunk pages in beat order into one screenplay; save it through the existing
   `saveNewDraft` + export flow ([RoomEditors.tsx:1744](../../../src/components/room-editor/RoomEditors.tsx)).

### Pacing & rate limits

- Raise the per-client cap from 8 to **30 requests/minute** via the existing
  `PLOT_GOBLIN_RATE_LIMIT_PER_MINUTE` env var ([route.ts:10](../../../src/app/api/hermes-cowriter/route.ts)).
  Because the loop is sequential and each call takes ~30-120s, a single run produces only
  ~1-2 calls/min, so 30/min is comfortable headroom and rarely triggers.
- **Adaptive backoff as a safety net:** on a 429, read the `Retry-After` header
  ([route.ts:241](../../../src/app/api/hermes-cowriter/route.ts)) and wait that long before retrying.
- Accepted v1 limitation: all runs share one Mac running Hermes; concurrent friends would
  queue. Expected real-world load is ~1 friend at a time, so this is fine.

### Failure handling

- Auto-retry a failed or unparseable chunk **2-3 times** (a 429 waits `Retry-After` first).
- If it still fails, **pause** and surface a **Retry / Skip / Stop** control. All completed
  beats remain saved.
- Because chunks persist as they land, the writer can close the tab and resume later from the
  last finished beat.

## Persistence & resume

A `DraftRun` object in localStorage, written after every chunk:

```ts
type DraftRun = {
  beatSheet: UnifiedBeatSheet;          // living, includes accumulated setups
  completedBeats: { indices: number[]; pages: string; summary: string }[];
  runningSummary: string;
  nextBeatIndex: number;
  status: "planning" | "running" | "paused" | "done" | "error";
};
```

On load, if a `DraftRun` is `running` or `paused`, the room offers to resume from
`nextBeatIndex`.

## UI (Create the Script room)

**Buttons** — replace the single-shot draft button with a clear hierarchy:

- **Write the full script** (primary, prominent) — runs the chunked loop. Promises the whole
  script.
- **Quick sample** (secondary, small) — the existing single-shot call, relabeled honestly as
  a fast first-6-8-pages taste. The old behavior becomes a legitimate preview feature instead
  of a misleading "draft."

**During a run:**

- A **growing list** of finished beats, each with a ✓ and its summary, newest appended as it
  lands.
- A **status line** beneath: e.g. *"Working on beats 7 and 8 now — please wait."*
- A **Stop** button always available; on failure, the **Retry / Skip / Stop** control.
- On completion, the full stitched script appears with the existing Save / Export options.

## Testing

Unit tests (required before "done"):

- Beat-sheet parser: well-formed input, missing fields, junk lines, budget sum.
- Chunk parser: all three sections present, a missing section (→ treated as failure),
  malformed setup lines.
- Setup → beat-sheet merge: note lands on the right beat; out-of-range beat index ignored.
- Continuity assembler: stays under the 36k cap; drops oldest summary detail, never the beat
  sheet or current beats.
- Page-budget / end-check math: detects a short total, selects thinnest beats for top-up.
- Throttle/backoff: honors `Retry-After`; retries the configured number of times.

Loop orchestration tested with a mocked `fetch` (no live Hermes), covering happy path,
mid-loop failure → retry → pause, and resume from a persisted `DraftRun`.

## Decisions log

- **Chunk unit:** generate against a planning-call-expanded unified beat sheet (not the raw 7
  structural beats, not raw scenes), 2 beats per call.
- **Approval checkpoint:** none — fully automatic after the button press.
- **Continuity:** running story-so-far summary + living beat sheet with setup/payoff
  annotations; not full prior pages (would blow the 36k cap).
- **Length control:** per-beat page budgets from the planning call, plus an end-check top-up.
- **Failure:** auto-retry then pause (Retry/Skip/Stop); chunks persisted and resumable.
- **Audience:** works over the public bridge; cap raised to 30/min; single-Mac concurrency
  accepted for v1.
- **Old button:** kept as small "Quick sample"; new "Write the full script" is primary.
- **Page count:** estimated (~250 words/page), so "100" means roughly 95-105.
