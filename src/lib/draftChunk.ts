import type { PlantedSetup } from "./draftBeatSheet";
import { parseContinuityLedger, type ContinuityLedger } from "./draftContinuityLedger";

export type ChunkResult = {
  pages: string;
  summary: string;
  setups: PlantedSetup[];
  ledger: ContinuityLedger;
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
  const normalized = raw.replace(/\r\n|\r/g, "\n");
  const pages = section(normalized, "PLOT_GOBLIN_PAGES:", ["PLOT_GOBLIN_SUMMARY:", "PLOT_GOBLIN_SETUPS:"]);
  const summary = section(normalized, "PLOT_GOBLIN_SUMMARY:", ["PLOT_GOBLIN_SETUPS:", "PLOT_GOBLIN_LEDGER:"]);
  const setupsBlock = section(normalized, "PLOT_GOBLIN_SETUPS:", ["PLOT_GOBLIN_LEDGER:"]);
  const ledgerBlock = section(normalized, "PLOT_GOBLIN_LEDGER:", []);

  if (!pages || !summary) return null;

  return { pages, summary, setups: parseSetups(setupsBlock), ledger: parseContinuityLedger(ledgerBlock) };
}
