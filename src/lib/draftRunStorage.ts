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
