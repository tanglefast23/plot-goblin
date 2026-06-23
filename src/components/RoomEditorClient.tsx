"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "@/app/workspace.module.css";
import type { ScriptBase } from "@/lib/guidedSetup";
import { ensureProject, saveProject } from "@/lib/projectStorage";
import { storyRooms } from "@/lib/storyRooms";
import { HermesCowriter } from "./HermesCowriter";

export function RoomEditorClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const room = useMemo(() => storyRooms.find((candidate) => candidate.slug === slug), [slug]);
  const [project, setProject] = useState<ScriptBase | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = ensureProject();
      setProject(loaded);
      setMarkdown(loaded.rooms[slug] ?? `# ${room?.title ?? "Unknown"} Room\n\n[Needs answer]\n`);
      setSavedAt(loaded.updatedAt);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [room?.title, slug]);

  useEffect(() => {
    if (!project || !room) return;
    const timer = window.setTimeout(() => {
      const updatedProject: ScriptBase = {
        ...project,
        rooms: { ...project.rooms, [slug]: markdown },
        updatedAt: new Date().toISOString(),
      };
      saveProject(updatedProject);
      setProject(updatedProject);
      setSavedAt(updatedProject.updatedAt);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [markdown, project, room, slug]);

  if (!room) {
    return (
      <section className={styles.editorPanel}>
        <h1>The goblin cannot find that room.</h1>
        <Link className={styles.primaryButton} href="/rooms">
          Back to rooms
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.editorPanel}>
      <p className={styles.stepMeta}>{room.markdownFile}</p>
      <h1>{room.title}</h1>
      <p className={styles.lede}>{room.purpose}</p>

      <div className={styles.editorGrid}>
        <div>
          <textarea
            aria-label={`${room.title} markdown`}
            className={styles.editorTextarea}
            onChange={(event) => setMarkdown(event.target.value)}
            value={markdown}
          />
          <p className={styles.savedLine}>Autosaved locally{savedAt ? ` · ${new Date(savedAt).toLocaleTimeString()}` : ""}. Export from the rooms dashboard.</p>
        </div>

        <aside className={styles.guidanceBox}>
          <h2>Goblin guidance</h2>
          <p className={styles.nudge}>{room.guidingQuestion}</p>
          <ul>
            {room.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
          <div className={styles.actionRow}>
            <Link className={styles.secondaryButton} href="/rooms">
              Back to rooms
            </Link>
          </div>
        </aside>
      </div>

      <HermesCowriter
        label="Suggest improvements, don't rewrite"
        mode="room"
        payload={{ room: room.title, markdown }}
      />
    </section>
  );
}
