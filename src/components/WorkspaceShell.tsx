import Link from "next/link";
import styles from "@/app/workspace.module.css";
import { WorkspaceNavigation } from "./WorkspaceNavigation";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.shell}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/">
            Plot Goblin
          </Link>
          <WorkspaceNavigation />
        </header>
        {children}
      </div>
    </main>
  );
}
