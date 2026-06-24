# Draft Continuity Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a continuity ledger to full-script chunk drafting so names, dates, locations, events, and named objects stay consistent across generated chunks.

**Architecture:** Add a small pure `draftContinuityLedger` module for parsing, rendering, seeding, and merging ledger entries. Extend chunk parsing to read `PLOT_GOBLIN_LEDGER`, store the merged ledger on `DraftRun`, include it in assembled chunk context, and require ledger updates in chunk prompts.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, localStorage-backed draft runs, Hermes co-writer prompt helpers.

---

### Task 1: Pure Continuity Ledger Module

**Files:**
- Create: `src/lib/draftContinuityLedger.ts`
- Test: `src/lib/draftContinuityLedger.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for parsing a ledger block, rendering it back into prompt text, merging generated entries, preserving seeded entries, and warning on same-first-name/same-role conflicts.

Run: `npx vitest run src/lib/draftContinuityLedger.test.ts`
Expected: FAIL because `src/lib/draftContinuityLedger.ts` does not exist.

- [ ] **Step 2: Implement minimal ledger code**

Create a module with:

```ts
export type ContinuityLedgerEntry = { name: string; note: string; source: "seeded" | "generated" };
export type ContinuityLedger = {
  people: ContinuityLedgerEntry[];
  objects: ContinuityLedgerEntry[];
  locations: ContinuityLedgerEntry[];
  events: ContinuityLedgerEntry[];
  warnings: string[];
};
export function emptyContinuityLedger(): ContinuityLedger;
export function parseContinuityLedger(block: string | null, source?: "seeded" | "generated"): ContinuityLedger;
export function mergeContinuityLedgers(base: ContinuityLedger, incoming: ContinuityLedger): ContinuityLedger;
export function renderContinuityLedger(ledger: ContinuityLedger): string;
export function seedContinuityLedger(roomExport: string): ContinuityLedger;
```

Use exact normalized-name matching plus a same-first-name/same-role warning for generated people that conflict with seeded people.

- [ ] **Step 3: Verify tests pass**

Run: `npx vitest run src/lib/draftContinuityLedger.test.ts`
Expected: PASS.

### Task 2: Parse Ledger From Chunk Output

**Files:**
- Modify: `src/lib/draftChunk.ts`
- Test: `src/lib/draftChunk.test.ts`

- [ ] **Step 1: Write failing tests**

Add a chunk parser test with `PLOT_GOBLIN_LEDGER` containing `PEOPLE`, `OBJECTS`, `LOCATIONS`, `EVENTS`, and `WARNINGS`.

Run: `npx vitest run src/lib/draftChunk.test.ts`
Expected: FAIL because `ChunkResult` has no `ledger` property.

- [ ] **Step 2: Implement parser extension**

Import the ledger parser, add `ledger: ContinuityLedger` to `ChunkResult`, and parse the optional section with:

```ts
const ledgerBlock = section(normalized, "PLOT_GOBLIN_LEDGER:", []);
return { pages, summary, setups: parseSetups(setupsBlock), ledger: parseContinuityLedger(ledgerBlock) };
```

Update section boundaries so `PLOT_GOBLIN_SETUPS` stops before `PLOT_GOBLIN_LEDGER`.

- [ ] **Step 3: Verify tests pass**

Run: `npx vitest run src/lib/draftChunk.test.ts`
Expected: PASS.

### Task 3: Carry Ledger Through Draft Runs

**Files:**
- Modify: `src/lib/draftRunStorage.ts`
- Modify: `src/lib/draftDirector.ts`
- Modify: `src/components/room-editor/useDraftDirector.ts`
- Test: `src/lib/draftDirector.test.ts`
- Test: `src/lib/draftContinuity.test.ts`

- [ ] **Step 1: Write failing tests**

Add a draft director test proving `advanceDraft` merges a chunk ledger into `run.continuityLedger`. Add a continuity context test proving rendered ledger text appears in assembled chunk context.

Run: `npx vitest run src/lib/draftDirector.test.ts src/lib/draftContinuity.test.ts`
Expected: FAIL because runs do not store ledgers and context assembly has no ledger section.

- [ ] **Step 2: Implement run/context changes**

Add `continuityLedger?: ContinuityLedger` to `DraftRun`.
Update `advanceDraft` to merge `chunk.ledger`.
Update `ChunkContextParams` with `continuityLedger?: ContinuityLedger`.
Include `## Continuity ledger (locked facts)` in `assembleChunkContext`.
Seed a new run with `seedContinuityLedger(roomExport)` in `useDraftDirector`.
Pass `run.continuityLedger` into `assembleChunkContext`.

- [ ] **Step 3: Verify tests pass**

Run: `npx vitest run src/lib/draftDirector.test.ts src/lib/draftContinuity.test.ts`
Expected: PASS.

### Task 4: Prompt Contract

**Files:**
- Modify: `src/lib/hermesCowriter.ts`
- Test: `src/lib/hermesCowriter.test.ts`

- [ ] **Step 1: Write failing test**

Add a chunk prompt test proving it asks for `PLOT_GOBLIN_LEDGER`, prohibits renaming names/objects/locations/events, preserves dates/timing, and avoids duplicate event discoveries.

Run: `npx vitest run src/lib/hermesCowriter.test.ts`
Expected: FAIL because current chunk prompt only requests pages, summary, and setups.

- [ ] **Step 2: Implement prompt text**

Change chunk output instructions to require four sections in order:

```txt
PLOT_GOBLIN_PAGES:
PLOT_GOBLIN_SUMMARY:
PLOT_GOBLIN_SETUPS:
PLOT_GOBLIN_LEDGER:
```

Add explicit rules to preserve canonical ledger facts and report new people, objects, locations, events, dates, and warnings.

- [ ] **Step 3: Verify tests pass**

Run: `npx vitest run src/lib/hermesCowriter.test.ts`
Expected: PASS.

### Task 5: Full Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused tests**

Run: `npx vitest run src/lib/draftContinuityLedger.test.ts src/lib/draftChunk.test.ts src/lib/draftDirector.test.ts src/lib/draftContinuity.test.ts src/lib/hermesCowriter.test.ts`
Expected: PASS.

- [ ] **Step 2: Run project verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all PASS.
