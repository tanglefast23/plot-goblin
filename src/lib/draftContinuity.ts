const WORDS_PER_PAGE = 250;
const TRIMMED_MARKER = "\n[...trimmed to fit the public bridge]";

export const DRAFT_CHUNK_CONTEXT_MAX_CHARS = 18_000;

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

function capText(value: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (value.length <= maxChars) return value;
  if (maxChars <= TRIMMED_MARKER.length) return value.slice(0, maxChars);

  return `${value.slice(0, maxChars - TRIMMED_MARKER.length)}${TRIMMED_MARKER}`;
}

function compose(
  params: ChunkContextParams,
  options: {
    beatSheetText: string;
    includeSummary: boolean;
    previousTail: string;
    runningSummary: string;
    storyContext: string;
  },
): string {
  const compactStoryContext = params.storyBrief?.trim();
  const sections = [
    compactStoryContext ? "## Story brief (compressed room facts)" : "## Room export (facts: premise, characters, theme, parameters)",
    options.storyContext,
    "",
    "## Beats to write now",
    params.currentBeatsText,
    "",
    "## Previous pages (tail — pick up seamlessly)",
    options.previousTail,
    "",
    options.includeSummary ? "## Story so far" : "",
    options.includeSummary ? options.runningSummary : "",
    "",
    "## Unified beat sheet (the living blueprint — honor every PLANTED note)",
    options.beatSheetText,
  ];
  return sections.filter((line) => line !== "").join("\n").trim();
}

export function assembleChunkContext(params: ChunkContextParams): string {
  const storyContext = params.storyBrief?.trim() || params.roomExport;
  const full = compose(params, {
    beatSheetText: params.beatSheetText,
    includeSummary: true,
    previousTail: params.previousTail,
    runningSummary: params.runningSummary,
    storyContext,
  });
  if (full.length <= params.maxChars) return full;

  const withoutSummary = compose(params, {
    beatSheetText: params.beatSheetText,
    includeSummary: false,
    previousTail: params.previousTail,
    runningSummary: "",
    storyContext,
  });
  if (withoutSummary.length <= params.maxChars) return withoutSummary;

  const fixedWithoutBeatSheet = compose(params, {
    beatSheetText: "",
    includeSummary: false,
    previousTail: params.previousTail,
    runningSummary: "",
    storyContext,
  });
  if (fixedWithoutBeatSheet.length <= params.maxChars) {
    const beatSheetBudget = params.maxChars - fixedWithoutBeatSheet.length - 1;
    return compose(params, {
      beatSheetText: capText(params.beatSheetText, beatSheetBudget),
      includeSummary: false,
      previousTail: params.previousTail,
      runningSummary: "",
      storyContext,
    });
  }

  const compactFixed = compose(params, {
    beatSheetText: "",
    includeSummary: false,
    previousTail: capText(params.previousTail, 600),
    runningSummary: "",
    storyContext: capText(storyContext, 2_000),
  });
  if (compactFixed.length <= params.maxChars) return compactFixed;

  return capText(compactFixed, params.maxChars);
}
