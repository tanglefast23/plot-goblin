"use client";

import { useState } from "react";
import styles from "@/app/workspace.module.css";

type HermesCowriterProps = {
  mode: "followup" | "suggestions" | "room";
  label: string;
  payload: Record<string, unknown>;
};

const ACCESS_KEY_STORAGE_KEY = "plot-goblin-ai-access-key";

function storedAccessKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY) ?? "";
}

export function HermesCowriter({ mode, label, payload }: HermesCowriterProps) {
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accessKey, setAccessKey] = useState(storedAccessKey);

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
      {output ? <div className={styles.cowriterOutput}>{output}</div> : null}
    </section>
  );
}
