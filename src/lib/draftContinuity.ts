const WORDS_PER_PAGE = 250;

export function estimatePageCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / WORDS_PER_PAGE);
}

export function shouldTopUp(totalPages: number, targetPages: number): boolean {
  if (targetPages <= 0) return false;
  return totalPages < targetPages * 0.9;
}

export type ChunkContextParams = {
  beatSheetText: string;
  currentBeatsText: string;
  runningSummary: string;
  previousTail: string;
  roomExport: string;
  storyBrief?: string;
  maxChars: number;
};

function compose(params: ChunkContextParams, includeSummary: boolean, roomChars: number): string {
  const compactStoryContext = params.storyBrief?.trim();
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
    compactStoryContext ? "## Story brief (compressed room facts)" : "## Room export (facts: premise, characters, theme, parameters)",
    compactStoryContext || params.roomExport.slice(0, roomChars),
  ];
  return sections.filter((line) => line !== "").join("\n").trim();
}

export function assembleChunkContext(params: ChunkContextParams): string {
  const full = compose(params, true, params.roomExport.length);
  if (full.length <= params.maxChars) return full;

  const withoutSummary = compose(params, false, params.roomExport.length);
  if (withoutSummary.length <= params.maxChars) return withoutSummary;

  const overflow = withoutSummary.length - params.maxChars;
  const trimmedRoomChars = Math.max(0, params.roomExport.length - overflow);
  return compose(params, false, trimmedRoomChars).slice(0, params.maxChars);
}
