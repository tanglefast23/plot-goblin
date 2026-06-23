import styles from "./page.module.css";
import { FeedTheGoblin } from "@/components/FeedTheGoblin";
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
      <section className={styles.hero} aria-labelledby="home-title">
        <p className={styles.eyebrow}>Plot Goblin</p>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <h1 aria-label="Feed the goblin before the script eats you." id="home-title">
              <span>
                Feed the <strong>goblin</strong>
              </span>
              <span>
                before the <strong>script</strong>
              </span>
              <span>eats you.</span>
            </h1>
            <p className={styles.lede}>
              A tiny structural menace that helps screenwriters move from premise → characters → theme → beats → scenes → script parameters without getting trapped in a rigid formula.
            </p>
            <div className={styles.ctaRow}>
              <FeedTheGoblin />
            </div>
          </div>
          <div className={styles.heroVisual}>
            <svg aria-hidden="true" className={styles.goblinPoster} viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg">
              <path className={styles.posterHat} d="M170 60h220c24 0 42 18 42 42v64h42c20 0 31 24 18 39l-54 61H137l-54-61c-13-15-2-39 18-39h42v-64c0-24 18-42 42-42Z" />
              <path className={styles.posterFace} d="M142 224h252c30 0 54 24 54 54v62c0 41-33 74-74 74H162c-41 0-74-33-74-74v-62c0-30 24-54 54-54Z" />
              <path className={styles.posterEarLeft} d="M102 248 24 202c-15-9-11-32 6-35l90-14Z" />
              <path className={styles.posterEarRight} d="M432 248l78-46c15-9 11-32-6-35l-90-14Z" />
              <path className={styles.posterGlasses} d="M142 273c20-25 76-25 96 0 10 13 8 55-6 68-18 17-67 17-85 0-14-13-15-55-5-68Zm158 0c20-25 76-25 96 0 10 13 9 55-5 68-18 17-67 17-85 0-14-13-16-55-6-68ZM238 291h62" />
              <path className={styles.posterSmirk} d="M214 362c38 24 82 22 120-4" />
              <path className={styles.posterTooth} d="M264 378 278 414l17-36Z" />
            </svg>
            <aside className={styles.heroCard} aria-label="MVP writing flow">
              <span>V1 flow</span>
              <strong>Idea → Logline → Dramatic Question → Beats → Scene Cards → Script Rules</strong>
              <p>Each room keeps one focused piece of the movie honest.</p>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Hybrid structure</p>
          <h2>
            Guided three-act <strong>defaults</strong>, writer-controlled <strong>shape</strong>.
          </h2>
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
          <h2>
            Six rooms to get from <strong>idea</strong> to <strong>draft rules</strong>.
          </h2>
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
          <h2>
            Visible, quiet, and clearly <strong>coming soon</strong>.
          </h2>
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
