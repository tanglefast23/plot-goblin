import Link from "next/link";
import styles from "@/app/workspace.module.css";
import { RoomNavMenu } from "./RoomNavMenu";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.shell}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/">
            Plot Goblin
          </Link>
          <nav className={styles.nav} aria-label="Plot Goblin navigation">
            <Link className={styles.linkButton} href="/guided-setup">
              Guided setup
            </Link>
            <RoomNavMenu align="end" buttonClassName={styles.linkButton} />
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
