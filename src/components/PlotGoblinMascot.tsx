import Link from "next/link";
import styles from "./PlotGoblinMascot.module.css";

export function PlotGoblinMascot() {
  return (
    <header className={styles.mascotBar}>
      <div className={styles.inner}>
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link href="/guided-setup">Setup</Link>
          <Link href="/rooms">Rooms</Link>
        </nav>

        <Link className={styles.brand} href="/">
          <svg
            aria-label="Teasing Plot Goblin mascot"
            className={styles.goblin}
            role="img"
            viewBox="0 0 128 82"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path className={styles.hat} d="M35 11h58c9 0 15 6 15 15v13h12c6 0 9 7 5 12L111 68H18L3 51c-4-5-1-12 5-12h12V26c0-9 6-15 15-15Z" />
            <path className={styles.ear} d="M26 50 4 37c-5-3-3-10 3-11l26-4Z" />
            <path className={styles.ear} d="m102 50 22-13c5-3 3-10-3-11l-26-4Z" />
            <path className={styles.face} d="M31 41h66c11 0 20 9 20 20v1c0 11-9 20-20 20H31c-11 0-20-9-20-20v-1c0-11 9-20 20-20Z" />
            <path className={styles.glasses} d="M26 54c7-6 23-6 30 0 4 4 3 16-2 20-6 5-20 5-26 0-5-4-6-16-2-20Zm46 0c7-6 23-6 30 0 4 4 3 16-2 20-6 5-20 5-26 0-5-4-6-16-2-20Zm-16 8h16" />
            <path className={styles.smirk} d="M50 72c10 5 21 5 31-1" />
          </svg>
          <span className={styles.name}>Plot Goblin</span>
        </Link>

        <p className={styles.tease}>Need a plot? Cute.</p>
      </div>
    </header>
  );
}
