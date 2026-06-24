"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/app/workspace.module.css";
import { clearSavedDrafts } from "@/lib/draftStorage";
import { LEGACY_NEEDS_ANSWER, NEEDS_ANSWER, NEEDS_WRITING, type ScriptBase } from "@/lib/guidedSetup";
import { clearProject, ensureProject, hasCompletedGuidedSetup } from "@/lib/projectStorage";
import { getActiveRooms, getComingSoonRooms, getScriptReadiness } from "@/lib/storyRooms";

export function RoomsDashboardClient() {
  const router = useRouter();
  const [project, setProject] = useState<ScriptBase | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setProject(ensureProject()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function startNewProject() {
    const confirmed = window.confirm(
      "Start a new project? This will wipe all information for this script from this browser, including saved drafts. It cannot be retrieved again.",
    );
    if (!confirmed) return;

    clearProject();
    clearSavedDrafts();
    setProject(null);
    setShowResetDialog(true);
  }

  function runGuidedSetupAgain() {
    setShowResetDialog(false);
    router.push("/guided-setup");
  }

  const activeRooms = getActiveRooms();
  const comingSoonRooms = getComingSoonRooms();
  const readiness = project ? getScriptReadiness(project.rooms) : null;
  const nextRoom = readiness?.missingRooms[0]?.room;
  const guidedSetupLabel = hasCompletedGuidedSetup(project) ? "Run guided setup again" : "Run guided setup";

  return (
    <>
      <section className={styles.heroPanel}>
        <p className={styles.stepMeta}>Rooms dashboard</p>
        <h1>The goblin filed your chaos into rooms.</h1>
        <p className={styles.lede}>
          Edit the markdown rooms directly. Autosave is local to this browser, so export often unless you enjoy avoidable tragedy.
        </p>
        <div className={styles.actionRow}>
          <Link className={styles.primaryButton} href="/guided-setup">
            {guidedSetupLabel}
          </Link>
          <button className={styles.dangerButton} onClick={startNewProject} type="button">
            Start a new project
          </button>
        </div>
        {nextRoom ? (
          <div className={styles.nextRoomCallout}>
            <div>
              <span>Next best room</span>
              <strong>{nextRoom.title}</strong>
              <p>{readiness?.missingRooms[0]?.reason ?? nextRoom.guidingQuestion}</p>
            </div>
            <Link className={styles.primaryButton} href={`/rooms/${nextRoom.slug}`}>
              Open {nextRoom.title}
            </Link>
          </div>
        ) : project ? (
          <div className={styles.nextRoomCallout}>
            <div>
              <span>Draft path</span>
              <strong>The story spine is ready enough to draft.</strong>
              <p>Head to Create the Script, save the draft you like, then export it before the browser forgets its manners.</p>
            </div>
            <Link className={styles.primaryButton} href="/rooms/create-script">
              Open Create the Script
            </Link>
          </div>
        ) : null}
      </section>

      <section aria-label="Editable MVP rooms">
        <div className={styles.grid}>
          {activeRooms.map((room, index) => {
            const markdown = project?.rooms[room.slug] ?? "";
            const needsAnswer = markdown.includes(NEEDS_ANSWER) || markdown.includes(LEGACY_NEEDS_ANSWER);
            const needsWriting = markdown.includes(NEEDS_WRITING);
            const statusLabel = needsAnswer ? "Needs your answers" : needsWriting ? "Needs writing" : "Seeded";
            return (
              <Link className={styles.card} href={`/rooms/${room.slug}`} key={room.slug}>
                <div className={styles.topline}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <code>{room.markdownFile}</code>
                </div>
                <h2>{room.title}</h2>
                <p>{room.purpose}</p>
                <span className={styles.statusPill}>{statusLabel}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-label="Coming soon rooms">
        <div className={styles.grid}>
          {comingSoonRooms.map((room) => (
            <article className={`${styles.card} ${styles.cardMuted}`} key={room.slug}>
              <div className={styles.topline}>
                <span>Coming soon</span>
                <code>{room.markdownFile}</code>
              </div>
              <h3>{room.title}</h3>
              <p>{room.purpose}</p>
            </article>
          ))}
        </div>
      </section>

      {showResetDialog ? (
        <div className={styles.modalOverlay}>
          <section aria-label="Script wiped" aria-modal="true" className={styles.modalDialog} role="dialog">
            <div className={styles.modalHeader}>
              <p>Script wiped</p>
            </div>
            <p className={styles.modalLede}>All information for this script has been wiped from this browser.</p>
            <p className={styles.modalLede}>Would you like to run the guided setup again?</p>
            <div className={styles.actionRow}>
              <button className={styles.primaryButton} onClick={runGuidedSetupAgain} type="button">
                Yes
              </button>
              <button className={styles.secondaryButton} onClick={() => setShowResetDialog(false)} type="button">
                No
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
