"use client";

import { useState } from "react";
import styles from "@/app/workspace.module.css";

type HermesCowriterProps = {
  mode: "followup" | "suggestions" | "room";
  label: string;
  payload: Record<string, unknown>;
};

export function HermesCowriter({ mode, label, payload }: HermesCowriterProps) {
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function askGoblin() {
    setIsLoading(true);
    setError("");
    setOutput("");

    try {
      const response = await fetch("/api/hermes-cowriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      <h2>Ask the local Hermes goblin</h2>
      <p className={styles.nudge}>
        Uses your local Hermes default model when this app is running on your Mac. On public Vercel, this fails closed.
      </p>
      <div className={styles.actionRow}>
        <button className={styles.primaryButton} disabled={isLoading} onClick={askGoblin} type="button">
          {isLoading ? "Summoning..." : label}
        </button>
      </div>
      {error ? <p className={styles.errorText}>{error}</p> : null}
      {output ? <div className={styles.cowriterOutput}>{output}</div> : null}
    </section>
  );
}
