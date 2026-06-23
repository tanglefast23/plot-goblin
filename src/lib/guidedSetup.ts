import { getActiveRooms, getComingSoonRooms } from "./storyRooms";

export const NEEDS_ANSWER = "[needs your answer]";
export const LEGACY_NEEDS_ANSWER = "[Needs answer]";
export const NEEDS_WRITING = "[Needs writing]";

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

function providedAnswer(answers: SetupAnswers, key: SetupQuestionId) {
  const value = answers[key]?.trim();
  return value && value.length > 0 ? value : null;
}

function sentence(value: string) {
  return value.endsWith(".") || value.endsWith("!") || value.endsWith("?") ? value : `${value}.`;
}

function needsYourAnswer(guess: string) {
  return `${NEEDS_ANSWER} ${sentence(guess.trim())}`;
}

function setupGuess(answers: SetupAnswers, key: SetupQuestionId) {
  const protagonist = providedAnswer(answers, "protagonist") ?? "the protagonist";
  const want = providedAnswer(answers, "surfaceWant") ?? "get what they want";
  const stakes = providedAnswer(answers, "stakes") ?? "the cost becomes personal";
  const falseBelief = providedAnswer(answers, "falseBelief") ?? "getting the visible goal will fix the deeper problem";
  const genre = providedAnswer(answers, "genre")?.toLowerCase() ?? "";

  switch (key) {
    case "rawIdea":
      return `${protagonist} chases ${want} before ${stakes}`;
    case "genre":
      if (genre) return genre;
      if (/laugh|funny|comic|joke/i.test(providedAnswer(answers, "audienceFeeling") ?? "")) return "Comedy";
      if (/dread|terror|fear|scare/i.test(providedAnswer(answers, "audienceFeeling") ?? "")) return "Horror";
      return "character-driven drama";
    case "audienceFeeling":
      if (/comedy|comic/i.test(genre)) return "hopeful, funny, and tense";
      if (/horror|thriller/i.test(genre)) return "dread and suspense";
      return "tension and catharsis";
    case "protagonist":
      return "a protagonist whose want exposes the wound they keep protecting";
    case "surfaceWant":
      return "win the visible goal that would prove they matter";
    case "stakes":
      return `They lose the chance to ${want} and have to face what that dream was protecting`;
    case "falseBelief":
      return falseBelief;
    case "opposition":
      return providedAnswer(answers, "opposition") ?? "a force with a good reason to stop them";
    case "endingDirection":
      return `${protagonist} changes by confronting the lie that ${falseBelief}`;
    case "structurePreference":
      return "Classic 3-act spine";
  }
}

function answer(answers: SetupAnswers, key: SetupQuestionId) {
  return providedAnswer(answers, key) ?? needsYourAnswer(setupGuess(answers, key));
}

function answerPhrase(answers: SetupAnswers, key: SetupQuestionId) {
  return providedAnswer(answers, key) ?? setupGuess(answers, key);
}

function answerWasProvided(answers: SetupAnswers, key: SetupQuestionId) {
  return providedAnswer(answers, key) !== null;
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
    return count + [...markdown.matchAll(/\[(?:Needs answer|needs your answer|Needs writing)\]/g)].length;
  }, 0);
}

function writingPrompt(guess: string) {
  return needsYourAnswer(guess);
}

function clause(value: string) {
  const trimmed = value.trim().replace(/[.!?]+$/, "");
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function effortBased(falseBelief: string) {
  return /effort|hard work|try harder|work harder/i.test(falseBelief);
}

function createRoomGuesses(answers: SetupAnswers) {
  const protagonist = answerPhrase(answers, "protagonist");
  const surfaceWant = answerPhrase(answers, "surfaceWant");
  const stakes = answerPhrase(answers, "stakes");
  const falseBelief = answerPhrase(answers, "falseBelief");
  const opposition = answerPhrase(answers, "opposition");
  const endingDirection = answerPhrase(answers, "endingDirection");
  const genreLabel = moviePromiseLabel(answerPhrase(answers, "genre"));
  const audienceFeeling = answerPhrase(answers, "audienceFeeling");
  const effortLie = effortBased(falseBelief);
  const deeperNeed = effortLie
    ? `They may need to accept that effort alone is not enough and adapt before the stakes become real: ${clause(stakes)}`
    : `They may need to challenge the belief that ${falseBelief} and choose a truer way to pursue ${surfaceWant}`;

  return {
    polishedLogline: `When ${protagonist} must ${surfaceWant}, ${opposition} pushes them toward failure: ${clause(stakes)}`,
    deeperNeed,
    flawDefense: effortLie
      ? `They double down on effort even when adaptation, vulnerability, or help would serve the real goal: ${surfaceWant}`
      : `They protect the belief that ${falseBelief} by choosing control, denial, or avoidance when pressure rises`,
    pressureTest: effortLie
      ? `Force them into a moment where effort cannot beat the obstacle and the stakes become real: ${clause(stakes)}`
      : `Put them in a situation where chasing ${surfaceWant} makes the lie impossible to hide`,
    oppositionArgument: effortLie
      ? `${opposition} may be right that limits, talent, or reality cannot be beaten by wanting the goal badly enough`
      : `${opposition} may be right because they expose the cost of ${protagonist} chasing ${surfaceWant} while believing ${falseBelief}`,
    supportingCharacter: `Name a helper, rival, or mirror who pressures ${protagonist} to confront ${falseBelief}`,
    storyProof: `Show choices where ${protagonist} pursues ${surfaceWant}, pays ${stakes}, and learns whether ${falseBelief} can survive pressure`,
    openingImage: `Show ${protagonist} chasing ${surfaceWant} before pressure exposes ${falseBelief}`,
    incitingIncident: `An event makes ${surfaceWant} urgent and impossible to ignore`,
    debate: `${protagonist} hesitates because ${falseBelief} still feels safer than change`,
    actOneBreak: `${protagonist} commits to ${surfaceWant} even though ${opposition} makes the cost real`,
    promise: `Build a sequence that delivers the ${genreLabel} promise and makes the audience feel ${audienceFeeling}`,
    midpoint: `A reveal or reversal proves the old plan for ${surfaceWant} will not survive`,
    badGuysCloseIn: `${opposition} tightens the trap until ${protagonist} cannot dodge the lie anymore`,
    allIsLost: `Make the cost feel personal, public, moral, or irreversible: ${stakes}`,
    darkNight: `${protagonist} finally names the damage caused by believing ${falseBelief}`,
    actThreeBreak: `A new choice points toward ${endingDirection}`,
    climax: `${protagonist} makes the hardest choice and proves what has changed`,
    finalImage: `Echo the opening image, but show how ${protagonist} has changed`,
    sceneCharacters: `${protagonist}, plus whoever can apply the most pressure in this moment`,
    sceneWant: `${protagonist} wants a concrete step toward ${surfaceWant}`,
    sceneOpposition: `${opposition} blocks the scene goal or makes the cost sharper`,
    sceneTurn: `By the end, power, emotion, or the plan shifts closer to ${stakes}`,
    sceneButton: `End on an image, line, or action that makes the next scene harder to avoid`,
    firstScene: `Open with a scene that makes ${surfaceWant} visible before ${opposition} fully arrives`,
  };
}

export function buildScriptBase(answers: SetupAnswers, now = new Date()): ScriptBase {
  const rawIdea = answer(answers, "rawIdea");
  const genre = answerPhrase(answers, "genre");
  const audienceFeeling = answerPhrase(answers, "audienceFeeling");
  const protagonist = answer(answers, "protagonist");
  const surfaceWant = answer(answers, "surfaceWant");
  const stakes = answer(answers, "stakes");
  const falseBelief = answer(answers, "falseBelief");
  const opposition = answer(answers, "opposition");
  const endingDirection = answer(answers, "endingDirection");
  const protagonistPhrase = answerPhrase(answers, "protagonist");
  const surfaceWantPhrase = answerPhrase(answers, "surfaceWant");
  const falseBeliefPhrase = answerPhrase(answers, "falseBelief");
  const structurePreference = providedAnswer(answers, "structurePreference") ?? "Classic 3-act spine";
  const roomGuesses = createRoomGuesses(answers);

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
Can ${protagonistPhrase} ${surfaceWantPhrase} before the cost becomes irreversible?

## Polished logline
${writingPrompt(roomGuesses.polishedLogline)}
`,
    characters: `# Characters Room

## Protagonist
${sentence(protagonist)}

### Surface want
${sentence(surfaceWant)}

### Deeper need
${writingPrompt(roomGuesses.deeperNeed)}

### False belief
${sentence(falseBelief)}

### Flaw / defense mechanism
${writingPrompt(roomGuesses.flawDefense)}

### Pressure test
${writingPrompt(roomGuesses.pressureTest)}

### Arc
Start: ${falseBelief}
End: ${endingDirection}

## Antagonist / opposition
${sentence(opposition)}

### Why are they right from their point of view?
${writingPrompt(roomGuesses.oppositionArgument)}

## Key supporting characters
- ${writingPrompt(roomGuesses.supportingCharacter)}
`,
    theme: `# Theme Room

## Theme question
If ${falseBeliefPhrase}, what does the story prove through pressure and consequence?

## Starting belief
${sentence(falseBelief)}

## Opposing argument
${sentence(opposition)}

## Story proof
${writingPrompt(roomGuesses.storyProof)}

## Ending statement
${sentence(endingDirection)}
`,
    beats: `# Beats Room

Hybrid default: ${structurePreference}. Rename, skip, add, or reorder beats when the story needs it.

## Opening Image
${writingPrompt(roomGuesses.openingImage)}

## Setup
Establish the world, the want (${surfaceWant}), the lie (${falseBelief}), and the cost of staying the same.

## Inciting Incident
${writingPrompt(roomGuesses.incitingIncident)}

## Debate / Refusal
${writingPrompt(roomGuesses.debate)}

## Act One Break
${writingPrompt(roomGuesses.actOneBreak)}

## Promise of the Premise
${writingPrompt(roomGuesses.promise)}

## Midpoint
${writingPrompt(roomGuesses.midpoint)}

## Bad Guys Close In
${writingPrompt(roomGuesses.badGuysCloseIn)}

## All Is Lost
${writingPrompt(roomGuesses.allIsLost)}

## Dark Night of the Soul
${writingPrompt(roomGuesses.darkNight)}

## Act Three Break
${writingPrompt(roomGuesses.actThreeBreak)}

## Climax
${writingPrompt(roomGuesses.climax)}

## Final Image
${writingPrompt(roomGuesses.finalImage)}

## Custom beats
- ${writingPrompt("Add, rename, skip, or reorder beats once this spine starts fighting back")}
`,
    scenes: `# Scenes Room

## Scene card template

### Scene: [Short title]

**Location / time:** INT./EXT. PLACE - DAY/NIGHT

**Characters:**
${writingPrompt(roomGuesses.sceneCharacters)}

**Scene want:**
${writingPrompt(roomGuesses.sceneWant)}

**Opposition:**
${writingPrompt(roomGuesses.sceneOpposition)}

**Turn:**
${writingPrompt(roomGuesses.sceneTurn)}

**Button:**
${writingPrompt(roomGuesses.sceneButton)}

**Purpose:**
Plot / character / theme / tension / setup / payoff

---

## Scene list
- ${writingPrompt(roomGuesses.firstScene)}
`,
    "script-parameters": `# Script Parameters Room

These are the rules an AI draft must obey when it generates screenplay pages from the other rooms. Change any line that is wrong before asking for pages.

## Runtime / page target
${writingPrompt("Choose short film, feature film, or really long feature, then drag the page target if needed")}
- Short film: roughly 5-30 pages.
- Feature film: roughly 90-110 pages.
- Really long feature: roughly 120-150 pages.

## Genre / movie promise
Current genre: ${sentence(moviePromiseLabel(genre))}
Audience feeling: ${sentence(audienceFeeling)}
Change this here if the script should obey a different promise than setup picked.

## Structure and pacing
Structure mode: ${sentence(structurePreference)}
Pacing bias: ${writingPrompt("Choose lean and fast, slow-burn, chaptered, ensemble, contained thriller, or another rhythm")}
Scene length rule: ${writingPrompt("Name whether scenes should be short and punchy, talky and patient, or mixed")}

## Format rules
Format: Standard spec screenplay format.
Dialogue density: ${writingPrompt("Choose sparse, naturalistic, heightened, joke-dense, poetic, or another dialogue lane")}
Voiceover / narration: ${writingPrompt("Allowed only if you explicitly say so here")}

## Rating and boundaries
Target rating: ${writingPrompt("Choose G, PG, PG-13, R, NC-17, or your own boundary")}
No-go content: ${writingPrompt("List anything the AI should avoid inventing or showing")}

## Production constraints
Cast size: ${writingPrompt("How many major speaking roles can the script support?")}
Location limits: ${writingPrompt("Contained, road movie, globe-trotting, one location, or specific places")}
Time period / setting rules: ${writingPrompt("What era, location, technology level, or world rules cannot change?")}
Budget reality: ${writingPrompt("Cheap, medium, expensive, animated, impossible dream, or other")}

## Point of view
Primary POV: ${writingPrompt("Whose experience should drive most scenes?")}
Scene access: ${writingPrompt("Can scenes happen without the protagonist, or should the script stay close?")}

## AI drafting rules
Treat these as strict rules when generating script pages.
- Use the other rooms as source material, but do not contradict this room.
- Do not silently rewrite premise, character arc, theme, beats, or scenes to make drafting easier.
- If a required parameter is missing, ask a follow-up question instead of inventing a major constraint.
- One screenplay page roughly equals one minute of screen time unless this room says otherwise.
`,
  };

  for (const room of getComingSoonRooms()) {
    rooms[room.slug] = `# ${room.title} Room

Coming soon.

## Purpose
${room.purpose}

## Starter note
${writingPrompt(`Save one useful note for the ${room.title} room once it opens up`)}
`;
  }

  const needsAnswerCount = countNeedsAnswers(rooms);
  const strongestKnownPieces = [rawIdea, protagonist, surfaceWant, stakes, falseBelief].filter(
    (_piece, index) => {
      const keys: SetupQuestionId[] = ["rawIdea", "protagonist", "surfaceWant", "stakes", "falseBelief"];
      return answerWasProvided(answers, keys[index]);
    },
  );
  const goblinWarnings = [
    !answerWasProvided(answers, "surfaceWant") ? "The goblin guessed a visible surface want. Confirm it before trusting it." : null,
    !answerWasProvided(answers, "stakes") ? "The goblin guessed the stakes. Feed it real consequences." : null,
    !answerWasProvided(answers, "falseBelief") ? "The goblin guessed the protagonist's lie. Theme still needs your answer." : null,
  ].filter(Boolean) as string[];

  const timestamp = now.toISOString();
  return {
    rooms,
    summary: {
      title: answerWasProvided(answers, "rawIdea") ? rawIdea : "Untitled Goblin Snack",
      oneLine:
        !answerWasProvided(answers, "rawIdea")
          ? "The story exists, but the goblin wants a premise."
          : `${rawIdea} The current spine follows ${protagonistPhrase} chasing ${surfaceWantPhrase}.`,
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
  const protagonist = answerPhrase(answers, "protagonist");
  const want = answerPhrase(answers, "surfaceWant");
  const stakes = clause(answerPhrase(answers, "stakes"));
  const opposition = answerPhrase(answers, "opposition");
  const falseBelief = answerPhrase(answers, "falseBelief");

  return [
    `When ${protagonist} must ${want}, ${opposition} forces them to act before ${stakes}.`,
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
