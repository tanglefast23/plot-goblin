"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/workspace.module.css";
import { loadProject, PROJECT_CHANGED_EVENT } from "@/lib/projectStorage";
import { WorkspaceNavigation } from "./WorkspaceNavigation";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    function refreshSavedStatus() {
      setSavedAt(loadProject()?.updatedAt ?? "");
    }

    refreshSavedStatus();
    window.addEventListener("storage", refreshSavedStatus);
    window.addEventListener(PROJECT_CHANGED_EVENT, refreshSavedStatus);

    return () => {
      window.removeEventListener("storage", refreshSavedStatus);
      window.removeEventListener(PROJECT_CHANGED_EVENT, refreshSavedStatus);
    };
  }, []);

  return (
    <main className={styles.shell}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <div aria-label="Plot Goblin save status" className={styles.brandStatus}>
            <Link className={styles.brand} href="/">
              Plot Goblin
            </Link>
            <p>Saved locally{savedAt ? ` · last update ${new Date(savedAt).toLocaleString()}` : ""}</p>
          </div>
          <WorkspaceNavigation />
        </header>
        {children}
      </div>
    </main>
  );
}
