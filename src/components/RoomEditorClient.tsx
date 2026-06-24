"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/workspace.module.css";
import { NEEDS_ANSWER, type ScriptBase } from "@/lib/guidedSetup";
import { ensureProject, saveProject } from "@/lib/projectStorage";
import { getScriptReadiness, storyRooms } from "@/lib/storyRooms";
import { GUIDED_ROOM_SLUGS } from "./room-editor/RoomEditorSupport";
import {
  BeatsCorkBoard,
  CreateScriptGuidanceMeters,
  CreateScriptRoom,
  GuidedRoomEditor,
  SceneBoard,
  ScenePopulationGuidance,
  ScriptParametersEditor,
} from "./room-editor/RoomEditors";

export function RoomEditorClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const room = useMemo(() => storyRooms.find((candidate) => candidate.slug === slug), [slug]);
  const [project, setProject] = useState<ScriptBase | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const firstGuidedRoomFieldRef = useRef<HTMLTextAreaElement>(null);
  const firstBeatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sceneTitleRef = useRef<HTMLInputElement>(null);
  const createScriptRoomProgress = useMemo(
    () => (project ? getScriptReadiness(project.rooms).roomProgress : []),
    [project],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = ensureProject();
      setProject(loaded);
      setMarkdown(loaded.rooms[slug] ?? `# ${room?.title ?? "Unknown"} Room\n\n${NEEDS_ANSWER}\n`);
      setSavedAt(loaded.updatedAt);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [room?.title, slug]);

  useEffect(() => {
    if (!project || !room) return;
    if (markdown === (project.rooms[slug] ?? "")) return;

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

  if (!project) {
    return (
      <section className={styles.editorPanel}>
        <p className={styles.stepMeta}>{room.markdownFile}</p>
        <h1>{room.title}</h1>
        <p className={styles.lede}>Loading the room board...</p>
      </section>
    );
  }

  return (
    <section className={styles.editorPanel}>
      <p className={styles.stepMeta}>{room.markdownFile}</p>
      <h1>{room.title}</h1>
      <p className={styles.lede}>{room.purpose}</p>

      <div className={`${styles.editorGrid} ${room.slug === "scenes" ? styles.sceneEditorGrid : ""}`}>
        <div>
          {room.slug === "beats" ? (
            <BeatsCorkBoard
              firstNoteRef={firstBeatTextareaRef}
              markdown={markdown}
              onMarkdownChange={setMarkdown}
              project={project}
            />
          ) : room.slug === "scenes" ? (
            <SceneBoard firstSceneRef={sceneTitleRef} markdown={markdown} onMarkdownChange={setMarkdown} project={project} />
          ) : room.slug === "create-script" ? (
            <CreateScriptRoom markdown={markdown} onMarkdownChange={setMarkdown} project={project} />
          ) : room.slug === "script-parameters" ? (
            <ScriptParametersEditor markdown={markdown} onMarkdownChange={setMarkdown} />
          ) : GUIDED_ROOM_SLUGS.has(room.slug) ? (
            <GuidedRoomEditor
              firstFieldRef={firstGuidedRoomFieldRef}
              markdown={markdown}
              onMarkdownChange={setMarkdown}
              project={project}
              roomSlug={room.slug}
              title={room.title}
            />
          ) : (
            <textarea
              aria-label={`${room.title} markdown`}
              className={styles.editorTextarea}
              onChange={(event) => setMarkdown(event.target.value)}
              value={markdown}
            />
          )}
          <p className={styles.savedLine}>Autosaved locally{savedAt ? ` · ${new Date(savedAt).toLocaleTimeString()}` : ""}. Export from the rooms dashboard.</p>
        </div>

        <aside className={styles.guidanceBox}>
          <h2>Goblin guidance</h2>
          <p className={styles.nudge}>{room.guidingQuestion}</p>
          {room.slug === "create-script" ? (
            <CreateScriptGuidanceMeters roomProgress={createScriptRoomProgress} />
          ) : room.slug === "scenes" ? (
            <ScenePopulationGuidance
              beatsMarkdown={project.rooms.beats ?? ""}
              scenesMarkdown={markdown}
              onScenesMarkdownChange={setMarkdown}
            />
          ) : (
            <ul>
              {room.prompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
