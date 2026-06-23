"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/app/workspace.module.css";
import { hasCompletedGuidedSetup, loadProject, PROJECT_CHANGED_EVENT } from "@/lib/projectStorage";
import { RoomNavMenu } from "./RoomNavMenu";

export function WorkspaceNavigation() {
  const [hasCompletedSetup, setHasCompletedSetup] = useState(true);

  useEffect(() => {
    function refreshProjectState() {
      setHasCompletedSetup(hasCompletedGuidedSetup(loadProject()));
    }

    refreshProjectState();
    window.addEventListener("storage", refreshProjectState);
    window.addEventListener(PROJECT_CHANGED_EVENT, refreshProjectState);

    return () => {
      window.removeEventListener("storage", refreshProjectState);
      window.removeEventListener(PROJECT_CHANGED_EVENT, refreshProjectState);
    };
  }, []);

  return (
    <nav className={styles.nav} aria-label="Plot Goblin navigation">
      {!hasCompletedSetup ? (
        <Link className={styles.linkButton} href="/guided-setup">
          Guided setup
        </Link>
      ) : null}
      <RoomNavMenu align="end" buttonClassName={styles.linkButton} />
    </nav>
  );
}
