import styles from "./WriterGoblin.module.css";

export type WriterGoblinVariant =
  | "home"
  | "setup"
  | "summary"
  | "rooms"
  | "premise"
  | "characters"
  | "theme"
  | "beats"
  | "scenes"
  | "scriptParameters"
  | "createScript"
  | "drafts";

type WriterGoblinProps = {
  className?: string;
  variant?: WriterGoblinVariant;
};

const variantClass: Record<WriterGoblinVariant, string> = {
  home: styles.home,
  setup: styles.setup,
  summary: styles.summary,
  rooms: styles.rooms,
  premise: styles.premise,
  characters: styles.characters,
  theme: styles.theme,
  beats: styles.beats,
  scenes: styles.scenes,
  scriptParameters: styles.scriptParameters,
  createScript: styles.createScript,
  drafts: styles.drafts,
};

const variantLabels: Record<WriterGoblinVariant, string> = {
  home: "Plain Plot Goblin mascot holding a quill",
  setup: "Plain Plot Goblin mascot holding a pencil",
  summary: "Plain Plot Goblin mascot holding a checklist",
  rooms: "Plain Plot Goblin mascot holding pages",
  premise: "Plain Plot Goblin mascot holding a logline card",
  characters: "Plain Plot Goblin mascot holding a name tag",
  theme: "Plain Plot Goblin mascot holding a question mark card",
  beats: "Plain Plot Goblin mascot holding a beat marker",
  scenes: "Plain Plot Goblin mascot holding a clapperboard",
  scriptParameters: "Plain Plot Goblin mascot holding a measuring tape",
  createScript: "Plain Plot Goblin mascot holding a draft page",
  drafts: "Plain Plot Goblin mascot holding an ink pen",
};

export function WriterGoblin({ className = "", variant = "home" }: WriterGoblinProps) {
  return (
    <figure className={`${styles.wrapper} ${variantClass[variant]} ${className}`} data-variant={variant}>
      <svg
        aria-label={variantLabels[variant]}
        className={styles.art}
        role="img"
        viewBox="0 0 260 190"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className={styles.goblin}>
          <path className={styles.leftEar} d="M54 91 2 68l52-24Z" />
          <path className={styles.rightEar} d="m206 91 52-23-52-24Z" />
          <path className={styles.head} d="M72 26h116c38 0 68 30 68 68v47c0 23-19 42-42 42H46c-23 0-42-19-42-42V94c0-38 30-68 68-68Z" />
          <path className={styles.glasses} d="M74 94c12-13 42-13 54 0 7 8 6 35-3 44-11 10-38 10-49 0-9-9-10-36-2-44Zm58 18h12m12-18c12-13 42-13 54 0 8 8 7 35-2 44-11 10-38 10-49 0-9-9-10-36-3-44Z" />
          <path className={styles.smirk} d="M91 148c25 16 54 15 78-4" />
          <path className={styles.tooth} d="M122 154 132 187l14-33Z" />
        </g>

        <g className={styles.handArm}>
          <path className={styles.arm} d="M196 151 220 112" />
          <path className={styles.hand} d="M217 102c17 2 31 12 39 27-13 15-33 18-51 7Z" />
        </g>

        <g className={`${styles.prop} ${styles.quill}`}>
          <path d="M214 111c17-36 27-51 42-60-1 24-13 42-36 66Z" />
          <path d="M221 119 198 158" />
        </g>

        <g className={`${styles.prop} ${styles.pencil}`}>
          <path d="M203 149 245 83l13 8-42 66Z" />
          <path d="m245 83 10-16 6 20Z" />
          <path d="m203 149-9 17 22-9Z" />
        </g>

        <g className={`${styles.prop} ${styles.checklist}`}>
          <path d="M195 86h50c6 0 11 5 11 11v58c0 6-5 11-11 11h-50Z" />
          <path d="M209 101h24M209 119h30M209 137h22" />
          <path d="m205 119 5 5 10-12" />
        </g>

        <g className={`${styles.prop} ${styles.pages}`}>
          <path d="M194 97h44v60h-44Z" />
          <path d="M203 88h44v60" />
          <path d="M205 115h22M205 130h25M205 145h14" />
        </g>

        <g className={`${styles.prop} ${styles.card}`}>
          <path d="M190 104h62v44h-62Z" />
          <path d="M202 121h38M202 134h26" />
        </g>

        <g className={`${styles.prop} ${styles.tag}`}>
          <path d="M190 109h55l11 18-11 18h-55Z" />
          <circle cx="203" cy="127" r="4" />
          <path d="M216 122h23M216 133h17" />
        </g>

        <g className={`${styles.prop} ${styles.questionCard}`}>
          <path d="M193 99h54v58h-54Z" />
          <path d="M215 117c1-10 18-10 18 1 0 9-12 8-12 18" />
          <path d="M221 148h1" />
        </g>

        <g className={`${styles.prop} ${styles.beatMarker}`}>
          <path d="M201 91h35l17 18-35 48-35-48Z" />
          <path d="M207 113h25M204 128h18" />
        </g>

        <g className={`${styles.prop} ${styles.clapper}`}>
          <path d="M192 104h58v47h-58Z" />
          <path d="M192 104 250 90l3 15-58 14Z" />
          <path d="M204 106 193 121M224 101l-11 15M244 96l-11 15M205 127h32M205 140h24" />
        </g>

        <g className={`${styles.prop} ${styles.measureTape}`}>
          <path d="M193 109h52c7 0 12 5 12 12v18c0 7-5 12-12 12h-52Z" />
          <path d="M205 125h38M211 125v10M223 125v7M235 125v10" />
        </g>

        <g className={`${styles.prop} ${styles.draftPage}`}>
          <path d="M196 91h45l15 15v57h-60Z" />
          <path d="M241 91v15h15" />
          <path d="M209 117h28M209 132h33M209 147h23" />
        </g>

        <g className={`${styles.prop} ${styles.pen}`}>
          <path d="M202 151 250 92" />
          <path d="m246 86 12 10-12 8-6-5Z" />
          <path d="m198 157 14-5-9 14Z" />
        </g>
      </svg>
    </figure>
  );
}
