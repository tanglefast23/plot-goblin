import { useCallback, useRef, useState } from "react";
import { cowriterRequestHeaders } from "@/lib/cowriterAccess";
import { parseBeatSheet, parseStoryBrief, renderBeatSheet } from "@/lib/draftBeatSheet";
import { parseChunkResult } from "@/lib/draftChunk";
import {
  DRAFT_CHUNK_CONTEXT_MAX_CHARS,
  assembleChunkContext,
  estimatePageCount,
  shouldTopUp,
} from "@/lib/draftContinuity";
import {
  advanceDraft,
  callWithRetry,
  nextBeatPair,
  stitchDraft,
  type CowriterCallResult,
} from "@/lib/draftDirector";
import { seedContinuityLedger } from "@/lib/draftContinuityLedger";
import { clearDraftRun, loadDraftRun, saveDraftRun, type DraftRun } from "@/lib/draftRunStorage";

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
  const [state, setState] = useState<DraftDirectorState>(() => ({
    run: loadDraftRun(),
    statusLine: "",
    error: null,
    stitched: null,
  }));
  const cancelled = useRef(false);
  const running = useRef(false);

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
          currentBeatsText: renderBeatSheet(pair),
          runningSummary: run.runningSummary,
          previousTail: lastPages.slice(-TAIL_CHARS),
          roomExport,
          continuityLedger: run.continuityLedger,
          storyBrief: run.storyBrief,
          maxChars: DRAFT_CHUNK_CONTEXT_MAX_CHARS,
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
          if (cancelled.current) return;
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
    if (running.current) return;
    running.current = true;
    cancelled.current = false;
    setState({ run: null, statusLine: "Planning the whole movie…", error: null, stitched: null });

    try {
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
        continuityLedger: seedContinuityLedger(roomExport),
        runningSummary: "",
        nextBeatIndex: 1,
        storyBrief: parseStoryBrief(planResult),
        targetPages,
        status: "running",
      };
      persist(run);
      await runLoop(run);
    } finally {
      running.current = false;
    }
  }, [persist, roomExport, runLoop, targetPages, writingStyle]);

  const resume = useCallback(async () => {
    if (running.current) return;
    const existing = loadDraftRun();
    if (!existing) return;
    running.current = true;
    cancelled.current = false;
    try {
      await runLoop({ ...existing, status: "running" });
    } finally {
      running.current = false;
    }
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
