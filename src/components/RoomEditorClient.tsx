"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/workspace.module.css";
import { NEEDS_ANSWER, type ScriptBase } from "@/lib/guidedSetup";
import { ensureProject, saveProject } from "@/lib/projectStorage";
import { getScriptReadiness, storyRooms } from "@/lib/storyRooms";
import { type WriterGoblinVariant, WriterGoblin } from "./WriterGoblin";
import { GUIDED_ROOM_SLUGS } from "./room-editor/RoomEditorSupport";
import {
  BeatsCorkBoard,
  CreateScriptGuidanceMeters,
  CreateScriptRoom,
  DraftsRoom,
  GuidedRoomEditor,
  SceneBoard,
  type SceneBoardHandle,
  ScenePopulationGuidance,
  ScriptParametersEditor,
} from "./room-editor/RoomEditors";

const roomGoblinVariants: Record<string, WriterGoblinVariant> = {
  beats: "beats",
  characters: "characters",
  "create-script": "createScript",
  drafts: "drafts",
  premise: "premise",
  scenes: "scenes",
  "script-parameters": "scriptParameters",
  theme: "theme",
};

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
  const sceneBoardRef = useRef<SceneBoardHandle>(null);
  const scriptReadiness = useMemo(() => {
    if (!project) return null;

    return getScriptReadiness({ ...project.rooms, [slug]: markdown });
  }, [markdown, project, slug]);
  const createScriptRoomProgress = scriptReadiness?.roomProgress ?? [];
  const nextSuggestedRoom = useMemo(() => {
    if (!scriptReadiness) return null;

    const progressBySlug = new Map(scriptReadiness.roomProgress.map((progress) => [progress.room.slug, progress]));
    return storyRooms.find((candidate) => (progressBySlug.get(candidate.slug)?.percent ?? 100) < 100) ?? null;
  }, [scriptReadiness]);

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
            <SceneBoard ref={sceneBoardRef} firstSceneRef={sceneTitleRef} markdown={markdown} onMarkdownChange={setMarkdown} project={project} />
          ) : room.slug === "create-script" ? (
            <CreateScriptRoom markdown={markdown} onMarkdownChange={setMarkdown} project={project} />
          ) : room.slug === "drafts" ? (
            <DraftsRoom />
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
          <WriterGoblin className={styles.guidanceGoblin} variant={roomGoblinVariants[room.slug] ?? "rooms"} />
          {room.slug === "create-script" ? (
            <CreateScriptGuidanceMeters roomProgress={createScriptRoomProgress} />
          ) : room.slug === "scenes" ? (
            <ScenePopulationGuidance
              beatsMarkdown={project.rooms.beats ?? ""}
              scenesMarkdown={markdown}
              sceneBoardRef={sceneBoardRef}
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

      {nextSuggestedRoom ? (
        <nav aria-label="Next suggested room" className={styles.nextSuggestedRoomFooter}>
          <span>Next suggested room:</span>
          <Link className={styles.primaryButton} href={`/rooms/${nextSuggestedRoom.slug}`}>
            {nextSuggestedRoom.title}
          </Link>
        </nav>
      ) : null}
    </section>
  );
}
