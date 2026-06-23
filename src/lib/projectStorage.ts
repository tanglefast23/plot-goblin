import { buildScriptBase, LEGACY_NEEDS_ANSWER, NEEDS_ANSWER, NEEDS_WRITING, type ScriptBase } from "./guidedSetup";

export const PROJECT_STORAGE_KEY = "plot-goblin-current-script";

const LEGACY_ROOM_PROMPTS = [
  "Replace this with a specific visual snapshot before pressure hits.",
  "Establish the world, want, lie, and cost of staying the same.",
  "What specific event forces the protagonist toward the want?",
  "Why they hesitate, dodge, rationalize, or choose badly.",
  "What choice locks them into the story?",
  "Which sequence delivers the fun/terror/longing promised by the genre?",
  "What reveal, reversal, or false victory makes the old plan impossible?",
  "How does the opposition tighten the trap?",
  "What moment makes the cost personal, public, moral, or irreversible?",
  "How does the protagonist confront the lie?",
  "What new choice points toward the ending?",
  "What maximum-pressure choice proves who they have become?",
  "What specific final image answers or twists the opening image?",
  "Who are they before the story starts pressing on the bruise?",
  "What visible thing are they chasing?",
  "What do they actually need to learn, accept, or risk?",
  "What lie keeps them stuck?",
  "How do they protect the false belief when pressure rises?",
  "Which situation exposes the flaw where they cannot hide from it?",
  "Who or what actively blocks them?",
  "Give them a real want, not just villain wallpaper.",
  "Give the opposition a fair argument.",
  "Make the opposition hit the wound, not just the schedule.",
  "What question does the movie test through action?",
  "What does the protagonist believe at the start?",
  "Who or what argues the other side?",
  "Which choices and consequences make the theme visible?",
  "What does the final image prove, complicate, or leave unresolved?",
  "Who is in the scene, and who has the most pressure on them?",
  "What does the active character want in this scene?",
  "What blocks them?",
  "What changes by the end: power, emotion, knowledge, relationship, stakes, or plan?",
  "What is the last image, line, or action?",
];

type Section = {
  heading: string;
  level: number;
  bodyStart: number;
  bodyEnd: number;
};

function headingLevel(line: string) {
  return /^(#{1,6})\s+/.exec(line)?.[1].length ?? 0;
}

function collectSections(lines: string[]) {
  const sections: Section[] = [];

  lines.forEach((line, index) => {
    const level = headingLevel(line);
    if (level === 0) return;

    let bodyEnd = lines.length;
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLevel = headingLevel(lines[nextIndex]);
      if (nextLevel > 0 && nextLevel <= level) {
        bodyEnd = nextIndex;
        break;
      }
    }

    sections.push({ heading: line.trim(), level, bodyStart: index + 1, bodyEnd });
  });

  return sections;
}

function unfinishedLine(line: string) {
  const normalized = line
    .trim()
    .replace(/^-\s*/, "")
    .replace(/^Start:\s*/, "")
    .replace(/^End:\s*/, "")
    .trim();

  return (
    normalized === LEGACY_NEEDS_ANSWER ||
    normalized === NEEDS_ANSWER ||
    normalized.startsWith(`${LEGACY_NEEDS_ANSWER} `) ||
    normalized.startsWith(`${NEEDS_ANSWER} `) ||
    normalized.startsWith(`${NEEDS_WRITING} `)
  );
}

function sectionCanBeAutofilled(lines: string[]) {
  const meaningfulLines = lines.map((line) => line.trim()).filter(Boolean);
  return meaningfulLines.length > 0 && meaningfulLines.every(unfinishedLine);
}

function replaceUnfinishedSections(markdown: string, generatedMarkdown: string) {
  const lines = markdown.split("\n");
  const generatedLines = generatedMarkdown.split("\n");
  const generatedSections = new Map(
    collectSections(generatedLines).map((section) => [
      section.heading,
      generatedLines.slice(section.bodyStart, section.bodyEnd),
    ]),
  );

  for (const section of collectSections(lines).reverse()) {
    const replacement = generatedSections.get(section.heading);
    if (!replacement || replacement.length === 0) continue;

    const currentBody = lines.slice(section.bodyStart, section.bodyEnd);
    if (!sectionCanBeAutofilled(currentBody)) continue;

    lines.splice(section.bodyStart, section.bodyEnd - section.bodyStart, ...replacement);
  }

  return lines.join("\n");
}

function migrateRoomMarkdown(markdown: string, generatedMarkdown: string) {
  let migrated = markdown;

  for (const prompt of LEGACY_ROOM_PROMPTS) {
    migrated = migrated.replaceAll(`\n${prompt}`, `\n${NEEDS_WRITING} ${prompt}`);
    migrated = migrated.replaceAll(`\n- ${prompt}`, `\n- ${NEEDS_WRITING} ${prompt}`);
  }

  migrated = migrated.replaceAll("\n- \n", `\n- ${NEEDS_WRITING}\n`);
  migrated = migrated.replaceAll(
    "**Characters:**\n\n**Scene want:**",
    `**Characters:**\n${NEEDS_WRITING} Who is in the scene, and who has the most pressure on them?\n\n**Scene want:**`,
  );
  migrated = migrated.replaceAll("Start:\nEnd:", `Start: ${NEEDS_WRITING}\nEnd: ${NEEDS_WRITING}`);
  migrated = migrated.replaceAll("Start: \nEnd: ", `Start: ${NEEDS_WRITING}\nEnd: ${NEEDS_WRITING}`);

  return replaceUnfinishedSections(migrated, generatedMarkdown);
}

function migrateProject(project: ScriptBase) {
  let changed = false;
  const generatedRooms = buildScriptBase(project.answers).rooms;
  const roomSlugs = Array.from(new Set([...Object.keys(generatedRooms), ...Object.keys(project.rooms)]));
  const rooms = Object.fromEntries(
    roomSlugs.map((slug) => {
      const markdown = project.rooms[slug];
      if (markdown === undefined) {
        changed = true;
        return [slug, generatedRooms[slug] ?? ""];
      }

      const migrated = migrateRoomMarkdown(markdown, generatedRooms[slug] ?? markdown);
      if (migrated !== markdown) changed = true;
      return [slug, migrated];
    }),
  ) as ScriptBase["rooms"];

  return changed ? { ...project, rooms, updatedAt: new Date().toISOString() } : project;
}

export function createBlankProject() {
  return buildScriptBase({});
}

export function loadProject(): ScriptBase | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return migrateProject(JSON.parse(raw) as ScriptBase);
  } catch {
    window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    return null;
  }
}

export function saveProject(project: ScriptBase) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PROJECT_STORAGE_KEY,
    JSON.stringify({ ...project, updatedAt: new Date().toISOString() }),
  );
}

export function ensureProject() {
  const existing = loadProject();
  if (existing) {
    saveProject(existing);
    return existing;
  }

  const blank = createBlankProject();
  saveProject(blank);
  return blank;
}

export function clearProject() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROJECT_STORAGE_KEY);
}
