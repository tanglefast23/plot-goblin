import { useEffect, useState } from "react";
import type { DraftRun } from "@/lib/draftRunStorage";
import styles from "@/app/workspace.module.css";
import {
  draftWaitingMessageDelayMs,
  draftWaitingMessages,
  randomDraftWaitingMessageIndex,
} from "./RoomEditorSupport";

type Props = {
  run: DraftRun | null;
  statusLine: string;
  error: string | null;
  stitched: string | null;
  onStart: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function FullScriptDirector({ run, statusLine, error, stitched, onStart, onResume, onStop, onReset }: Props) {
  const planning = !run && statusLine === "Planning the whole movie…";
  const running = planning || run?.status === "running" || run?.status === "planning";
  const paused = run?.status === "paused";
  const [draftWaitingMessageIndex, setDraftWaitingMessageIndex] = useState(0);
  const draftWaitingMessage = draftWaitingMessages[draftWaitingMessageIndex] ?? draftWaitingMessages[0];

  useEffect(() => {
    if (!planning) return;

    const interval = window.setInterval(() => {
      setDraftWaitingMessageIndex((currentIndex) => randomDraftWaitingMessageIndex(currentIndex));
    }, draftWaitingMessageDelayMs);

    return () => window.clearInterval(interval);
  }, [planning]);

  function startFullScript() {
    setDraftWaitingMessageIndex(0);
    onStart();
  }

  return (
    <section aria-label="Full script director" className={styles.scriptGatePanel}>
      {!run && (
        <button
          aria-label={planning ? `${draftWaitingMessage}...` : undefined}
          className={`${styles.primaryButton} ${styles.goblinDraftButton}`}
          disabled={planning}
          type="button"
          onClick={startFullScript}
        >
          {planning ? (
            <>
              <span>{draftWaitingMessage}</span>
              <span aria-label="Animated writing ellipsis" className={styles.writingEllipsis} role="img">
                <span aria-hidden="true">.</span>
                <span aria-hidden="true">.</span>
                <span aria-hidden="true">.</span>
              </span>
            </>
          ) : (
            "Write the full script"
          )}
        </button>
      )}

      {run && (
        <ol className={styles.summaryBox}>
          {run.completedBeats.map((beat) => (
            <li key={beat.indices.join("-")}>
              <span aria-hidden="true">✓</span> Beats {beat.indices.join(" & ")}: {beat.summary}
            </li>
          ))}
        </ol>
      )}

      {statusLine && (
        <p className={styles.scenePopulateStatus} role="status">
          {statusLine}
        </p>
      )}
      {error && (
        <p className={styles.fieldSuggestionError} role="alert">
          {error}
        </p>
      )}

      {running && (
        <button className={styles.secondaryButton} type="button" onClick={onStop}>
          Stop
        </button>
      )}

      {paused && (
        <div className={styles.actionRow}>
          <button className={styles.primaryButton} type="button" onClick={onResume}>
            Retry
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onResume}>
            Skip
          </button>
          <button className={styles.dangerButton} type="button" onClick={onReset}>
            Stop
          </button>
        </div>
      )}

      {stitched && (
        <article className={styles.scriptGateNotice}>
          <h3>Generated screenplay</h3>
          <pre className={styles.editorTextarea}>{stitched}</pre>
        </article>
      )}
    </section>
  );
}
