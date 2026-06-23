"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/page.module.css";
import {
  ACCESS_KEY_STORAGE_KEY,
  ACCESS_MODE_STORAGE_KEY,
  type CowriterAccessMode,
} from "@/lib/cowriterAccess";

function storedAccessMode(): CowriterAccessMode | null {
  if (typeof window === "undefined") return null;
  const mode = window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY);
  if (mode === "local") return mode;
  if (mode === "public" && window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)?.trim()) return mode;
  return null;
}

export function FeedTheGoblin() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [message, setMessage] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    inputRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function feedGoblin() {
    // Already chose an AI access mode before — skip the prompt and keep going.
    if (storedAccessMode()) {
      router.push("/guided-setup");
      return;
    }

    setMessage("");
    setAccessKey("");
    setIsTesting(false);
    setIsOpen(true);
  }

  async function savePublicKey() {
    const trimmed = accessKey.trim();

    if (!trimmed) {
      setMessage("Paste a public key or use local");
      return;
    }

    setIsTesting(true);
    setMessage("");

    try {
      const response = await fetch("/api/hermes-cowriter", {
        method: "GET",
        headers: {
          "x-plot-goblin-key": trimmed,
        },
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "The public key test failed.");
        return;
      }

      window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, trimmed);
      window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "public");
      router.push("/guided-setup");
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Unknown test failure.";
      setMessage(`The public key test could not run. ${detail}`);
    } finally {
      setIsTesting(false);
    }
  }

  function useLocal() {
    window.localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "local");
    router.push("/guided-setup");
  }

  return (
    <>
      <button className={styles.primaryCta} onClick={feedGoblin} type="button">
        Feed the goblin
      </button>
      {isOpen ? (
        <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
          <section
            aria-label="AI access setup"
            aria-modal="true"
            className={styles.modalDialog}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <p>AI access</p>
              <button
                aria-label="Close"
                className={styles.modalClose}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <p className={styles.modalLede}>
              Paste a friend&apos;s public key to use the shared goblin, or keep everything on this device.
            </p>
            <div className={styles.accessControls}>
              <label className={styles.accessKeyLabel}>
                Access key for public site
                <input
                  autoComplete="off"
                  className={styles.accessKeyInput}
                  onChange={(event) => setAccessKey(event.target.value)}
                  placeholder="Friends paste key here"
                  ref={inputRef}
                  type="password"
                  value={accessKey}
                />
              </label>
              <div className={styles.accessActions}>
                <button className={styles.accessSaveButton} disabled={isTesting} onClick={savePublicKey} type="button">
                  {isTesting ? "Testing..." : "Test and save key"}
                </button>
                <button className={styles.accessLocalButton} disabled={isTesting} onClick={useLocal} type="button">
                  Use local
                </button>
              </div>
            </div>
            {message ? <p className={styles.modalError}>{message}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
