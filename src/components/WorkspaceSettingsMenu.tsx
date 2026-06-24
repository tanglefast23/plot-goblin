"use client";

import { useId, useRef, useState } from "react";
import styles from "@/app/workspace.module.css";
import { clearCowriterAccess } from "@/lib/cowriterAccess";
import { clearProject, ensureProject, importProjectMarkdown, loadProject } from "@/lib/projectStorage";
import {
  buildMarkdownArchiveFile,
  buildScreenplayExportFile,
  screenplayExportFormats,
  type ScreenplayExportFile,
  type ScreenplayExportFormatId,
} from "@/lib/screenplayExport";

function downloadFile(file: ScreenplayExportFile) {
  const contents =
    typeof file.contents === "string"
      ? file.contents
      : (Uint8Array.from(file.contents).buffer as ArrayBuffer);
  const blob = new Blob([contents], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadMarkdownArchive() {
  const project = loadProject() ?? ensureProject();
  downloadFile(buildMarkdownArchiveFile(project.rooms));
}

function downloadScreenplayFormat(format: ScreenplayExportFormatId) {
  const project = loadProject() ?? ensureProject();
  downloadFile(buildScreenplayExportFile(project.rooms, format));
}

export function WorkspaceSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState("");
  const menuId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  function resetSavedScript() {
    clearProject();
    setStatus("Saved script reset.");
    setIsOpen(false);
  }

  function resetAiAccess() {
    clearCowriterAccess();
    setStatus("AI access reset.");
    setIsOpen(false);
  }

  async function importMarkdown(file: File | undefined) {
    if (!file) return;

    try {
      importProjectMarkdown(await file.text());
      setStatus("Markdown imported.");
      setIsOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={styles.settingsMenu}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Settings"
        className={styles.iconButton}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        title="Settings"
        type="button"
      >
        <span aria-hidden="true" className={styles.settingsIcon} />
      </button>

      {isOpen ? (
        <div className={styles.settingsPanel} id={menuId}>
          <span className={styles.settingsLabel}>Screenplay exports</span>
          {screenplayExportFormats.map((format) => (
            <button className={styles.settingsAction} key={format.id} onClick={() => downloadScreenplayFormat(format.id)} type="button">
              Export {format.label}
            </button>
          ))}
          <span className={styles.settingsLabel}>Backup</span>
          <button className={styles.settingsAction} onClick={downloadMarkdownArchive} type="button">
            Export all .md files
          </button>
          <label className={styles.settingsAction}>
            <span>Import all .md files</span>
            <input
              accept=".md,text/markdown,text/plain"
              aria-label="Import Plot Goblin markdown"
              className={styles.fileInput}
              onChange={(event) => void importMarkdown(event.currentTarget.files?.[0])}
              ref={inputRef}
              type="file"
            />
          </label>
          <button className={`${styles.settingsAction} ${styles.settingsDanger}`} onClick={resetSavedScript} type="button">
            Reset saved script
          </button>
          <button className={`${styles.settingsAction} ${styles.settingsDanger}`} onClick={resetAiAccess} type="button">
            Reset AI access
          </button>
        </div>
      ) : null}

      {status ? (
        <span aria-live="polite" className={styles.settingsStatus}>
          {status}
        </span>
      ) : null}
    </div>
  );
}
