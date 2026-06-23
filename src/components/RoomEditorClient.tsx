"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/workspace.module.css";
import { parseCowriterChoices } from "@/lib/cowriterChoices";
import { ACCESS_KEY_STORAGE_KEY } from "@/lib/cowriterAccess";
import { buildExportMarkdown, NEEDS_ANSWER, NEEDS_WRITING, type ScriptBase } from "@/lib/guidedSetup";
import { ensureProject, saveProject } from "@/lib/projectStorage";
import { storyRooms } from "@/lib/storyRooms";

type BeatSection = {
  heading: string;
  body: string;
};

type SuggestionState = {
  error: string;
  isLoading: boolean;
  mascotCycle: number;
  mascotState: SuggestionMascotState;
  text: string;
};

type SuggestionMascotState = "idle" | "thinking" | "happy";

type SceneSummary = {
  title: string;
  location: string;
  characters: string;
};

type GuidedRoomField = {
  body: string;
  heading: string;
  level: 2 | 3;
};

type SceneDraftValues = {
  button: string;
  characters: string;
  locationTime: string;
  opposition: string;
  purpose: string;
  sceneWant: string;
  title: string;
  turn: string;
};

type ScriptParameterValues = {
  audienceFeeling: string;
  budgetReality: string;
  castSize: number;
  dialogueDensity: string;
  format: string;
  genre: string;
  lengthFormat: string;
  locationLimits: string;
  noGoContent: string;
  pacingBias: string;
  primaryPov: string;
  rating: string;
  sceneAccess: string;
  sceneLength: string;
  structureMode: string;
  targetPages: number;
  timePeriod: string;
  toneWords: string;
  voiceover: string;
};

const SCENE_TEMPLATE_HEADING = "## Scene card template";
const SAVED_SCENES_HEADING = "## Saved scenes";
const SCENE_LIST_HEADING = "## Scene list";
const GUIDED_ROOM_SLUGS = new Set(["premise", "characters", "theme"]);
const SUGGESTION_GOBLIN_POP_MS = 1900;

const DEFAULT_SCENE_CARD = `### Scene: [Short title]

**Location / time:** INT./EXT. PLACE - DAY/NIGHT

**Characters:**
${NEEDS_WRITING} Who is in the scene, and who has the most pressure on them?

**Scene want:**
${NEEDS_WRITING} What does the active character want in this scene?

**Opposition:**
${NEEDS_WRITING} What blocks them?

**Turn:**
${NEEDS_WRITING} What changes by the end: power, emotion, knowledge, relationship, stakes, or plan?

**Button:**
${NEEDS_WRITING} What is the last image, line, or action?

**Purpose:**
Plot / character / theme / tension / setup / payoff`;

function cowriterRequestHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const accessKey =
    typeof window === "undefined" ? "" : (window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY) ?? "").trim();

  if (accessKey) {
    headers["x-plot-goblin-key"] = accessKey;
  }

  return headers;
}

type AudioContextFactory = new () => AudioContext;
type BrowserAudioWindow = Window & typeof globalThis & { AudioContext?: AudioContextFactory; webkitAudioContext?: AudioContextFactory };

function createGoblinPopAudioContext() {
  if (typeof window === "undefined") return null;
  const audioWindow = window as BrowserAudioWindow;
  const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;

  return new AudioContextCtor();
}

function playGoblinSquashSound() {
  try {
    const audioContext = createGoblinPopAudioContext();
    if (!audioContext) return;
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => undefined);
    }

    const now = audioContext.currentTime;
    const duration = 0.24;
    const masterGain = audioContext.createGain();

    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.018);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(audioContext.destination);

    const thump = audioContext.createOscillator();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(168, now);
    thump.frequency.exponentialRampToValueAtTime(46, now + duration);
    thump.connect(masterGain);
    thump.start(now);
    thump.stop(now + duration);

    const noiseLength = Math.floor(audioContext.sampleRate * duration);
    const noiseBuffer = audioContext.createBuffer(1, noiseLength, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      const fade = 1 - index / noiseData.length;
      noiseData[index] = (Math.random() * 2 - 1) * fade * 0.38;
    }

    const wetNoise = audioContext.createBufferSource();
    const wetFilter = audioContext.createBiquadFilter();
    const wetGain = audioContext.createGain();
    wetNoise.buffer = noiseBuffer;
    wetFilter.type = "lowpass";
    wetFilter.frequency.setValueAtTime(560, now);
    wetFilter.frequency.exponentialRampToValueAtTime(88, now + duration);
    wetGain.gain.setValueAtTime(0.44, now);
    wetGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    wetNoise.connect(wetFilter);
    wetFilter.connect(wetGain);
    wetGain.connect(masterGain);
    wetNoise.start(now);
    wetNoise.stop(now + duration);

    window.setTimeout(() => {
      void audioContext.close().catch(() => undefined);
    }, 420);
  } catch {
    // Browser audio can be unavailable, blocked, or disabled.
  }
}

function defaultSuggestionState(): SuggestionState {
  return {
    error: "",
    isLoading: false,
    mascotCycle: 0,
    mascotState: "idle",
    text: "",
  };
}

function useSuggestionStates() {
  const [suggestions, setSuggestions] = useState<Record<number, SuggestionState>>({});
  const cyclesRef = useRef<Record<number, number>>({});
  const hideTimersRef = useRef<Record<number, number>>({});

  useEffect(
    () => () => {
      Object.values(hideTimersRef.current).forEach(window.clearTimeout);
    },
    [],
  );

  function clearMascotTimer(index: number) {
    const timer = hideTimersRef.current[index];
    if (timer) window.clearTimeout(timer);
    delete hideTimersRef.current[index];
  }

  function updateSuggestion(index: number, patch: Partial<SuggestionState>) {
    setSuggestions((current) => {
      const previous = current[index] ?? defaultSuggestionState();

      return {
        ...current,
        [index]: { ...previous, ...patch },
      };
    });
  }

  function beginSuggestion(index: number) {
    playGoblinSquashSound();
    const mascotCycle = (cyclesRef.current[index] ?? 0) + 1;
    cyclesRef.current[index] = mascotCycle;
    clearMascotTimer(index);
    updateSuggestion(index, { error: "", isLoading: true, mascotCycle, mascotState: "thinking", text: "" });
    return mascotCycle;
  }

  function finishSuggestion(index: number, mascotCycle: number, patch: Pick<SuggestionState, "error" | "text">) {
    if (cyclesRef.current[index] !== mascotCycle) return;

    clearMascotTimer(index);
    updateSuggestion(index, { ...patch, isLoading: false, mascotCycle, mascotState: "happy" });
    hideTimersRef.current[index] = window.setTimeout(() => {
      setSuggestions((current) => {
        const currentSuggestion = current[index];
        if (
          !currentSuggestion ||
          currentSuggestion.mascotCycle !== mascotCycle ||
          currentSuggestion.mascotState !== "happy"
        ) {
          return current;
        }

        return {
          ...current,
          [index]: { ...currentSuggestion, mascotState: "idle" },
        };
      });
      delete hideTimersRef.current[index];
    }, SUGGESTION_GOBLIN_POP_MS);
  }

  function failSuggestion(index: number, mascotCycle: number, patch: Pick<SuggestionState, "error" | "text">) {
    if (cyclesRef.current[index] !== mascotCycle) return;

    clearMascotTimer(index);
    updateSuggestion(index, { ...patch, isLoading: false, mascotCycle, mascotState: "idle" });
  }

  function clearSuggestion(index: number) {
    clearMascotTimer(index);
    setSuggestions((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  }

  return { beginSuggestion, clearSuggestion, failSuggestion, finishSuggestion, suggestions };
}

function trimBlankEdges(lines: string[]) {
  const trimmed = [...lines];
  while (trimmed[0]?.trim() === "") trimmed.shift();
  while (trimmed.at(-1)?.trim() === "") trimmed.pop();
  return trimmed;
}

function trimSceneMarkdown(markdown: string) {
  let lines = trimBlankEdges(markdown.replace(/\r\n/g, "\n").split("\n"));

  while (lines[0]?.trim() === "---") {
    lines = trimBlankEdges(lines.slice(1));
  }

  while (lines.at(-1)?.trim() === "---") {
    lines = trimBlankEdges(lines.slice(0, -1));
  }

  return lines.join("\n");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sectionBody(markdown: string, heading: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) return "";

  let nextHeadingIndex = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      nextHeadingIndex = index;
      break;
    }
  }

  return trimSceneMarkdown(lines.slice(headingIndex + 1, nextHeadingIndex).join("\n"));
}

function sceneDocumentIntro(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const firstSectionIndex = lines.findIndex((line) =>
    [SCENE_TEMPLATE_HEADING, SAVED_SCENES_HEADING, SCENE_LIST_HEADING].includes(line.trim()),
  );
  const intro =
    firstSectionIndex === -1 ? markdown.replace(/\r\n/g, "\n").trimEnd() : lines.slice(0, firstSectionIndex).join("\n").trimEnd();

  return intro || "# Scenes Room";
}

function sceneCardTemplate(markdown: string) {
  return sectionBody(markdown, SCENE_TEMPLATE_HEADING) || DEFAULT_SCENE_CARD;
}

function parseSavedSceneCards(markdown: string) {
  const body = sectionBody(markdown, SAVED_SCENES_HEADING);
  if (!body) return [];

  return body
    .split(/(?=^###\s+Scene:)/m)
    .map(trimSceneMarkdown)
    .filter((card) => /^###\s+Scene:/m.test(card));
}

function cleanSceneValue(value: string) {
  return value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSceneDraftValue(value: string) {
  return value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sceneField(markdown: string, label: string) {
  const match = new RegExp(`^\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.*)$`, "im").exec(markdown);
  if (!match) return "";
  if (match[1]?.trim()) return cleanSceneValue(match[1]);

  const afterField = markdown.slice(match.index + match[0].length).replace(/^\n/, "").split("\n");
  const fieldLines: string[] = [];

  for (const line of afterField) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (fieldLines.length > 0) break;
      continue;
    }

    if (/^(\*\*[^*]+:\*\*|#{1,6}\s+|---)/.test(trimmed)) break;
    fieldLines.push(trimmed);
  }

  return cleanSceneValue(fieldLines.join(" "));
}

function sceneDraftField(markdown: string, label: string) {
  const match = new RegExp(`^\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.*)$`, "im").exec(markdown);
  if (!match) return "";
  if (match[1]?.trim()) return cleanSceneDraftValue(match[1]);

  const afterField = markdown.slice(match.index + match[0].length).replace(/^\n/, "").split("\n");
  const fieldLines: string[] = [];

  for (const line of afterField) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (fieldLines.length > 0) break;
      continue;
    }

    if (/^(\*\*[^*]+:\*\*|#{1,6}\s+|---)/.test(trimmed)) break;
    fieldLines.push(line.trimEnd());
  }

  return cleanSceneDraftValue(fieldLines.join("\n"));
}

function sceneSummary(markdown: string): SceneSummary {
  const title = cleanSceneValue(/^###\s+Scene:\s*(.+)$/m.exec(markdown)?.[1] ?? "");

  return {
    title: title && title !== "[Short title]" ? title : "Untitled scene",
    location: sceneField(markdown, "Location / time") || "Location TBD",
    characters: sceneField(markdown, "Characters") || "Characters TBD",
  };
}

function cleanSceneDraftTitle(value: string) {
  const cleaned = cleanSceneValue(value);
  return cleaned === "[Short title]" ? "" : cleaned;
}

function parseSceneDraftValues(markdown: string): SceneDraftValues {
  return {
    button: sceneDraftField(markdown, "Button"),
    characters: sceneDraftField(markdown, "Characters"),
    locationTime: sceneDraftField(markdown, "Location / time").replace(/^INT\.\/EXT\. PLACE - DAY\/NIGHT$/i, ""),
    opposition: sceneDraftField(markdown, "Opposition"),
    purpose: sceneDraftField(markdown, "Purpose").replace(/^Plot \/ character \/ theme \/ tension \/ setup \/ payoff$/i, ""),
    sceneWant: sceneDraftField(markdown, "Scene want"),
    title: cleanSceneDraftTitle(/^###\s+Scene:\s*(.+)$/m.exec(markdown)?.[1] ?? ""),
    turn: sceneDraftField(markdown, "Turn"),
  };
}

function sceneDraftBlock(value: string, fallback: string) {
  const cleaned = value.trim();
  return cleaned || `${NEEDS_WRITING} ${fallback}`;
}

function sceneDraftInline(value: string, fallback: string) {
  return value.trim() || fallback;
}

function formatSceneDraftValues(values: SceneDraftValues) {
  return `### Scene: ${values.title.trim() || "[Short title]"}

**Location / time:** ${sceneDraftInline(values.locationTime, "INT./EXT. PLACE - DAY/NIGHT")}

**Characters:**
${sceneDraftBlock(values.characters, "Who is in the scene, and who has the most pressure on them?")}

**Scene want:**
${sceneDraftBlock(values.sceneWant, "What does the active character want in this scene?")}

**Opposition:**
${sceneDraftBlock(values.opposition, "What blocks them?")}

**Turn:**
${sceneDraftBlock(values.turn, "What changes by the end: power, emotion, knowledge, relationship, stakes, or plan?")}

**Button:**
${sceneDraftBlock(values.button, "What is the last image, line, or action?")}

**Purpose:**
${sceneDraftInline(values.purpose, "Plot / character / theme / tension / setup / payoff")}`;
}

function sceneListMarkdown(sceneCards: string[]) {
  if (sceneCards.length === 0) return `- ${NEEDS_WRITING}`;
  return sceneCards.map((card) => `- ${sceneSummary(card).title}`).join("\n");
}

function formatScenesMarkdown(markdown: string, sceneCards: string[]) {
  const pieces = [
    sceneDocumentIntro(markdown),
    `${SCENE_TEMPLATE_HEADING}\n\n${sceneCardTemplate(markdown)}`,
    sceneCards.length > 0 ? `${SAVED_SCENES_HEADING}\n\n${sceneCards.map(trimSceneMarkdown).join("\n\n---\n\n")}` : "",
    `${SCENE_LIST_HEADING}\n${sceneListMarkdown(sceneCards)}`,
  ].filter(Boolean);

  return `${pieces.join("\n\n")}\n`;
}

function reorderSceneCards(sceneCards: string[], fromIndex: number, toIndex: number) {
  const reordered = [...sceneCards];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

function selectedSceneAfterMove(selectedIndex: number, fromIndex: number, toIndex: number) {
  if (selectedIndex === fromIndex) return toIndex;
  if (fromIndex < toIndex && selectedIndex > fromIndex && selectedIndex <= toIndex) return selectedIndex - 1;
  if (fromIndex > toIndex && selectedIndex >= toIndex && selectedIndex < fromIndex) return selectedIndex + 1;
  return selectedIndex;
}

function parseGuidedRoomFields(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headingIndexes = lines.reduce<Array<{ index: number; level: 2 | 3 }>>((indexes, line, index) => {
    const match = /^(##|###)\s+/.exec(line);
    if (match) indexes.push({ index, level: match[1].length as 2 | 3 });
    return indexes;
  }, []);

  if (headingIndexes.length === 0) {
    return { intro: markdown, fields: [] as GuidedRoomField[] };
  }

  const intro = lines.slice(0, headingIndexes[0].index).join("\n").trimEnd();
  const fields = headingIndexes.map((heading, index) => {
    const nextHeadingIndex = headingIndexes[index + 1]?.index ?? lines.length;
    const bodyLines = trimBlankEdges(lines.slice(heading.index + 1, nextHeadingIndex));

    return {
      body: bodyLines.join("\n"),
      heading: lines[heading.index].replace(/^#{2,3}\s+/, "").trim(),
      level: heading.level,
    };
  });

  return { intro, fields };
}

function formatGuidedRoomFields(intro: string, fields: GuidedRoomField[]) {
  const pieces = [
    intro.trimEnd(),
    ...fields.map((field) => {
      const heading = field.heading.trim() || "Untitled question";
      const body = field.body.replace(/\r\n/g, "\n").trimEnd();
      return body ? `${"#".repeat(field.level)} ${heading}\n${body}` : `${"#".repeat(field.level)} ${heading}`;
    }),
  ].filter(Boolean);

  return `${pieces.join("\n\n")}\n`;
}

function cleanGuidedFieldValue(value: string) {
  return value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/^\s*-\s+/gm, "")
    .trim();
}

function guidedFieldRows(value: string) {
  const explicitLines = value.split("\n").length;
  const estimatedWrappedLines = Math.ceil(value.length / 70);
  return Math.min(8, Math.max(2, explicitLines + estimatedWrappedLines));
}

function updateGuidedRoomField(markdown: string, fieldIndex: number, body: string) {
  const parsed = parseGuidedRoomFields(markdown);
  if (!parsed.fields[fieldIndex]) return markdown;

  const nextBody = body.trim() || NEEDS_ANSWER;
  const fields = parsed.fields.map((field, index) => (index === fieldIndex ? { ...field, body: nextBody } : field));
  return formatGuidedRoomFields(parsed.intro, fields);
}

function parseRoomSections(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headingIndexes = lines.reduce<number[]>((indexes, line, index) => {
    if (/^##\s+/.test(line)) indexes.push(index);
    return indexes;
  }, []);

  if (headingIndexes.length === 0) {
    return { intro: markdown, sections: [] };
  }

  const intro = lines.slice(0, headingIndexes[0]).join("\n").trimEnd();
  const sections = headingIndexes.map((headingIndex, index) => {
    const nextHeadingIndex = headingIndexes[index + 1] ?? lines.length;
    const bodyLines = trimBlankEdges(lines.slice(headingIndex + 1, nextHeadingIndex));

    return {
      heading: lines[headingIndex].replace(/^##\s+/, "").trim(),
      body: bodyLines.join("\n"),
    };
  });

  return { intro, sections };
}

function formatRoomSections(intro: string, sections: BeatSection[]) {
  const pieces = [
    intro.trimEnd(),
    ...sections.map((section) => {
      const heading = section.heading.trim() || "Untitled Beat";
      const body = section.body.replace(/\r\n/g, "\n").trimEnd();
      return body ? `## ${heading}\n${body}` : `## ${heading}`;
    }),
  ].filter(Boolean);

  return `${pieces.join("\n\n")}\n`;
}

function updateBeatSection(markdown: string, sectionIndex: number, body: string) {
  const parsed = parseRoomSections(markdown);
  if (!parsed.sections[sectionIndex]) return markdown;

  const sections = parsed.sections.map((section, index) => (index === sectionIndex ? { ...section, body } : section));
  return formatRoomSections(parsed.intro, sections);
}

function renameBeatSection(markdown: string, sectionIndex: number, heading: string) {
  const parsed = parseRoomSections(markdown);
  if (!parsed.sections[sectionIndex]) return markdown;

  const sections = parsed.sections.map((section, index) => (index === sectionIndex ? { ...section, heading } : section));
  return formatRoomSections(parsed.intro, sections);
}

function nextCustomBeatHeading(sections: BeatSection[]) {
  const existingHeadings = new Set(sections.map((section) => section.heading.toLowerCase()));
  let customBeatNumber = 1;

  while (existingHeadings.has(`custom beat ${customBeatNumber}`)) {
    customBeatNumber += 1;
  }

  return `Custom Beat ${customBeatNumber}`;
}

function addCustomBeatSection(markdown: string) {
  const parsed = parseRoomSections(markdown);
  const intro =
    parsed.intro.trim() ||
    "# Beats Room\n\nHybrid default: Customize from scratch. Rename, skip, add, or reorder beats when the story needs it.";
  const heading = nextCustomBeatHeading(parsed.sections);
  const customBeatIndex = parsed.sections.findIndex((section) => section.heading.toLowerCase() === "custom beats");
  const insertIndex = customBeatIndex === -1 ? parsed.sections.length : customBeatIndex;
  const sections = [...parsed.sections];

  sections.splice(insertIndex, 0, {
    heading,
    body: `${NEEDS_ANSWER} What pressure turn belongs here?`,
  });

  return formatRoomSections(intro, sections);
}

const BEAT_NEEDS_MARKER_PATTERN = /^\s*-?\s*\[(?:needs your answer|needs answer|needs writing)\]\s*/i;
const BEAT_PLACEHOLDER_PATTERN = /\[(?:needs your answer|needs answer|needs writing)\]\s*/gi;

const DEFAULT_BEAT_PROMPT_PATTERNS_BY_HEADING: Record<string, RegExp[]> = {
  "opening image": [
    /^Replace this with a specific visual snapshot before pressure hits\.$/i,
    /^Show .+ before pressure exposes .+\.$/i,
  ],
  setup: [/^Establish the world, (?:the )?want\b.*\b(?:lie|cost of staying the same)\b/i],
  "inciting incident": [
    /^What specific event forces the protagonist toward the want\?$/i,
    /^Something forces the protagonist toward\b/i,
    /^An event makes .+ urgent and impossible to ignore\.$/i,
  ],
  "debate / refusal": [
    /^Why they hesitate, dodge, rationalize, or choose badly\.$/i,
    /^a protagonist whose want exposes the wound they keep protecting\b/i,
    /^.+ hesitates because .+ still feels safer than change\.$/i,
  ],
  "act one break": [
    /^What choice locks them into the story\?$/i,
    /^They make a choice that locks them into the story\.$/i,
    /^.+ commits to .+ even though .+ makes the cost real\.$/i,
  ],
  "promise of the premise": [
    /^Which sequence delivers the fun\/terror\/longing promised by the genre\?$/i,
    /^The movie delivers the fun\/terror\/longing promised by\b/i,
    /^Build a sequence that delivers the .+ promise and makes the audience feel .+\.$/i,
  ],
  midpoint: [
    /^What reveal, reversal, or false victory makes the old plan impossible\?$/i,
    /^A reveal, reversal, or false victory makes the old plan impossible\.$/i,
    /^A reveal or reversal proves the old plan for .+ will not survive\.$/i,
  ],
  "bad guys close in": [
    /^How does the opposition tighten the trap\?$/i,
    /^.+ tightens the trap(?: until .+)?\.$/i,
  ],
  "all is lost": [
    /^What moment makes the cost personal, public, moral, or irreversible\?$/i,
    /^The worst version of the cost lands\.$/i,
    /^The cost becomes personal, public, moral, or irreversible\b/i,
    /^Make the cost feel personal, public, moral, or irreversible: .+$/i,
  ],
  "dark night of the soul": [
    /^How does the protagonist confront the lie\?$/i,
    /^The protagonist confronts the lie:/i,
    /^The protagonist faces the lie\b/i,
    /^.+ finally names the damage caused by believing .+\.$/i,
  ],
  "act three break": [
    /^What new choice points toward the ending\?$/i,
    /^They make a new choice\b/i,
    /^A new choice points toward .+$/i,
  ],
  climax: [
    /^What maximum-pressure choice proves who they have become\?$/i,
    /^The maximum-pressure choice\b/i,
    /^The protagonist must choose under maximum pressure\.$/i,
    /^.+ makes the hardest choice and proves what has changed\.$/i,
  ],
  "final image": [
    /^What specific final image answers or twists the opening image\?$/i,
    /^A final image answers or twists the opening image\.$/i,
    /^A visual answer to the opening image\.$/i,
    /^Echo the opening image\b/i,
  ],
  "custom beats": [
    /^Add custom beats\.$/i,
    /^Add, rename, skip, or reorder beats once this spine starts fighting back\.$/i,
  ],
};

function normalizeBeatPrompt(value: string) {
  return value
    .replace(BEAT_NEEDS_MARKER_PATTERN, "")
    .replace(BEAT_PLACEHOLDER_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

function beatUsesDefaultPrompt(section: BeatSection) {
  const body = normalizeBeatPrompt(section.body);
  if (!body) return false;

  const heading = section.heading.trim().toLowerCase();
  const headingPatterns = DEFAULT_BEAT_PROMPT_PATTERNS_BY_HEADING[heading] ?? [];
  return headingPatterns.some((pattern) => pattern.test(body));
}

function beatNeedsAnswer(section: BeatSection) {
  return BEAT_NEEDS_MARKER_PATTERN.test(section.body) || beatUsesDefaultPrompt(section);
}

function beatDisplayBody(body: string) {
  return body.replace(BEAT_NEEDS_MARKER_PATTERN, "").replace(BEAT_PLACEHOLDER_PATTERN, "");
}

function beatNoteRows(body: string) {
  const explicitLines = body.split("\n").length;
  const estimatedWrappedLines = Math.ceil(body.length / 38);
  return Math.min(11, Math.max(4, explicitLines + estimatedWrappedLines));
}

type GuidedRoomEditorProps = {
  firstFieldRef: RefObject<HTMLTextAreaElement | null>;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  project: ScriptBase;
  roomSlug: string;
  title: string;
};

function guidedFieldSuggestionMarkdown(title: string, field: GuidedRoomField, fullMarkdown: string) {
  return [
    `Selected ${title} field: ${field.heading}`,
    `Write the actual content for the ${field.heading} field, specific to THIS script — not a description of what the field is for.`,
    "If the current text below is an instruction or placeholder, fulfill it with specifics drawn from the other rooms; do not paraphrase it.",
    "Suggest exactly one replacement for this field only.",
    `Return one numbered option using this format: 1. ${field.heading}: Replacement text.`,
    "",
    `${"#".repeat(field.level)} ${field.heading}`,
    field.body,
    "",
    "Full script markdown:",
    fullMarkdown,
  ].join("\n");
}

function SuggestionGoblin({ label, state }: { label: string; state?: SuggestionMascotState }) {
  if (!state || state === "idle") return null;

  const isHappy = state === "happy";

  return (
    <span
      aria-label={`Goblin is ${isHappy ? "happy about" : "thinking for"} ${label}`}
      className={`${styles.suggestionGoblin} ${
        isHappy ? styles.suggestionGoblinHappy : styles.suggestionGoblinThinking
      }`}
      role="img"
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 80 70" xmlns="http://www.w3.org/2000/svg">
        <path className={styles.suggestionGoblinEar} d="M18 36 5 28c-4-2-3-8 2-9l18-3Z" />
        <path className={styles.suggestionGoblinEar} d="m62 36 13-8c4-2 3-8-2-9l-18-3Z" />
        <path className={styles.suggestionGoblinHat} d="M22 8h36c6 0 10 4 10 10v10H12V18c0-6 4-10 10-10Z" />
        <path className={styles.suggestionGoblinFace} d="M18 24h44c8 0 14 6 14 14v4c0 10-8 18-18 18H22C12 60 4 52 4 42v-4c0-8 6-14 14-14Z" />
        <path className={styles.suggestionGoblinLine} d={isHappy ? "M22 35c5-5 12-5 17 0m19 0c-5-5-12-5-17 0" : "M23 33c5-3 11-3 16 0m18 0c-5-3-11-3-16 0"} />
        <path className={styles.suggestionGoblinLine} d={isHappy ? "M29 46c7 7 16 7 23 0" : "M33 47c5 2 10 2 15 0"} />
        <g className={styles.suggestionGoblinThinkingArm}>
          <path className={styles.suggestionGoblinLine} d="M61 57c-5-9-10-13-17-12" />
          <circle className={styles.suggestionGoblinHand} cx="43" cy="45" r="3.6" />
        </g>
        <g className={styles.suggestionGoblinHappyArms}>
          <path className={styles.suggestionGoblinLine} d="M19 52 7 40m54 12 12-12" />
          <circle className={styles.suggestionGoblinHand} cx="7" cy="40" r="3.2" />
          <circle className={styles.suggestionGoblinHand} cx="73" cy="40" r="3.2" />
        </g>
        <g className={styles.suggestionGoblinThought}>
          <circle cx="59" cy="12" r="2.4" />
          <circle cx="66" cy="8" r="1.7" />
        </g>
      </svg>
    </span>
  );
}

function GuidedRoomEditor({ firstFieldRef, markdown, onMarkdownChange, project, roomSlug, title }: GuidedRoomEditorProps) {
  const parsedRoom = useMemo(() => parseGuidedRoomFields(markdown), [markdown]);
  const {
    beginSuggestion: beginFieldSuggestion,
    clearSuggestion: clearFieldSuggestion,
    failSuggestion: failFieldSuggestion,
    finishSuggestion: finishFieldSuggestion,
    suggestions: fieldSuggestions,
  } = useSuggestionStates();

  async function suggestField(index: number, field: GuidedRoomField) {
    const mascotCycle = beginFieldSuggestion(index);

    try {
      const fullMarkdown = buildExportMarkdown({ ...project.rooms, [roomSlug]: markdown });
      const response = await fetch("/api/hermes-cowriter", {
        method: "POST",
        headers: cowriterRequestHeaders(),
        body: JSON.stringify({
          mode: "room",
          room: `${title} field ${field.heading}`,
          markdown: guidedFieldSuggestionMarkdown(title, field, fullMarkdown),
        }),
      });
      const data = (await response.json()) as { output?: string; error?: string };

      if (!response.ok) {
        failFieldSuggestion(index, mascotCycle, {
          error: data.error ?? "The field suggestion failed.",
          text: "",
        });
        return;
      }

      const output = data.output ?? "";
      const choice = parseCowriterChoices(output)[0];
      finishFieldSuggestion(index, mascotCycle, {
        error: "",
        text: choice?.text ?? output.trim() ?? "No suggestion came back.",
      });
    } catch (caught) {
      failFieldSuggestion(index, mascotCycle, {
        error: caught instanceof Error ? caught.message : "The field suggestion failed.",
        text: "",
      });
    }
  }

  function applyFieldSuggestion(index: number, suggestionText: string) {
    onMarkdownChange(updateGuidedRoomField(markdown, index, suggestionText));
    clearFieldSuggestion(index);
  }

  return (
    <section aria-label={`${title} questions`} className={styles.parameterPanel}>
      <div className={styles.parameterIntro}>
        <p className={styles.stepMeta}>Working notes</p>
        <h2>Answer the pressure points before the pages start lying.</h2>
      </div>

      {parsedRoom.fields.map((field, index) => {
        const value = cleanGuidedFieldValue(field.body);
        const suggestion = fieldSuggestions[index];

        return (
          <section
            className={`${styles.parameterQuestion} ${field.level === 3 ? styles.guidedSubQuestion : ""}`}
            key={`${field.level}-${field.heading}-${index}`}
          >
            <div className={styles.parameterQuestionCopy}>
              <div className={styles.fieldQuestionHeader}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.suggestionButtonCluster}>
                  <button
                    aria-label={`Goblin Suggest for ${field.heading}`}
                    className={`${styles.fieldSuggestButton} ${styles.goblinSuggestButton} ${
                      suggestion?.isLoading ? styles.goblinSuggestButtonSquashed : ""
                    }`}
                    disabled={suggestion?.isLoading}
                    onClick={() => suggestField(index, field)}
                    type="button"
                  >
                    {suggestion?.isLoading ? "Thinking" : "Goblin Suggest"}
                  </button>
                  <SuggestionGoblin label={field.heading} state={suggestion?.mascotState} />
                </span>
              </div>
              <h3>{field.heading}</h3>
            </div>
            <label className={styles.parameterField}>
              <span>Answer</span>
              <textarea
                aria-label={field.heading}
                onChange={(event) => onMarkdownChange(updateGuidedRoomField(markdown, index, event.target.value))}
                ref={index === 0 ? firstFieldRef : undefined}
                rows={guidedFieldRows(value)}
                value={value}
              />
            </label>
            {suggestion?.error ? <p className={styles.fieldSuggestionError}>{suggestion.error}</p> : null}
            {suggestion?.text ? (
              <div className={styles.fieldSuggestion}>
                <p className={styles.fieldSuggestionText}>{suggestion.text}</p>
                <div className={styles.fieldSuggestionActions}>
                  <button
                    aria-label={`Use suggestion for ${field.heading}`}
                    className={styles.fieldUseSuggestionButton}
                    onClick={() => applyFieldSuggestion(index, suggestion.text)}
                    type="button"
                  >
                    Use suggestion
                  </button>
                  <button
                    aria-label={`Another suggestion for ${field.heading}`}
                    className={`${styles.fieldUseSuggestionButton} ${styles.goblinSuggestButton} ${
                      suggestion.isLoading ? styles.goblinSuggestButtonSquashed : ""
                    }`}
                    disabled={suggestion.isLoading}
                    onClick={() => suggestField(index, field)}
                    type="button"
                  >
                    Another suggestion
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </section>
  );
}

type BeatsCorkBoardProps = {
  firstNoteRef: RefObject<HTMLTextAreaElement | null>;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  project: ScriptBase | null;
};

function BeatsCorkBoard({ firstNoteRef, markdown, onMarkdownChange, project }: BeatsCorkBoardProps) {
  const beatSections = useMemo(() => parseRoomSections(markdown).sections, [markdown]);
  const {
    beginSuggestion: beginBeatSuggestion,
    clearSuggestion: clearBeatSuggestion,
    failSuggestion: failBeatSuggestion,
    finishSuggestion: finishBeatSuggestion,
    suggestions: beatSuggestions,
  } = useSuggestionStates();
  const stickyToneClasses = [styles.beatStickyGold, styles.beatStickyMist, styles.beatStickyLichen];

  async function suggestBeat(index: number, section: BeatSection) {
    const mascotCycle = beginBeatSuggestion(index);

    try {
      const response = await fetch("/api/hermes-cowriter", {
        method: "POST",
        headers: cowriterRequestHeaders(),
        body: JSON.stringify({
          mode: "beat",
          beat: section.heading,
          beatMarkdown: section.body,
          markdown: buildExportMarkdown({ ...(project?.rooms ?? {}), beats: markdown }),
        }),
      });
      const data = (await response.json()) as { output?: string; error?: string };

      if (!response.ok) {
        failBeatSuggestion(index, mascotCycle, {
          error: data.error ?? "The beat suggestion failed.",
          text: "",
        });
        return;
      }

      const output = data.output ?? "";
      const choice = parseCowriterChoices(output)[0];
      finishBeatSuggestion(index, mascotCycle, {
        error: "",
        text: choice?.text ?? output.trim() ?? "No suggestion came back.",
      });
    } catch (caught) {
      failBeatSuggestion(index, mascotCycle, {
        error: caught instanceof Error ? caught.message : "The beat suggestion failed.",
        text: "",
      });
    }
  }

  function addBeat() {
    onMarkdownChange(addCustomBeatSection(markdown));
  }

  function renameBeat(index: number, heading: string) {
    onMarkdownChange(renameBeatSection(markdown, index, heading));
  }

  function updateBeat(index: number, body: string) {
    onMarkdownChange(updateBeatSection(markdown, index, body));
  }

  function applyBeatSuggestion(index: number, suggestionText: string) {
    updateBeat(index, suggestionText);
    clearBeatSuggestion(index);
  }

  return (
    <section aria-label="Beat cork board" className={styles.beatBoardPanel}>
      <div className={styles.beatBoardToolbar}>
        <button aria-label="Add custom beat" className={styles.beatAddButton} onClick={addBeat} type="button">
          + Beat
        </button>
      </div>
      <ol className={styles.beatBoard}>
        {beatSections.map((section, index) => {
          const noteId = `beat-note-${index}`;
          const titleId = `beat-title-${index}`;
          const suggestion = beatSuggestions[index];
          const needsAnswer = beatNeedsAnswer(section);
          const displayedBody = beatDisplayBody(section.body);

          return (
            <li className={styles.beatBoardItem} key={`beat-${index}`}>
              <article
                className={`${styles.beatSticky} ${stickyToneClasses[index % stickyToneClasses.length]} ${
                  needsAnswer ? styles.beatStickyNeedsAnswer : ""
                }`}
              >
                <div className={styles.beatStickyTop}>
                  {needsAnswer ? (
                    <span aria-label={`${section.heading} needs your answer`} className={styles.beatNeedsTag}>
                      Needs your answer
                    </span>
                  ) : null}
                  <span className={styles.suggestionButtonCluster}>
                    <button
                      aria-label={`Goblin Suggest for ${section.heading}`}
                      className={`${styles.beatSuggestButton} ${styles.goblinSuggestButton} ${
                        suggestion?.isLoading ? styles.goblinSuggestButtonSquashed : ""
                      }`}
                      disabled={suggestion?.isLoading}
                      onClick={() => suggestBeat(index, section)}
                      type="button"
                    >
                      {suggestion?.isLoading ? "Thinking" : "Goblin Suggest"}
                    </button>
                    <SuggestionGoblin label={section.heading} state={suggestion?.mascotState} />
                  </span>
                </div>
                <div className={styles.beatStickyHeader}>
                  <label className={styles.beatStickyNumber} htmlFor={titleId}>
                    {String(index + 1).padStart(2, "0")}
                  </label>
                  <input
                    aria-label={`Beat title for ${section.heading}`}
                    className={styles.beatTitleInput}
                    id={titleId}
                    onChange={(event) => renameBeat(index, event.target.value)}
                    value={section.heading}
                  />
                </div>
                <textarea
                  aria-label={`${section.heading} beat`}
                  className={styles.beatStickyTextarea}
                  id={noteId}
                  onChange={(event) => updateBeat(index, event.target.value)}
                  ref={index === 0 ? firstNoteRef : undefined}
                  rows={beatNoteRows(displayedBody)}
                  value={displayedBody}
                />
                {suggestion?.error ? <p className={styles.beatSuggestionError}>{suggestion.error}</p> : null}
                {suggestion?.text ? (
                  <div className={styles.beatSuggestion}>
                    <p className={styles.beatSuggestionText}>{suggestion.text}</p>
                    <div className={styles.beatSuggestionActions}>
                      <button
                        aria-label={`Use suggestion for ${section.heading}`}
                        className={styles.beatUseSuggestionButton}
                        onClick={() => applyBeatSuggestion(index, suggestion.text)}
                        type="button"
                      >
                        Use suggestion
                      </button>
                      <button
                        aria-label={`Another suggestion for ${section.heading}`}
                        className={`${styles.beatUseSuggestionButton} ${styles.goblinSuggestButton} ${
                          suggestion.isLoading ? styles.goblinSuggestButtonSquashed : ""
                        }`}
                        disabled={suggestion.isLoading}
                        onClick={() => suggestBeat(index, section)}
                        type="button"
                      >
                        Another suggestion
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
              {index < beatSections.length - 1 ? (
                <span aria-hidden="true" className={styles.beatConnector} data-testid="beat-connector" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type SceneBoardProps = {
  firstSceneRef: RefObject<HTMLInputElement | null>;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
};

function SceneBoard({ firstSceneRef, markdown, onMarkdownChange }: SceneBoardProps) {
  const sceneCards = useMemo(() => parseSavedSceneCards(markdown), [markdown]);
  const template = useMemo(() => sceneCardTemplate(markdown), [markdown]);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [sceneDraft, setSceneDraft] = useState(template);
  const [draftChanged, setDraftChanged] = useState(false);
  const [draggedSceneIndex, setDraggedSceneIndex] = useState<number | null>(null);
  const activeScene = selectedSceneIndex === null ? template : sceneCards[selectedSceneIndex] ?? template;
  const displayedSceneDraft = draftChanged ? sceneDraft : activeScene;
  const sceneValues = useMemo(() => parseSceneDraftValues(displayedSceneDraft), [displayedSceneDraft]);
  const canSaveScene = draftChanged && displayedSceneDraft.trim().length > 0 && displayedSceneDraft !== activeScene;

  function focusSceneDraft() {
    window.setTimeout(() => firstSceneRef.current?.focus(), 0);
  }

  function startNewScene() {
    setSelectedSceneIndex(null);
    setSceneDraft(template);
    setDraftChanged(false);
    focusSceneDraft();
  }

  function openScene(index: number) {
    setSelectedSceneIndex(index);
    setSceneDraft(sceneCards[index] ?? template);
    setDraftChanged(false);
    focusSceneDraft();
  }

  function saveScene() {
    const cleanedDraft = trimSceneMarkdown(displayedSceneDraft);
    if (!cleanedDraft) return;

    const nextSceneCards =
      selectedSceneIndex === null
        ? [...sceneCards, cleanedDraft]
        : sceneCards.map((card, index) => (index === selectedSceneIndex ? cleanedDraft : card));
    const nextSelectedIndex = selectedSceneIndex ?? nextSceneCards.length - 1;

    onMarkdownChange(formatScenesMarkdown(markdown, nextSceneCards));
    setSelectedSceneIndex(nextSelectedIndex);
    setSceneDraft(cleanedDraft);
    setDraftChanged(false);
    focusSceneDraft();
  }

  function dropScene(toIndex: number) {
    if (draggedSceneIndex === null || draggedSceneIndex === toIndex) return;

    onMarkdownChange(formatScenesMarkdown(markdown, reorderSceneCards(sceneCards, draggedSceneIndex, toIndex)));
    setSelectedSceneIndex((current) =>
      current === null ? null : selectedSceneAfterMove(current, draggedSceneIndex, toIndex),
    );
    setDraggedSceneIndex(null);
  }

  function updateSceneDraft(patch: Partial<SceneDraftValues>) {
    setSceneDraft(formatSceneDraftValues({ ...sceneValues, ...patch }));
    setDraftChanged(true);
  }

  return (
    <section aria-label="Scene cards" className={styles.sceneBoardPanel}>
      <div aria-label="Saved scene cards" className={styles.sceneStrip}>
        <button
          aria-label="Start new scene"
          className={styles.sceneAddTile}
          onClick={startNewScene}
          title="Start new scene"
          type="button"
        >
          +
        </button>

        {sceneCards.map((sceneCard, index) => {
          const summary = sceneSummary(sceneCard);
          const isSelected = selectedSceneIndex === index;

          return (
            <button
              aria-current={isSelected ? "true" : undefined}
              aria-label={`${summary.title}. ${summary.location}. ${summary.characters}`}
              className={`${styles.sceneMiniCard} ${isSelected ? styles.sceneMiniCardActive : ""}`}
              draggable
              key={`${summary.title}-${index}`}
              onClick={() => openScene(index)}
              onDragEnd={() => setDraggedSceneIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggedSceneIndex(index)}
              onDrop={() => dropScene(index)}
              title="Drag to reorder"
              type="button"
            >
              <span className={styles.sceneMiniNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.sceneMiniTitle}>{summary.title}</span>
              <span className={styles.sceneMiniMeta}>{summary.location}</span>
              <span className={styles.sceneMiniMeta}>{summary.characters}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.sceneDraftPanel}>
        <div className={styles.sceneDraftHeader}>
          <p className={styles.sceneDraftKicker}>{selectedSceneIndex === null ? "New scene draft" : "Selected scene"}</p>
          {canSaveScene ? (
            <button className={styles.primaryButton} onClick={saveScene} type="button">
              Save scene
            </button>
          ) : null}
        </div>
        <section aria-label="Scene card questions" className={styles.sceneQuestionPanel}>
          <label className={styles.parameterField}>
            <span>Scene title</span>
            <input
              aria-label="Scene title"
              onChange={(event) => updateSceneDraft({ title: event.target.value })}
              placeholder="Tryout Opens"
              ref={firstSceneRef}
              value={sceneValues.title}
            />
          </label>
          <label className={styles.parameterField}>
            <span>Location / time</span>
            <input
              aria-label="Location / time"
              onChange={(event) => updateSceneDraft({ locationTime: event.target.value })}
              placeholder="EXT. SANDLOT - DAY"
              value={sceneValues.locationTime}
            />
          </label>
          <label className={styles.parameterField}>
            <span>Characters</span>
            <textarea
              aria-label="Characters"
              onChange={(event) => updateSceneDraft({ characters: event.target.value })}
              placeholder="Rafa, Coach Bell"
              value={sceneValues.characters}
            />
          </label>
          <label className={styles.parameterField}>
            <span>Scene want</span>
            <textarea
              aria-label="Scene want"
              onChange={(event) => updateSceneDraft({ sceneWant: event.target.value })}
              placeholder="What does the active character want right now?"
              value={sceneValues.sceneWant}
            />
          </label>
          <label className={styles.parameterField}>
            <span>Opposition</span>
            <textarea
              aria-label="Opposition"
              onChange={(event) => updateSceneDraft({ opposition: event.target.value })}
              placeholder="What blocks them?"
              value={sceneValues.opposition}
            />
          </label>
          <label className={styles.parameterField}>
            <span>Turn</span>
            <textarea
              aria-label="Turn"
              onChange={(event) => updateSceneDraft({ turn: event.target.value })}
              placeholder="What changes by the end?"
              value={sceneValues.turn}
            />
          </label>
          <label className={styles.parameterField}>
            <span>Button</span>
            <textarea
              aria-label="Button"
              onChange={(event) => updateSceneDraft({ button: event.target.value })}
              placeholder="Last image, line, or action."
              value={sceneValues.button}
            />
          </label>
          <label className={styles.parameterField}>
            <span>Purpose</span>
            <input
              aria-label="Purpose"
              onChange={(event) => updateSceneDraft({ purpose: event.target.value })}
              placeholder="Plot / character / theme / tension"
              value={sceneValues.purpose}
            />
          </label>
        </section>
      </div>
    </section>
  );
}

const LENGTH_FORMATS = ["Short film", "Feature film", "Really long feature"] as const;
type LengthFormat = (typeof LENGTH_FORMATS)[number];
const LENGTH_FORMAT_PAGE_TARGETS: Record<LengthFormat, number> = {
  "Short film": 15,
  "Feature film": 100,
  "Really long feature": 135,
};
const STRUCTURE_MODES = ["Classic 3-act spine", "Loose beat map", "Customize from scratch"];
const PACING_BIASES = ["Lean and fast", "Slow-burn", "Chaptered", "Ensemble", "Contained thriller"];
const SCENE_LENGTHS = ["Short and punchy", "Talky and patient", "Mixed"];
const DIALOGUE_DENSITIES = ["Sparse", "Naturalistic", "Heightened", "Joke-dense", "Poetic"];
const VOICEOVER_RULES = ["No voiceover", "Allowed if useful", "Required"];
const RATINGS = ["G", "PG", "PG-13", "R", "NC-17"];
const BUDGET_REALITIES = ["Cheap", "Medium", "Expensive", "Animated", "Impossible dream"];
const SCENE_ACCESS_OPTIONS = ["Stay close", "Mostly close", "Allow scenes without protagonist"];

function cleanParameterValue(value: string) {
  const cleaned = value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    /^(choose|name whether|allowed only|list anything|how many|contained,|what era|cheap,|whose experience|can scenes happen)/i.test(
      cleaned,
    )
  ) {
    return "";
  }

  return cleaned.replace(/[.!?]+$/, "");
}

function lineParameter(markdown: string, label: string) {
  const match = new RegExp(`^${escapeRegExp(label)}:\\s*(.*)$`, "im").exec(markdown);
  return cleanParameterValue(match?.[1] ?? "");
}

function numberParameter(markdown: string, label: string, fallback: number) {
  const value = Number(new RegExp(`^${escapeRegExp(label)}:\\s*(\\d+)`, "im").exec(markdown)?.[1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function markdownValue(value: string) {
  const cleaned = value.trim().replace(/[.!?]+$/, "");
  return cleaned ? `${cleaned}.` : NEEDS_ANSWER;
}

function parseScriptParameters(markdown: string): ScriptParameterValues {
  return {
    audienceFeeling: lineParameter(markdown, "Audience feeling"),
    budgetReality: lineParameter(markdown, "Budget reality"),
    castSize: numberParameter(markdown, "Cast size", 6),
    dialogueDensity: lineParameter(markdown, "Dialogue density"),
    format: lineParameter(markdown, "Format") || "Standard spec screenplay format",
    genre: lineParameter(markdown, "Current genre"),
    lengthFormat: lineParameter(markdown, "Length format"),
    locationLimits: lineParameter(markdown, "Location limits"),
    noGoContent: lineParameter(markdown, "No-go content"),
    pacingBias: lineParameter(markdown, "Pacing bias"),
    primaryPov: lineParameter(markdown, "Primary POV"),
    rating: lineParameter(markdown, "Target rating"),
    sceneAccess: lineParameter(markdown, "Scene access"),
    sceneLength: lineParameter(markdown, "Scene length rule"),
    structureMode: lineParameter(markdown, "Structure mode"),
    targetPages:
      numberParameter(markdown, "Target page count", 0) || numberParameter(markdown, "Exact page count", 100),
    timePeriod: lineParameter(markdown, "Time period / setting rules"),
    toneWords: lineParameter(markdown, "Tone words"),
    voiceover: lineParameter(markdown, "Voiceover / narration"),
  };
}

function formatScriptParameters(values: ScriptParameterValues) {
  return `# Script Parameters Room

These are the rules an AI draft must obey when it generates screenplay pages from the other rooms.

## Runtime / page target
Length format: ${markdownValue(values.lengthFormat)}
Target page count: ${values.targetPages} pages.
Screen time guess: roughly ${values.targetPages} minutes.

## Genre / movie promise
Current genre: ${markdownValue(values.genre)}
Audience feeling: ${markdownValue(values.audienceFeeling)}
Tone words: ${markdownValue(values.toneWords)}

## Structure and pacing
Structure mode: ${markdownValue(values.structureMode)}
Pacing bias: ${markdownValue(values.pacingBias)}
Scene length rule: ${markdownValue(values.sceneLength)}

## Format rules
Format: ${markdownValue(values.format)}
Dialogue density: ${markdownValue(values.dialogueDensity)}
Voiceover / narration: ${markdownValue(values.voiceover)}

## Rating and boundaries
Target rating: ${markdownValue(values.rating)}
No-go content: ${markdownValue(values.noGoContent)}

## Production constraints
Cast size: ${values.castSize} major speaking roles.
Location limits: ${markdownValue(values.locationLimits)}
Time period / setting rules: ${markdownValue(values.timePeriod)}
Budget reality: ${markdownValue(values.budgetReality)}

## Point of view
Primary POV: ${markdownValue(values.primaryPov)}
Scene access: ${markdownValue(values.sceneAccess)}

## AI drafting rules
Treat these as strict rules when generating script pages.
- Use the other rooms as source material, but do not contradict this room.
- Do not silently rewrite premise, character arc, theme, beats, or scenes to make drafting easier.
- If a required parameter is missing, ask a follow-up question instead of inventing a major constraint.
- One screenplay page roughly equals one minute of screen time unless this room says otherwise.
`;
}

type ScriptParametersEditorProps = {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
};

function ScriptParametersEditor({ markdown, onMarkdownChange }: ScriptParametersEditorProps) {
  const values = useMemo(() => parseScriptParameters(markdown), [markdown]);

  function updateParameters(patch: Partial<ScriptParameterValues>) {
    onMarkdownChange(formatScriptParameters({ ...values, ...patch }));
  }

  function choiceButtons(field: keyof ScriptParameterValues, options: string[]) {
    const selectedValue = values[field];
    return (
      <div className={styles.parameterPills}>
        {options.map((option) => (
          <button
            aria-pressed={selectedValue === option}
            className={`${styles.parameterPill} ${selectedValue === option ? styles.parameterPillSelected : ""}`}
            key={option}
            onClick={() => updateParameters({ [field]: option })}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  function choiceButtonGroup(label: string, field: keyof ScriptParameterValues, options: string[]) {
    return (
      <fieldset className={styles.parameterChoiceGroup}>
        <legend className={styles.parameterChoiceLabel}>{label}</legend>
        {choiceButtons(field, options)}
      </fieldset>
    );
  }

  function lengthFormatButtons() {
    return (
      <div className={styles.parameterPills}>
        {LENGTH_FORMATS.map((option) => (
          <button
            aria-pressed={values.lengthFormat === option}
            className={`${styles.parameterPill} ${values.lengthFormat === option ? styles.parameterPillSelected : ""}`}
            key={option}
            onClick={() =>
              updateParameters({
                lengthFormat: option,
                targetPages: LENGTH_FORMAT_PAGE_TARGETS[option],
              })
            }
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Script parameter questions" className={styles.parameterPanel}>
      <div className={styles.parameterIntro}>
        <p className={styles.stepMeta}>Draft contract</p>
        <h2>Tell the future script what rules it has to obey.</h2>
        <p>These answers are saved into the room markdown for export and AI context, but you do not have to edit the file by hand.</p>
      </div>

      <section className={styles.parameterQuestion}>
        <div className={styles.parameterQuestionCopy}>
          <span>01</span>
          <h3>How long is this thing?</h3>
          <p>Pick the movie size, then tune the page target. One page is roughly one minute.</p>
        </div>
        {lengthFormatButtons()}
        <label className={styles.parameterSlider}>
          <span>Target page count</span>
          <strong>{values.targetPages} pages</strong>
          <input
            aria-label="Target page count"
            max="180"
            min="1"
            onChange={(event) => updateParameters({ targetPages: Number(event.target.value) })}
            type="range"
            value={values.targetPages}
          />
        </label>
      </section>

      <section className={styles.parameterQuestion}>
        <div className={styles.parameterQuestionCopy}>
          <span>02</span>
          <h3>What promise is the audience buying?</h3>
          <p>Genre and tone are the guardrails. This is where the AI learns what kind of movie not to betray.</p>
        </div>
        <label className={styles.parameterField}>
          <span>Genre / movie promise</span>
          <input
            onChange={(event) => updateParameters({ genre: event.target.value })}
            placeholder="Sports comedy, horror romance, contained thriller..."
            value={values.genre}
          />
        </label>
        <label className={styles.parameterField}>
          <span>Audience feeling</span>
          <input
            onChange={(event) => updateParameters({ audienceFeeling: event.target.value })}
            placeholder="Hopeful and tense"
            value={values.audienceFeeling}
          />
        </label>
        <label className={styles.parameterField}>
          <span>Tone words</span>
          <input
            onChange={(event) => updateParameters({ toneWords: event.target.value })}
            placeholder="Warm, mean-funny, eerie, grounded..."
            value={values.toneWords}
          />
        </label>
      </section>

      <section className={styles.parameterQuestion}>
        <div className={styles.parameterQuestionCopy}>
          <span>03</span>
          <h3>How should the pages move?</h3>
          <p>Structure and scene rhythm keep the draft from wandering into a swamp.</p>
        </div>
        {choiceButtons("structureMode", STRUCTURE_MODES)}
        {choiceButtons("pacingBias", PACING_BIASES)}
        {choiceButtons("sceneLength", SCENE_LENGTHS)}
      </section>

      <section className={styles.parameterQuestion}>
        <div className={styles.parameterQuestionCopy}>
          <span>04</span>
          <h3>What should the page style obey?</h3>
          <p>Format, dialogue density, and narration rules keep the draft from changing lanes mid-script.</p>
        </div>
        <label className={styles.parameterField}>
          <span>Screenplay format</span>
          <input
            onChange={(event) => updateParameters({ format: event.target.value })}
            placeholder="Standard spec screenplay format"
            value={values.format}
          />
        </label>
        {choiceButtonGroup("Dialogue density", "dialogueDensity", DIALOGUE_DENSITIES)}
        {choiceButtonGroup("Voiceover / narration", "voiceover", VOICEOVER_RULES)}
      </section>

      <section className={styles.parameterQuestion}>
        <div className={styles.parameterQuestionCopy}>
          <span>05</span>
          <h3>What can the script actually show?</h3>
          <p>Rating, budget, cast, and locations stop the AI from inventing a spaceship finale unless you asked for one.</p>
        </div>
        {choiceButtons("rating", RATINGS)}
        <label className={styles.parameterSlider}>
          <span>Major speaking roles</span>
          <strong>{values.castSize}</strong>
          <input
            aria-label="Major speaking roles"
            max="30"
            min="1"
            onChange={(event) => updateParameters({ castSize: Number(event.target.value) })}
            type="range"
            value={values.castSize}
          />
        </label>
        {choiceButtons("budgetReality", BUDGET_REALITIES)}
        <label className={styles.parameterField}>
          <span>Location limits</span>
          <input
            onChange={(event) => updateParameters({ locationLimits: event.target.value })}
            placeholder="One diner, three city blocks, road movie..."
            value={values.locationLimits}
          />
        </label>
        <label className={styles.parameterField}>
          <span>Time period / setting rules</span>
          <input
            onChange={(event) => updateParameters({ timePeriod: event.target.value })}
            placeholder="Modern day, 1998, no phones, rural Texas..."
            value={values.timePeriod}
          />
        </label>
        <label className={styles.parameterField}>
          <span>No-go content</span>
          <textarea
            onChange={(event) => updateParameters({ noGoContent: event.target.value })}
            placeholder="Anything the AI should avoid inventing or showing."
            value={values.noGoContent}
          />
        </label>
      </section>

      <section className={styles.parameterQuestion}>
        <div className={styles.parameterQuestionCopy}>
          <span>06</span>
          <h3>Who owns the camera?</h3>
          <p>POV rules tell the draft whose experience matters and when scenes can leave them.</p>
        </div>
        <label className={styles.parameterField}>
          <span>Primary POV</span>
          <input
            onChange={(event) => updateParameters({ primaryPov: event.target.value })}
            placeholder="The protagonist, alternating leads, ensemble..."
            value={values.primaryPov}
          />
        </label>
        {choiceButtons("sceneAccess", SCENE_ACCESS_OPTIONS)}
      </section>
    </section>
  );
}

export function RoomEditorClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const room = useMemo(() => storyRooms.find((candidate) => candidate.slug === slug), [slug]);
  const [project, setProject] = useState<ScriptBase | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const firstGuidedRoomFieldRef = useRef<HTMLTextAreaElement>(null);
  const firstBeatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sceneTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = ensureProject();
      setProject(loaded);
      setMarkdown(loaded.rooms[slug] ?? `# ${room?.title ?? "Unknown"} Room\n\n${NEEDS_ANSWER}\n`);
      setSavedAt(loaded.updatedAt);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [room?.title, slug]);

  useEffect(() => {
    if (!project || !room) return;
    const timer = window.setTimeout(() => {
      const updatedProject: ScriptBase = {
        ...project,
        rooms: { ...project.rooms, [slug]: markdown },
        updatedAt: new Date().toISOString(),
      };
      saveProject(updatedProject);
      setProject(updatedProject);
      setSavedAt(updatedProject.updatedAt);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [markdown, project, room, slug]);

  if (!room) {
    return (
      <section className={styles.editorPanel}>
        <h1>The goblin cannot find that room.</h1>
        <Link className={styles.primaryButton} href="/rooms">
          Back to rooms
        </Link>
      </section>
    );
  }

  if (!project) {
    return (
      <section className={styles.editorPanel}>
        <p className={styles.stepMeta}>{room.markdownFile}</p>
        <h1>{room.title}</h1>
        <p className={styles.lede}>Loading the room board...</p>
      </section>
    );
  }

  return (
    <section className={styles.editorPanel}>
      <p className={styles.stepMeta}>{room.markdownFile}</p>
      <h1>{room.title}</h1>
      <p className={styles.lede}>{room.purpose}</p>

      <div className={styles.editorGrid}>
        <div>
          {room.slug === "beats" ? (
            <BeatsCorkBoard
              firstNoteRef={firstBeatTextareaRef}
              markdown={markdown}
              onMarkdownChange={setMarkdown}
              project={project}
            />
          ) : room.slug === "scenes" ? (
            <SceneBoard firstSceneRef={sceneTitleRef} markdown={markdown} onMarkdownChange={setMarkdown} />
          ) : room.slug === "script-parameters" ? (
            <ScriptParametersEditor markdown={markdown} onMarkdownChange={setMarkdown} />
          ) : GUIDED_ROOM_SLUGS.has(room.slug) ? (
            <GuidedRoomEditor
              firstFieldRef={firstGuidedRoomFieldRef}
              markdown={markdown}
              onMarkdownChange={setMarkdown}
              project={project}
              roomSlug={room.slug}
              title={room.title}
            />
          ) : (
            <textarea
              aria-label={`${room.title} markdown`}
              className={styles.editorTextarea}
              onChange={(event) => setMarkdown(event.target.value)}
              value={markdown}
            />
          )}
          <p className={styles.savedLine}>Autosaved locally{savedAt ? ` · ${new Date(savedAt).toLocaleTimeString()}` : ""}. Export from the rooms dashboard.</p>
        </div>

        <aside className={styles.guidanceBox}>
          <h2>Goblin guidance</h2>
          <p className={styles.nudge}>{room.guidingQuestion}</p>
          <ul>
            {room.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
          <div className={styles.actionRow}>
            <Link className={styles.secondaryButton} href="/rooms">
              Back to rooms
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
