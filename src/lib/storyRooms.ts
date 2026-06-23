export type RoomStatus = "active" | "coming-soon";

export type StoryRoom = {
  slug: string;
  title: string;
  status: RoomStatus;
  markdownFile: string;
  purpose: string;
  guidingQuestion: string;
  prompts: string[];
};

export type ScriptReadinessIssue = {
  reason: string;
  room: StoryRoom;
};

export type ScriptRoomProgress = {
  completed: number;
  missingRequirements: string[];
  percent: number;
  remaining: number;
  room: StoryRoom;
  total: number;
};

export type ScriptReadiness = {
  blockedRooms: StoryRoom[];
  missingRoom?: StoryRoom;
  missingRooms: ScriptReadinessIssue[];
  ready: boolean;
  roomProgress: ScriptRoomProgress[];
};

export const structureModes = {
  default: "guided-three-act",
  allowCustomBeats: true,
  principle:
    "Start with proven screenplay pressure points, then let the writer rename, skip, add, and reorder beats when the story needs it.",
} as const;

export const storyRooms: StoryRoom[] = [
  {
    slug: "premise",
    title: "Premise",
    status: "active",
    markdownFile: "premise.md",
    purpose: "Turn a raw idea into a logline, dramatic question, stakes, and story promise.",
    guidingQuestion: "What movie are we promising, and why must it happen now?",
    prompts: [
      "What does the protagonist want on the surface?",
      "What happens if they fail?",
      "What is the emotional question under the plot?",
    ],
  },
  {
    slug: "characters",
    title: "Characters",
    status: "active",
    markdownFile: "characters.md",
    purpose: "Shape the protagonist, antagonist, and key players around desire, flaw, pressure, and change.",
    guidingQuestion: "Who is forced to change, and what lie are they protecting?",
    prompts: [
      "What does each character want?",
      "What do they actually need?",
      "Which pressure test reveals who they really are?",
    ],
  },
  {
    slug: "theme",
    title: "Theme",
    status: "active",
    markdownFile: "theme.md",
    purpose: "Define the story's central argument without turning it into a sermon.",
    guidingQuestion: "What question does the story test through choices and consequences?",
    prompts: [
      "What belief does the protagonist start with?",
      "Who embodies the opposing answer?",
      "What does the ending prove, complicate, or refuse to resolve?",
    ],
  },
  {
    slug: "beats",
    title: "Beats",
    status: "active",
    markdownFile: "beats.md",
    purpose: "Map the major turns from opening image to final image with flexible three-act defaults.",
    guidingQuestion: "Where does pressure escalate, reverse, and force a new choice?",
    prompts: [
      "What changes at each act break?",
      "What does the midpoint reveal or reverse?",
      "Which beat most directly attacks the protagonist's false belief?",
    ],
  },
  {
    slug: "scenes",
    title: "Scenes",
    status: "active",
    markdownFile: "scenes.md",
    purpose: "Break the story into playable scene cards where every scene creates change.",
    guidingQuestion: "What changes by the end of this scene?",
    prompts: [
      "Who enters with a goal?",
      "What blocks them?",
      "What turns by the end: power, emotion, knowledge, relationship, or stakes?",
    ],
  },
  {
    slug: "script-parameters",
    title: "Script Parameters",
    status: "active",
    markdownFile: "script-parameters.md",
    purpose: "Set the strict drafting rules: length, genre, tone, rating, format, structure, and production boundaries.",
    guidingQuestion: "What rules must the script obey before it writes a single slugline?",
    prompts: [
      "How long is it: short, feature, or really long, and what page target should it hit?",
      "What genre, rating, tone, and audience promise must stay locked?",
      "What constraints shape the pages: cast, locations, time period, POV, language, or no-go content?",
    ],
  },
  {
    slug: "create-script",
    title: "Create the Script",
    status: "active",
    markdownFile: "create-script.md",
    purpose: "Summon the goblin to check whether the script has enough bones for a halfway decent draft.",
    guidingQuestion: "Has the writer fed the goblin enough premise, character, theme, beats, and drafting rules?",
    prompts: [
      "Script Parameters must be completely filled out.",
      "Premise, Characters, and Beats need the strongest story spine.",
      "Theme can be lighter, but it cannot be empty fog.",
      "Scenes are useful later, but they are not required to start a draft.",
    ],
  },
  {
    slug: "relationships",
    title: "Relationships",
    status: "coming-soon",
    markdownFile: "relationships.md",
    purpose: "Track emotional geometry, power shifts, secrets, and relationship turns.",
    guidingQuestion: "How does this relationship change the story's choices?",
    prompts: ["What do they need from each other?", "Who has power now?"],
  },
  {
    slug: "world",
    title: "World",
    status: "coming-soon",
    markdownFile: "world.md",
    purpose: "Build the arena, rules, rituals, status games, and visual texture.",
    guidingQuestion: "How does the world pressure the story instead of decorating it?",
    prompts: ["Who has power here?", "What rule cannot be broken?"],
  },
  {
    slug: "dialogue",
    title: "Dialogue",
    status: "coming-soon",
    markdownFile: "dialogue.md",
    purpose: "Develop voice, subtext, status play, and character-specific language.",
    guidingQuestion: "What is each character doing with words besides saying information?",
    prompts: ["What do they never say directly?", "What is their default verbal weapon?"],
  },
  {
    slug: "setups-payoffs",
    title: "Setups/Payoffs",
    status: "coming-soon",
    markdownFile: "setups-payoffs.md",
    purpose: "Track planted details that return with changed meaning.",
    guidingQuestion: "What comes back later and matters more the second time?",
    prompts: ["Where is it planted?", "How does the payoff change meaning?"],
  },
  {
    slug: "revision",
    title: "Revision",
    status: "coming-soon",
    markdownFile: "revision.md",
    purpose: "Turn diagnostics into a rewrite plan: weak scenes, flat arcs, missing payoffs, and tone drift.",
    guidingQuestion: "What is the highest-leverage fix for the next draft?",
    prompts: ["What is weak but fixable?", "What should be cut, merged, or sharpened?"],
  },
];

export const SCRIPT_SOURCE_ROOM_SLUGS = [
  "script-parameters",
  "premise",
  "characters",
  "theme",
  "beats",
] as const;

const UNFINISHED_MARKER_PATTERN = /\[(?:needs your answer|needs answer|needs writing)\]/i;

export const CREATE_SCRIPT_BLOCKED_MESSAGES = [
  "I would love to write your screenplay, truly, but right now you have handed me fog in a hat. Feed me the {room} room first.",
  "Magnificent. A draft request with the structural density of soup steam. The goblin requires {room} before committing crimes against cinema.",
  "I checked the story pantry and found vibes, lint, and one frightened adjective. Go fill out {room} so this can become a movie instead of a haunted shrug.",
  "Your confidence is adorable. Unfortunately, the screenplay machine runs on choices, consequences, and {room}, not wishing noises.",
  "I can write nonsense immediately. I am gifted that way. But for a halfway decent script, the goblin demands {room}.",
] as const;

type MarkdownSection = {
  body: string;
  heading: string;
  level: number;
  ownBody: string;
};

const REQUIRED_SCRIPT_PARAMETER_LABELS = [
  "Length format",
  "Target page count",
  "Current genre",
  "Audience feeling",
  "Tone words",
  "Structure mode",
  "Pacing bias",
  "Scene length rule",
  "Format",
  "Dialogue density",
  "Voiceover / narration",
  "Target rating",
  "No-go content",
  "Cast size",
  "Location limits",
  "Time period / setting rules",
  "Budget reality",
  "Primary POV",
  "Scene access",
] as const;

const PREMISE_REQUIRED_SECTIONS = [
  ["Story promise", "Core promise"],
  ["Raw idea"],
  ["Protagonist"],
  ["Surface want"],
  ["Stakes"],
  ["Opposition"],
  ["Dramatic question"],
  ["Polished logline", "Logline"],
];

const CHARACTER_REQUIRED_SECTIONS = [
  ["Protagonist"],
  ["Surface want"],
  ["Deeper need"],
  ["False belief"],
  ["Flaw / defense mechanism"],
  ["Antagonist / opposition"],
];

const THEME_REQUIRED_SECTIONS = [["Theme question"], ["Starting belief"], ["Ending statement"]];

const BEAT_REQUIRED_SECTIONS = [
  ["Opening Image"],
  ["Inciting Incident"],
  ["Act One Break"],
  ["Midpoint"],
  ["All Is Lost"],
  ["Climax"],
  ["Final Image"],
];

function headingLevel(line: string) {
  return /^(#{1,6})\s+/.exec(line)?.[1].length ?? 0;
}

function normalizeHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_#]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headingIndexes = lines.reduce<Array<{ index: number; level: number }>>((indexes, line, index) => {
    const level = headingLevel(line);
    if (level > 0) indexes.push({ index, level });
    return indexes;
  }, []);

  return headingIndexes.map((heading, headingIndex) => {
    let bodyEnd = lines.length;
    let ownBodyEnd = lines.length;

    for (let index = heading.index + 1; index < lines.length; index += 1) {
      const nextLevel = headingLevel(lines[index]);
      if (nextLevel === 0) continue;
      if (ownBodyEnd === lines.length) ownBodyEnd = index;
      if (nextLevel <= heading.level) {
        bodyEnd = index;
        break;
      }
    }

    const nextHeading = headingIndexes[headingIndex + 1]?.index;
    if (nextHeading !== undefined && ownBodyEnd === lines.length) ownBodyEnd = nextHeading;

    return {
      body: lines.slice(heading.index + 1, bodyEnd).join("\n").trim(),
      heading: lines[heading.index].replace(/^#{1,6}\s+/, "").trim(),
      level: heading.level,
      ownBody: lines.slice(heading.index + 1, ownBodyEnd).join("\n").trim(),
    };
  });
}

function section(markdown: string, heading: string) {
  const normalized = normalizeHeading(heading);
  return markdownSections(markdown).find((candidate) => normalizeHeading(candidate.heading) === normalized);
}

function finishedText(value: string | undefined) {
  if (!value || UNFINISHED_MARKER_PATTERN.test(value)) return false;

  const cleaned = value
    .replace(/^[-*\s]+/gm, "")
    .replace(/\[(?:short title|protagonist|goal|stakes\/clock|central obstacle|hard choice)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 3;
}

function sectionGroupIsReady(markdown: string, headings: string[]) {
  return headings.some((heading) => finishedText(section(markdown, heading)?.ownBody));
}

function firstMissingSection(markdown: string, sectionGroups: string[][]) {
  return sectionGroups.find((headings) => !sectionGroupIsReady(markdown, headings))?.[0] ?? null;
}

function completedSectionGroups(markdown: string, sectionGroups: string[][]) {
  return sectionGroups.filter((headings) => sectionGroupIsReady(markdown, headings)).length;
}

function lineValue(markdown: string, label: string) {
  const match = new RegExp(`^${escapeRegExp(label)}:\\s*(.*)$`, "im").exec(markdown);
  return match?.[1]?.trim() ?? "";
}

function lineIsReady(markdown: string, label: string) {
  const value = lineValue(markdown, label);
  if (!finishedText(value)) return false;
  if (label === "Target page count") return /\d+/.test(value);
  if (label === "Cast size") return /\d+/.test(value);
  return true;
}

function firstMissingScriptParameter(markdown: string) {
  return REQUIRED_SCRIPT_PARAMETER_LABELS.find((label) => !lineIsReady(markdown, label)) ?? null;
}

function completedScriptParameters(markdown: string) {
  return REQUIRED_SCRIPT_PARAMETER_LABELS.filter((label) => lineIsReady(markdown, label)).length;
}

function missingScriptParameters(markdown: string) {
  return REQUIRED_SCRIPT_PARAMETER_LABELS.filter((label) => !lineIsReady(markdown, label));
}

function missingSectionGroups(markdown: string, sectionGroups: string[][]) {
  return sectionGroups.filter((headings) => !sectionGroupIsReady(markdown, headings)).map((headings) => headings[0]);
}

function firstMissingReason(slug: (typeof SCRIPT_SOURCE_ROOM_SLUGS)[number], markdown: string) {
  if (!markdown.trim()) return "Add usable story material.";

  if (slug === "script-parameters") {
    const missingParameter = firstMissingScriptParameter(markdown);
    return missingParameter ? `Fill out ${missingParameter}.` : null;
  }

  if (slug === "premise") {
    const missing = firstMissingSection(markdown, PREMISE_REQUIRED_SECTIONS);
    return missing ? `Fill out ${missing}.` : null;
  }

  if (slug === "characters") {
    const missing = firstMissingSection(markdown, CHARACTER_REQUIRED_SECTIONS);
    return missing ? `Fill out ${missing}.` : null;
  }

  if (slug === "theme") {
    const missing = firstMissingSection(markdown, THEME_REQUIRED_SECTIONS);
    return missing ? `Fill out ${missing}.` : null;
  }

  if (slug === "beats") {
    const missing = firstMissingSection(markdown, BEAT_REQUIRED_SECTIONS);
    return missing ? `Fill out ${missing}.` : null;
  }

  return null;
}

function buildRoomProgress(
  slug: (typeof SCRIPT_SOURCE_ROOM_SLUGS)[number],
  room: StoryRoom,
  markdown: string,
): ScriptRoomProgress {
  let completed = 0;
  let missingRequirements: string[] = [];
  let total = 1;

  if (slug === "script-parameters") {
    completed = completedScriptParameters(markdown);
    missingRequirements = missingScriptParameters(markdown);
    total = REQUIRED_SCRIPT_PARAMETER_LABELS.length;
  } else if (slug === "premise") {
    completed = completedSectionGroups(markdown, PREMISE_REQUIRED_SECTIONS);
    missingRequirements = missingSectionGroups(markdown, PREMISE_REQUIRED_SECTIONS);
    total = PREMISE_REQUIRED_SECTIONS.length;
  } else if (slug === "characters") {
    completed = completedSectionGroups(markdown, CHARACTER_REQUIRED_SECTIONS);
    missingRequirements = missingSectionGroups(markdown, CHARACTER_REQUIRED_SECTIONS);
    total = CHARACTER_REQUIRED_SECTIONS.length;
  } else if (slug === "theme") {
    completed = completedSectionGroups(markdown, THEME_REQUIRED_SECTIONS);
    missingRequirements = missingSectionGroups(markdown, THEME_REQUIRED_SECTIONS);
    total = THEME_REQUIRED_SECTIONS.length;
  } else if (slug === "beats") {
    completed = completedSectionGroups(markdown, BEAT_REQUIRED_SECTIONS);
    missingRequirements = missingSectionGroups(markdown, BEAT_REQUIRED_SECTIONS);
    total = BEAT_REQUIRED_SECTIONS.length;
  }

  const remaining = Math.max(total - completed, 0);

  return {
    completed,
    missingRequirements,
    percent: total === 0 ? 100 : Math.round((completed / total) * 100),
    remaining,
    room,
    total,
  };
}

export function getActiveRooms() {
  return storyRooms.filter((room) => room.status === "active");
}

export function getComingSoonRooms() {
  return storyRooms.filter((room) => room.status === "coming-soon");
}

export function getScriptReadiness(rooms: Record<string, string>): ScriptReadiness {
  const roomProgress = SCRIPT_SOURCE_ROOM_SLUGS.flatMap<ScriptRoomProgress>((slug) => {
    const room = storyRooms.find((candidate) => candidate.slug === slug);
    if (!room) return [];

    return [buildRoomProgress(slug, room, rooms[slug] ?? "")];
  });

  const missingRooms = SCRIPT_SOURCE_ROOM_SLUGS.flatMap<ScriptReadinessIssue>((slug) => {
    const room = storyRooms.find((candidate) => candidate.slug === slug);
    if (!room) return [];

    const markdown = rooms[slug] ?? "";
    const reason = firstMissingReason(slug, markdown);

    return reason ? [{ reason, room }] : [];
  });
  const blockedRooms = missingRooms.map((issue) => issue.room);

  return {
    blockedRooms,
    missingRoom: blockedRooms[0],
    missingRooms,
    ready: blockedRooms.length === 0,
    roomProgress,
  };
}
