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
