"use client";

import Link from "next/link";
import { type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/workspace.module.css";
import {
  buildScriptBase,
  createLoglineSuggestions,
  guidedSetupQuestions,
  NEEDS_ANSWER,
  NEEDS_WRITING,
  type ScriptBase,
  type SetupAnswers,
} from "@/lib/guidedSetup";
import { saveProject } from "@/lib/projectStorage";

function splitSelectedOptions(value: string) {
  return value
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);
}

function optionIsSelected(value: string, option: string) {
  return splitSelectedOptions(value).some((piece) => piece.toLowerCase() === option.toLowerCase());
}

function getAcceptedLogline(project: ScriptBase) {
  const match = project.rooms.premise.match(/## Polished logline\n([^\n]+)/);
  const logline = match?.[1]?.trim() ?? "";

  if (!logline || logline.startsWith(NEEDS_ANSWER) || logline.startsWith("[Needs answer]") || logline.startsWith(NEEDS_WRITING)) {
    return "";
  }

  return logline;
}

const answerPathLabels: Record<(typeof guidedSetupQuestions)[number]["id"], string> = {
  rawIdea: "Idea",
  genre: "Kind",
  audienceFeeling: "Feeling",
  protagonist: "Hero",
  surfaceWant: "Want",
  stakes: "Stakes",
  falseBelief: "Lie",
  opposition: "Wall",
  endingDirection: "End",
  structurePreference: "Shape",
};

export function GuidedSetupClient() {
  const [answers, setAnswers] = useState<SetupAnswers>({ structurePreference: "Classic 3-act spine" });
  const [step, setStep] = useState(0);
  const [draftValue, setDraftValue] = useState("");
  const [completedProject, setCompletedProject] = useState<ScriptBase | null>(null);
  const [loglineSuggestions, setLoglineSuggestions] = useState<string[]>([]);
  const [loglineSuggestionIndex, setLoglineSuggestionIndex] = useState(0);
  const answerBoxRef = useRef<HTMLTextAreaElement>(null);

  const question = guidedSetupQuestions[step];
  const stepNumber = Math.min(step + 1, guidedSetupQuestions.length);
  const progress = `${stepNumber} / ${guidedSetupQuestions.length}`;
  const progressFraction = stepNumber / guidedSetupQuestions.length;

  const answerPathAnswers = useMemo(() => {
    return question ? { ...answers, [question.id]: draftValue.trim() } : answers;
  }, [answers, draftValue, question]);

  useEffect(() => {
    if (!completedProject) {
      answerBoxRef.current?.focus({ preventScroll: true });
    }
  }, [completedProject, step]);

  function selectOption(option: string) {
    if (!question.multiple) {
      setDraftValue(option);
      answerBoxRef.current?.focus({ preventScroll: true });
      return;
    }

    const currentPieces = splitSelectedOptions(draftValue);
    const isSelected = optionIsSelected(draftValue, option);
    const nextPieces = isSelected
      ? currentPieces.filter((piece) => piece.toLowerCase() !== option.toLowerCase())
      : [...currentPieces, option];

    setDraftValue(nextPieces.join(", "));
    answerBoxRef.current?.focus({ preventScroll: true });
  }

  function saveCurrentAnswer(value = draftValue) {
    return question ? { ...answers, [question.id]: value.trim() } : answers;
  }

  function loadStep(nextStep: number, nextAnswers: SetupAnswers) {
    const nextQuestion = guidedSetupQuestions[nextStep];

    setAnswers(nextAnswers);
    setDraftValue(nextQuestion ? nextAnswers[nextQuestion.id] ?? "" : "");
    setStep(nextStep);
  }

  function moveNext(value = draftValue) {
    const nextAnswers = question ? { ...answers, [question.id]: value.trim() } : answers;

    if (step >= guidedSetupQuestions.length - 1) {
      const project = buildScriptBase(nextAnswers);
      setAnswers(nextAnswers);
      setDraftValue("");
      saveProject(project);
      setCompletedProject(project);
      return;
    }

    loadStep(step + 1, nextAnswers);
  }

  function skipQuestion() {
    moveNext("");
  }

  function moveBack() {
    if (step === 0) return;
    loadStep(step - 1, saveCurrentAnswer());
  }

  function jumpToAnswer(nextStep: number) {
    if (nextStep === step) return;
    loadStep(nextStep, saveCurrentAnswer());
  }

  function handleAnswerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    moveNext();
  }

  function acceptLogline(logline: string) {
    if (!completedProject) return;
    const updatedProject: ScriptBase = {
      ...completedProject,
      rooms: {
        ...completedProject.rooms,
        premise: completedProject.rooms.premise.replace(
          /## Polished logline\n[^\n]*/,
          `## Polished logline\n${logline}`,
        ),
      },
      updatedAt: new Date().toISOString(),
    };
    saveProject(updatedProject);
    setCompletedProject(updatedProject);
    setLoglineSuggestions([]);
    setLoglineSuggestionIndex(0);
  }

  function suggestLogline() {
    if (!completedProject) return;

    const nextSuggestions = createLoglineSuggestions(completedProject.answers);
    const nextIndex = loglineSuggestions.length > 0 ? (loglineSuggestionIndex + 1) % nextSuggestions.length : 0;

    setLoglineSuggestions(nextSuggestions);
    setLoglineSuggestionIndex(nextIndex);
  }

  if (completedProject) {
    const acceptedLogline = getAcceptedLogline(completedProject);
    const suggestedLogline = loglineSuggestions[loglineSuggestionIndex] ?? "";

    return (
      <div className={styles.summaryPanel}>
        <p className={styles.stepMeta}>Setup complete</p>
        <h1>Here is what the goblin thinks your movie is.</h1>

        <div className={styles.summaryGrid}>
          <section className={styles.summaryBox}>
            <h2>Strongest known pieces</h2>
            {completedProject.summary.strongestKnownPieces.length > 0 ? (
              <ul>
                {completedProject.summary.strongestKnownPieces.map((piece) => (
                  <li key={piece}>{piece}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.nudge}>The goblin has almost nothing. Brave, but inconvenient.</p>
            )}
          </section>

          <section className={styles.summaryBox}>
            <h2>Goblin complaints</h2>
            {completedProject.summary.goblinWarnings.length > 0 ? (
              <ul>
                {completedProject.summary.goblinWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.nudge}>No major complaints yet. Suspicious.</p>
            )}
            <p className={styles.savedLine}>{completedProject.summary.needsAnswerCount} unanswered slots remain.</p>
          </section>
        </div>

        <section className={styles.loglineBox}>
          <h2>Polished loglines</h2>
          <p className={styles.nudge}>Annoy the goblin for a cleaner logline based on the setup answers so far.</p>
          <div className={styles.actionRow}>
            <button
              className={`${styles.fieldSuggestButton} ${styles.goblinSuggestButton} ${styles.loglineSuggestButton}`}
              onClick={suggestLogline}
              type="button"
            >
              Annoy the goblin for logline
            </button>
          </div>
          {acceptedLogline ? (
            <div className={styles.acceptedLogline}>
              <p className={styles.acceptedLabel}>Accepted logline</p>
              <p>{acceptedLogline}</p>
              <p className={styles.savedLine}>Saved to the Premise room.</p>
            </div>
          ) : null}
          {suggestedLogline ? (
            <div className={styles.loglineSuggestion}>
              <p>{suggestedLogline}</p>
              <div className={styles.fieldSuggestionActions}>
                <button className={styles.fieldUseSuggestionButton} onClick={() => acceptLogline(suggestedLogline)} type="button">
                  Use suggestion
                </button>
                <button
                  className={`${styles.fieldUseSuggestionButton} ${styles.goblinSuggestButton}`}
                  onClick={suggestLogline}
                  type="button"
                >
                  Another suggestion
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className={styles.actionRow}>
          <Link className={styles.primaryButton} href="/rooms">
            Enter rooms
          </Link>
          <Link className={styles.ghostButton} href="/guided-setup">
            Start over
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className={styles.heroPanel}>
      <p className={styles.stepMeta}>Script Setup Goblin · {progress}</p>
      <div
        aria-label="Setup progress"
        aria-valuemax={guidedSetupQuestions.length}
        aria-valuemin={0}
        aria-valuenow={stepNumber}
        className={styles.progressTrack}
        role="progressbar"
        style={{ "--progress": progressFraction } as CSSProperties}
      >
        <span className={styles.progressFill} />
      </div>
      <div className={styles.stepBody} key={step}>
        <h1>{question.title}</h1>
        <p className={styles.lede}>{question.goblinNudge}</p>

        <form
          className={styles.questionForm}
          onSubmit={(event) => {
            event.preventDefault();
            moveNext();
          }}
        >
          {question.options ? (
            <div className={styles.optionRow}>
              {question.options.map((option) => {
                const isSelected = question.multiple && optionIsSelected(draftValue, option);

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`${styles.secondaryButton} ${isSelected ? styles.selectedOption : ""}`}
                    key={option}
                    onClick={() => selectOption(option)}
                    type="button"
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : null}

          <label>
            Your answer
            <textarea
              className={styles.textarea}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={handleAnswerKeyDown}
              placeholder={question.placeholder}
              ref={answerBoxRef}
              value={draftValue}
            />
          </label>

          <p className={styles.nudge}>
            <strong>Skip rule:</strong> allowed. Cowardly, but allowed. Skipped answers become [needs your answer] goblin guesses.
          </p>

          <div className={styles.actionRow}>
            {step > 0 ? (
              <button className={styles.ghostButton} onClick={moveBack} type="button">
                Back
              </button>
            ) : null}
            <button className={styles.primaryButton} type="submit">
              {step >= guidedSetupQuestions.length - 1 ? "Create script base" : "Next"}
            </button>
            <button className={styles.ghostButton} onClick={skipQuestion} type="button">
              Skip, cowardly but allowed
            </button>
          </div>

          <nav aria-label="Answer path" className={styles.answerPath}>
            {guidedSetupQuestions.map((setupQuestion, index) => {
              const answer = answerPathAnswers[setupQuestion.id]?.trim();
              const isCurrentStep = index === step;

              return (
                <button
                  aria-current={isCurrentStep ? "step" : undefined}
                  aria-label={`Go to answer ${index + 1}: ${setupQuestion.title}`}
                  className={`${styles.answerPathButton} ${isCurrentStep ? styles.currentAnswerPathButton : ""}`}
                  key={setupQuestion.id}
                  onClick={() => jumpToAnswer(index)}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <strong>{answerPathLabels[setupQuestion.id]}</strong>
                  <small>{answer ? "Answered" : "Blank"}</small>
                </button>
              );
            })}
          </nav>
        </form>
      </div>
    </section>
  );
}
