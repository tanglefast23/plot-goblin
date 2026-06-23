import { getActiveRooms, getComingSoonRooms } from "./storyRooms";

export const NEEDS_ANSWER = "[Needs answer]";

export type SetupQuestionId =
  | "rawIdea"
  | "genre"
  | "audienceFeeling"
  | "protagonist"
  | "surfaceWant"
  | "stakes"
  | "falseBelief"
  | "opposition"
  | "endingDirection"
  | "structurePreference";

export type SetupAnswers = Partial<Record<SetupQuestionId, string>>;

export type SetupQuestion = {
  id: SetupQuestionId;
  title: string;
  goblinNudge: string;
  placeholder: string;
  allowSkip: true;
  options?: string[];
  multiple?: true;
};

export type RoomMarkdown = Record<string, string>;

export type ScriptBase = {
  rooms: RoomMarkdown;
  summary: {
    title: string;
    oneLine: string;
    needsAnswerCount: number;
    strongestKnownPieces: string[];
    goblinWarnings: string[];
  };
  answers: SetupAnswers;
  createdAt: string;
  updatedAt: string;
};

export const guidedSetupQuestions: SetupQuestion[] = [
  {
    id: "rawIdea",
    title: "What's the movie idea, badly explained?",
    goblinNudge: "Bad is fine. Vague is not. Give me the mess.",
    placeholder: "A burned-out paramedic has to keep a mysterious patient alive during one impossible night.",
    allowSkip: true,
  },
  {
    id: "genre",
    title: "What kind of movie is this?",
    goblinNudge: "The goblin needs the promise. Thriller? Romance? Sad clown space opera?",
    placeholder: "Thriller, comedy, drama, horror, romance, sci-fi...",
    allowSkip: true,
    options: ["Drama", "Comedy", "Thriller", "Horror", "Romance", "Action", "Sci-fi", "Fantasy", "Crime"],
    multiple: true,
  },
  {
    id: "audienceFeeling",
    title: "What should the audience feel most?",
    goblinNudge: "Dread, longing, tension, wonder, catharsis, laughter, discomfort — pick a flavor of suffering.",
    placeholder: "Tension and catharsis",
    allowSkip: true,
  },
  {
    id: "protagonist",
    title: "Who is the story really about?",
    goblinNudge: "Name or role, how they start, and what they avoid. Biography is optional. Damage is useful.",
    placeholder: "Mara, a burned-out paramedic who avoids needing anyone.",
    allowSkip: true,
  },
  {
    id: "surfaceWant",
    title: "What do they want on the surface?",
    goblinNudge: "The goblin rejects 'happiness.' What can we see them chasing?",
    placeholder: "Win the case. Save the restaurant. Find the missing sister. Survive the night.",
    allowSkip: true,
  },
  {
    id: "stakes",
    title: "What gets worse if they fail?",
    goblinNudge: "If failure only makes them sad, the goblin remains hungry.",
    placeholder: "External loss, emotional loss, public/social loss, or moral cost.",
    allowSkip: true,
  },
  {
    id: "falseBelief",
    title: "What lie does the protagonist believe?",
    goblinNudge: "This is the tasty bit. Character, theme, and structure all feed on this lie.",
    placeholder: "If I control everything, I can't be hurt.",
    allowSkip: true,
  },
  {
    id: "opposition",
    title: "Who or what actively blocks them?",
    goblinNudge: "A villain is nice. A villain who thinks they're right is dinner.",
    placeholder: "A person, system, monster, rival, family, workplace, ticking clock, or flaw.",
    allowSkip: true,
  },
  {
    id: "endingDirection",
    title: "What kind of ending are we aiming for?",
    goblinNudge: "Pick the wound shape. Victory? Ruin? Bittersweet goblin crumbs?",
    placeholder: "They change and win / change but lose / refuse to change / ambiguous",
    allowSkip: true,
    options: [
      "They change and win",
      "They change but lose",
      "They refuse to change and win externally",
      "They refuse to change and are destroyed",
      "Bittersweet / ambiguous",
      "I don't know yet",
    ],
  },
  {
    id: "structurePreference",
    title: "How much structure should the goblin impose?",
    goblinNudge: "Default is classic three-act. The cage has a door.",
    placeholder: "Classic 3-act spine",
    allowSkip: true,
    options: ["Classic 3-act spine", "Loose beat map", "Customize from scratch"],
  },
];

function answer(answers: SetupAnswers, key: SetupQuestionId) {
  const value = answers[key]?.trim();
  return value && value.length > 0 ? value : NEEDS_ANSWER;
}

function sentence(value: string) {
  if (value === NEEDS_ANSWER) return value;
  return value.endsWith(".") || value.endsWith("!") || value.endsWith("?") ? value : `${value}.`;
}

function splitListAnswer(value: string) {
  return value
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);
}

function moviePromiseGenre(value: string) {
  if (value === NEEDS_ANSWER) return value;

  const genres = splitListAnswer(value);
  if (genres.length < 2) return value.toLowerCase();

  return `${genres.map((genre) => genre.toLowerCase()).join(" / ")} hybrid`;
}

function moviePromiseLabel(value: string) {
  if (value === NEEDS_ANSWER) return value;

  const genres = splitListAnswer(value);
  if (genres.length < 2) return value;

  return `${genres.join(" / ")} hybrid`;
}

function countNeedsAnswers(markdownByRoom: RoomMarkdown) {
  return Object.values(markdownByRoom).reduce((count, markdown) => {
    return count + [...markdown.matchAll(/\[Needs answer\]/g)].length;
  }, 0);
}

export function buildScriptBase(answers: SetupAnswers, now = new Date()): ScriptBase {
  const rawIdea = answer(answers, "rawIdea");
  const genre = answer(answers, "genre");
  const audienceFeeling = answer(answers, "audienceFeeling");
  const protagonist = answer(answers, "protagonist");
  const surfaceWant = answer(answers, "surfaceWant");
  const stakes = answer(answers, "stakes");
  const falseBelief = answer(answers, "falseBelief");
  const opposition = answer(answers, "opposition");
  const endingDirection = answer(answers, "endingDirection");
  const structurePreference = answer(answers, "structurePreference") === NEEDS_ANSWER ? "Classic 3-act spine" : answer(answers, "structurePreference");

  const rooms: RoomMarkdown = {
    premise: `# Premise Room

## Raw idea
${sentence(rawIdea)}

## Story promise
A ${moviePromiseGenre(genre)} built to make the audience feel ${audienceFeeling.toLowerCase()}.

## Protagonist
${sentence(protagonist)}

## Surface want
${sentence(surfaceWant)}

## Stakes
${sentence(stakes)}

## Opposition
${sentence(opposition)}

## Dramatic question
Can ${protagonist === NEEDS_ANSWER ? "the protagonist" : protagonist} ${surfaceWant === NEEDS_ANSWER ? "get what they want" : surfaceWant} before the cost becomes irreversible?

## Polished logline
${NEEDS_ANSWER}
`,
    characters: `# Characters Room

## Protagonist
${sentence(protagonist)}

### Surface want
${sentence(surfaceWant)}

### Deeper need
${NEEDS_ANSWER}

### False belief
${sentence(falseBelief)}

### Flaw / defense mechanism
${NEEDS_ANSWER}

### Pressure test
${NEEDS_ANSWER}

### Arc
Start: ${falseBelief}
End: ${endingDirection}

## Antagonist / opposition
${sentence(opposition)}

### Why are they right from their point of view?
${NEEDS_ANSWER}

## Key supporting characters
- ${NEEDS_ANSWER}
`,
    theme: `# Theme Room

## Theme question
If ${falseBelief === NEEDS_ANSWER ? "the protagonist's lie" : falseBelief}, what does the story prove through pressure and consequence?

## Starting belief
${sentence(falseBelief)}

## Opposing argument
${sentence(opposition)}

## Story proof
${NEEDS_ANSWER}

## Ending statement
${sentence(endingDirection)}
`,
    beats: `# Beats Room

Hybrid default: ${structurePreference}. Rename, skip, add, or reorder beats when the story needs it.

## Opening Image
A visual snapshot of ${protagonist === NEEDS_ANSWER ? "the protagonist" : protagonist} before pressure hits.

## Setup
Establish the world, the want (${surfaceWant}), the lie (${falseBelief}), and the cost of staying the same.

## Inciting Incident
Something forces the protagonist toward ${surfaceWant}.

## Debate / Refusal
Why they hesitate, dodge, rationalize, or choose badly.

## Act One Break
They make a choice that locks them into the story.

## Promise of the Premise
The movie delivers the fun/terror/longing promised by ${moviePromiseLabel(genre)}.

## Midpoint
A reveal, reversal, or false victory makes the old plan impossible.

## Bad Guys Close In
${opposition} tightens the trap.

## All Is Lost
The cost becomes personal, public, moral, or irreversible: ${stakes}

## Dark Night of the Soul
The protagonist confronts the lie: ${falseBelief}

## Act Three Break
A new choice points toward the ending: ${endingDirection}

## Climax
The protagonist must choose under maximum pressure.

## Final Image
A visual answer to the opening image.

## Custom beats
- ${NEEDS_ANSWER}
`,
    scenes: `# Scenes Room

## Scene card template

### Scene: [Short title]

**Location / time:** INT./EXT. PLACE - DAY/NIGHT

**Characters:**

**Scene want:**
What does the active character want in this scene?

**Opposition:**
What blocks them?

**Turn:**
What changes by the end: power, emotion, knowledge, relationship, stakes, or plan?

**Button:**
What is the last image, line, or action?

**Purpose:**
Plot / character / theme / tension / setup / payoff

---

## Scene list
- ${NEEDS_ANSWER}
`,
  };

  for (const room of getComingSoonRooms()) {
    rooms[room.slug] = `# ${room.title} Room

Coming soon.

## Purpose
${room.purpose}

## Starter note
${NEEDS_ANSWER}
`;
  }

  const needsAnswerCount = countNeedsAnswers(rooms);
  const strongestKnownPieces = [rawIdea, protagonist, surfaceWant, stakes, falseBelief].filter(
    (piece) => piece !== NEEDS_ANSWER,
  );
  const goblinWarnings = [
    surfaceWant === NEEDS_ANSWER ? "The goblin still needs a visible surface want." : null,
    stakes === NEEDS_ANSWER ? "The goblin smells weak stakes. Feed it consequences." : null,
    falseBelief === NEEDS_ANSWER ? "The protagonist's lie is missing. The theme is starving." : null,
  ].filter(Boolean) as string[];

  const timestamp = now.toISOString();
  return {
    rooms,
    summary: {
      title: rawIdea === NEEDS_ANSWER ? "Untitled Goblin Snack" : rawIdea,
      oneLine:
        rawIdea === NEEDS_ANSWER
          ? "The story exists, but the goblin wants a premise."
          : `${rawIdea} The current spine follows ${protagonist} chasing ${surfaceWant}.`,
      needsAnswerCount,
      strongestKnownPieces,
      goblinWarnings,
    },
    answers,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createLoglineSuggestions(answers: SetupAnswers) {
  const protagonist = answer(answers, "protagonist");
  const want = answer(answers, "surfaceWant");
  const stakes = answer(answers, "stakes");
  const opposition = answer(answers, "opposition");
  const falseBelief = answer(answers, "falseBelief");

  return [
    `When ${protagonist} must ${want}, ${opposition} forces them to risk ${stakes}.`,
    `${protagonist} must ${want} before ${stakes}, but winning means confronting the lie that ${falseBelief}.`,
  ];
}

export function buildExportMarkdown(rooms: RoomMarkdown) {
  const activeSlugs = getActiveRooms().map((room) => room.slug);
  const otherSlugs = Object.keys(rooms).filter((slug) => !activeSlugs.includes(slug));
  const orderedSlugs = [...activeSlugs, ...otherSlugs];

  return [
    "# Plot Goblin Export",
    "",
    "Generated from local browser storage. The goblin recommends backing this up somewhere less snackable.",
    "",
    ...orderedSlugs.flatMap((slug) => [`## ${slug}.md`, "", rooms[slug] ?? "", ""]),
  ].join("\n");
}
