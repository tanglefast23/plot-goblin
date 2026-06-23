"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/app/workspace.module.css";
import {
  buildScriptBase,
  createLoglineSuggestions,
  guidedSetupQuestions,
  type ScriptBase,
  type SetupAnswers,
} from "@/lib/guidedSetup";
import { saveProject } from "@/lib/projectStorage";
import { HermesCowriter } from "./HermesCowriter";

function splitSelectedOptions(value: string) {
  return value
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);
}

function optionIsSelected(value: string, option: string) {
  return splitSelectedOptions(value).some((piece) => piece.toLowerCase() === option.toLowerCase());
}

export function GuidedSetupClient() {
  const [answers, setAnswers] = useState<SetupAnswers>({ structurePreference: "Classic 3-act spine" });
  const [step, setStep] = useState(0);
  const [draftValue, setDraftValue] = useState("");
  const [completedProject, setCompletedProject] = useState<ScriptBase | null>(null);
  const [loglineSuggestions, setLoglineSuggestions] = useState<string[]>([]);

  const question = guidedSetupQuestions[step];
  const progress = `${Math.min(step + 1, guidedSetupQuestions.length)} / ${guidedSetupQuestions.length}`;

  const selectedAnswer = useMemo(() => {
    if (!question) return "";
    return draftValue || answers[question.id] || "";
  }, [answers, draftValue, question]);

  function selectOption(option: string) {
    if (!question.multiple) {
      setDraftValue(option);
      return;
    }

    const currentPieces = splitSelectedOptions(selectedAnswer);
    const isSelected = optionIsSelected(selectedAnswer, option);
    const nextPieces = isSelected
      ? currentPieces.filter((piece) => piece.toLowerCase() !== option.toLowerCase())
      : [...currentPieces, option];

    setDraftValue(nextPieces.join(", "));
  }

  function moveNext(value: string) {
    const nextAnswers = question ? { ...answers, [question.id]: value.trim() } : answers;
    setAnswers(nextAnswers);
    setDraftValue("");

    if (step >= guidedSetupQuestions.length - 1) {
      const project = buildScriptBase(nextAnswers);
      saveProject(project);
      setCompletedProject(project);
      return;
    }

    setStep((current) => current + 1);
  }

  function skipQuestion() {
    moveNext("");
  }

  function acceptLogline(logline: string) {
    if (!completedProject) return;
    const updatedProject: ScriptBase = {
      ...completedProject,
      rooms: {
        ...completedProject.rooms,
        premise: completedProject.rooms.premise.replace("## Polished logline\n[Needs answer]", `## Polished logline\n${logline}`),
      },
      updatedAt: new Date().toISOString(),
    };
    saveProject(updatedProject);
    setCompletedProject(updatedProject);
  }

  if (completedProject) {
    const suggestions = loglineSuggestions.length > 0 ? loglineSuggestions : [];

    return (
      <div className={styles.summaryPanel}>
        <p className={styles.stepMeta}>Setup complete</p>
        <h1>Here is what the goblin thinks your movie is.</h1>
        <p className={styles.lede}>{completedProject.summary.oneLine}</p>

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
          <h2>Polished logline</h2>
          <p className={styles.nudge}>Working notes came first. Now you can ask for two cleaner options and accept one.</p>
          <div className={styles.actionRow}>
            <button
              className={`${styles.secondaryButton} ${styles.attentionButton}`}
              onClick={() => setLoglineSuggestions(createLoglineSuggestions(completedProject.answers))}
              type="button"
            >
              Make it sound less like a parking ticket
            </button>
          </div>
          {suggestions.map((suggestion) => (
            <div className={styles.loglineSuggestion} key={suggestion}>
              <p>{suggestion}</p>
              <button className={styles.primaryButton} onClick={() => acceptLogline(suggestion)} type="button">
                Accept this one
              </button>
            </div>
          ))}
        </section>

        <HermesCowriter
          label="Ask one annoying follow-up"
          mode="followup"
          payload={{ answers: completedProject.answers, summary: completedProject.summary }}
        />

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
      <h1>{question.title}</h1>
      <p className={styles.lede}>{question.goblinNudge}</p>

      <form
        className={styles.questionForm}
        onSubmit={(event) => {
          event.preventDefault();
          moveNext(selectedAnswer);
        }}
      >
        {question.options ? (
          <div className={styles.optionRow}>
            {question.options.map((option) => {
              const isSelected = question.multiple && optionIsSelected(selectedAnswer, option);

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
            placeholder={question.placeholder}
            value={selectedAnswer}
          />
        </label>

        <p className={styles.nudge}>
          <strong>Skip rule:</strong> allowed. Cowardly, but allowed. Skipped answers become [Needs answer].
        </p>

        <div className={styles.actionRow}>
          <button className={styles.primaryButton} type="submit">
            {step >= guidedSetupQuestions.length - 1 ? "Create script base" : "Next"}
          </button>
          <button className={styles.ghostButton} onClick={skipQuestion} type="button">
            Skip, cowardly but allowed
          </button>
        </div>
      </form>
    </section>
  );
}
