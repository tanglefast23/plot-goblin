# Chunked Feature Drafting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Write the full script" button produce a near-target-length screenplay (≈100 pages) by planning a unified beat sheet, then generating it two beats at a time with continuity carry-forward, persistence, and adaptive rate-limit backoff.

**Architecture:** Two phases driven by a client orchestrator. A `plan` cowriter call expands the writer's input into a living unified beat sheet. A loop then walks the beat sheet two beats at a time via `chunk` calls, each returning pages + a summary + planted setups; setups are merged back onto the beat sheet, summaries feed a running recap, every chunk is persisted to localStorage, and at the end all chunk pages are stitched into one saved draft. The old single-shot draft is kept as a small "Quick sample".

**Tech Stack:** Next.js App Router (Node runtime API route), TypeScript strict, React (client components + hooks), Vitest, localStorage. LLM access via the existing `/api/hermes-cowriter` route (local Hermes CLI or public bridge).

**Spec:** `docs/superpowers/specs/2026-06-24-chunked-feature-drafting-design.md`

---

## File Structure

**New pure-logic lib files (fully unit-tested):**

- `src/lib/draftBeatSheet.ts` — `Beat`, `UnifiedBeatSheet`, `PlantedSetup` types; `parseBeatSheet`, `mergeSetups`, `pageBudgetTotal`, `renderBeatSheet`.
- `src/lib/draftChunk.ts` — `ChunkResult` type; `parseChunkResult`.
- `src/lib/draftContinuity.ts` — `assembleChunkContext`, `estimatePageCount`, `shouldTopUp`.
- `src/lib/draftRunStorage.ts` — `DraftRun`, `CompletedBeat`, `DraftRunStatus` types; `loadDraftRun`, `saveDraftRun`, `clearDraftRun`.
- `src/lib/draftDirector.ts` — orchestration pure functions: `nextBeatPair`, `advanceDraft`, `stitchDraft`, `callWithRetry`.

**Modified backend files:**

- `src/lib/hermesCowriter.ts` — add `plan` + `chunk` modes and request fields to `CowriterRequest` and `buildCowriterPrompt`.
- `src/app/api/hermes-cowriter/route.ts` — accept/validate new modes + fields, bump default rate limit to 30, return `retryAfterSeconds` on 429.

**New + modified UI files:**

- `src/components/room-editor/useDraftDirector.ts` — React hook running the loop against the API, owning progress state + persistence.
- `src/components/room-editor/FullScriptDirector.tsx` — progress panel (checklist + status line + Stop / Retry / Skip controls).
- `src/components/room-editor/RoomEditors.tsx` — replace single-shot draft button with primary **Write the full script** (opens director) + secondary **Quick sample** (existing `requestDraft`, relabeled).

**Test files:** one `*.test.ts` beside each new lib file; `FullScriptDirector.test.tsx` beside the component.

Build order is bottom-up: Tasks 1-8 (pure logic) have no dependencies on UI; Tasks 9-10 (prompts/route) are independent of 1-8; Tasks 11-13 (UI) depend on all prior; Task 14 verifies.

---

## Task 1: Beat sheet types + `parseBeatSheet`

**Files:**
- Create: `src/lib/draftBeatSheet.ts`
- Test: `src/lib/draftBeatSheet.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/draftBeatSheet.test.ts
import { describe, expect, it } from "vitest";
import { parseBeatSheet } from "./draftBeatSheet";

describe("parseBeatSheet", () => {
  it("parses labeled beat blocks into typed beats", () => {
    const raw = [
      "BEAT 1 | PAGES: 3 | TITLE: Cold open at the impound lot",
      "INTENT: Mara hot-wires the wrong car and meets the antagonist.",
      "---",
      "BEAT 2 | PAGES: 5 | TITLE: The wager",
      "INTENT: She bets the deed to win the car back.",
      "---",
    ].join("\n");

    const sheet = parseBeatSheet(raw);

    expect(sheet).toHaveLength(2);
    expect(sheet[0]).toEqual({
      index: 1,
      pageBudget: 3,
      title: "Cold open at the impound lot",
      intent: "Mara hot-wires the wrong car and meets the antagonist.",
      setups: [],
    });
    expect(sheet[1].pageBudget).toBe(5);
    expect(sheet[1].title).toBe("The wager");
  });

  it("ignores junk lines and tolerates a missing trailing divider", () => {
    const raw = [
      "Here is your beat sheet:",
      "BEAT 1 | PAGES: 4 | TITLE: Opening",
      "INTENT: Something happens.",
    ].join("\n");

    expect(parseBeatSheet(raw)).toHaveLength(1);
    expect(parseBeatSheet(raw)[0].index).toBe(1);
  });

  it("renumbers indices sequentially even if the model misnumbers", () => {
    const raw = "BEAT 7 | PAGES: 2 | TITLE: A\nINTENT: x\n---\nBEAT 9 | PAGES: 2 | TITLE: B\nINTENT: y";
    const sheet = parseBeatSheet(raw);
    expect(sheet.map((b) => b.index)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/draftBeatSheet.test.ts`
Expected: FAIL — "parseBeatSheet is not a function" / module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/draftBeatSheet.ts
export type Beat = {
  index: number;
  pageBudget: number;
  title: string;
  intent: string;
  setups: string[];
};

export type UnifiedBeatSheet = Beat[];

export type PlantedSetup = { beatIndex: number; note: string };

const BEAT_HEADER = /^BEAT\s+\d+\s*\|\s*PAGES:\s*(\d+)\s*\|\s*TITLE:\s*(.+)$/i;
const INTENT_LINE = /^INTENT:\s*(.*)$/i;

export function parseBeatSheet(raw: string): UnifiedBeatSheet {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const beats: UnifiedBeatSheet = [];
  let current: Beat | null = null;

  for (const line of lines) {
    const header = BEAT_HEADER.exec(line.trim());
    if (header) {
      if (current) beats.push(current);
      current = {
        index: beats.length + 1,
        pageBudget: Number.parseInt(header[1], 10),
        title: header[2].trim(),
        intent: "",
        setups: [],
      };
      continue;
    }

    if (!current) continue;

    const intent = INTENT_LINE.exec(line.trim());
    if (intent) {
      current.intent = current.intent ? `${current.intent} ${intent[1].trim()}` : intent[1].trim();
    }
  }

  if (current) beats.push(current);
  return beats;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/draftBeatSheet.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftBeatSheet.ts src/lib/draftBeatSheet.test.ts
git commit -m "Add unified beat sheet parser for chunked drafting"
```

---

## Task 2: `mergeSetups`, `pageBudgetTotal`, `renderBeatSheet`

**Files:**
- Modify: `src/lib/draftBeatSheet.ts`
- Test: `src/lib/draftBeatSheet.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to src/lib/draftBeatSheet.test.ts
import { mergeSetups, pageBudgetTotal, renderBeatSheet } from "./draftBeatSheet";

describe("mergeSetups", () => {
  it("appends a planted note to the matching beat without mutating the input", () => {
    const sheet = parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x\n---\nBEAT 2 | PAGES: 3 | TITLE: B\nINTENT: y");
    const next = mergeSetups(sheet, [{ beatIndex: 2, note: "cellar door left unlocked" }]);

    expect(next[1].setups).toEqual(["cellar door left unlocked"]);
    expect(sheet[1].setups).toEqual([]); // original untouched
  });

  it("ignores setups whose beat index is out of range", () => {
    const sheet = parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x");
    const next = mergeSetups(sheet, [{ beatIndex: 99, note: "nope" }]);
    expect(next[0].setups).toEqual([]);
  });
});

describe("pageBudgetTotal", () => {
  it("sums every beat's page budget", () => {
    const sheet = parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x\n---\nBEAT 2 | PAGES: 5 | TITLE: B\nINTENT: y");
    expect(pageBudgetTotal(sheet)).toBe(8);
  });
});

describe("renderBeatSheet", () => {
  it("renders beats back to text including planted setups", () => {
    const sheet = mergeSetups(
      parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x"),
      [{ beatIndex: 1, note: "gun on the mantel" }],
    );
    const text = renderBeatSheet(sheet);
    expect(text).toContain("BEAT 1 | PAGES: 3 | TITLE: A");
    expect(text).toContain("INTENT: x");
    expect(text).toContain("PLANTED: gun on the mantel");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/draftBeatSheet.test.ts`
Expected: FAIL — `mergeSetups`/`pageBudgetTotal`/`renderBeatSheet` not exported.

- [ ] **Step 3: Add implementation**

```ts
// append to src/lib/draftBeatSheet.ts
export function mergeSetups(sheet: UnifiedBeatSheet, setups: PlantedSetup[]): UnifiedBeatSheet {
  const next = sheet.map((beat) => ({ ...beat, setups: [...beat.setups] }));
  for (const setup of setups) {
    const beat = next.find((candidate) => candidate.index === setup.beatIndex);
    if (beat && setup.note.trim()) beat.setups.push(setup.note.trim());
  }
  return next;
}

export function pageBudgetTotal(sheet: UnifiedBeatSheet): number {
  return sheet.reduce((total, beat) => total + beat.pageBudget, 0);
}

export function renderBeatSheet(sheet: UnifiedBeatSheet): string {
  return sheet
    .map((beat) => {
      const lines = [
        `BEAT ${beat.index} | PAGES: ${beat.pageBudget} | TITLE: ${beat.title}`,
        `INTENT: ${beat.intent}`,
        ...beat.setups.map((note) => `PLANTED: ${note}`),
      ];
      return lines.join("\n");
    })
    .join("\n---\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/draftBeatSheet.test.ts`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftBeatSheet.ts src/lib/draftBeatSheet.test.ts
git commit -m "Add setup merge, budget total, and render for living beat sheet"
```

---

## Task 3: `ChunkResult` + `parseChunkResult`

**Files:**
- Create: `src/lib/draftChunk.ts`
- Test: `src/lib/draftChunk.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/draftChunk.test.ts
import { describe, expect, it } from "vitest";
import { parseChunkResult } from "./draftChunk";

const sample = [
  "PLOT_GOBLIN_PAGES:",
  "INT. IMPOUND LOT - NIGHT",
  "Mara pries the lock.",
  "PLOT_GOBLIN_SUMMARY:",
  "Mara breaks into the lot and meets Cole.",
  "PLOT_GOBLIN_SETUPS:",
  "- beat 14 | the cellar door is left unlocked",
  "- beat 9 | running joke: Dana mispronounces espresso",
].join("\n");

describe("parseChunkResult", () => {
  it("splits the three labeled sections", () => {
    const result = parseChunkResult(sample);
    expect(result).not.toBeNull();
    expect(result?.pages).toContain("INT. IMPOUND LOT - NIGHT");
    expect(result?.pages).not.toContain("PLOT_GOBLIN_SUMMARY");
    expect(result?.summary).toBe("Mara breaks into the lot and meets Cole.");
    expect(result?.setups).toEqual([
      { beatIndex: 14, note: "the cellar door is left unlocked" },
      { beatIndex: 9, note: "running joke: Dana mispronounces espresso" },
    ]);
  });

  it("treats a missing pages or summary section as unparseable (null)", () => {
    expect(parseChunkResult("PLOT_GOBLIN_SUMMARY:\nonly a summary")).toBeNull();
    expect(parseChunkResult("PLOT_GOBLIN_PAGES:\nonly pages")).toBeNull();
  });

  it("returns an empty setups list when the setups section is absent", () => {
    const result = parseChunkResult("PLOT_GOBLIN_PAGES:\npages\nPLOT_GOBLIN_SUMMARY:\nrecap");
    expect(result?.setups).toEqual([]);
  });

  it("skips malformed setup lines", () => {
    const raw = "PLOT_GOBLIN_PAGES:\np\nPLOT_GOBLIN_SUMMARY:\ns\nPLOT_GOBLIN_SETUPS:\n- garbage with no beat\n- beat 3 | valid";
    expect(parseChunkResult(raw)?.setups).toEqual([{ beatIndex: 3, note: "valid" }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/draftChunk.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/draftChunk.ts
import type { PlantedSetup } from "./draftBeatSheet";

export type ChunkResult = {
  pages: string;
  summary: string;
  setups: PlantedSetup[];
};

const SETUP_LINE = /^-\s*beat\s+(\d+)\s*\|\s*(.+)$/i;

function section(raw: string, marker: string, nextMarkers: string[]): string | null {
  const start = raw.indexOf(marker);
  if (start < 0) return null;

  const afterMarker = start + marker.length;
  let end = raw.length;
  for (const next of nextMarkers) {
    const idx = raw.indexOf(next, afterMarker);
    if (idx >= 0 && idx < end) end = idx;
  }

  return raw.slice(afterMarker, end).trim();
}

function parseSetups(block: string | null): PlantedSetup[] {
  if (!block) return [];
  return block
    .split("\n")
    .map((line) => SETUP_LINE.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ beatIndex: Number.parseInt(match[1], 10), note: match[2].trim() }));
}

export function parseChunkResult(raw: string): ChunkResult | null {
  const normalized = raw.replace(/\r\n/g, "\n");
  const pages = section(normalized, "PLOT_GOBLIN_PAGES:", ["PLOT_GOBLIN_SUMMARY:", "PLOT_GOBLIN_SETUPS:"]);
  const summary = section(normalized, "PLOT_GOBLIN_SUMMARY:", ["PLOT_GOBLIN_SETUPS:"]);
  const setupsBlock = section(normalized, "PLOT_GOBLIN_SETUPS:", []);

  if (!pages || !summary) return null;

  return { pages, summary, setups: parseSetups(setupsBlock) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/draftChunk.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftChunk.ts src/lib/draftChunk.test.ts
git commit -m "Add chunk result parser for three-section draft output"
```

---

## Task 4: `estimatePageCount` + `shouldTopUp`

**Files:**
- Create: `src/lib/draftContinuity.ts`
- Test: `src/lib/draftContinuity.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/draftContinuity.test.ts
import { describe, expect, it } from "vitest";
import { estimatePageCount, shouldTopUp } from "./draftContinuity";

describe("estimatePageCount", () => {
  it("estimates ~1 page per 250 words", () => {
    const text = Array.from({ length: 500 }, () => "word").join(" ");
    expect(estimatePageCount(text)).toBe(2);
  });

  it("returns 0 for empty text", () => {
    expect(estimatePageCount("   ")).toBe(0);
  });
});

describe("shouldTopUp", () => {
  it("flags a draft that lands under 90% of target", () => {
    expect(shouldTopUp(80, 100)).toBe(true);
    expect(shouldTopUp(95, 100)).toBe(false);
    expect(shouldTopUp(120, 100)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/draftContinuity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/draftContinuity.ts
const WORDS_PER_PAGE = 250;

export function estimatePageCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / WORDS_PER_PAGE);
}

export function shouldTopUp(totalPages: number, targetPages: number): boolean {
  if (targetPages <= 0) return false;
  return totalPages < targetPages * 0.9;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/draftContinuity.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftContinuity.ts src/lib/draftContinuity.test.ts
git commit -m "Add page estimation and end-check helpers for chunked drafting"
```

---

## Task 5: `assembleChunkContext` (prompt assembly with 36k cap)

**Files:**
- Modify: `src/lib/draftContinuity.ts`
- Test: `src/lib/draftContinuity.test.ts`

The chunk prompt source must include the living beat sheet, the running summary, the previous chunk's tail, and the room export — but stay under the route's 36,000-char limit. When over budget, drop the running summary first (oldest, least critical), never the beat sheet or current beats.

- [ ] **Step 1: Add failing tests**

```ts
// append to src/lib/draftContinuity.test.ts
import { assembleChunkContext } from "./draftContinuity";

describe("assembleChunkContext", () => {
  const base = {
    beatSheetText: "BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x",
    currentBeatsText: "BEAT 4 | PAGES: 5 | TITLE: D",
    runningSummary: "So far: Mara escaped.",
    previousTail: "FADE OUT.",
    roomExport: "# Premise\nA heist.",
    maxChars: 36_000,
  };

  it("includes every section when under budget", () => {
    const out = assembleChunkContext(base);
    expect(out).toContain("BEAT 1 | PAGES: 3");
    expect(out).toContain("BEAT 4 | PAGES: 5 | TITLE: D");
    expect(out).toContain("So far: Mara escaped.");
    expect(out).toContain("FADE OUT.");
    expect(out).toContain("A heist.");
  });

  it("drops the running summary first when over budget, keeping the beat sheet and current beats", () => {
    const huge = "x".repeat(40_000);
    const out = assembleChunkContext({ ...base, runningSummary: huge, maxChars: 5_000 });
    expect(out.length).toBeLessThanOrEqual(5_000);
    expect(out).toContain("BEAT 4 | PAGES: 5 | TITLE: D");
    expect(out).not.toContain(huge);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/draftContinuity.test.ts`
Expected: FAIL — `assembleChunkContext` not exported.

- [ ] **Step 3: Add implementation**

```ts
// append to src/lib/draftContinuity.ts
export type ChunkContextParams = {
  beatSheetText: string;
  currentBeatsText: string;
  runningSummary: string;
  previousTail: string;
  roomExport: string;
  maxChars: number;
};

function compose(params: ChunkContextParams, includeSummary: boolean, roomChars: number): string {
  const sections = [
    "## Unified beat sheet (the living blueprint — honor every PLANTED note)",
    params.beatSheetText,
    "",
    "## Beats to write now",
    params.currentBeatsText,
    "",
    includeSummary ? "## Story so far" : "",
    includeSummary ? params.runningSummary : "",
    "",
    "## Previous pages (tail — pick up seamlessly)",
    params.previousTail,
    "",
    "## Room export (facts: premise, characters, theme, parameters)",
    params.roomExport.slice(0, roomChars),
  ];
  return sections.filter((line) => line !== "").join("\n").trim();
}

export function assembleChunkContext(params: ChunkContextParams): string {
  const full = compose(params, true, params.roomExport.length);
  if (full.length <= params.maxChars) return full;

  // Over budget: drop the running summary first.
  const withoutSummary = compose(params, false, params.roomExport.length);
  if (withoutSummary.length <= params.maxChars) return withoutSummary;

  // Still over: trim the room export to fit, keeping beat sheet + current beats intact.
  const overflow = withoutSummary.length - params.maxChars;
  const trimmedRoomChars = Math.max(0, params.roomExport.length - overflow);
  return compose(params, false, trimmedRoomChars).slice(0, params.maxChars);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/draftContinuity.test.ts`
Expected: PASS (5 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftContinuity.ts src/lib/draftContinuity.test.ts
git commit -m "Add capped chunk-context assembler for draft continuity"
```

---

## Task 6: `DraftRun` types + localStorage persistence

**Files:**
- Create: `src/lib/draftRunStorage.ts`
- Test: `src/lib/draftRunStorage.test.ts`

Mirror the `draftStorage.ts` localStorage pattern (guard `window`, JSON parse with try/catch, clear on corruption).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/draftRunStorage.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { clearDraftRun, loadDraftRun, saveDraftRun, type DraftRun } from "./draftRunStorage";

const run: DraftRun = {
  beatSheet: [{ index: 1, pageBudget: 3, title: "A", intent: "x", setups: [] }],
  completedBeats: [{ indices: [1, 2], pages: "PAGES", summary: "recap" }],
  runningSummary: "recap",
  nextBeatIndex: 3,
  targetPages: 100,
  status: "running",
};

describe("draftRunStorage", () => {
  beforeEach(() => clearDraftRun());

  it("round-trips a saved run", () => {
    saveDraftRun(run);
    expect(loadDraftRun()).toEqual(run);
  });

  it("returns null when nothing is stored", () => {
    expect(loadDraftRun()).toBeNull();
  });

  it("returns null and clears storage on corrupt JSON", () => {
    window.localStorage.setItem("plot-goblin-draft-run", "{not json");
    expect(loadDraftRun()).toBeNull();
    expect(window.localStorage.getItem("plot-goblin-draft-run")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/draftRunStorage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/draftRunStorage.ts
import type { UnifiedBeatSheet } from "./draftBeatSheet";

export const DRAFT_RUN_STORAGE_KEY = "plot-goblin-draft-run";

export type CompletedBeat = { indices: number[]; pages: string; summary: string };
export type DraftRunStatus = "planning" | "running" | "paused" | "done" | "error";

export type DraftRun = {
  beatSheet: UnifiedBeatSheet;
  completedBeats: CompletedBeat[];
  runningSummary: string;
  nextBeatIndex: number;
  targetPages: number;
  status: DraftRunStatus;
};

export function loadDraftRun(): DraftRun | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(DRAFT_RUN_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DraftRun;
  } catch {
    window.localStorage.removeItem(DRAFT_RUN_STORAGE_KEY);
    return null;
  }
}

export function saveDraftRun(run: DraftRun): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_RUN_STORAGE_KEY, JSON.stringify(run));
}

export function clearDraftRun(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_RUN_STORAGE_KEY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/draftRunStorage.test.ts`
Expected: PASS (3 tests). (`window` is available — `vitest.config.mts` sets `environment: "jsdom"` globally.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftRunStorage.ts src/lib/draftRunStorage.test.ts
git commit -m "Add DraftRun persistence for resumable chunked drafting"
```

---

## Task 7: `nextBeatPair`, `advanceDraft`, `stitchDraft`

**Files:**
- Create: `src/lib/draftDirector.ts`
- Test: `src/lib/draftDirector.test.ts`

These are the pure reducers at the heart of the loop. `nextBeatPair` returns the next 2 beats to write; `advanceDraft` applies a parsed chunk to produce the next run state; `stitchDraft` concatenates completed pages in order.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/draftDirector.test.ts
import { describe, expect, it } from "vitest";
import { advanceDraft, nextBeatPair, stitchDraft } from "./draftDirector";
import type { DraftRun } from "./draftRunStorage";

function baseRun(): DraftRun {
  return {
    beatSheet: [
      { index: 1, pageBudget: 3, title: "A", intent: "x", setups: [] },
      { index: 2, pageBudget: 3, title: "B", intent: "y", setups: [] },
      { index: 3, pageBudget: 3, title: "C", intent: "z", setups: [] },
    ],
    completedBeats: [],
    runningSummary: "",
    nextBeatIndex: 1,
    targetPages: 9,
    status: "running",
  };
}

describe("nextBeatPair", () => {
  it("returns the next two beats from nextBeatIndex", () => {
    const pair = nextBeatPair(baseRun());
    expect(pair.map((b) => b.index)).toEqual([1, 2]);
  });

  it("returns the final single beat when only one remains", () => {
    const run = { ...baseRun(), nextBeatIndex: 3 };
    expect(nextBeatPair(run).map((b) => b.index)).toEqual([3]);
  });

  it("returns an empty array when finished", () => {
    const run = { ...baseRun(), nextBeatIndex: 4 };
    expect(nextBeatPair(run)).toEqual([]);
  });
});

describe("advanceDraft", () => {
  it("records the chunk, merges setups, grows the summary, and bumps the index", () => {
    const run = baseRun();
    const next = advanceDraft(run, [run.beatSheet[0], run.beatSheet[1]], {
      pages: "PAGES 1-2",
      summary: "Mara escapes.",
      setups: [{ beatIndex: 3, note: "keycard pocketed" }],
    });

    expect(next.completedBeats).toEqual([{ indices: [1, 2], pages: "PAGES 1-2", summary: "Mara escapes." }]);
    expect(next.runningSummary).toContain("Mara escapes.");
    expect(next.beatSheet[2].setups).toEqual(["keycard pocketed"]);
    expect(next.nextBeatIndex).toBe(3);
    expect(next.status).toBe("running");
  });

  it("marks the run done when the last beat is consumed", () => {
    const run = { ...baseRun(), nextBeatIndex: 3 };
    const next = advanceDraft(run, [run.beatSheet[2]], { pages: "PAGES 3", summary: "End.", setups: [] });
    expect(next.nextBeatIndex).toBe(4);
    expect(next.status).toBe("done");
  });
});

describe("stitchDraft", () => {
  it("joins completed pages in order with scene spacing", () => {
    const run: DraftRun = {
      ...baseRun(),
      completedBeats: [
        { indices: [1, 2], pages: "PAGES 1-2", summary: "a" },
        { indices: [3], pages: "PAGES 3", summary: "b" },
      ],
    };
    expect(stitchDraft(run)).toBe("PAGES 1-2\n\nPAGES 3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/draftDirector.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/draftDirector.ts
import type { Beat } from "./draftBeatSheet";
import { mergeSetups } from "./draftBeatSheet";
import type { ChunkResult } from "./draftChunk";
import type { DraftRun } from "./draftRunStorage";

export function nextBeatPair(run: DraftRun): Beat[] {
  return run.beatSheet.filter((beat) => beat.index >= run.nextBeatIndex && beat.index < run.nextBeatIndex + 2);
}

export function advanceDraft(run: DraftRun, beatsInChunk: Beat[], chunk: ChunkResult): DraftRun {
  const indices = beatsInChunk.map((beat) => beat.index);
  const lastIndex = indices[indices.length - 1] ?? run.nextBeatIndex;
  const nextBeatIndex = lastIndex + 1;
  const finished = nextBeatIndex > run.beatSheet.length;

  return {
    ...run,
    beatSheet: mergeSetups(run.beatSheet, chunk.setups),
    completedBeats: [...run.completedBeats, { indices, pages: chunk.pages, summary: chunk.summary }],
    runningSummary: run.runningSummary ? `${run.runningSummary}\n${chunk.summary}` : chunk.summary,
    nextBeatIndex,
    status: finished ? "done" : "running",
  };
}

export function stitchDraft(run: DraftRun): string {
  return run.completedBeats.map((beat) => beat.pages.trim()).join("\n\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/draftDirector.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftDirector.ts src/lib/draftDirector.test.ts
git commit -m "Add draft director reducers: next pair, advance, stitch"
```

---

## Task 8: `callWithRetry` (auto-retry + adaptive backoff)

**Files:**
- Modify: `src/lib/draftDirector.ts`
- Test: `src/lib/draftDirector.test.ts`

Wraps a cowriter network call. Retries transient failures up to `maxAttempts`; on a rate-limit signal it waits `retryAfterSeconds` (via an injected `sleep` so tests stay fast). Returns the parsed output text, or throws after exhausting attempts.

- [ ] **Step 1: Add failing tests**

```ts
// append to src/lib/draftDirector.test.ts
import { callWithRetry, type CowriterCallResult } from "./draftDirector";

describe("callWithRetry", () => {
  const noSleep = async () => {};

  it("returns output on the first success", async () => {
    const call = async (): Promise<CowriterCallResult> => ({ status: 200, output: "ok" });
    expect(await callWithRetry(call, { maxAttempts: 3, sleep: noSleep })).toBe("ok");
  });

  it("retries a transient failure then succeeds", async () => {
    let attempts = 0;
    const call = async (): Promise<CowriterCallResult> => {
      attempts += 1;
      return attempts < 2 ? { status: 500, error: "boom" } : { status: 200, output: "recovered" };
    };
    expect(await callWithRetry(call, { maxAttempts: 3, sleep: noSleep })).toBe("recovered");
    expect(attempts).toBe(2);
  });

  it("waits the retry-after delay on a 429", async () => {
    const waits: number[] = [];
    const sleep = async (ms: number) => void waits.push(ms);
    let attempts = 0;
    const call = async (): Promise<CowriterCallResult> => {
      attempts += 1;
      return attempts < 2 ? { status: 429, error: "slow down", retryAfterSeconds: 7 } : { status: 200, output: "done" };
    };
    expect(await callWithRetry(call, { maxAttempts: 3, sleep })).toBe("done");
    expect(waits).toContain(7000);
  });

  it("throws after exhausting attempts", async () => {
    const call = async (): Promise<CowriterCallResult> => ({ status: 500, error: "always fails" });
    await expect(callWithRetry(call, { maxAttempts: 2, sleep: noSleep })).rejects.toThrow("always fails");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/draftDirector.test.ts`
Expected: FAIL — `callWithRetry`/`CowriterCallResult` not exported.

- [ ] **Step 3: Add implementation**

```ts
// append to src/lib/draftDirector.ts
export type CowriterCallResult = {
  status: number;
  output?: string;
  error?: string;
  retryAfterSeconds?: number;
};

export type RetryOptions = {
  maxAttempts: number;
  sleep: (ms: number) => Promise<void>;
};

export async function callWithRetry(
  call: () => Promise<CowriterCallResult>,
  options: RetryOptions,
): Promise<string> {
  let lastError = "The goblin failed to draft this beat.";

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const result = await call();

    if (result.status >= 200 && result.status < 300 && result.output) {
      return result.output;
    }

    lastError = result.error ?? lastError;

    if (attempt < options.maxAttempts) {
      const backoffMs = result.status === 429 && result.retryAfterSeconds
        ? result.retryAfterSeconds * 1000
        : attempt * 1000;
      await options.sleep(backoffMs);
    }
  }

  throw new Error(lastError);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/draftDirector.test.ts`
Expected: PASS (10 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/draftDirector.ts src/lib/draftDirector.test.ts
git commit -m "Add retry-with-backoff wrapper for cowriter calls"
```

---

## Task 9: Add `plan` + `chunk` modes to the cowriter prompt

**Files:**
- Modify: `src/lib/hermesCowriter.ts:4` (mode union + request fields)
- Modify: `src/lib/hermesCowriter.ts` (`buildCowriterPrompt`, before the final `return`)
- Test: `src/lib/hermesCowriter.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
// append to src/lib/hermesCowriter.test.ts
describe("plan mode", () => {
  it("asks for a labeled, page-budgeted unified beat sheet", () => {
    const prompt = buildCowriterPrompt({
      mode: "plan",
      markdown: "# Premise\nA heist gone wrong.",
      targetPages: 100,
    });
    expect(prompt).toContain("unified beat sheet");
    expect(prompt).toContain("BEAT 1 | PAGES:");
    expect(prompt).toContain("INTENT:");
    expect(prompt).toContain("100");
    expect(prompt).toContain("PLOT_GOBLIN_FINAL:");
  });
});

describe("chunk mode", () => {
  it("asks for the three labeled output sections and honors planted setups", () => {
    const prompt = buildCowriterPrompt({
      mode: "chunk",
      markdown: "## Beats to write now\nBEAT 4",
      beat: "4 and 5",
    });
    expect(prompt).toContain("PLOT_GOBLIN_PAGES:");
    expect(prompt).toContain("PLOT_GOBLIN_SUMMARY:");
    expect(prompt).toContain("PLOT_GOBLIN_SETUPS:");
    expect(prompt).toContain("PLANTED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/hermesCowriter.test.ts`
Expected: FAIL — `plan`/`chunk` not assignable to `mode`; prompt lacks the new strings.

- [ ] **Step 3: Implement**

In `src/lib/hermesCowriter.ts`, extend the type at line 4 and add `targetPages`:

```ts
export type CowriterRequest = {
  mode: "followup" | "suggestions" | "logline" | "room" | "beat" | "draft" | "scene" | "scene-suggest" | "plan" | "chunk";
  room?: string;
  beat?: string;
  beatMarkdown?: string;
  markdown?: string;
  sceneList?: string;
  writingStyle?: string;
  targetPages?: number;
  answers?: Record<string, unknown>;
  summary?: Record<string, unknown>;
};
```

Then, inside `buildCowriterPrompt`, immediately before the final `return` (the generic room handler at line 276), add:

```ts
  if (request.mode === "plan") {
    const targetPages = request.targetPages ?? 100;
    return `${sharedRules}

Task: Build the UNIFIED BEAT SHEET for a full ${targetPages}-page feature of THIS specific script. Read the structural beats, every scene the writer already wrote, and the room facts below. Decide how many beats a strong, award-worthy version of this movie needs (usually 15-30). Expand thin spots, add the connective beats a real feature requires, and keep the writer's existing choices.

Output rules:
- Return ONLY beat blocks in this exact format, one per beat, divided by a line containing only ---:
  BEAT 1 | PAGES: <n> | TITLE: <short title>
  INTENT: <one line of what concretely happens>
- Assign each beat a PAGES budget. The budgets MUST sum to about ${targetPages}.
- Number beats sequentially from 1. Do not write screenplay pages here — only the plan.

Complete Plot Goblin room export (structural beats, scenes, premise, characters, theme, parameters):
${request.markdown ?? ""}`;
  }

  if (request.mode === "chunk") {
    const beatLabel = request.beat ?? "the next beats";
    return `${sharedRules}

Task: Write the actual screenplay pages for ${beatLabel} of THIS specific script, using the living beat sheet and story-so-far below. Honor every PLANTED note on these and earlier beats, and set up anything later beats will need. Hit the PAGES budget for these beats. Pick up seamlessly from the previous pages' tail.

Output EXACTLY these three labeled sections, in this order, after the final marker:
PLOT_GOBLIN_PAGES:
<standard screenplay pages: scene headings, action, character cues, dialogue>
PLOT_GOBLIN_SUMMARY:
<2-3 sentences recapping what happened in these beats>
PLOT_GOBLIN_SETUPS:
<zero or more lines, each "- beat <number> | <thing planted that pays off in that beat>"; write the single word NONE if nothing was planted>

Living beat sheet and story context:
${request.markdown ?? ""}`;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/hermesCowriter.test.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/hermesCowriter.ts src/lib/hermesCowriter.test.ts
git commit -m "Add plan and chunk cowriter prompt modes"
```

---

## Task 10: Route — accept new modes, raise rate limit, expose retry-after

**Files:**
- Modify: `src/app/api/hermes-cowriter/route.ts:10` (default rate limit)
- Modify: `src/app/api/hermes-cowriter/route.ts:21-34` (`isCowriterRequest`)
- Modify: `src/app/api/hermes-cowriter/route.ts:54-67` (validate `targetPages`)
- Modify: `src/app/api/hermes-cowriter/route.ts:237-243` (return `retryAfterSeconds` in 429 body)

- [ ] **Step 1: Add failing test**

```ts
// src/app/api/hermes-cowriter/route.test.ts
import { describe, expect, it } from "vitest";
import { isCowriterRequestForTest } from "./route";

describe("cowriter request validation", () => {
  it("accepts the new plan and chunk modes", () => {
    expect(isCowriterRequestForTest({ mode: "plan" })).toBe(true);
    expect(isCowriterRequestForTest({ mode: "chunk" })).toBe(true);
  });

  it("rejects an unknown mode", () => {
    expect(isCowriterRequestForTest({ mode: "nonsense" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/hermes-cowriter/route.test.ts`
Expected: FAIL — `isCowriterRequestForTest` not exported; plan/chunk not accepted.

- [ ] **Step 3: Implement**

In `route.ts` line 10, change the default from `8` to `30`:

```ts
const rateLimitPerMinute = Number.parseInt(process.env.PLOT_GOBLIN_RATE_LIMIT_PER_MINUTE ?? "30", 10);
```

Extend `isCowriterRequest` (line 24-33) to include the new modes, and export a test alias at the end of the file:

```ts
  return (
    mode === "followup" ||
    mode === "suggestions" ||
    mode === "logline" ||
    mode === "room" ||
    mode === "beat" ||
    mode === "draft" ||
    mode === "scene" ||
    mode === "scene-suggest" ||
    mode === "plan" ||
    mode === "chunk"
  );
}

export const isCowriterRequestForTest = isCowriterRequest;
```

Add `targetPages` validation inside `validateCowriterRequest` (line 55-64), appending to the issues array:

```ts
    value.targetPages !== undefined && (typeof value.targetPages !== "number" || value.targetPages < 1 || value.targetPages > 200)
      ? "Target pages must be a number between 1 and 200."
      : null,
```

In the 429 branch (line 237-243), include `retryAfterSeconds` in the JSON body so the client orchestrator can back off:

```ts
    if (!limit.allowed) {
      return jsonResponse(
        { error: `Too many goblin summons. Try again in ${limit.retryAfterSeconds}s.`, retryAfterSeconds: limit.retryAfterSeconds },
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/hermes-cowriter/route.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/hermes-cowriter/route.ts src/app/api/hermes-cowriter/route.test.ts
git commit -m "Accept plan/chunk modes, raise rate limit to 30, expose retry-after"
```

---

## Task 11: `useDraftDirector` hook (runs the loop against the API)

**Files:**
- Create: `src/components/room-editor/useDraftDirector.ts`
- Test: covered indirectly by Task 12's component test + the Task 7/8 unit tests for the pure logic it composes.

The hook owns the run loop: plan → loop chunks → end-check → stitch. It persists after every step and exposes state for the UI. It injects the real `fetch` and a real `sleep`; all decision logic delegates to the tested pure functions.

- [ ] **Step 1: Create the hook**

```ts
// src/components/room-editor/useDraftDirector.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { cowriterRequestHeaders } from "@/lib/cowriterAccess";
import { parseBeatSheet, renderBeatSheet } from "@/lib/draftBeatSheet";
import { parseChunkResult } from "@/lib/draftChunk";
import { assembleChunkContext, estimatePageCount, shouldTopUp } from "@/lib/draftContinuity";
import {
  advanceDraft,
  callWithRetry,
  nextBeatPair,
  stitchDraft,
  type CowriterCallResult,
} from "@/lib/draftDirector";
import { clearDraftRun, loadDraftRun, saveDraftRun, type DraftRun } from "@/lib/draftRunStorage";

const MAX_PROMPT_CHARS = 36_000;
const MAX_ATTEMPTS = 3;
const TAIL_CHARS = 1_200;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function callCowriter(body: Record<string, unknown>): Promise<CowriterCallResult> {
  try {
    const response = await fetch("/api/hermes-cowriter", {
      method: "POST",
      headers: cowriterRequestHeaders(),
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { output?: string; error?: string; retryAfterSeconds?: number };
    return { status: response.status, output: data.output, error: data.error, retryAfterSeconds: data.retryAfterSeconds };
  } catch (caught) {
    return { status: 0, error: caught instanceof Error ? caught.message : "Network error." };
  }
}

export type DraftDirectorState = {
  run: DraftRun | null;
  statusLine: string;
  error: string | null;
  stitched: string | null;
};

export function useDraftDirector(roomExport: string, writingStyle: string, targetPages: number) {
  const [state, setState] = useState<DraftDirectorState>({ run: null, statusLine: "", error: null, stitched: null });
  const cancelled = useRef(false);

  useEffect(() => {
    const existing = loadDraftRun();
    if (existing) setState((prev) => ({ ...prev, run: existing }));
  }, []);

  const persist = useCallback((run: DraftRun, patch: Partial<DraftDirectorState> = {}) => {
    saveDraftRun(run);
    setState((prev) => ({ ...prev, run, ...patch }));
  }, []);

  const runLoop = useCallback(
    async (startRun: DraftRun) => {
      let run = startRun;
      while (!cancelled.current) {
        const pair = nextBeatPair(run);
        if (pair.length === 0) break;

        const label = pair.map((beat) => beat.index).join(" and ");
        setState((prev) => ({ ...prev, statusLine: `Working on beats ${label} now — please wait.` }));

        const lastPages = run.completedBeats.at(-1)?.pages ?? "";
        const context = assembleChunkContext({
          beatSheetText: renderBeatSheet(run.beatSheet),
          currentBeatsText: pair.map((beat) => `BEAT ${beat.index} | PAGES: ${beat.pageBudget} | TITLE: ${beat.title}`).join("\n"),
          runningSummary: run.runningSummary,
          previousTail: lastPages.slice(-TAIL_CHARS),
          roomExport,
          maxChars: MAX_PROMPT_CHARS,
        });

        try {
          const output = await callWithRetry(
            () => callCowriter({ mode: "chunk", beat: label, markdown: context, writingStyle }),
            { maxAttempts: MAX_ATTEMPTS, sleep },
          );
          const chunk = parseChunkResult(output);
          if (!chunk) throw new Error(`Beat ${label} came back in an unreadable shape.`);

          run = advanceDraft(run, pair, chunk);
          persist(run);
        } catch (caught) {
          const paused: DraftRun = { ...run, status: "paused" };
          persist(paused, { statusLine: "", error: caught instanceof Error ? caught.message : "Drafting stalled." });
          return;
        }
      }

      if (cancelled.current) return;

      const stitched = stitchDraft(run);
      const total = estimatePageCount(stitched);
      const tail = shouldTopUp(total, run.targetPages)
        ? ` (came in around ${total} pages — under the ${run.targetPages} target; consider re-running thin beats)`
        : ` (about ${total} pages)`;
      persist({ ...run, status: "done" }, { statusLine: `Done${tail}.`, stitched });
    },
    [persist, roomExport, writingStyle],
  );

  const start = useCallback(async () => {
    cancelled.current = false;
    setState({ run: null, statusLine: "Planning the whole movie…", error: null, stitched: null });

    const planResult = await callWithRetry(
      () => callCowriter({ mode: "plan", markdown: roomExport, writingStyle, targetPages }),
      { maxAttempts: MAX_ATTEMPTS, sleep },
    ).catch((caught: Error) => {
      setState((prev) => ({ ...prev, statusLine: "", error: caught.message }));
      return null;
    });
    if (!planResult) return;

    const beatSheet = parseBeatSheet(planResult);
    if (beatSheet.length === 0) {
      setState((prev) => ({ ...prev, statusLine: "", error: "The goblin's blueprint came back empty. Try again." }));
      return;
    }

    const run: DraftRun = {
      beatSheet,
      completedBeats: [],
      runningSummary: "",
      nextBeatIndex: 1,
      targetPages,
      status: "running",
    };
    persist(run);
    await runLoop(run);
  }, [persist, roomExport, runLoop, targetPages, writingStyle]);

  const resume = useCallback(async () => {
    const existing = loadDraftRun();
    if (!existing) return;
    cancelled.current = false;
    await runLoop({ ...existing, status: "running" });
  }, [runLoop]);

  const stop = useCallback(() => {
    cancelled.current = true;
    setState((prev) => ({ ...prev, statusLine: "Stopped." }));
  }, []);

  const reset = useCallback(() => {
    cancelled.current = true;
    clearDraftRun();
    setState({ run: null, statusLine: "", error: null, stitched: null });
  }, []);

  return { ...state, start, resume, stop, reset };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `useDraftDirector.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/components/room-editor/useDraftDirector.ts
git commit -m "Add useDraftDirector hook to run the chunked draft loop"
```

---

## Task 12: `FullScriptDirector` progress panel

**Files:**
- Create: `src/components/room-editor/FullScriptDirector.tsx`
- Test: `src/components/room-editor/FullScriptDirector.test.tsx`

Renders the growing checklist of finished beats, the status line, and the controls. Receives the hook's state as props so it is easy to test in isolation.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/room-editor/FullScriptDirector.test.tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FullScriptDirector } from "./FullScriptDirector";
import type { DraftRun } from "@/lib/draftRunStorage";

const run: DraftRun = {
  beatSheet: [
    { index: 1, pageBudget: 3, title: "A", intent: "x", setups: [] },
    { index: 2, pageBudget: 3, title: "B", intent: "y", setups: [] },
  ],
  completedBeats: [{ indices: [1, 2], pages: "PAGES", summary: "Mara escapes the lot." }],
  runningSummary: "Mara escapes the lot.",
  nextBeatIndex: 3,
  targetPages: 100,
  status: "running",
};

describe("FullScriptDirector", () => {
  it("shows finished beats with their summaries and the status line", () => {
    render(
      <FullScriptDirector
        run={run}
        statusLine="Working on beats 3 and 4 now — please wait."
        error={null}
        stitched={null}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText(/Mara escapes the lot\./)).toBeTruthy();
    expect(screen.getByText(/Working on beats 3 and 4 now/)).toBeTruthy();
  });

  it("shows Retry / Skip / Stop controls when paused with an error", () => {
    render(
      <FullScriptDirector
        run={{ ...run, status: "paused" }}
        statusLine=""
        error="Beat 3 stalled."
        stitched={null}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText(/Beat 3 stalled\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/room-editor/FullScriptDirector.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Write the component**

Match existing styling by reusing the room's CSS module classes. Use the workspace module classes already imported in sibling components (inspect `RoomEditors.tsx` imports for the CSS module name, e.g. `styles`, and reuse button classes). Minimal structural version:

```tsx
// src/components/room-editor/FullScriptDirector.tsx
import type { DraftRun } from "@/lib/draftRunStorage";

type Props = {
  run: DraftRun | null;
  statusLine: string;
  error: string | null;
  stitched: string | null;
  onStart: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function FullScriptDirector({ run, statusLine, error, stitched, onStart, onResume, onStop, onReset }: Props) {
  const running = run?.status === "running" || run?.status === "planning";
  const paused = run?.status === "paused";

  return (
    <section aria-label="Full script director">
      {!run && (
        <button type="button" onClick={onStart}>
          Write the full script
        </button>
      )}

      {run && (
        <ol>
          {run.completedBeats.map((beat) => (
            <li key={beat.indices.join("-")}>
              <span aria-hidden="true">✓</span> Beats {beat.indices.join(" & ")}: {beat.summary}
            </li>
          ))}
        </ol>
      )}

      {statusLine && <p role="status">{statusLine}</p>}
      {error && <p role="alert">{error}</p>}

      {running && (
        <button type="button" onClick={onStop}>
          Stop
        </button>
      )}

      {paused && (
        <div>
          <button type="button" onClick={onResume}>
            Retry
          </button>
          <button type="button" onClick={onResume}>
            Skip
          </button>
          <button type="button" onClick={onReset}>
            Stop
          </button>
        </div>
      )}

      {stitched && (
        <article>
          <h3>Generated screenplay</h3>
          <pre>{stitched}</pre>
        </article>
      )}
    </section>
  );
}
```

Note: "Retry" and "Skip" both call `onResume` for v1 (resume continues from the saved `nextBeatIndex`; a true "skip" would advance the index past the stuck beat — implement that refinement only if the user asks). Apply the project's Tailwind/CSS-module classes to match the pale-green editorial look per `docs/plot-goblin-style-guide.md` before finalizing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/room-editor/FullScriptDirector.test.tsx`
Expected: PASS (2 tests). If `@testing-library/react` is not installed, confirm with `grep "@testing-library/react" package.json`; the existing `*.test.tsx` files already use it, so it should be present.

- [ ] **Step 5: Commit**

```bash
git add src/components/room-editor/FullScriptDirector.tsx src/components/room-editor/FullScriptDirector.test.tsx
git commit -m "Add FullScriptDirector progress panel for chunked drafting"
```

---

## Task 13: Wire into the Create the Script room (two buttons)

**Files:**
- Modify: `src/components/room-editor/RoomEditors.tsx` (around the existing draft button + `requestDraft`, lines ~1698-1756)

- [ ] **Step 1: Relabel the existing single-shot button to "Quick sample"**

Find the JSX button that currently triggers `requestDraft` (the single-shot draft action). Change its visible label to **"Quick sample"** and downgrade its styling to a secondary/small variant (reuse the existing secondary button class already used elsewhere in this file). Leave `requestDraft` itself unchanged — it remains the fast first-pages call.

- [ ] **Step 2: Mount the director for the primary action**

Near the top of the `RoomEditors` create-script component body (where `writingStyle` is in scope, line ~1638), add the hook and the target-pages source. Derive `targetPages` from the existing script parameters; if a parser is not readily available, default to 100:

```tsx
import { useDraftDirector } from "./useDraftDirector";
import { FullScriptDirector } from "./FullScriptDirector";
import { buildDraftContextMarkdown } from "@/lib/guidedSetup";
// ...inside the component:
const director = useDraftDirector(buildDraftContextMarkdown(project.rooms), writingStyle, 100);
```

- [ ] **Step 3: Render the primary button + panel**

Place the director UI directly above or beside the relabeled "Quick sample" button, gated by the same `readiness.ready` check used by `requestDraft` (reuse the existing gate logic so an unfilled workbook still blocks). When `!director.run`, the panel shows the **"Write the full script"** primary button; once running it shows the progress checklist:

```tsx
{readiness.ready && (
  <FullScriptDirector
    run={director.run}
    statusLine={director.statusLine}
    error={director.error}
    stitched={director.stitched}
    onStart={director.start}
    onResume={director.resume}
    onStop={director.stop}
    onReset={director.reset}
  />
)}
```

- [ ] **Step 4: Save the stitched script through the existing flow**

When `director.stitched` becomes non-null, save it as a draft and mirror it into the room markdown exactly like `requestDraft` does at lines 1744-1748. Add an effect:

```tsx
useEffect(() => {
  if (!director.stitched) return;
  const savedDraft = saveNewDraft(director.stitched);
  onMarkdownChange(`# Create the Script Room\n\n## Generated screenplay draft\n${director.stitched}\n`);
  setSavedDraftConfirmation(savedDraft);
}, [director.stitched]);
```

- [ ] **Step 5: Type-check and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/room-editor/RoomEditors.tsx
git commit -m "Wire full-script director and Quick sample into Create the Script room"
```

---

## Task 14: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the project's required checks**

Run: `npm test`
Expected: all suites pass.

Run: `npm run lint`
Expected: no errors (run `npm run lint:fix` first per the global standard).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Browser-check the happy path**

Start the dev server, open the Create the Script room with a filled workbook, and press **Write the full script**. Confirm: the planning status appears, finished beats stream in with checkmarks and summaries, the status line updates per pair, and a stitched script appears at the end with Save/Export working. Confirm **Quick sample** still returns a fast short draft. Watch the console for errors.

- [ ] **Step 3: Verify resume**

Mid-run, reload the page. Confirm the room offers to resume and continues from the last finished beat rather than restarting.

- [ ] **Step 4: Final commit (if any lint/build fixups were needed)**

```bash
git add -A
git commit -m "Fix lint/build issues for chunked feature drafting"
```

---

## Self-Review Notes

- **Spec coverage:** plan/chunk modes (T9), living beat sheet + setup merge (T2/T7), per-beat budgets + end-check (T1/T4), continuity assembly with 36k cap (T5), persistence/resume (T6/T11/T14), failure auto-retry → pause (T8/T11/T12), rate limit 30 + retry-after (T10), two-button UI (T12/T13). All spec sections map to tasks.
- **Type consistency:** `Beat`, `UnifiedBeatSheet`, `PlantedSetup` (draftBeatSheet) → `ChunkResult` (draftChunk) → `DraftRun`, `CompletedBeat` (draftRunStorage) → `CowriterCallResult` (draftDirector) are defined once and imported, names identical across tasks.
- **Known approximation:** "Skip" reuses "Resume" in v1 (documented in T12); a true index-advancing skip is deferred unless requested.
- **Test environment:** `vitest.config.mts` already sets `environment: "jsdom"` globally, so `window` and React rendering work in every test without per-file directives. The `// @vitest-environment jsdom` lines in T6/T12 are belt-and-suspenders and can be omitted.
