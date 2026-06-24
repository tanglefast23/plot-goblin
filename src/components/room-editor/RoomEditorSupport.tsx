import { useEffect, useRef, useState } from "react";
import styles from "@/app/workspace.module.css";
import { cowriterRequestHeaders } from "@/lib/cowriterAccess";
import { type CowriterChoice } from "@/lib/cowriterChoices";
import { NEEDS_ANSWER, NEEDS_WRITING, type SetupAnswers } from "@/lib/guidedSetup";

export type BeatSection = {
  heading: string;
  body: string;
};

export type SuggestionState = {
  error: string;
  isLoading: boolean;
  mascotCycle: number;
  mascotState: SuggestionMascotState;
  text: string;
};

export type SuggestionMascotState = "idle" | "thinking" | "happy";

export type SceneSummary = {
  title: string;
  location: string;
  characters: string;
};

export type GuidedRoomField = {
  body: string;
  heading: string;
  level: 2 | 3;
};

export type SceneDraftValues = {
  button: string;
  characters: string;
  locationTime: string;
  opposition: string;
  purpose: string;
  sceneWant: string;
  title: string;
  turn: string;
};

export const DEFAULT_SCENE_DRAFT_PLACEHOLDERS: SceneDraftValues = {
  button: "Last image, line, or action.",
  characters: "Rafa, Coach Bell",
  locationTime: "EXT. SANDLOT - DAY",
  opposition: "What blocks them?",
  purpose: "Plot / character / theme / tension / setup / payoff",
  sceneWant: "What does the active character want right now?",
  title: "Tryout Opens",
  turn: "What changes by the end?",
};

export type ScriptParameterValues = {
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

export const SCENE_TEMPLATE_HEADING = "## Scene card template";
export const SAVED_SCENES_HEADING = "## Saved scenes";
export const SCENE_LIST_HEADING = "## Scene list";
export const GUIDED_ROOM_SLUGS = new Set(["premise", "characters", "theme"]);
export const SUGGESTION_GOBLIN_POP_MS = 1900;
export { cowriterRequestHeaders };

export const draftWaitingMessageDelayMs = 8000;

export const draftWaitingMessages = [
  "Goblin is writing",
  "Please wait. The goblin is bribing the commas",
  "Tiny quill tantrum. Five more seconds",
  "Hold please. Act Two is arguing",
  "Do not refresh. The verbs are being sharpened",
  "Almost there. A subplot is being cornered",
  "The midpoint is refusing to make eye contact",
  "A side character just demanded snacks",
  "The third act is looking for its shoes",
  "Plot holes are being lightly threatened",
  "The protagonist is practicing wanting something visible",
  "The antagonist has requested better lighting",
  "One theme is being lured into the room",
  "The draft is chewing with its mouth closed",
  "A scene heading is putting on pants",
  "The stakes are being made less decorative",
  "A joke has entered committee review",
  "The emotional arc is doing stretches",
  "Someone found a motive under the couch",
  "The cold open is pretending not to panic",
  "A weak verb has been escorted outside",
  "The screenplay is asking for one responsible adult",
  "Three commas have formed a union",
  "The ending is being bribed with snacks",
  "A dramatic question is blinking into existence",
  "Emergency semicolon meeting in progress",
];

export function randomDraftWaitingMessageIndex(currentIndex: number, randomValue = Math.random()) {
  if (draftWaitingMessages.length <= 1) return 0;

  const candidateIndex = Math.floor(randomValue * (draftWaitingMessages.length - 1));
  return candidateIndex >= currentIndex ? candidateIndex + 1 : candidateIndex;
}

export const DEFAULT_SCENE_CARD = `### Scene: [Short title]

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

export type AudioContextFactory = new () => AudioContext;
export type BrowserAudioWindow = Window & typeof globalThis & { AudioContext?: AudioContextFactory; webkitAudioContext?: AudioContextFactory };

export function createGoblinPopAudioContext() {
  if (typeof window === "undefined") return null;
  const audioWindow = window as BrowserAudioWindow;
  const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;

  return new AudioContextCtor();
}

export function playGoblinSquashSound() {
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

export function defaultSuggestionState(): SuggestionState {
  return {
    error: "",
    isLoading: false,
    mascotCycle: 0,
    mascotState: "idle",
    text: "",
  };
}

export function useSuggestionStates() {
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

export function trimBlankEdges(lines: string[]) {
  const trimmed = [...lines];
  while (trimmed[0]?.trim() === "") trimmed.shift();
  while (trimmed.at(-1)?.trim() === "") trimmed.pop();
  return trimmed;
}

export function trimSceneMarkdown(markdown: string) {
  let lines = trimBlankEdges(markdown.replace(/\r\n/g, "\n").split("\n"));

  while (lines[0]?.trim() === "---") {
    lines = trimBlankEdges(lines.slice(1));
  }

  while (lines.at(-1)?.trim() === "---") {
    lines = trimBlankEdges(lines.slice(0, -1));
  }

  return lines.join("\n");
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sectionBody(markdown: string, heading: string) {
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

export function sceneDocumentIntro(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const firstSectionIndex = lines.findIndex((line) =>
    [SCENE_TEMPLATE_HEADING, SAVED_SCENES_HEADING, SCENE_LIST_HEADING].includes(line.trim()),
  );
  const intro =
    firstSectionIndex === -1 ? markdown.replace(/\r\n/g, "\n").trimEnd() : lines.slice(0, firstSectionIndex).join("\n").trimEnd();

  return intro || "# Scenes Room";
}

export function sceneCardTemplate(markdown: string) {
  return sectionBody(markdown, SCENE_TEMPLATE_HEADING) || DEFAULT_SCENE_CARD;
}

export function parseSavedSceneCards(markdown: string) {
  const body = sectionBody(markdown, SAVED_SCENES_HEADING);
  if (!body) return [];

  return body
    .split(/(?=^###\s+Scene:)/m)
    .map(trimSceneMarkdown)
    .filter((card) => /^###\s+Scene:/m.test(card));
}

export function cleanSceneValue(value: string) {
  return value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanSceneDraftValue(value: string) {
  return value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function editableSceneDraftValue(value: string) {
  return value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

export function sceneField(markdown: string, label: string) {
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

export function sceneDraftField(markdown: string, label: string) {
  const match = new RegExp(`^\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.*)$`, "im").exec(markdown);
  if (!match) return "";
  if (match[1]?.trim()) return editableSceneDraftValue(match[1]);

  const afterField = markdown.slice(match.index + match[0].length).replace(/^\n/, "").split("\n");
  const fieldLines: string[] = [];

  for (const line of afterField) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (fieldLines.length > 0) break;
      continue;
    }

    if (/^(\*\*[^*]+:\*\*|#{1,6}\s+|---)/.test(trimmed)) break;
    fieldLines.push(line);
  }

  return editableSceneDraftValue(fieldLines.join("\n"));
}

export function sceneSummary(markdown: string): SceneSummary {
  const title = cleanSceneValue(/^###\s+Scene:\s*(.+)$/m.exec(markdown)?.[1] ?? "");

  return {
    title: title && title !== "[Short title]" ? title : "Untitled scene",
    location: sceneField(markdown, "Location / time") || "Location TBD",
    characters: sceneField(markdown, "Characters") || "Characters TBD",
  };
}

export function cleanSceneDraftTitle(value: string) {
  const cleaned = editableSceneDraftValue(value);
  return cleaned.trim() === "[Short title]" ? "" : cleaned;
}

export function sceneDraftFieldIsHelper(label: keyof SceneDraftValues, value: string) {
  const cleaned = cleanSceneDraftValue(value);
  if (!cleaned) return false;

  switch (label) {
    case "button":
      return /^(?:what is the last image|end on an image)/i.test(cleaned);
    case "characters":
      return /^(?:who is in (?:this beat's |the )?scene|a protagonist whose want exposes the wound they keep protecting, plus whoever can apply the most pressure)/i.test(
        cleaned,
      );
    case "locationTime":
      return /^INT\.\/EXT\. PLACE - DAY\/NIGHT$/i.test(cleaned);
    case "opposition":
      return /^(?:what blocks|a force with a good reason to stop them|.+ blocks the scene goal or makes the cost sharper)/i.test(
        cleaned,
      );
    case "purpose":
      return /^Plot \/ character \/ theme \/ tension \/ setup \/ payoff$/i.test(cleaned);
    case "sceneWant":
      return /^(?:what does the active character want|make the scene want concrete from this beat:|a protagonist whose want exposes the wound they keep protecting wants a concrete step|.+ wants a concrete step toward)/i.test(
        cleaned,
      );
    case "title":
      return cleaned === "[Short title]";
    case "turn":
      return /^(?:what changes by the end|by the end, this beat has changed:|by the end, power, emotion, or the plan shifts)/i.test(
        cleaned,
      );
    default:
      return false;
  }
}

export function sceneDraftValue(label: keyof SceneDraftValues, value: string) {
  return sceneDraftFieldIsHelper(label, value) ? "" : value;
}

export function sceneDraftPlaceholder(label: keyof SceneDraftValues, value: string) {
  return sceneDraftFieldIsHelper(label, value) ? value : DEFAULT_SCENE_DRAFT_PLACEHOLDERS[label];
}

export function parseSceneDraftValues(markdown: string): SceneDraftValues {
  const button = sceneDraftField(markdown, "Button");
  const characters = sceneDraftField(markdown, "Characters");
  const locationTime = sceneDraftField(markdown, "Location / time");
  const opposition = sceneDraftField(markdown, "Opposition");
  const purpose = sceneDraftField(markdown, "Purpose");
  const sceneWant = sceneDraftField(markdown, "Scene want");
  const title = cleanSceneDraftTitle(/^###\s+Scene:\s*(.+)$/m.exec(markdown)?.[1] ?? "");
  const turn = sceneDraftField(markdown, "Turn");

  return {
    button: sceneDraftValue("button", button),
    characters: sceneDraftValue("characters", characters),
    locationTime: sceneDraftValue("locationTime", locationTime),
    opposition: sceneDraftValue("opposition", opposition),
    purpose: sceneDraftValue("purpose", purpose),
    sceneWant: sceneDraftValue("sceneWant", sceneWant),
    title: sceneDraftValue("title", title),
    turn: sceneDraftValue("turn", turn),
  };
}

export function parseSceneDraftPlaceholders(markdown: string): SceneDraftValues {
  const button = sceneDraftField(markdown, "Button");
  const characters = sceneDraftField(markdown, "Characters");
  const locationTime = sceneDraftField(markdown, "Location / time");
  const opposition = sceneDraftField(markdown, "Opposition");
  const purpose = sceneDraftField(markdown, "Purpose");
  const sceneWant = sceneDraftField(markdown, "Scene want");
  const title = cleanSceneDraftTitle(/^###\s+Scene:\s*(.+)$/m.exec(markdown)?.[1] ?? "");
  const turn = sceneDraftField(markdown, "Turn");

  return {
    button: sceneDraftPlaceholder("button", button),
    characters: sceneDraftPlaceholder("characters", characters),
    locationTime: sceneDraftPlaceholder("locationTime", locationTime),
    opposition: sceneDraftPlaceholder("opposition", opposition),
    purpose: sceneDraftPlaceholder("purpose", purpose),
    sceneWant: sceneDraftPlaceholder("sceneWant", sceneWant),
    title: sceneDraftPlaceholder("title", title),
    turn: sceneDraftPlaceholder("turn", turn),
  };
}

export function sceneDraftBlock(value: string, fallback: string) {
  return value.trim() ? value : `${NEEDS_WRITING} ${fallback}`;
}

export function sceneDraftInline(value: string, fallback: string) {
  return value.trim() ? value : fallback;
}

export function formatSceneDraftValues(values: SceneDraftValues) {
  return `### Scene: ${values.title.trim() ? values.title : "[Short title]"}

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

export function sceneListMarkdown(sceneCards: string[]) {
  if (sceneCards.length === 0) return `- ${NEEDS_WRITING}`;
  return sceneCards.map((card) => `- ${sceneSummary(card).title}`).join("\n");
}

export function formatScenesMarkdown(markdown: string, sceneCards: string[]) {
  const pieces = [
    sceneDocumentIntro(markdown),
    `${SCENE_TEMPLATE_HEADING}\n\n${sceneCardTemplate(markdown)}`,
    sceneCards.length > 0 ? `${SAVED_SCENES_HEADING}\n\n${sceneCards.map(trimSceneMarkdown).join("\n\n---\n\n")}` : "",
    `${SCENE_LIST_HEADING}\n${sceneListMarkdown(sceneCards)}`,
  ].filter(Boolean);

  return `${pieces.join("\n\n")}\n`;
}

export function numberedSceneList(sceneCards: string[]) {
  return sceneCards
    .map((card, index) => {
      const summary = sceneSummary(card);
      return `${index + 1}. ${summary.title} — ${summary.location}`;
    })
    .join("\n");
}

export function parseSuggestedPlacement(output: string, sceneCount: number) {
  const clamp = (value: number) => Math.max(0, Math.min(sceneCount, value));
  const line = /placement[^\n]*/i.exec(output)?.[0] ?? "";

  if (/\b(start|beginning|top|opening|very first)\b/i.test(line)) return 0;

  const before = /before\s+scene\s*#?\s*(\d+)/i.exec(line);
  if (before) return clamp(Number(before[1]) - 1);

  const after = /(?:after\s+scene|scene)\s*#?\s*(\d+)/i.exec(line);
  if (after) return clamp(Number(after[1]));

  return sceneCount;
}

export function reorderSceneCards(sceneCards: string[], fromIndex: number, toIndex: number) {
  const reordered = [...sceneCards];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

export function selectedSceneAfterMove(selectedIndex: number, fromIndex: number, toIndex: number) {
  if (selectedIndex === fromIndex) return toIndex;
  if (fromIndex < toIndex && selectedIndex > fromIndex && selectedIndex <= toIndex) return selectedIndex - 1;
  if (fromIndex > toIndex && selectedIndex >= toIndex && selectedIndex < fromIndex) return selectedIndex + 1;
  return selectedIndex;
}

export function parseGuidedRoomFields(markdown: string) {
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

export function formatGuidedRoomFields(intro: string, fields: GuidedRoomField[]) {
  const pieces = [
    intro.trimEnd(),
    ...fields.map((field) => {
      const heading = field.heading.trim() || "Untitled question";
      const body = field.body.replace(/\r\n/g, "\n");
      return body ? `${"#".repeat(field.level)} ${heading}\n${body}` : `${"#".repeat(field.level)} ${heading}`;
    }),
  ].filter(Boolean);

  return `${pieces.join("\n\n")}\n`;
}

export function cleanGuidedFieldValue(value: string) {
  return value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/^\s*-\s+/gm, "")
    .trim();
}

export function editableGuidedFieldValue(value: string) {
  return value
    .replace(/\[(?:needs your answer|needs answer|needs writing)\]\s*/gi, "")
    .replace(/^\s*-\s+/gm, "");
}

export function isGuidedFieldHelper(value: string) {
  return /^\s*-?\s*\[(?:needs your answer|needs answer|needs writing)\]/i.test(value);
}

function normalizeGuidedContent(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' -]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guidedFieldHasSetupAnswerSignal(value: string, answers: SetupAnswers) {
  const normalizedValue = normalizeGuidedContent(value);
  if (!normalizedValue) return false;

  return Object.values(answers).some((answer) => {
    const normalizedAnswer = normalizeGuidedContent(answer ?? "");
    return normalizedAnswer.length >= 4 && normalizedValue.includes(normalizedAnswer);
  });
}

export function guidedFieldLooksLikeInstruction(value: string) {
  const cleaned = cleanGuidedFieldValue(value);
  return /^(?:add|choose|create|describe|establish|force|how|let|list|make|name|put|replace|show|start:|end:|what|when should|where|which|who|why|write)\b/i.test(
    cleaned,
  );
}

export function guidedFieldUsesPlaceholder(value: string, answers: SetupAnswers) {
  if (!isGuidedFieldHelper(value)) return false;
  const cleaned = cleanGuidedFieldValue(value);
  if (!cleaned) return true;
  if (guidedFieldLooksLikeInstruction(cleaned)) return true;
  return !guidedFieldHasSetupAnswerSignal(cleaned, answers);
}

export function guidedFieldRows(value: string) {
  const explicitLines = value.split("\n").length;
  const estimatedWrappedLines = Math.ceil(value.length / 70);
  return Math.min(8, Math.max(2, explicitLines + estimatedWrappedLines));
}

export function updateGuidedRoomField(markdown: string, fieldIndex: number, body: string) {
  const parsed = parseGuidedRoomFields(markdown);
  if (!parsed.fields[fieldIndex]) return markdown;

  const nextBody = body.trim() ? body : NEEDS_ANSWER;
  const fields = parsed.fields.map((field, index) => (index === fieldIndex ? { ...field, body: nextBody } : field));
  return formatGuidedRoomFields(parsed.intro, fields);
}

export function parseRoomSections(markdown: string) {
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

export function formatRoomSections(intro: string, sections: BeatSection[]) {
  const pieces = [
    intro.trimEnd(),
    ...sections.map((section) => {
      const heading = section.heading.trim() || "Untitled Beat";
      const body = section.body.replace(/\r\n/g, "\n");
      return body ? `## ${heading}\n${body}` : `## ${heading}`;
    }),
  ].filter(Boolean);

  return `${pieces.join("\n\n")}\n`;
}

export function updateBeatSection(markdown: string, sectionIndex: number, body: string) {
  const parsed = parseRoomSections(markdown);
  if (!parsed.sections[sectionIndex]) return markdown;

  const sections = parsed.sections.map((section, index) => (index === sectionIndex ? { ...section, body } : section));
  return formatRoomSections(parsed.intro, sections);
}

export function renameBeatSection(markdown: string, sectionIndex: number, heading: string) {
  const parsed = parseRoomSections(markdown);
  if (!parsed.sections[sectionIndex]) return markdown;

  const sections = parsed.sections.map((section, index) => (index === sectionIndex ? { ...section, heading } : section));
  return formatRoomSections(parsed.intro, sections);
}

export function nextCustomBeatHeading(sections: BeatSection[]) {
  const existingHeadings = new Set(sections.map((section) => section.heading.toLowerCase()));
  let customBeatNumber = 1;

  while (existingHeadings.has(`custom beat ${customBeatNumber}`)) {
    customBeatNumber += 1;
  }

  return `Custom Beat ${customBeatNumber}`;
}

export function addCustomBeatSection(markdown: string) {
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

export const BEAT_NEEDS_MARKER_PATTERN = /^\s*-?\s*\[(?:needs your answer|needs answer|needs writing)\]\s*/i;
export const BEAT_PLACEHOLDER_PATTERN = /\[(?:needs your answer|needs answer|needs writing)\]\s*/gi;

export const DEFAULT_BEAT_PROMPT_PATTERNS_BY_HEADING: Record<string, RegExp[]> = {
  "opening image": [
    /^Replace this with a specific visual snapshot before pressure hits\.$/i,
    /^Show .+ before pressure exposes .+\.$/i,
    /^Describe the first visual snapshot: who, where, and what feels normal before the story applies pressure\.$/i,
  ],
  setup: [
    /^Establish the world, (?:the )?want\b.*\b(?:lie|cost of staying the same)\b/i,
    /^Establish the ordinary world, core want, false belief, relationships, and cost of staying the same\.$/i,
  ],
  "inciting incident": [
    /^What specific event forces the protagonist toward the want\?$/i,
    /^Something forces the protagonist toward\b/i,
    /^An event makes .+ urgent and impossible to ignore\.$/i,
    /^Name the event that disrupts normal life and makes inaction impossible\.$/i,
  ],
  "debate / refusal": [
    /^Why they hesitate, dodge, rationalize, or choose badly\.$/i,
    /^a protagonist whose want exposes the wound they keep protecting\b/i,
    /^.+ hesitates because .+ still feels safer than change\.$/i,
    /^Show why the protagonist hesitates, rationalizes, or tries the wrong safer path\.$/i,
  ],
  "act one break": [
    /^What choice locks them into the story\?$/i,
    /^They make a choice that locks them into the story\.$/i,
    /^.+ commits to .+ even though .+ makes the cost real\.$/i,
    /^Make the protagonist choose the visible goal, cross into the main story, and accept that the cost is now real\.$/i,
  ],
  "promise of the premise": [
    /^Which sequence delivers the fun\/terror\/longing promised by the genre\?$/i,
    /^The movie delivers the fun\/terror\/longing promised by\b/i,
    /^Build a sequence that delivers the .+ promise and makes the audience feel .+\.$/i,
    /^Write the sequence that proves the movie's core promise: the fun, dread, longing, awe, or tension the audience came for\.$/i,
  ],
  midpoint: [
    /^What reveal, reversal, or false victory makes the old plan impossible\?$/i,
    /^A reveal, reversal, or false victory makes the old plan impossible\.$/i,
    /^A reveal or reversal proves the old plan for .+ will not survive\.$/i,
    /^Create the reveal, reversal, false victory, or false defeat that makes the old plan impossible\.$/i,
  ],
  "bad guys close in": [
    /^How does the opposition tighten the trap\?$/i,
    /^.+ tightens the trap(?: until .+)?\.$/i,
    /^Let pressure pile up from rivals, flaws, consequences, and the clock until escape routes close and the protagonist cannot dodge the lie anymore\.$/i,
  ],
  "all is lost": [
    /^What moment makes the cost personal, public, moral, or irreversible\?$/i,
    /^The worst version of the cost lands\.$/i,
    /^The cost becomes personal, public, moral, or irreversible\b/i,
    /^Make the cost feel personal, public, moral, or irreversible: .+$/i,
    /^Write the moment where the cost lands as personal, public, moral, or seemingly irreversible\.$/i,
  ],
  "dark night of the soul": [
    /^How does the protagonist confront the lie\?$/i,
    /^The protagonist confronts the lie:/i,
    /^The protagonist faces the lie\b/i,
    /^.+ finally names the damage caused by believing .+\.$/i,
    /^Show the quiet aftermath where the protagonist has to face the lie, wound, or mistake\.$/i,
  ],
  "act three break": [
    /^What new choice points toward the ending\?$/i,
    /^They make a new choice\b/i,
    /^A new choice points toward .+$/i,
    /^Name the new choice or plan that sends the story into its final movement\.$/i,
  ],
  climax: [
    /^What maximum-pressure choice proves who they have become\?$/i,
    /^The maximum-pressure choice\b/i,
    /^The protagonist must choose under maximum pressure\.$/i,
    /^.+ makes the hardest choice and proves what has changed\.$/i,
    /^Describe the maximum-pressure choice that proves what has changed\.$/i,
  ],
  "final image": [
    /^What specific final image answers or twists the opening image\?$/i,
    /^A final image answers or twists the opening image\.$/i,
    /^A visual answer to the opening image\.$/i,
    /^Echo the opening image\b/i,
    /^Create the closing visual that answers, twists, or contrasts the opening image\.$/i,
  ],
  "custom beats": [
    /^Add custom beats\.$/i,
    /^Add, rename, skip, or reorder beats once this spine starts fighting back\.$/i,
  ],
};

export function normalizeBeatPrompt(value: string) {
  return value
    .replace(BEAT_NEEDS_MARKER_PATTERN, "")
    .replace(BEAT_PLACEHOLDER_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function beatUsesDefaultPrompt(section: BeatSection) {
  const body = normalizeBeatPrompt(section.body);
  if (!body) return false;

  const heading = section.heading.trim().toLowerCase();
  const headingPatterns = DEFAULT_BEAT_PROMPT_PATTERNS_BY_HEADING[heading] ?? [];
  return headingPatterns.some((pattern) => pattern.test(body));
}

export function beatNeedsAnswer(section: BeatSection) {
  return BEAT_NEEDS_MARKER_PATTERN.test(section.body) || beatUsesDefaultPrompt(section);
}

export function beatDisplayBody(body: string) {
  return body.replace(BEAT_NEEDS_MARKER_PATTERN, "").replace(BEAT_PLACEHOLDER_PATTERN, "");
}

export function beatNoteRows(body: string) {
  const explicitLines = body.split("\n").length;
  const estimatedWrappedLines = Math.ceil(body.length / 21);
  return Math.min(17, Math.max(4, explicitLines + estimatedWrappedLines));
}

export function cleanBeatSceneText(body: string) {
  return body
    .replace(BEAT_PLACEHOLDER_PATTERN, "")
    .replace(BEAT_NEEDS_MARKER_PATTERN, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function answeredBeatSections(beatsMarkdown: string): BeatSection[] {
  return parseRoomSections(beatsMarkdown).sections
    .filter((section) => section.heading.trim().toLowerCase() !== "custom beats")
    .filter((section) => !beatNeedsAnswer(section))
    .filter((section) => cleanBeatSceneText(section.body).length > 0);
}

const SCENE_FIELD_ORDER: Array<keyof SceneDraftValues> = [
  "title",
  "locationTime",
  "characters",
  "sceneWant",
  "opposition",
  "turn",
  "button",
  "purpose",
];

function normalizeSceneFieldTarget(target: string) {
  return target
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sceneFieldFromTarget(target: string): keyof SceneDraftValues | null {
  const normalized = normalizeSceneFieldTarget(target);
  if (!normalized) return null;
  if (/\btitle\b/.test(normalized)) return "title";
  if (/\blocation\b/.test(normalized) || /\btime\b/.test(normalized)) return "locationTime";
  if (/\bcharacter/.test(normalized)) return "characters";
  if (/\bwant\b/.test(normalized)) return "sceneWant";
  if (/\boppos/.test(normalized)) return "opposition";
  if (/\bturn\b/.test(normalized)) return "turn";
  if (/\bbutton\b/.test(normalized)) return "button";
  if (/\bpurpose\b/.test(normalized)) return "purpose";
  return null;
}

export function sceneDraftValuesFromChoices(choices: CowriterChoice[]): Partial<SceneDraftValues> {
  const values: Partial<SceneDraftValues> = {};
  const hasLabels = choices.some((choice) => choice.target && sceneFieldFromTarget(choice.target));

  if (hasLabels) {
    for (const choice of choices) {
      const field = choice.target ? sceneFieldFromTarget(choice.target) : null;
      const text = choice.text.trim();
      if (field && !values[field] && text) values[field] = text;
    }
    return values;
  }

  choices.slice(0, SCENE_FIELD_ORDER.length).forEach((choice, index) => {
    const text = choice.text.trim();
    if (text) values[SCENE_FIELD_ORDER[index]] = text;
  });
  return values;
}

export function SuggestionGoblin({ label, state }: { label: string; state?: SuggestionMascotState }) {
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
        <path
          className={styles.suggestionGoblinGlasses}
          d="M16 34c5-5 18-5 23 0 3 3 2 12-1 15-5 4-17 4-22 0-4-3-4-12 0-15Zm25 0c5-5 18-5 23 0 4 3 4 12 0 15-5 4-17 4-22 0-3-3-4-12-1-15Zm-2 7h3"
          data-mascot-part="glasses"
        />
        <path className={styles.suggestionGoblinLine} d={isHappy ? "M22 35c5-5 12-5 17 0m19 0c-5-5-12-5-17 0" : "M23 33c5-3 11-3 16 0m18 0c-5-3-11-3-16 0"} />
        <path className={styles.suggestionGoblinLine} d={isHappy ? "M29 46c7 7 16 7 23 0" : "M33 47c5 2 10 2 15 0"} />
        <path className={styles.suggestionGoblinTooth} d="M38 49 42 59l5-10Z" data-mascot-part="fang" />
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
