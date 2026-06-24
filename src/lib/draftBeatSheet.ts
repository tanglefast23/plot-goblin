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
const INTENT_LINE = /^INTENT:\s*(.+)$/i;
const STORY_BRIEF_HEADER = /^STORY_BRIEF:\s*$/im;
const FIRST_BEAT_HEADER = /^BEAT\s+\d+\s*\|/im;

export function parseBeatSheet(raw: string): UnifiedBeatSheet {
  const lines = raw.replace(/\r\n|\r/g, "\n").split("\n");
  const beats: UnifiedBeatSheet = [];
  let current: Beat | null = null;

  for (const line of lines) {
    const header = BEAT_HEADER.exec(line.trim());
    if (header) {
      const [, rawPages, rawTitle] = header;
      if (current) beats.push(current);
      current = {
        index: beats.length + 1,
        pageBudget: Number.parseInt(rawPages, 10),
        title: rawTitle.trim(),
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
