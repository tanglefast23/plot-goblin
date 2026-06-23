"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";
import { ACCESS_KEY_STORAGE_KEY, ACCESS_MODE_STORAGE_KEY, type CowriterAccessMode } from "@/lib/cowriterAccess";

function storedAccessKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY) ?? "";
}

function storedAccessMode(): CowriterAccessMode | "" {
  if (typeof window === "undefined") return "";
  const mode = window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY);
  return mode === "local" || mode === "public" ? mode : "";
}

function storedAccessMessage() {
  const storedKey = storedAccessKey();
  const storedMode = storedAccessMode();

  if (storedMode === "local") return "Local mode selected";
  if (storedKey) return "Public key saved";
  return "";
}

export function CowriterAccessSetup() {
  const [accessKey, setAccessKey] = useState(storedAccessKey);
  const [accessMode, setAccessMode] = useState<CowriterAccessMode | "">(storedAccessMode);
  const [message, setMessage] = useState(storedAccessMessage);

  function savePublicKey() {
    const trimmed = accessKey.trim();

    if (!trimmed) {
      setMessage("Paste a public key or use local");
      return;
    }

    window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, trimmed);
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "public");
    setAccessKey(trimmed);
    setAccessMode("public");
    setMessage("Public key saved");
  }

  function useLocal() {
    window.localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "local");
    setAccessKey("");
    setAccessMode("local");
    setMessage("Local mode selected");
  }

  return (
    <section aria-label="AI access setup" className={styles.accessPanel}>
      <div className={styles.accessPanelHeader}>
        <p>AI access</p>
        {message ? <span data-mode={accessMode || undefined}>{message}</span> : null}
      </div>
      <div className={styles.accessControls}>
        <label className={styles.accessKeyLabel}>
          Access key for public site
          <input
            autoComplete="off"
            className={styles.accessKeyInput}
            onChange={(event) => setAccessKey(event.target.value)}
            placeholder="Friends paste key here"
            type="password"
            value={accessKey}
          />
        </label>
        <div className={styles.accessActions}>
          <button className={styles.accessSaveButton} onClick={savePublicKey} type="button">
            Save public key
          </button>
          <button className={styles.accessLocalButton} onClick={useLocal} type="button">
            Use local
          </button>
        </div>
      </div>
    </section>
  );
}
