"use client";

import Link from "next/link";
import {
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "@/app/workspace.module.css";
import { parseCowriterChoices } from "@/lib/cowriterChoices";
import { deleteSavedDraft, loadSavedDrafts, saveNewDraft, updateSavedDraft, type SavedDraft } from "@/lib/draftStorage";
import {
  buildDraftContextMarkdown,
  buildExportMarkdown,
  buildScriptBase,
  buildSuggestionContextMarkdown,
  NEEDS_ANSWER,
  type ScriptBase,
} from "@/lib/guidedSetup";
import {
  buildScreenplayExportFile,
  screenplayExportFormats,
  type ScreenplayExportFile,
  type ScreenplayExportFormatId,
} from "@/lib/screenplayExport";
import {
  CREATE_SCRIPT_BLOCKED_MESSAGES,
  getScriptReadiness,
  type ScriptRoomProgress,
} from "@/lib/storyRooms";
import {
  addCustomBeatSection,
  answeredBeatSections,
  beatDisplayBody,
  beatNeedsAnswer,
  beatNoteRows,
  cleanGuidedFieldValue,
  cowriterRequestHeaders,
  escapeRegExp,
  formatSceneDraftValues,
  formatScenesMarkdown,
  guidedFieldUsesPlaceholder,
  guidedFieldRows,
  parseGuidedRoomFields,
  parseRoomSections,
  parseSavedSceneCards,
  parseSceneDraftPlaceholders,
  parseSceneDraftValues,
  parseSuggestedPlacement,
  numberedSceneList,
  renameBeatSection,
  reorderSceneCards,
  sceneCardTemplate,
  sceneDraftValuesFromChoices,
  sceneSummary,
  selectedSceneAfterMove,
  SuggestionGoblin,
  trimSceneMarkdown,
  updateBeatSection,
  updateGuidedRoomField,
  useSuggestionStates,
  type BeatSection,
  type GuidedRoomField,
  type SceneDraftValues,
  type ScriptParameterValues,
} from "./RoomEditorSupport";
import { defaultWritingStyleId, writingStyleOptions } from "@/lib/writingStyles";

type GuidedRoomEditorProps = {
  firstFieldRef: RefObject<HTMLTextAreaElement | null>;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  project: ScriptBase;
  roomSlug: string;
  title: string;
};

function SceneOrderChevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.sceneOrderChevron}
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={direction === "up" ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
    </svg>
  );
}

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

const generatedCharacterHelperHeadings = new Set(["Arc"]);

function isGeneratedGuidedFieldHelper(
  roomSlug: string,
  field: GuidedRoomField,
  generatedField: GuidedRoomField | undefined,
) {
  return (
    roomSlug === "characters" &&
    generatedCharacterHelperHeadings.has(field.heading) &&
    field.body.trim() === generatedField?.body.trim()
  );
}

function shouldUseGuidedFieldPlaceholder(
  roomSlug: string,
  field: GuidedRoomField,
  generatedField: GuidedRoomField | undefined,
  project: ScriptBase,
) {
  return isGeneratedGuidedFieldHelper(roomSlug, field, generatedField) || guidedFieldUsesPlaceholder(field.body, project.answers);
}

export function GuidedRoomEditor({ firstFieldRef, markdown, onMarkdownChange, project, roomSlug, title }: GuidedRoomEditorProps) {
  const parsedRoom = useMemo(() => parseGuidedRoomFields(markdown), [markdown]);
  const generatedFieldsByHeading = useMemo(() => {
    const generatedMarkdown = buildScriptBase(project.answers).rooms[roomSlug] ?? "";
    return new Map(parseGuidedRoomFields(generatedMarkdown).fields.map((field) => [field.heading, field]));
  }, [project.answers, roomSlug]);
  const fieldRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [focusedFieldIndex, setFocusedFieldIndex] = useState<number | null>(null);
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

  function setGuidedFieldRef(index: number, element: HTMLTextAreaElement | null) {
    fieldRefs.current[index] = element;
    if (index === 0) firstFieldRef.current = element;
  }

  function focusNextGuidedField(index: number) {
    const nextField = fieldRefs.current.slice(index + 1).find(Boolean);
    nextField?.focus();
  }

  function handleGuidedFieldKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    focusNextGuidedField(index);
  }

  return (
    <section aria-label={`${title} questions`} className={styles.parameterPanel}>
      <div className={styles.parameterIntro}>
        <p className={styles.stepMeta}>Working notes</p>
        <h2>Answer the pressure points before the pages start lying.</h2>
      </div>

      {parsedRoom.fields.map((field, index) => {
        const helperText = shouldUseGuidedFieldPlaceholder(roomSlug, field, generatedFieldsByHeading.get(field.heading), project)
          ? cleanGuidedFieldValue(field.body)
          : "";
        const value = helperText ? "" : cleanGuidedFieldValue(field.body);
        const suggestion = fieldSuggestions[index];
        const fieldId = `guided-${roomSlug}-field-${index}`;

        return (
          <section
            className={`${styles.parameterQuestion} ${field.level === 3 ? styles.guidedSubQuestion : ""}`}
            key={`${field.level}-${field.heading}-${index}`}
          >
            <div className={styles.parameterQuestionCopy}>
              <div className={styles.fieldQuestionHeader}>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3>{field.heading}</h3>
            </div>
            <div className={styles.parameterField}>
              <div className={styles.fieldInputHeader}>
                <label htmlFor={fieldId}>Answer</label>
                <div className={styles.suggestionButtonCluster}>
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
                </div>
              </div>
              <textarea
                aria-label={field.heading}
                className={helperText ? styles.guidedPlaceholderField : undefined}
                id={fieldId}
                onChange={(event) => onMarkdownChange(updateGuidedRoomField(markdown, index, event.target.value))}
                onBlur={() => setFocusedFieldIndex(null)}
                onFocus={() => setFocusedFieldIndex(index)}
                onKeyDown={(event) => handleGuidedFieldKeyDown(event, index)}
                placeholder={focusedFieldIndex === index ? "" : helperText}
                ref={(element) => setGuidedFieldRef(index, element)}
                rows={guidedFieldRows(value || helperText)}
                value={value}
              />
            </div>
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

export function BeatsCorkBoard({ firstNoteRef, markdown, onMarkdownChange, project }: BeatsCorkBoardProps) {
  const beatSections = useMemo(() => parseRoomSections(markdown).sections, [markdown]);
  const [focusedBeatIndex, setFocusedBeatIndex] = useState<number | null>(null);
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
          const placeholder = needsAnswer ? displayedBody.trim() : "";
          const textareaValue = placeholder ? "" : displayedBody;

          return (
            <li className={styles.beatBoardItem} key={`beat-${index}`}>
              <article
                className={`${styles.beatSticky} ${stickyToneClasses[index % stickyToneClasses.length]} ${
                  needsAnswer ? styles.beatStickyNeedsAnswer : ""
                }`}
              >
                {needsAnswer ? (
                  <div className={styles.beatStickyTop}>
                    <span aria-label={`${section.heading} needs your answer`} className={styles.beatNeedsTag}>
                      Needs your answer
                    </span>
                  </div>
                ) : null}
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
                <div className={styles.beatTextareaHeader}>
                  <div className={styles.suggestionButtonCluster}>
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
                  </div>
                </div>
                <textarea
                  aria-label={`${section.heading} beat`}
                  className={`${styles.beatStickyTextarea} ${placeholder ? styles.beatStickyPlaceholderTextarea : ""}`}
                  id={noteId}
                  onChange={(event) => updateBeat(index, event.target.value)}
                  onBlur={() => setFocusedBeatIndex(null)}
                  onFocus={() => setFocusedBeatIndex(index)}
                  placeholder={focusedBeatIndex === index ? "" : placeholder}
                  ref={index === 0 ? firstNoteRef : undefined}
                  rows={beatNoteRows(textareaValue || placeholder)}
                  value={textareaValue}
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
  project: ScriptBase | null;
};

type SceneFieldElement = HTMLInputElement | HTMLTextAreaElement;

export type SceneBoardHandle = {
  buildFromBeat: (heading: string) => Promise<void>;
  suggestScene: () => Promise<void>;
};

type ScenePopulationGuidanceProps = {
  beatsMarkdown: string;
  scenesMarkdown: string;
  sceneBoardRef: RefObject<SceneBoardHandle | null>;
};

export function ScenePopulationGuidance({
  beatsMarkdown,
  scenesMarkdown,
  sceneBoardRef,
}: ScenePopulationGuidanceProps) {
  const answeredBeats = useMemo(() => answeredBeatSections(beatsMarkdown), [beatsMarkdown]);
  const availableBeats = useMemo(() => {
    const placed = new Set(
      parseSavedSceneCards(scenesMarkdown).map((card) => sceneSummary(card).title.trim().toLowerCase()),
    );
    return answeredBeats.filter((beat) => !placed.has(beat.heading.trim().toLowerCase()));
  }, [answeredBeats, scenesMarkdown]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [beatLoading, setBeatLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = beatLoading || suggestLoading;

  async function populateFromBeat(heading: string) {
    if (!heading) return;
    setError("");
    setPickerOpen(false);
    setBeatLoading(true);
    try {
      await sceneBoardRef.current?.buildFromBeat(heading);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The goblin could not build that beat.");
    } finally {
      setBeatLoading(false);
    }
  }

  async function askForSuggestion() {
    setError("");
    setSuggestLoading(true);
    try {
      await sceneBoardRef.current?.suggestScene();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The goblin could not suggest a scene.");
    } finally {
      setSuggestLoading(false);
    }
  }

  return (
    <div className={styles.scenePopulatePanel}>
      {answeredBeats.length === 0 ? (
        <p className={styles.scenePopulateHelp}>
          Populate the beat sheet first — the goblin has no answered beats to work from.
        </p>
      ) : availableBeats.length === 0 ? (
        <p className={styles.scenePopulateHelp}>All answered beats are already in the timeline.</p>
      ) : (
        <>
          <button
            className={`${styles.primaryButton} ${styles.scenePopulateButton} ${styles.goblinSuggestButton} ${
              beatLoading ? styles.goblinSuggestButtonSquashed : ""
            }`}
            disabled={busy}
            onClick={() => setPickerOpen((open) => !open)}
            type="button"
          >
            {beatLoading ? "Building" : "Populate from beat sheet"}
          </button>
          {pickerOpen ? (
            <label className={styles.parameterField}>
              <span>Pick a beat to populate</span>
              <select
                aria-label="Beat to populate from the beat sheet"
                defaultValue=""
                onChange={(event) => populateFromBeat(event.target.value)}
              >
                <option value="">Pick a beat…</option>
                {availableBeats.map((beat) => (
                  <option key={beat.heading} value={beat.heading}>
                    {beat.heading}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className={styles.scenePopulateHelp}>
            The goblin builds one scene from only that beat, then drops it in the editor to review and save.
          </p>
        </>
      )}

      <button
        className={`${styles.primaryButton} ${styles.scenePopulateButton} ${styles.goblinSuggestButton} ${
          suggestLoading ? styles.goblinSuggestButtonSquashed : ""
        }`}
        disabled={busy}
        onClick={askForSuggestion}
        type="button"
      >
        {suggestLoading ? "Thinking" : "Goblin suggestion"}
      </button>
      <p className={styles.scenePopulateHelp}>
        The goblin reads the whole story, finds where it is light, and suggests a new scene to drop in.
      </p>

      {error ? (
        <p className={styles.fieldSuggestionError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const SceneBoard = forwardRef<SceneBoardHandle, SceneBoardProps>(function SceneBoard(
  { firstSceneRef, markdown, onMarkdownChange, project },
  ref,
) {
  const sceneCards = useMemo(() => parseSavedSceneCards(markdown), [markdown]);
  const template = useMemo(() => sceneCardTemplate(markdown), [markdown]);
  const sceneFieldRefs = useRef<Array<SceneFieldElement | null>>([]);
  const saveSceneButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [sceneDraft, setSceneDraft] = useState(template);
  const [draftChanged, setDraftChanged] = useState(false);
  const [draggedSceneIndex, setDraggedSceneIndex] = useState<number | null>(null);
  const [isTrashTargetActive, setIsTrashTargetActive] = useState(false);
  const [sceneRailCompact, setSceneRailCompact] = useState(false);
  const [focusedSceneField, setFocusedSceneField] = useState<keyof SceneDraftValues | null>(null);
  const activeScene = selectedSceneIndex === null ? template : sceneCards[selectedSceneIndex] ?? template;
  const displayedSceneDraft = draftChanged ? sceneDraft : activeScene;
  const sceneValues = useMemo(() => parseSceneDraftValues(displayedSceneDraft), [displayedSceneDraft]);
  const scenePlaceholders = useMemo(() => parseSceneDraftPlaceholders(activeScene), [activeScene]);
  const canSaveScene = draftChanged && displayedSceneDraft.trim().length > 0 && displayedSceneDraft !== activeScene;

  const beatOptions = useMemo(() => answeredBeatSections(project?.rooms.beats ?? ""), [project]);
  const [selectedBeatHeading, setSelectedBeatHeading] = useState<string | null>(null);
  const matchedBeatHeading = useMemo(() => {
    const title = sceneValues.title.trim().toLowerCase();
    if (!title) return "";
    return beatOptions.find((beat) => beat.heading.trim().toLowerCase() === title)?.heading ?? "";
  }, [beatOptions, sceneValues.title]);
  const activeBeatHeading = selectedBeatHeading ?? matchedBeatHeading;
  const {
    beginSuggestion: beginSceneFill,
    clearSuggestion: clearSceneFill,
    failSuggestion: failSceneFill,
    finishSuggestion: finishSceneFill,
    suggestions: sceneFillStates,
  } = useSuggestionStates();
  const sceneFill = sceneFillStates[0];
  const preFillSnapshot = useRef<{ draft: string; changed: boolean } | null>(null);
  const [goblinFilled, setGoblinFilled] = useState(false);
  const [suggestionActive, setSuggestionActive] = useState(false);
  const [suggestionPlacement, setSuggestionPlacement] = useState(0);

  async function buildSceneFromBeat(headingOverride?: string, options?: { fresh?: boolean }) {
    const heading = headingOverride ?? activeBeatHeading;
    const beat = beatOptions.find((option) => option.heading === heading);
    if (!beat) return;

    const baseValues = options?.fresh ? parseSceneDraftValues(template) : sceneValues;
    if (!goblinFilled) {
      preFillSnapshot.current = options?.fresh
        ? { draft: template, changed: false }
        : { draft: sceneDraft, changed: draftChanged };
    }

    const mascotCycle = beginSceneFill(0);

    try {
      const response = await fetch("/api/hermes-cowriter", {
        method: "POST",
        headers: cowriterRequestHeaders(),
        body: JSON.stringify({
          mode: "scene",
          beat: beat.heading,
          beatMarkdown: beat.body,
        }),
      });
      const data = (await response.json()) as { output?: string; error?: string };

      if (!response.ok) {
        failSceneFill(0, mascotCycle, { error: data.error ?? "The scene build failed.", text: "" });
        return;
      }

      const filledValues = sceneDraftValuesFromChoices(parseCowriterChoices(data.output ?? ""));
      if (Object.keys(filledValues).length === 0) {
        failSceneFill(0, mascotCycle, { error: "The goblin came back empty-handed. Try again.", text: "" });
        return;
      }

      setSceneDraft(formatSceneDraftValues({ ...baseValues, ...filledValues }));
      setDraftChanged(true);
      setGoblinFilled(true);
      finishSceneFill(0, mascotCycle, { error: "", text: "" });
    } catch (caught) {
      failSceneFill(0, mascotCycle, {
        error: caught instanceof Error ? caught.message : "The scene build failed.",
        text: "",
      });
    }
  }

  async function buildFromBeat(heading: string) {
    setSuggestionActive(false);
    setSelectedSceneIndex(null);
    setSelectedBeatHeading(heading);
    setGoblinFilled(false);
    await buildSceneFromBeat(heading, { fresh: true });
  }

  async function suggestScene() {
    setSelectedSceneIndex(null);
    setSelectedBeatHeading(null);
    const mascotCycle = beginSceneFill(0);

    try {
      const response = await fetch("/api/hermes-cowriter", {
        method: "POST",
        headers: cowriterRequestHeaders(),
        body: JSON.stringify({
          mode: "scene-suggest",
          markdown: buildSuggestionContextMarkdown(project?.rooms ?? {}),
          sceneList: numberedSceneList(sceneCards),
        }),
      });
      const data = (await response.json()) as { output?: string; error?: string };

      if (!response.ok) {
        failSceneFill(0, mascotCycle, { error: data.error ?? "The scene suggestion failed.", text: "" });
        return;
      }

      const output = data.output ?? "";
      const filledValues = sceneDraftValuesFromChoices(parseCowriterChoices(output));
      if (Object.keys(filledValues).length === 0) {
        failSceneFill(0, mascotCycle, { error: "The goblin came back empty-handed. Try again.", text: "" });
        return;
      }

      setSceneDraft(formatSceneDraftValues({ ...parseSceneDraftValues(template), ...filledValues }));
      setDraftChanged(true);
      setSuggestionPlacement(parseSuggestedPlacement(output, sceneCards.length));
      setSuggestionActive(true);
      finishSceneFill(0, mascotCycle, { error: "", text: "" });
    } catch (caught) {
      failSceneFill(0, mascotCycle, {
        error: caught instanceof Error ? caught.message : "The scene suggestion failed.",
        text: "",
      });
    }
  }

  useImperativeHandle(ref, () => ({ buildFromBeat, suggestScene }));

  function saveSuggestedScene() {
    const cleaned = trimSceneMarkdown(displayedSceneDraft);
    if (!cleaned) return;

    const index = Math.max(0, Math.min(suggestionPlacement, sceneCards.length));
    const nextSceneCards = [...sceneCards];
    nextSceneCards.splice(index, 0, cleaned);

    onMarkdownChange(formatScenesMarkdown(markdown, nextSceneCards));
    setSelectedSceneIndex(index);
    setSceneDraft(cleaned);
    setDraftChanged(false);
    resetGoblinFill();
    focusSceneDraft();
  }

  function discardSuggestion() {
    startNewScene();
  }

  function discardSceneFill() {
    const snapshot = preFillSnapshot.current;
    setSceneDraft(snapshot?.draft ?? template);
    setDraftChanged(snapshot?.changed ?? false);
    resetGoblinFill();
  }

  function pickBeat(heading: string) {
    setSelectedBeatHeading(heading);
    resetGoblinFill();
  }

  function focusSceneDraft() {
    window.setTimeout(() => firstSceneRef.current?.focus(), 0);
  }

  function resetGoblinFill() {
    preFillSnapshot.current = null;
    setGoblinFilled(false);
    setSuggestionActive(false);
    clearSceneFill(0);
  }

  function startNewScene() {
    setSelectedSceneIndex(null);
    setSceneDraft(template);
    setDraftChanged(false);
    resetGoblinFill();
    focusSceneDraft();
  }

  function openScene(index: number) {
    setSelectedSceneIndex(index);
    setSceneDraft(sceneCards[index] ?? template);
    setDraftChanged(false);
    resetGoblinFill();
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
    resetGoblinFill();
    focusSceneDraft();
  }

  function dropScene(toIndex: number) {
    if (draggedSceneIndex === null || draggedSceneIndex === toIndex) return;

    onMarkdownChange(formatScenesMarkdown(markdown, reorderSceneCards(sceneCards, draggedSceneIndex, toIndex)));
    setSelectedSceneIndex((current) =>
      current === null ? null : selectedSceneAfterMove(current, draggedSceneIndex, toIndex),
    );
    setIsTrashTargetActive(false);
    setDraggedSceneIndex(null);
  }

  function moveScene(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= sceneCards.length) return;

    onMarkdownChange(formatScenesMarkdown(markdown, reorderSceneCards(sceneCards, fromIndex, toIndex)));
    setSelectedSceneIndex((current) => (current === null ? null : selectedSceneAfterMove(current, fromIndex, toIndex)));
  }

  function selectedSceneAfterDelete(deletedIndex: number, nextSceneCount: number) {
    if (selectedSceneIndex === null) return null;
    if (selectedSceneIndex === deletedIndex) return nextSceneCount === 0 ? null : Math.min(deletedIndex, nextSceneCount - 1);
    return selectedSceneIndex > deletedIndex ? selectedSceneIndex - 1 : selectedSceneIndex;
  }

  function deleteScene(index: number) {
    const nextSceneCards = sceneCards.filter((_, sceneIndex) => sceneIndex !== index);
    const nextSelectedIndex = selectedSceneAfterDelete(index, nextSceneCards.length);

    onMarkdownChange(formatScenesMarkdown(markdown, nextSceneCards));
    setSelectedSceneIndex(nextSelectedIndex);
    setSceneDraft(nextSelectedIndex === null ? template : (nextSceneCards[nextSelectedIndex] ?? template));
    setDraftChanged(false);
    resetGoblinFill();
  }

  function endSceneDrag() {
    setDraggedSceneIndex(null);
    setIsTrashTargetActive(false);
  }

  function deleteDraggedScene() {
    if (draggedSceneIndex === null) return;

    deleteScene(draggedSceneIndex);
    endSceneDrag();
  }

  function updateSceneDraft(patch: Partial<SceneDraftValues>) {
    setSceneDraft(formatSceneDraftValues({ ...sceneValues, ...patch }));
    setDraftChanged(true);
  }

  function setSceneFieldRef(index: number, element: SceneFieldElement | null) {
    sceneFieldRefs.current[index] = element;
    if (index === 0) firstSceneRef.current = element as HTMLInputElement | null;
  }

  function scenePlaceholder(field: keyof SceneDraftValues) {
    return focusedSceneField === field ? "" : scenePlaceholders[field];
  }

  function focusNextSceneField(index: number) {
    const nextField = sceneFieldRefs.current.slice(index + 1).find(Boolean);
    if (nextField) {
      nextField.focus();
      return;
    }

    saveSceneButtonRef.current?.focus();
  }

  function handleSceneFieldKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    index: number,
  ) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    focusNextSceneField(index);
  }

  return (
    <section aria-label="Scene cards" className={styles.sceneBoardPanel}>
      <div className={`${styles.sceneBoardLayout} ${sceneRailCompact ? styles.sceneBoardLayoutCompact : ""}`}>
        <div className={styles.sceneRailShell}>
          {draggedSceneIndex !== null ? (
            <button
              aria-label="Delete dragged scene"
              className={`${styles.sceneTrashTarget} ${isTrashTargetActive ? styles.sceneTrashTargetActive : ""}`}
              onDragEnter={() => setIsTrashTargetActive(true)}
              onDragLeave={() => setIsTrashTargetActive(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={deleteDraggedScene}
              type="button"
            >
              <span aria-hidden="true" className={styles.sceneTrashIcon} />
              <span>Drop to delete</span>
            </button>
          ) : null}

          <nav
            aria-label="Scene timeline"
            className={`${styles.sceneRail} ${sceneRailCompact ? styles.sceneRailCompact : ""}`}
          >
            <button
              aria-label={sceneRailCompact ? "Use readable scene rail" : "Use compact scene rail"}
              aria-pressed={sceneRailCompact}
              className={styles.sceneRailToggle}
              onClick={() => setSceneRailCompact((current) => !current)}
              title={sceneRailCompact ? "Use readable scene rail" : "Use compact scene rail"}
              type="button"
            >
              <span className={styles.sceneRailToggleText}>{sceneRailCompact ? "Wide" : "Compact"}</span>
              <span aria-hidden="true" className={styles.sceneRailToggleKnob} />
            </button>
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
                <div className={styles.sceneMiniCardShell} key={`${summary.title}-${index}`}>
                  <button
                    aria-current={isSelected ? "true" : undefined}
                    aria-label={`${summary.title}. ${summary.location}. ${summary.characters}. Drag to reorder.`}
                    className={`${styles.sceneMiniCard} ${isSelected ? styles.sceneMiniCardActive : ""}`}
                    draggable
                    onClick={() => openScene(index)}
                    onDragEnd={endSceneDrag}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={() => setDraggedSceneIndex(index)}
                    onDrop={() => dropScene(index)}
                    title="Drag to reorder"
                    type="button"
                  >
                    <span className={styles.sceneMiniTopline}>
                      <span className={styles.sceneMiniNumber}>{String(index + 1).padStart(2, "0")}</span>
                      <span className={styles.sceneDragPill}>Drag</span>
                    </span>
                    <span className={styles.sceneMiniTitle}>{summary.title}</span>
                    <span className={styles.sceneMiniMeta}>{summary.location}</span>
                    <span className={styles.sceneMiniMeta}>{summary.characters}</span>
                  </button>
                  <div aria-label={`Order controls for ${summary.title}`} className={styles.sceneOrderControls}>
                    <button
                      aria-label={`Move scene ${index + 1} earlier`}
                      className={styles.sceneOrderButton}
                      disabled={index === 0}
                      onClick={() => moveScene(index, index - 1)}
                      title="Move earlier"
                      type="button"
                    >
                      <SceneOrderChevron direction="up" />
                    </button>
                    <button
                      aria-label={`Move scene ${index + 1} later`}
                      className={styles.sceneOrderButton}
                      disabled={index === sceneCards.length - 1}
                      onClick={() => moveScene(index, index + 1)}
                      title="Move later"
                      type="button"
                    >
                      <SceneOrderChevron direction="down" />
                    </button>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className={styles.sceneDraftPanel}>
          <div className={styles.sceneDraftHeader}>
            <p className={styles.sceneDraftKicker}>
              {selectedSceneIndex === null ? "New scene draft" : "Selected scene"}
            </p>
          </div>
          {beatOptions.length > 0 ? (
            <div className={styles.sceneGoblinFill}>
              <label className={styles.parameterField}>
                <span>Build this scene from a beat</span>
                <select
                  aria-label="Beat for the goblin to build"
                  onChange={(event) => pickBeat(event.target.value)}
                  value={activeBeatHeading}
                >
                  <option value="">Pick a beat for the goblin to build…</option>
                  {beatOptions.map((beat) => (
                    <option key={beat.heading} value={beat.heading}>
                      {beat.heading}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.suggestionButtonCluster}>
                {goblinFilled ? (
                  <>
                    <button
                      aria-label="Ask the goblin for another scene attempt"
                      className={`${styles.fieldUseSuggestionButton} ${styles.goblinSuggestButton} ${
                        sceneFill?.isLoading ? styles.goblinSuggestButtonSquashed : ""
                      }`}
                      disabled={sceneFill?.isLoading}
                      onClick={() => buildSceneFromBeat()}
                      type="button"
                    >
                      {sceneFill?.isLoading ? "Thinking" : "Another attempt"}
                    </button>
                    <button
                      aria-label="Discard the goblin scene draft"
                      className={styles.fieldUseSuggestionButton}
                      onClick={discardSceneFill}
                      type="button"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <button
                    aria-label="Ask the goblin to build this scene from a beat"
                    className={`${styles.fieldSuggestButton} ${styles.goblinSuggestButton} ${
                      sceneFill?.isLoading ? styles.goblinSuggestButtonSquashed : ""
                    }`}
                    disabled={!activeBeatHeading || sceneFill?.isLoading}
                    onClick={() => buildSceneFromBeat()}
                    type="button"
                  >
                    {sceneFill?.isLoading ? "Building" : "Ask the goblin to build this scene"}
                  </button>
                )}
                <SuggestionGoblin label="scene builder" state={sceneFill?.mascotState} />
              </div>
              {sceneFill?.error ? <p className={styles.fieldSuggestionError}>{sceneFill.error}</p> : null}
            </div>
          ) : null}
          <section aria-label="Scene card questions" className={styles.sceneQuestionPanel}>
            <label className={styles.parameterField}>
              <span>Scene title</span>
              <input
                aria-label="Scene title"
                onChange={(event) => updateSceneDraft({ title: event.target.value })}
                onBlur={() => setFocusedSceneField(null)}
                onFocus={() => setFocusedSceneField("title")}
                onKeyDown={(event) => handleSceneFieldKeyDown(event, 0)}
                placeholder={scenePlaceholder("title")}
                ref={(element) => setSceneFieldRef(0, element)}
                value={sceneValues.title}
              />
            </label>
            <label className={styles.parameterField}>
              <span>Location / time</span>
              <input
                aria-label="Location / time"
                onChange={(event) => updateSceneDraft({ locationTime: event.target.value })}
                onBlur={() => setFocusedSceneField(null)}
                onFocus={() => setFocusedSceneField("locationTime")}
                onKeyDown={(event) => handleSceneFieldKeyDown(event, 1)}
                placeholder={scenePlaceholder("locationTime")}
                ref={(element) => setSceneFieldRef(1, element)}
                value={sceneValues.locationTime}
              />
            </label>
            <label className={styles.parameterField}>
              <span>Characters</span>
              <textarea
                aria-label="Characters"
                onChange={(event) => updateSceneDraft({ characters: event.target.value })}
                onBlur={() => setFocusedSceneField(null)}
                onFocus={() => setFocusedSceneField("characters")}
                onKeyDown={(event) => handleSceneFieldKeyDown(event, 2)}
                placeholder={scenePlaceholder("characters")}
                ref={(element) => setSceneFieldRef(2, element)}
                value={sceneValues.characters}
              />
            </label>
            <label className={styles.parameterField}>
              <span>Scene want</span>
              <textarea
                aria-label="Scene want"
                onChange={(event) => updateSceneDraft({ sceneWant: event.target.value })}
                onBlur={() => setFocusedSceneField(null)}
                onFocus={() => setFocusedSceneField("sceneWant")}
                onKeyDown={(event) => handleSceneFieldKeyDown(event, 3)}
                placeholder={scenePlaceholder("sceneWant")}
                ref={(element) => setSceneFieldRef(3, element)}
                value={sceneValues.sceneWant}
              />
            </label>
            <label className={styles.parameterField}>
              <span>Opposition</span>
              <textarea
                aria-label="Opposition"
                onChange={(event) => updateSceneDraft({ opposition: event.target.value })}
                onBlur={() => setFocusedSceneField(null)}
                onFocus={() => setFocusedSceneField("opposition")}
                onKeyDown={(event) => handleSceneFieldKeyDown(event, 4)}
                placeholder={scenePlaceholder("opposition")}
                ref={(element) => setSceneFieldRef(4, element)}
                value={sceneValues.opposition}
              />
            </label>
            <label className={styles.parameterField}>
              <span>Turn</span>
              <textarea
                aria-label="Turn"
                onChange={(event) => updateSceneDraft({ turn: event.target.value })}
                onBlur={() => setFocusedSceneField(null)}
                onFocus={() => setFocusedSceneField("turn")}
                onKeyDown={(event) => handleSceneFieldKeyDown(event, 5)}
                placeholder={scenePlaceholder("turn")}
                ref={(element) => setSceneFieldRef(5, element)}
                value={sceneValues.turn}
              />
            </label>
            <label className={styles.parameterField}>
              <span>Button</span>
              <textarea
                aria-label="Button"
                onChange={(event) => updateSceneDraft({ button: event.target.value })}
                onBlur={() => setFocusedSceneField(null)}
                onFocus={() => setFocusedSceneField("button")}
                onKeyDown={(event) => handleSceneFieldKeyDown(event, 6)}
                placeholder={scenePlaceholder("button")}
                ref={(element) => setSceneFieldRef(6, element)}
                value={sceneValues.button}
              />
            </label>
            <label className={styles.parameterField}>
              <span>Purpose</span>
              <input
                aria-label="Purpose"
                onChange={(event) => updateSceneDraft({ purpose: event.target.value })}
                onBlur={() => setFocusedSceneField(null)}
                onFocus={() => setFocusedSceneField("purpose")}
                onKeyDown={(event) => handleSceneFieldKeyDown(event, 7)}
                placeholder={scenePlaceholder("purpose")}
                ref={(element) => setSceneFieldRef(7, element)}
                value={sceneValues.purpose}
              />
            </label>
          </section>
          <div className={styles.sceneDraftFooter}>
            {suggestionActive ? (
              <>
                <button
                  aria-label="Delete the suggested scene"
                  className={`${styles.dangerButton} ${styles.sceneDeleteButton}`}
                  onClick={discardSuggestion}
                  type="button"
                >
                  Delete
                </button>
                <button
                  aria-label="Ask the goblin to suggest another scene"
                  className={`${styles.fieldUseSuggestionButton} ${styles.goblinSuggestButton} ${
                    sceneFill?.isLoading ? styles.goblinSuggestButtonSquashed : ""
                  }`}
                  disabled={sceneFill?.isLoading}
                  onClick={() => suggestScene()}
                  type="button"
                >
                  {sceneFill?.isLoading ? "Thinking" : "Suggest another"}
                </button>
                <button
                  aria-label="Save the suggested scene"
                  className={styles.primaryButton}
                  onClick={saveSuggestedScene}
                  ref={saveSceneButtonRef}
                  type="button"
                >
                  Save scene
                </button>
              </>
            ) : (
              <>
                {selectedSceneIndex !== null ? (
                  <button
                    aria-label="Delete selected scene"
                    className={`${styles.dangerButton} ${styles.sceneDeleteButton}`}
                    onClick={() => deleteScene(selectedSceneIndex)}
                    type="button"
                  >
                    Delete scene
                  </button>
                ) : null}
                {canSaveScene ? (
                  <button className={styles.primaryButton} onClick={saveScene} ref={saveSceneButtonRef} type="button">
                    Save scene
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

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

type CreateScriptRoomProps = {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  project: ScriptBase;
};

type CreateScriptGateState =
  | { status: "idle" }
  | { message: string; reason: string; roomSlug: string; roomTitle: string; status: "blocked" }
  | { status: "drafting" }
  | { message: string; status: "error" }
  | { status: "drafted" };

function downloadFile(file: ScreenplayExportFile) {
  const contents =
    typeof file.contents === "string"
      ? file.contents
      : (Uint8Array.from(file.contents).buffer as ArrayBuffer);
  const blob = new Blob([contents], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function generatedDraftBody(markdown: string) {
  const marker = "## Generated screenplay draft";
  const markerIndex = markdown.indexOf(marker);
  if (markerIndex === -1) return "";

  return markdown.slice(markerIndex + marker.length).trim();
}

function randomBlockedMessage(roomTitle: string) {
  const template =
    CREATE_SCRIPT_BLOCKED_MESSAGES[Math.floor(Math.random() * CREATE_SCRIPT_BLOCKED_MESSAGES.length)] ??
    CREATE_SCRIPT_BLOCKED_MESSAGES[0];

  return template.replace("{room}", roomTitle);
}

export function DraftsRoom() {
  const [drafts, setDrafts] = useState<SavedDraft[]>(() => loadSavedDrafts());
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? null;
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [status, setStatus] = useState("");

  function openDraft(draft: SavedDraft) {
    setSelectedDraftId(draft.id);
    setEditingTitle(draft.title);
    setEditingBody(draft.body);
    setStatus("");
  }

  function saveDraftEdits() {
    if (!selectedDraft) return;

    const updatedDrafts = updateSavedDraft(selectedDraft.id, {
      body: editingBody,
      title: editingTitle,
    });
    setDrafts(updatedDrafts);
    setStatus("Draft saved.");
  }

  function deleteDraft(id: string) {
    if (!window.confirm("Delete this saved draft? This cannot be undone.")) return;

    const updatedDrafts = deleteSavedDraft(id);
    setDrafts(updatedDrafts);
    if (selectedDraftId === id) {
      setSelectedDraftId(null);
      setEditingBody("");
      setEditingTitle("");
    }
    setStatus("Draft deleted.");
  }

  function closeDraft() {
    setSelectedDraftId(null);
    setEditingBody("");
    setEditingTitle("");
    setStatus("");
  }

  return (
    <section aria-label="Saved screenplay drafts" className={styles.draftsRoomPanel}>
      <div className={styles.parameterIntro}>
        <p className={styles.stepMeta}>Saved drafts</p>
        <h2>Drafts the writer decided not to abandon in a ditch.</h2>
      </div>

      {selectedDraft ? (
        <div className={styles.draftEditorPanel}>
          <label className={styles.parameterField}>
            <span>Draft title</span>
            <input
              aria-label="Draft title"
              onChange={(event) => setEditingTitle(event.target.value)}
              value={editingTitle}
            />
          </label>
          <label className={styles.parameterField}>
            <span>Draft body</span>
            <textarea
              aria-label="Draft body"
              className={styles.editorTextarea}
              onChange={(event) => setEditingBody(event.target.value)}
              value={editingBody}
            />
          </label>
          <div className={styles.scriptDraftActions}>
            <button className={styles.primaryButton} onClick={saveDraftEdits} type="button">
              Save draft edits
            </button>
            <button className={styles.secondaryButton} onClick={closeDraft} type="button">
              Back to drafts
            </button>
            <button className={styles.dangerButton} onClick={() => deleteDraft(selectedDraft.id)} type="button">
              Delete draft
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.draftListPanel}>
          {drafts.length > 0 ? (
            drafts.map((draft) => (
              <article className={styles.draftListItem} key={draft.id}>
                <button
                  aria-label={`Edit ${draft.title}`}
                  className={styles.draftTitleButton}
                  onClick={() => openDraft(draft)}
                  type="button"
                >
                  <span>Edit {draft.title}</span>
                  <small>Saved {new Date(draft.updatedAt).toLocaleString()}</small>
                </button>
                <button className={styles.draftDeleteButton} onClick={() => deleteDraft(draft.id)} type="button">
                  Delete {draft.title}
                </button>
              </article>
            ))
          ) : (
            <p className={styles.nudge}>No saved drafts yet. Save one from Create the Script when a draft earns its keep.</p>
          )}
        </div>
      )}

      {status ? (
        <p aria-live="polite" className={styles.exportHint}>
          {status}
        </p>
      ) : null}
    </section>
  );
}

export function CreateScriptRoom({ markdown, onMarkdownChange, project }: CreateScriptRoomProps) {
  const readiness = useMemo(() => getScriptReadiness(project.rooms), [project.rooms]);
  const [gateState, setGateState] = useState<CreateScriptGateState>({ status: "idle" });
  const [writingStyle, setWritingStyle] = useState(defaultWritingStyleId);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const exportMenuId = useId();
  const draftBody = generatedDraftBody(markdown);
  const hasDraft = draftBody.length > 0;

  async function requestDraft() {
    if (!readiness.ready) {
      const missing = readiness.missingRooms[0];
      if (!missing) return;

      setGateState({
        message: randomBlockedMessage(missing.room.title),
        reason: missing.reason,
        roomSlug: missing.room.slug,
        roomTitle: missing.room.title,
        status: "blocked",
      });
      return;
    }

    if (
      hasDraft &&
      !window.confirm("Replace the generated draft in this room? Save it to Drafts first if you want to keep it.")
    ) {
      return;
    }

    setGateState({ status: "drafting" });

    try {
      const response = await fetch("/api/hermes-cowriter", {
        method: "POST",
        headers: cowriterRequestHeaders(),
        body: JSON.stringify({
          mode: "draft",
          room: "Create the Script",
          markdown: buildDraftContextMarkdown(project.rooms),
          writingStyle,
          answers: project.answers,
          summary: project.summary,
        }),
      });
      const data = (await response.json()) as { output?: string; error?: string };

      if (!response.ok) {
        setGateState({ message: data.error ?? "The goblin failed to draft the script.", status: "error" });
        return;
      }

      const output = data.output?.trim() || "The goblin came back empty. Rude.";
      onMarkdownChange(`# Create the Script Room\n\n## Generated screenplay draft\n${output}\n`);
      setExportMenuOpen(false);
      setSaveStatus("");
      setGateState({ status: "drafted" });
    } catch (caught) {
      setGateState({
        message: caught instanceof Error ? caught.message : "The goblin failed to draft the script.",
        status: "error",
      });
    }
  }

  function deleteDraftOutput() {
    if (!window.confirm("Delete the generated draft from this room? Saved drafts will stay in Drafts.")) return;

    onMarkdownChange("# Create the Script Room\n\n");
    setExportMenuOpen(false);
    setSaveStatus("");
    setGateState({ status: "idle" });
  }

  function saveDraftOutput() {
    const savedDraft = saveNewDraft(draftBody);
    setSaveStatus(savedDraft ? "Saved to Drafts room." : "Nothing to save yet.");
  }

  function exportDraft(format: ScreenplayExportFormatId) {
    downloadFile(buildScreenplayExportFile({ ...project.rooms, "create-script": markdown }, format));
    setExportMenuOpen(false);
  }

  function exportAllDraftFormats() {
    const rooms = { ...project.rooms, "create-script": markdown };
    for (const format of screenplayExportFormats) {
      downloadFile(buildScreenplayExportFile(rooms, format.id));
    }
    setExportMenuOpen(false);
  }

  return (
    <section aria-label="Create the Script draft gate" className={styles.scriptGatePanel}>
      <div aria-label="Huge Create the Script goblin" className={styles.scriptGateGoblin} role="img">
        <span className={styles.scriptGateGoblinGlasses} data-mascot-part="glasses" />
        <span className={styles.scriptGateGoblinMouth} />
        <span className={styles.scriptGateGoblinFang} data-mascot-part="fang" />
      </div>

      <div className={styles.scriptGateCopy}>
        <p className={styles.stepMeta}>Draft checkpoint</p>
        <h2>Summon the goblin when the script has bones.</h2>
        <p>
          The goblin checks the core story rooms and draft rules before drafting. If the story is still underfed, it
          points to the room that needs work instead of inventing your movie for you.
        </p>
      </div>

      <div className={styles.scriptGateLinks}>
        <label className={`${styles.parameterField} ${styles.scriptGateStyleField}`}>
          <span>Writing style</span>
          <select
            aria-label="Writing style"
            onChange={(event) => setWritingStyle(event.target.value)}
            value={writingStyle}
          >
            {writingStyleOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className={`${styles.primaryButton} ${styles.goblinDraftButton}`}
          disabled={gateState.status === "drafting"}
          onClick={requestDraft}
          type="button"
        >
          {gateState.status === "drafting" ? "Goblin is writing..." : "Please Oh Mighty Goblin. Write a draft."}
        </button>
      </div>

      {gateState.status === "blocked" ? (
        <div className={styles.scriptGateNotice} role="status">
          <p>{gateState.message}</p>
          <small>{gateState.reason}</small>
          <Link
            className={`${styles.primaryButton} ${styles.attentionButton} ${styles.scriptGateQuestButton}`}
            href={`/rooms/${gateState.roomSlug}`}
          >
            {gateState.roomTitle} - take me there
          </Link>
        </div>
      ) : null}

      {gateState.status === "error" ? (
        <div className={styles.scriptGateNotice} role="alert">
          <p>{gateState.message}</p>
        </div>
      ) : null}

      {gateState.status === "drafted" || hasDraft ? (
        <div className={styles.scriptGateNotice} role="status">
          <p>The goblin wrote a draft from the filled rooms. Dangerous. Promising. Finally.</p>
          <textarea
            aria-label="Create the Script markdown"
            className={styles.editorTextarea}
            onChange={(event) => onMarkdownChange(event.target.value)}
            value={markdown}
          />
          <div className={styles.scriptDraftActions}>
            <button className={styles.dangerButton} onClick={deleteDraftOutput} type="button">
              Delete draft
            </button>
            <span className={styles.scriptSaveAction}>
              <button className={styles.primaryButton} onClick={saveDraftOutput} type="button">
                Save draft
              </button>
              <small>Saves to Drafts room.</small>
            </span>
            <button
              className={`${styles.secondaryButton} ${styles.goblinDraftButton}`}
              disabled={gateState.status === "drafting"}
              onClick={requestDraft}
              type="button"
            >
              Goblin, make me another.
            </button>
            <div className={styles.scriptExportMenu}>
              <button
                aria-controls={exportMenuId}
                aria-expanded={exportMenuOpen}
                aria-haspopup="menu"
                className={styles.secondaryButton}
                onClick={() => setExportMenuOpen((current) => !current)}
                type="button"
              >
                Export draft
              </button>
              {exportMenuOpen ? (
                <div className={styles.scriptExportChoices} id={exportMenuId}>
                  <button
                    className={`${styles.settingsAction} ${styles.settingsAllAction}`}
                    onClick={exportAllDraftFormats}
                    type="button"
                  >
                    Export all formats
                  </button>
                  {screenplayExportFormats.map((format) => (
                    <button
                      className={styles.settingsAction}
                      key={format.id}
                      onClick={() => exportDraft(format.id)}
                      type="button"
                    >
                      Export {format.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {saveStatus ? (
            <small aria-live="polite" className={styles.scriptDraftStatus}>
              {saveStatus}
            </small>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CreateScriptGuidanceMeters({ roomProgress }: { roomProgress: ScriptRoomProgress[] }) {
  const unfinishedRooms = roomProgress.filter((progress) => progress.remaining > 0);
  const blockingRooms = unfinishedRooms.filter((progress) => progress.blocksDraft);

  if (unfinishedRooms.length === 0) {
    return <p className={styles.nudge}>Every required room has enough material for the draft gate.</p>;
  }

  return (
    <div aria-label="Create the Script readiness meters" className={styles.guidanceMeters}>
      {blockingRooms.length === 0 ? (
        <p className={styles.guidanceReadyEnough}>
          Ready enough to draft. These gaps are optional polish if you want sharper pages.
        </p>
      ) : null}
      {unfinishedRooms.map((progress) => (
        <div className={styles.guidanceMeterRow} key={progress.room.slug}>
          <div className={styles.guidanceMeterHeader}>
            <strong>{progress.room.title}</strong>
            <span>{progress.percent}%</span>
          </div>
          <div
            aria-label={`${progress.room.title} readiness`}
            aria-valuemax={progress.total}
            aria-valuemin={0}
            aria-valuenow={progress.completed}
            className={styles.guidanceMeterTrack}
            role="progressbar"
          >
            <span className={styles.guidanceMeterFill} style={{ width: `${progress.percent}%` }} />
          </div>
          <div className={styles.guidanceMeterFooter}>
            <span>
              {progress.completed} filled / {progress.remaining} to go
            </span>
            <Link
              aria-label={`${progress.room.title} - take me there`}
              className={styles.guidanceMeterButton}
              href={`/rooms/${progress.room.slug}`}
            >
              Take me there
            </Link>
          </div>
          {progress.missingRequirements.length > 0 ? (
            <small className={styles.guidanceMeterMissing}>
              Still needs: {progress.missingRequirements.join(", ")}
            </small>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ScriptParametersEditor({ markdown, onMarkdownChange }: ScriptParametersEditorProps) {
  const parsedValues = useMemo(() => parseScriptParameters(markdown), [markdown]);
  const [editingValues, setEditingValues] = useState<ScriptParameterValues | null>(null);
  const [focusedParameterField, setFocusedParameterField] = useState<keyof ScriptParameterValues | null>(null);
  const values = editingValues ?? parsedValues;

  function updateParameters(patch: Partial<ScriptParameterValues>) {
    const nextValues = { ...values, ...patch };
    if (editingValues) setEditingValues(nextValues);
    onMarkdownChange(formatScriptParameters(nextValues));
  }

  function parameterPlaceholder(field: keyof ScriptParameterValues, placeholder: string) {
    return focusedParameterField === field ? "" : placeholder;
  }

  function blurParameterField() {
    setFocusedParameterField(null);
    setEditingValues(null);
  }

  function focusParameterField(field: keyof ScriptParameterValues) {
    setFocusedParameterField(field);
    setEditingValues(values);
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

  function choiceButtonGroup(label: string, field: keyof ScriptParameterValues, options: string[], description?: string) {
    return (
      <fieldset className={styles.parameterChoiceGroup}>
        <legend className={styles.parameterChoiceLabel}>{label}</legend>
        {description ? <p className={styles.parameterChoiceDescription}>{description}</p> : null}
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
            name="genre"
            onBlur={blurParameterField}
            onChange={(event) => updateParameters({ genre: event.target.value })}
            onFocus={() => focusParameterField("genre")}
            placeholder={parameterPlaceholder("genre", "Sports comedy, horror romance, contained thriller...")}
            value={values.genre}
          />
        </label>
        <label className={styles.parameterField}>
          <span>Audience feeling</span>
          <input
            name="audienceFeeling"
            onBlur={blurParameterField}
            onChange={(event) => updateParameters({ audienceFeeling: event.target.value })}
            onFocus={() => focusParameterField("audienceFeeling")}
            placeholder={parameterPlaceholder("audienceFeeling", "Hopeful and tense")}
            value={values.audienceFeeling}
          />
        </label>
        <label className={styles.parameterField}>
          <span>Tone words</span>
          <input
            name="toneWords"
            onBlur={blurParameterField}
            onChange={(event) => updateParameters({ toneWords: event.target.value })}
            onFocus={() => focusParameterField("toneWords")}
            placeholder={parameterPlaceholder("toneWords", "Warm, mean-funny, eerie, grounded...")}
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
        {choiceButtonGroup("Structure", "structureMode", STRUCTURE_MODES, "The big organizing pattern for the draft.")}
        {choiceButtonGroup("Rhythm", "pacingBias", PACING_BIASES, "How momentum should feel from sequence to sequence.")}
        {choiceButtonGroup("Scene length", "sceneLength", SCENE_LENGTHS, "How much room each scene gets on the page.")}
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
            name="format"
            onBlur={blurParameterField}
            onChange={(event) => updateParameters({ format: event.target.value })}
            onFocus={() => focusParameterField("format")}
            placeholder={parameterPlaceholder("format", "Standard spec screenplay format")}
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
        {choiceButtonGroup("Budget reality", "budgetReality", BUDGET_REALITIES)}
        <label className={styles.parameterField}>
          <span>Location limits</span>
          <input
            name="locationLimits"
            onBlur={blurParameterField}
            onChange={(event) => updateParameters({ locationLimits: event.target.value })}
            onFocus={() => focusParameterField("locationLimits")}
            placeholder={parameterPlaceholder("locationLimits", "One diner, three city blocks, road movie...")}
            value={values.locationLimits}
          />
        </label>
        <label className={styles.parameterField}>
          <span>Time period / setting rules</span>
          <input
            name="timePeriod"
            onBlur={blurParameterField}
            onChange={(event) => updateParameters({ timePeriod: event.target.value })}
            onFocus={() => focusParameterField("timePeriod")}
            placeholder={parameterPlaceholder("timePeriod", "Modern day, 1998, no phones, rural Texas...")}
            value={values.timePeriod}
          />
        </label>
        <label className={styles.parameterField}>
          <span>No-go content</span>
          <textarea
            name="noGoContent"
            onBlur={blurParameterField}
            onChange={(event) => updateParameters({ noGoContent: event.target.value })}
            onFocus={() => focusParameterField("noGoContent")}
            placeholder={parameterPlaceholder("noGoContent", "Anything the AI should avoid inventing or showing.")}
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
            name="primaryPov"
            onBlur={blurParameterField}
            onChange={(event) => updateParameters({ primaryPov: event.target.value })}
            onFocus={() => focusParameterField("primaryPov")}
            placeholder={parameterPlaceholder("primaryPov", "The protagonist, alternating leads, ensemble...")}
            value={values.primaryPov}
          />
        </label>
        {choiceButtons("sceneAccess", SCENE_ACCESS_OPTIONS)}
      </section>
    </section>
  );
}
