"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/workspace.module.css";
import { extractCowriterNotes, parseCowriterChoices, type CowriterChoice } from "@/lib/cowriterChoices";
import { ACCESS_KEY_STORAGE_KEY } from "@/lib/cowriterAccess";

type HermesCowriterProps = {
  mode: "followup" | "suggestions" | "room";
  label: string;
  payload: Record<string, unknown>;
  onSelectChoice?: (choice: CowriterChoice) => void;
};

function storedAccessKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY) ?? "";
}

export function HermesCowriter({ mode, label, payload, onSelectChoice }: HermesCowriterProps) {
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accessKey, setAccessKey] = useState(storedAccessKey);
  const [appliedChoiceNumber, setAppliedChoiceNumber] = useState<number | null>(null);
  const choices = useMemo(() => (onSelectChoice ? parseCowriterChoices(output) : []), [onSelectChoice, output]);
  const outputNotes = choices.length > 0 ? extractCowriterNotes(output) : output;

  useEffect(() => {
    if (!onSelectChoice || choices.length === 0) return;
    const handleSelectChoice = onSelectChoice;

    function handleChoiceShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const choice = choices.find((candidate) => String(candidate.number) === event.key);
      if (!choice) return;

      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT" || activeElement?.isContentEditable) return;

      event.preventDefault();
      handleSelectChoice(choice);
      setAppliedChoiceNumber(choice.number);
    }

    window.addEventListener("keydown", handleChoiceShortcut);
    return () => window.removeEventListener("keydown", handleChoiceShortcut);
  }, [choices, onSelectChoice]);

  function selectChoice(choice: CowriterChoice) {
    if (!onSelectChoice) return;
    onSelectChoice(choice);
    setAppliedChoiceNumber(choice.number);
  }

  function updateAccessKey(value: string) {
    setAccessKey(value);
    if (typeof window === "undefined") return;

    const trimmed = value.trim();
    if (trimmed) {
      window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
    }
  }

  async function askGoblin() {
    setIsLoading(true);
    setError("");
    setOutput("");
    setAppliedChoiceNumber(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const trimmedAccessKey = accessKey.trim();
      if (trimmedAccessKey) {
        headers["x-plot-goblin-key"] = trimmedAccessKey;
      }

      const response = await fetch("/api/hermes-cowriter", {
        method: "POST",
        headers,
        body: JSON.stringify({ mode, ...payload }),
      });
      const data = (await response.json()) as { output?: string; error?: string };

      if (!response.ok) {
        setError(data.error ?? "The goblin bridge failed.");
        return;
      }

      setOutput(data.output ?? "The goblin stared at the wall and said nothing.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The goblin bridge failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.cowriterPanel}>
      <h2>Ask the Hermes goblin</h2>
      <p className={styles.nudge}>
        Local Mac runs Hermes directly. Public Vercel needs Joe&apos;s access key, then relays through the protected Hermes bridge.
      </p>
      <label className={styles.accessKeyLabel}>
        Access key for public site
        <input
          autoComplete="off"
          className={styles.accessKeyInput}
          onChange={(event) => updateAccessKey(event.target.value)}
          placeholder="Paste key here on Vercel; local Mac can leave this blank"
          type="password"
          value={accessKey}
        />
      </label>
      <div className={styles.actionRow}>
        <button className={styles.primaryButton} disabled={isLoading} onClick={askGoblin} type="button">
          {isLoading ? "Summoning..." : label}
        </button>
      </div>
      {error ? <p className={styles.errorText}>{error}</p> : null}
      {choices.length > 0 ? (
        <div aria-label="Goblin example choices" className={styles.cowriterChoices}>
          {choices.map((choice) => (
            <button
              aria-keyshortcuts={String(choice.number)}
              aria-label={`${choice.number}. ${choice.target ? `${choice.target}: ` : ""}${choice.text}`}
              aria-pressed={appliedChoiceNumber === choice.number}
              className={`${styles.cowriterChoice} ${appliedChoiceNumber === choice.number ? styles.appliedCowriterChoice : ""}`}
              key={`${choice.number}-${choice.text}`}
              onClick={() => selectChoice(choice)}
              type="button"
            >
              <span className={styles.cowriterChoiceNumber}>{choice.number}.</span>
              <span>
                {choice.target ? <strong>{choice.target}: </strong> : null}
                {choice.text}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {outputNotes ? <div className={styles.cowriterOutput}>{outputNotes}</div> : null}
    </section>
  );
}
