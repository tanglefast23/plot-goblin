"use client";

import { useId, useRef, useState } from "react";
import styles from "@/app/workspace.module.css";
import { ACCESS_KEY_STORAGE_KEY, ACCESS_MODE_STORAGE_KEY, clearCowriterAccess } from "@/lib/cowriterAccess";
import { loadSavedDrafts, type SavedDraft } from "@/lib/draftStorage";
import { clearProject, ensureProject, importProjectMarkdown, loadProject } from "@/lib/projectStorage";
import {
  buildMarkdownArchiveFile,
  buildSavedDraftExportFile,
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
  downloadFile(buildMarkdownArchiveFile(project.rooms, loadSavedDrafts()));
}

function downloadScreenplayFormat(format: ScreenplayExportFormatId) {
  const project = loadProject() ?? ensureProject();
  downloadFile(buildScreenplayExportFile(project.rooms, format));
}

function exportFormatLabel(formatId: ScreenplayExportFormatId) {
  return screenplayExportFormats.find((format) => format.id === formatId)?.label ?? "selected format";
}

function currentAiAccessLabel() {
  const mode = window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY);
  const hasBridgeKey = Boolean(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)?.trim());

  if (mode === "local") return "Local";
  if (mode === "public" && hasBridgeKey) return "Bridge key";
  return "Not set";
}

export function WorkspaceSettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [bridgeKey, setBridgeKey] = useState("");
  const [aiAccessLabel, setAiAccessLabel] = useState("Not set");
  const [isTestingBridgeKey, setIsTestingBridgeKey] = useState(false);
  const [bridgeKeyTestResult, setBridgeKeyTestResult] = useState<"idle" | "saved" | "failed">("idle");
  const [selectedDraftExportFormat, setSelectedDraftExportFormat] = useState<ScreenplayExportFormatId | null>(null);
  const [draftExportChoices, setDraftExportChoices] = useState<SavedDraft[]>([]);
  const [status, setStatus] = useState("");
  const menuId = useId();
  const exportMenuId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const bridgeKeyButtonLabel = isTestingBridgeKey
    ? "Testing..."
    : bridgeKeyTestResult === "saved"
      ? "Bridge key saved"
      : bridgeKeyTestResult === "failed"
        ? "Bridge key failed"
        : "Test and save bridge key";

  function syncAiAccessFields() {
    setBridgeKey(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY) ?? "");
    setAiAccessLabel(currentAiAccessLabel());
  }

  function toggleSettingsMenu() {
    setIsOpen((current) => {
      const next = !current;
      if (!next) {
        setExportMenuOpen(false);
        setDraftExportChoices([]);
      }
      if (next) syncAiAccessFields();
      return next;
    });
  }

  function resetSavedScript() {
    if (!window.confirm("Reset the saved script in this browser? Export first if you want a backup.")) return;

    clearProject();
    setStatus("Saved script reset.");
    setExportMenuOpen(false);
    setIsOpen(false);
  }

  function resetAiAccess() {
    clearCowriterAccess();
    setBridgeKey("");
    setAiAccessLabel("Not set");
    setStatus("AI access reset.");
    setExportMenuOpen(false);
    setIsOpen(false);
  }

  async function saveBridgeKey() {
    const trimmed = bridgeKey.trim();

    if (!trimmed) {
      setStatus("Paste a bridge key or use local.");
      setBridgeKeyTestResult("failed");
      return;
    }

    setIsTestingBridgeKey(true);
    setBridgeKeyTestResult("idle");
    setStatus("");

    try {
      const response = await fetch("/api/hermes-cowriter", {
        method: "GET",
        headers: {
          "x-plot-goblin-key": trimmed,
        },
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setStatus(data.error ?? "Bridge key test failed.");
        setBridgeKeyTestResult("failed");
        return;
      }

      window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, trimmed);
      window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "public");
      setBridgeKey(trimmed);
      setAiAccessLabel("Bridge key");
      setStatus("Bridge key saved.");
      setBridgeKeyTestResult("saved");
      setExportMenuOpen(false);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Unknown test failure.";
      setStatus(`Bridge key test could not run. ${detail}`);
      setBridgeKeyTestResult("failed");
    } finally {
      setIsTestingBridgeKey(false);
    }
  }

  function useLocalAiAccess() {
    window.localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "local");
    setBridgeKey("");
    setAiAccessLabel("Local");
    setStatus("Local AI access selected.");
    setExportMenuOpen(false);
    setIsOpen(false);
  }

  async function importMarkdown(file: File | undefined) {
    if (!file) return;

    try {
      importProjectMarkdown(await file.text());
      setStatus("Markdown imported.");
      setExportMenuOpen(false);
      setIsOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function toggleExportMenu() {
    setExportMenuOpen((current) => {
      const next = !current;
      if (!next) setDraftExportChoices([]);
      return next;
    });
  }

  function selectAndDownloadScreenplayFormat(format: ScreenplayExportFormatId) {
    setSelectedDraftExportFormat(format);
    const savedDrafts = loadSavedDrafts();

    if (savedDrafts.length > 1) {
      setDraftExportChoices(savedDrafts);
      setStatus(`Choose a draft to export as ${exportFormatLabel(format)}.`);
      return;
    }

    setDraftExportChoices([]);

    if (savedDrafts.length === 1) {
      downloadFile(buildSavedDraftExportFile(savedDrafts[0], format));
      setStatus(`Exported ${savedDrafts[0].title} as ${exportFormatLabel(format)}.`);
      setExportMenuOpen(false);
      return;
    }

    downloadScreenplayFormat(format);
  }

  function downloadSavedDraft(draft: SavedDraft) {
    if (!selectedDraftExportFormat) {
      setStatus("Select a format before exporting a draft.");
      return;
    }

    downloadFile(buildSavedDraftExportFile(draft, selectedDraftExportFormat));
    setStatus(`Exported ${draft.title} as ${exportFormatLabel(selectedDraftExportFormat)}.`);
    setDraftExportChoices([]);
    setExportMenuOpen(false);
  }

  function downloadAllSavedDrafts() {
    if (!selectedDraftExportFormat) {
      setStatus("Select a format before exporting all drafts.");
      return;
    }

    const drafts = loadSavedDrafts();
    if (drafts.length === 0) {
      setStatus("No saved drafts to export.");
      return;
    }

    for (const draft of drafts) {
      downloadFile(buildSavedDraftExportFile(draft, selectedDraftExportFormat));
    }

    setStatus(`Exported ${drafts.length} drafts as ${exportFormatLabel(selectedDraftExportFormat)}.`);
    setDraftExportChoices([]);
    setExportMenuOpen(false);
  }

  return (
    <div className={styles.settingsMenu}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Settings"
        className={styles.iconButton}
        onClick={toggleSettingsMenu}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setExportMenuOpen(false);
            setIsOpen(false);
          }
        }}
        title="Settings"
        type="button"
      >
        <span aria-hidden="true" className={styles.settingsIcon} />
      </button>

      {isOpen ? (
        <div className={styles.settingsPanel} id={menuId}>
          <span className={styles.settingsLabel}>Screenplay exports</span>
          <div className={styles.settingsSubmenu}>
            <button
              aria-controls={exportMenuId}
              aria-expanded={exportMenuOpen}
              aria-haspopup="menu"
              className={`${styles.settingsAction} ${styles.settingsDisclosure}`}
              onClick={toggleExportMenu}
              type="button"
            >
              Export screenplay
            </button>
            {exportMenuOpen ? (
              <div className={styles.settingsSubmenuChoices} id={exportMenuId}>
                <button className={`${styles.settingsAction} ${styles.settingsAllAction}`} onClick={downloadAllSavedDrafts} type="button">
                  Export all drafts
                </button>
                {screenplayExportFormats.map((format) => (
                  <button className={styles.settingsAction} key={format.id} onClick={() => selectAndDownloadScreenplayFormat(format.id)} type="button">
                    Export {format.label}
                  </button>
                ))}
                {draftExportChoices.length > 1 && selectedDraftExportFormat ? (
                  <div className={styles.settingsDraftChoices}>
                    <span className={styles.settingsDraftChoiceLabel}>
                      Choose draft for {exportFormatLabel(selectedDraftExportFormat)}
                    </span>
                    {draftExportChoices.map((draft) => (
                      <button className={styles.settingsAction} key={draft.id} onClick={() => downloadSavedDraft(draft)} type="button">
                        Export {draft.title} as {exportFormatLabel(selectedDraftExportFormat)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <span className={styles.settingsLabel}>AI access</span>
          <div className={styles.settingsAccessPanel}>
            <p className={styles.settingsAccessCurrent}>Current: {aiAccessLabel}</p>
            <label className={styles.settingsAccessField}>
              <span>Bridge access key</span>
              <input
                autoComplete="off"
                onChange={(event) => {
                  setBridgeKey(event.target.value);
                  setBridgeKeyTestResult("idle");
                }}
                placeholder="Paste bridge key"
                type="password"
                value={bridgeKey}
              />
            </label>
            <div className={styles.settingsAccessActions}>
              <button className={styles.settingsAction} disabled={isTestingBridgeKey} onClick={saveBridgeKey} type="button">
                {bridgeKeyButtonLabel}
              </button>
              <button className={styles.settingsAction} disabled={isTestingBridgeKey} onClick={useLocalAiAccess} type="button">
                Use local
              </button>
            </div>
          </div>
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
