export type Beat = {
  index: number;
  pageBudget: number;
  title: string;
  intent: string;
  setups: string[];
};

export type UnifiedBeatSheet = Beat[];

export type PlantedSetup = { beatIndex: number; note: string };

const BEAT_HEADER = /^(?:[-*]\s*|\d+[.)]\s*)?BEAT\s+\d+\s*\|\s*PAGES:\s*(\d+)\s*\|\s*TITLE:\s*(.+)$/i;
const BEAT_START = /^(?:[-*]\s*|\d+[.)]\s*)?BEAT\s+\d+\b(.+)$/i;
const INTENT_LINE = /^INTENT:\s*(.+)$/i;
const PAGE_LINE = /^(?:PAGES?|PAGE\s+BUDGET):\s*(\d+)/i;
const INLINE_PAGE_BUDGET = /\b(?:PAGES?|PAGE\s+BUDGET):\s*(\d+)/i;
const PAREN_PAGE_BUDGET = /\((\d+)\s*pages?\)/i;
const TITLE_LINE = /^TITLE:\s*(.+)$/i;
const STORY_BRIEF_HEADER = /^STORY_BRIEF:\s*$/im;
const FIRST_BEAT_HEADER = /^(?:[-*]\s*|\d+[.)]\s*)?BEAT\s+\d+\b/im;

type DraftBeat = Omit<Beat, "pageBudget"> & { pageBudget: number | null };

function pageBudgetFromLine(line: string): number | null {
  const inline = INLINE_PAGE_BUDGET.exec(line) ?? PAREN_PAGE_BUDGET.exec(line);
  if (!inline) return null;

  return Number.parseInt(inline[1], 10);
}

function titleFromBeatLine(line: string) {
  const title = /\bTITLE:\s*(.+)$/i.exec(line);
  if (title) return title[1].trim();

  return line
    .replace(/^(?:[-*]\s*|\d+[.)]\s*)?BEAT\s+\d+\b/i, "")
    .replace(/\|\s*(?:PAGES?|PAGE\s+BUDGET):\s*\d+\b/gi, "")
    .replace(/\((?:\d+\s*pages?|(?:PAGES?|PAGE\s+BUDGET):\s*\d+)\)/gi, "")
    .replace(/^\s*(?:\||:|-|—)+\s*/, "")
    .trim();
}

function finalBeat(current: DraftBeat | null): Beat | null {
  if (!current || current.pageBudget === null) return null;

  return {
    ...current,
    pageBudget: current.pageBudget,
    title: current.title || `Beat ${current.index}`,
  };
}

export function parseBeatSheet(raw: string): UnifiedBeatSheet {
  const lines = raw.replace(/\r\n|\r/g, "\n").split("\n");
  const beats: UnifiedBeatSheet = [];
  let current: DraftBeat | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const header = BEAT_HEADER.exec(trimmed);
    if (header) {
      const [, rawPages, rawTitle] = header;
      const finished = finalBeat(current);
      if (finished) beats.push(finished);
      current = {
        index: beats.length + 1,
        pageBudget: Number.parseInt(rawPages, 10),
        title: rawTitle.trim(),
        intent: "",
        setups: [],
      };
      continue;
    }

    const looseHeader = BEAT_START.exec(trimmed);
    if (looseHeader) {
      const finished = finalBeat(current);
      if (finished) beats.push(finished);
      current = {
        index: beats.length + 1,
        pageBudget: pageBudgetFromLine(trimmed),
        title: titleFromBeatLine(trimmed),
        intent: "",
        setups: [],
      };
      continue;
    }

    if (!current) continue;

    const pageBudget = PAGE_LINE.exec(trimmed);
    if (pageBudget) {
      current.pageBudget = Number.parseInt(pageBudget[1], 10);
      continue;
    }

    const title = TITLE_LINE.exec(trimmed);
    if (title) {
      current.title = title[1].trim();
      continue;
    }

    const intent = INTENT_LINE.exec(trimmed);
    if (intent) {
      current.intent = current.intent ? `${current.intent} ${intent[1].trim()}` : intent[1].trim();
    }
  }

  const finished = finalBeat(current);
  if (finished) beats.push(finished);
  return beats;
}

export function parseStoryBrief(raw: string): string {
  const storyBriefMatch = STORY_BRIEF_HEADER.exec(raw);
  if (!storyBriefMatch) return "";

  const afterHeader = raw.slice(storyBriefMatch.index + storyBriefMatch[0].length).trimStart();
  const firstBeat = FIRST_BEAT_HEADER.exec(afterHeader);
  const brief = firstBeat ? afterHeader.slice(0, firstBeat.index) : afterHeader;
  return brief.trim();
}

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
