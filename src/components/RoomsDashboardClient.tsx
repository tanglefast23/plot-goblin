"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/workspace.module.css";
import { buildExportMarkdown, LEGACY_NEEDS_ANSWER, NEEDS_ANSWER, NEEDS_WRITING, type ScriptBase } from "@/lib/guidedSetup";
import { clearProject, ensureProject } from "@/lib/projectStorage";
import { getActiveRooms, getComingSoonRooms, getScriptReadiness } from "@/lib/storyRooms";

function downloadMarkdown(project: ScriptBase) {
  const blob = new Blob([buildExportMarkdown(project.rooms)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "plot-goblin-export.md";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function RoomsDashboardClient() {
  const [project, setProject] = useState<ScriptBase | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setProject(ensureProject()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function resetLocalProject() {
    if (!window.confirm("Reset the saved script in this browser? Export first if you want a backup.")) return;

    clearProject();
    setProject(ensureProject());
  }

  const activeRooms = getActiveRooms();
  const comingSoonRooms = getComingSoonRooms();
  const readiness = project ? getScriptReadiness(project.rooms) : null;
  const nextRoom = readiness?.missingRooms[0]?.room;

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
            Run guided setup
          </Link>
          <button className={styles.secondaryButton} disabled={!project} onClick={() => project && downloadMarkdown(project)} type="button">
            Export one giant .md
          </button>
          <button className={styles.dangerButton} onClick={resetLocalProject} type="button">
            Reset local script
          </button>
        </div>
        <p className={styles.exportHint}>Saved locally{project?.updatedAt ? ` · last update ${new Date(project.updatedAt).toLocaleString()}` : ""}</p>
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
    </>
  );
}
