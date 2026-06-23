import styles from "./page.module.css";
import { getActiveRooms, getComingSoonRooms, structureModes } from "@/lib/storyRooms";

const defaultBeats = [
  "Opening Image",
  "Setup",
  "Inciting Incident",
  "Act One Break",
  "Midpoint",
  "All Is Lost",
  "Climax",
  "Final Image",
];

export default function Home() {
  const activeRooms = getActiveRooms();
  const comingSoonRooms = getComingSoonRooms();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Plot Goblin</p>
        <div className={styles.heroGrid}>
          <div>
            <h1>Feed the goblin before the script eats you.</h1>
            <p className={styles.lede}>
              A tiny structural menace that helps screenwriters move from premise → characters → theme → beats → scenes without getting trapped in a rigid formula.
            </p>
          </div>
          <aside className={styles.heroCard} aria-label="MVP writing flow">
            <span>V1 flow</span>
            <strong>Idea → Logline → Dramatic Question → Beats → Scene Cards</strong>
            <p>Each room has a dedicated markdown file plus structured prompts for future diagnostics.</p>
          </aside>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Hybrid structure</p>
          <h2>Guided three-act defaults, writer-controlled shape.</h2>
        </div>
        <div className={styles.hybridGrid}>
          <div>
            <p>
              The default path gives writers familiar pressure points — setup, inciting incident, act breaks, midpoint, collapse, climax, and final image.
            </p>
            <p>
              But the app should never force a formula. Writers can customize, rename, skip, or add beats when the story wants a different shape.
            </p>
          </div>
          <ol className={styles.beatList} aria-label="Default flexible beat spine">
            {defaultBeats.map((beat) => (
              <li key={beat}>{beat}</li>
            ))}
          </ol>
        </div>
        <p className={styles.structurePrinciple}>{structureModes.principle}</p>
      </section>

      <section className={styles.roomsSection} aria-label="Active MVP work rooms">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>MVP rooms</p>
          <h2>Five rooms to get from idea to scene map.</h2>
        </div>
        <div className={styles.roomGrid}>
          {activeRooms.map((room, index) => (
            <article className={styles.roomCard} key={room.slug}>
              <div className={styles.roomTopline}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <code>{room.markdownFile}</code>
              </div>
              <h3>{room.title}</h3>
              <p>{room.purpose}</p>
              <div className={styles.questionBlock}>
                <span>Guiding question</span>
                <strong>{room.guidingQuestion}</strong>
              </div>
              <ul>
                {room.prompts.map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.roomsSection} aria-label="Coming soon work rooms">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Later rooms</p>
          <h2>Visible, greyed out, and clearly coming soon.</h2>
        </div>
        <div className={styles.comingSoonGrid}>
          {comingSoonRooms.map((room) => (
            <article className={styles.soonCard} key={room.slug} data-disabled="true">
              <div className={styles.roomTopline}>
                <span>Coming soon</span>
                <code>{room.markdownFile}</code>
              </div>
              <h3>{room.title}</h3>
              <p>{room.purpose}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
