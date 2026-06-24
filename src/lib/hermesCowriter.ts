import { writingStylePrompt } from "./writingStyles";
import { DRAFT_CHUNK_CONTEXT_MAX_CHARS } from "./draftContinuity";

export type CowriterRequest = {
  mode:
    | "followup"
    | "suggestions"
    | "logline"
    | "room"
    | "beat"
    | "draft"
    | "sample"
    | "scene"
    | "scene-suggest"
    | "plan"
    | "chunk";
  room?: string;
  beat?: string;
  beatMarkdown?: string;
  markdown?: string;
  sceneList?: string;
  targetPages?: number;
  writingStyle?: string;
  answers?: Record<string, unknown>;
  summary?: Record<string, unknown>;
};

function asJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function capPromptText(value: string | undefined, maxChars: number) {
  if (!value || value.length <= maxChars) return value ?? "";

  return `${value.slice(0, maxChars)}\n\n[...capped at ${maxChars} characters]`;
}

function cleanMovieKind(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
  if (!cleaned || /\[(?:needs your answer|needs answer|needs writing)\]/i.test(cleaned)) return "";

  return cleaned;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? cleanMovieKind(value) : "";
}

function movieKindFromRecord(value: unknown) {
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  return (
    stringValue(record.genre) ||
    stringValue(record.movieKind) ||
    stringValue(record.kind) ||
    stringValue(record.moviePromise)
  );
}

function movieKindFromMarkdown(markdown: unknown) {
  if (typeof markdown !== "string") return "";

  const currentGenre = /^Current genre:\s*(.+)$/im.exec(markdown)?.[1];
  return cleanMovieKind(currentGenre ?? "");
}

function movieKindForRequest(request: CowriterRequest) {
  return (
    movieKindFromRecord(request.answers) ||
    movieKindFromRecord(request.summary) ||
    movieKindFromMarkdown(request.markdown) ||
    movieKindFromMarkdown(request.beatMarkdown)
  );
}

function movieKindRules(request: CowriterRequest) {
  const movieKind = movieKindForRequest(request);
  if (!movieKind) return "";

  const selectedRules = [
    {
      pattern: /\b(comedy|comic|funny)\b/i,
      text: "- Comedy choices should be genuinely funny through premise-specific situations, reversals, jokes, embarrassment, irony, and comic escalation. When generating screenplay pages, infuse the script with a lot of jokes, set up punch lines in dialogue, and create awkward/funny situations.",
    },
    {
      pattern: /\bhorror\b/i,
      text: "- Horror choices should prioritize dread, suspense, vulnerability, ominous images, threat logic, and scary turns when the story calls for it.",
    },
    {
      pattern: /\bdrama\b|\bdramatic\b/i,
      text: "- Drama choices should stay serious, emotionally specific, consequential, and character-driven.",
    },
    {
      pattern: /\bromance\b|\bromantic\b/i,
      text: "- Romance choices should heighten longing, chemistry, vulnerability, and emotional risk.",
    },
    {
      pattern: /\bthriller\b/i,
      text: "- Thriller choices should sharpen danger, pressure, reversals, clocks, secrets, and suspicion.",
    },
    {
      pattern: /\bsci[- ]?fi\b|\bscience fiction\b|\bfantasy\b/i,
      text: "- Sci-fi and fantasy choices should make the speculative promise matter through rules, wonder, costs, and story consequences.",
    },
  ]
    .filter((rule) => rule.pattern.test(movieKind))
    .map((rule) => rule.text);

  const rules = selectedRules.length > 0 ? selectedRules : ["- Keep the selected movie kind visible in choices, tone, pacing, pressure, and payoffs."];

  return `

Movie-kind weight:
- Current movie kind: ${movieKind}.
- Treat the current movie kind as a high-priority creative constraint for every suggestion, follow-up question, beat, room fill, and draft choice.
${rules.join("\n")}
- When generating screenplay pages, keep the selected movie kind visible in scene ideas, dialogue lane, tension, set pieces, pacing, and payoffs.`;
}

function isOpeningImageBeat(beatName: string) {
  return beatName.trim().toLowerCase() === "opening image";
}

function isFinalImageBeat(beatName: string) {
  return beatName.trim().toLowerCase() === "final image";
}

export function cleanHermesOutput(output: string) {
  const normalized = output.replace(/\r\n/g, "\n").trim();
  const marker = "PLOT_GOBLIN_FINAL:";
  const markerIndex = normalized.lastIndexOf(marker);

  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + marker.length).trim();
  }

  return normalized
    .split("\n")
    .filter((line) => !line.startsWith("Warning: Unknown toolsets:"))
    .join("\n")
    .trim();
}

export function buildCowriterPrompt(request: CowriterRequest) {
  const suggestionMode =
    request.mode === "followup" ||
    request.mode === "suggestions" ||
    request.mode === "room" ||
    request.mode === "beat";
  const suggestionRules = suggestionMode
    ? `
- Do not rewrite the user's document automatically unless the explicit task is to draft screenplay pages.
- Give 1-2 concrete suggestions the user can accept, reject, or adapt when the task is suggestions/room/beat help.
- When giving example choices, number each choice and use this format when possible: 1. Section heading: Replacement text.`
    : "";
  const sharedRules = `You are Plot Goblin, a helpfully annoying screenplay co-writer. Be useful, sharp, funny in small doses, and structurally rigorous.

Rules:${suggestionRules}
- Write the ACTUAL content for THIS script: name the protagonist, dramatize specific events, images, and turns. Never restate what a beat, field, or room is "for" — fulfill it.
- Treat any instruction-style or placeholder text (for example "Establish the world, the want, the lie...") as a task to complete with specifics, not text to paraphrase.
- Ground every specific in the other rooms: pull the want, stakes, false belief, opposition, and theme from the full script context.
- When a needed detail is still blank, invent one vivid specific that fits what is already known and mark it (assumed). Prefer a concrete invented choice over a generic description.
- Focus on screenplay fundamentals: visible want, stakes, false belief, opposition, theme pressure, beat turns, and scene change.
- ${writingStylePrompt(request.writingStyle)}
- Keep the answer concise.
- Start the final answer with PLOT_GOBLIN_FINAL: so the app can strip Hermes CLI noise.${movieKindRules(request)}`;

  if (request.mode === "followup") {
    return `${sharedRules}

Task: Ask exactly one follow-up question that would most improve this script foundation. The question should be helpfully annoying, not mean.

Current answers:
${asJson(request.answers)}

Current summary:
${asJson(request.summary)}`;
  }

  if (request.mode === "suggestions") {
    return `${sharedRules}

Task: Give 1-2 alternate stronger logline or beat suggestions. Do not replace the user's text. Make the options specific and user-confirmable.

Current answers:
${asJson(request.answers)}`;
  }

  if (request.mode === "logline") {
    return `${sharedRules}

Task: Draft the single strongest, most succinct, proper screenplay logline from the setup facts below. Use the strongest known pieces first, then fill only tiny connective gaps when needed.

Logline rules:
- Return exactly one logline, not a list, note, explanation, title, tagline, or question.
- Use a clean professional form: When [specific protagonist] must [visible goal], [specific opposition/pressure] forces [action or choice] before [stakes].
- Keep it one sentence, ideally 25-40 words.
- Include protagonist, visible want, opposition/pressure, stakes, and the inner contradiction or false belief only if it makes the line sharper.
- Do not mention the goblin, the app, placeholders, or missing-answer labels.

Current answers:
${asJson(request.answers)}

Strongest known pieces and warnings:
${asJson(request.summary)}`;
  }

  if (request.mode === "beat") {
    const beatName = request.beat ?? "selected";
    const markdown = capPromptText(request.markdown, 8_000);
    const task = isOpeningImageBeat(beatName)
      ? `Task: Write an Opening Image, not a scene beat, for THIS specific script. Make it a single still, filmable before-image that uses the protagonist, world, desire, flaw, mood, genre, tone, theme, and emotional conflict from the full script below. Keep the replacement succinct and use simple words. Return one numbered option only, using this exact format: 1. ${beatName}: Replacement text.

Opening Image rules:
- Show the world of the story through action, setting, mood, and visual detail.
- Establish the genre and tone immediately.
- Hint at the central theme or emotional conflict.
- Introduce the main character's life, problem, desire, or flaw without explaining it.
- Create curiosity in the audience.
- Avoid exposition, backstory dumps, or overly literary description.
- Be filmable: describe only what the audience can see and hear.
- Feel specific, memorable, and symbolic, not generic.
- Act as a before image that can later contrast with the final image of the story.`
      : isFinalImageBeat(beatName)
        ? `Task: Write a Final Image, not a scene beat, for THIS specific script. Make it a single still, filmable after-image that uses the protagonist, world, changed desire or flaw, mood, genre, tone, theme, emotional conflict, and the Opening Image from the full script below. Keep the replacement succinct and use simple words. Return one numbered option only, using this exact format: 1. ${beatName}: Replacement text.

Final Image rules:
- Show the result of the character's journey without explaining it.
- Visually contrast with the opening image.
- Reveal what has changed in the character, world, relationship, or central conflict.
- Leave the audience with a clear emotional aftertaste.
- Echo the theme of the story in a simple, powerful way.
- Avoid speeches, exposition, or explaining the moral.
- Be filmable: describe only what the audience can see and hear.
- Feel inevitable but not obvious.
- Work as the story's final emotional punctuation mark.`
      : `Task: Write the actual ${beatName} beat for THIS specific script. Dramatize what concretely happens in this beat using the protagonist, want, lie, stakes, opposition, and theme from the full script below. Do not paraphrase the current beat text and do not explain what the ${beatName} beat is for. Keep the replacement succinct and use simple words. Return one numbered option only, using this exact format: 1. ${beatName}: Replacement text.`;

    return `${sharedRules}

${task}

Current ${beatName} beat text (this is usually an instruction telling you what to accomplish — fulfill it with specifics, do not echo it):
${request.beatMarkdown ?? ""}

Full script markdown (your source of truth for character, want, lie, stakes, opposition, and theme):
${markdown}`;
  }

  if (request.mode === "scene") {
    const beatName = request.beat ?? "selected";

    return `${sharedRules}

Task: Build the actual scene for the ${beatName} beat of THIS specific script. Work only from the beat text below — turn it into one concrete, playable scene. Make best-guess assumptions when a detail is missing and mark each invented specific with (assumed). Do not paraphrase the beat text and do not explain what the fields are for — fill them with specifics.

Return exactly 8 numbered lines, one per field, using this exact format and these exact labels:
1. Scene title: A short, specific scene title.
2. Location / time: A proper slugline like INT./EXT. PLACE - DAY/NIGHT.
3. Characters: The named people in the scene, noting who applies the most pressure.
4. Scene want: What the active character is trying to get in this scene.
5. Opposition: What blocks the want inside this scene.
6. Turn: What changes by the end (power, emotion, knowledge, relationship, stakes, or plan).
7. Button: The last image, line, or action that pushes into the next beat.
8. Purpose: Plot / character / theme / tension / setup / payoff for this scene.

Current ${beatName} beat text (this is the only source for the scene — dramatize it):
${request.beatMarkdown ?? ""}`;
  }

  if (request.mode === "scene-suggest") {
    const summary = capPromptText(request.markdown, 8_000);
    const sceneList = capPromptText(request.sceneList, 6_000);

    return `${sharedRules}

Task: Read the compact story summary and the current scene list below. Decide where THIS script feels thin or is missing a scene (beginning, middle, or end), then invent ONE new scene that fills that gap and earns its place. Make best-guess assumptions when a detail is missing and mark each invented specific with (assumed). Do not explain what the fields are for — fill them with specifics.

Return exactly 9 numbered lines using this exact format and these exact labels:
1. Scene title: A short, specific scene title.
2. Location / time: A proper slugline like INT./EXT. PLACE - DAY/NIGHT.
3. Characters: The named people in the scene, noting who applies the most pressure.
4. Scene want: What the active character is trying to get in this scene.
5. Opposition: What blocks the want inside this scene.
6. Turn: What changes by the end (power, emotion, knowledge, relationship, stakes, or plan).
7. Button: The last image, line, or action that pushes into the next scene.
8. Purpose: Plot / character / theme / tension / setup / payoff for this scene.
9. Placement: Where this scene belongs, written as "after scene N" using the numbers in the scene list, or "start" for the very beginning.

Compact story summary (your source of truth for character, want, lie, stakes, opposition, and theme):
${summary}

Current scene list (numbered, in order — use these numbers for placement):
${sceneList.trim() ? sceneList : "(no scenes yet — suggest an opening scene and place it at the start)"}`;
  }

  if (request.mode === "draft") {
    return `${sharedRules}

Task: Generate screenplay pages from the complete Plot Goblin room export below. This is an explicit draft request, so write screenplay-format material rather than advice.

Drafting rules:
- Use standard screenplay style with scene headings, action lines, character cues, and dialogue.
- Base the draft on the filled rooms: premise, characters, theme, beats, scenes, and script parameters.
- Keep the selected genre/movie promise visible in situation, tone, pacing, dialogue, set pieces, and stakes.
- Make the protagonist active: give them visible choices, tactics, and consequences instead of letting the plot happen around them.
- Keep the story driven by clear, high stakes: either external danger, personal loss, or a threat to the characters' deepest personal values.
- Put strong opposition in every major movement: a person, system, force, secret, flaw, or clock that actively fights the protagonist's want.
- Treat the midpoint as a real midpoint reversal: new information, a win that curdles, a loss that opens a harder path, or a shift that changes the protagonist's plan.
- Approved-story continuity rules: Do not change the protagonist, want, stakes, false belief, opposition, theme, genre, rating, POV, or ending direction unless the room export explicitly changes them.
- Carry forward named characters, locations, relationships, and decisions from prior rooms; do not rename, merge, resurrect, kill, or replace them for convenience.
- If two room details conflict, preserve the newest or most specific user-written choice and make the draft quietly consistent with that choice.
- If the Script Parameters target is a short film or 15 pages or fewer, write a compact complete short-script draft.
- If the target is a feature or longer than 15 pages, write the first 6-8 pages plus a concise continuation map for the remaining act structure.
- Do not include generic advice before the pages. Start with a title line or the first scene heading after the final marker.

Complete Plot Goblin room export:
${request.markdown ?? ""}`;
  }

  if (request.mode === "sample") {
    return `${sharedRules}

Task: Generate a quick screenplay sample from the compact Plot Goblin context below. This is an explicit draft request, so write screenplay-format material rather than advice.

Sample rules:
- Use standard screenplay style: scene headings, action, character cues, and dialogue.
- Preserve approved facts: protagonist, want, stakes, false belief, opposition, theme, genre, rating, POV, ending direction, names, relationships, and locations.
- Make the protagonist active, with visible choices, pressure, stakes, opposition, and genre tone on the page.
- For short-film targets, write a compact complete sample. For feature targets, write only the first 6-8 pages.
- Do not include generic advice. Start with a title line or the first scene heading after the final marker.

Compact Plot Goblin draft context:
${request.markdown ?? ""}`;
  }

  if (request.mode === "plan") {
    const targetPages = request.targetPages ?? 100;
    return `${sharedRules}

Task: Build the unified beat sheet for a full ${targetPages}-page feature of THIS specific script. Read the structural beats, every scene the writer already wrote, and the room facts below. Decide how many beats a strong, award-worthy version of this movie needs (usually 15-30). Expand thin spots, add the connective beats a real feature requires, and keep the writer's existing choices.

Output rules:
- Start with STORY_BRIEF:. Summarize each source room in as few words as possible. The app will reuse STORY_BRIEF for chunk drafting instead of resending full room exports.
- Then return beat blocks in this exact format, one per beat, divided by a line containing only ---:
  BEAT 1 | PAGES: <n> | TITLE: <short title>
  INTENT: <one line of what concretely happens>
- Assign each beat a PAGES budget. The budgets MUST sum to about ${targetPages}.
- Number beats sequentially from 1. Do not write screenplay pages here — only the plan.

Complete Plot Goblin room export (structural beats, scenes, premise, characters, theme, parameters):
${request.markdown ?? ""}`;
  }

  if (request.mode === "chunk") {
    const beatLabel = request.beat ?? "the next beats";
    const chunkContext = capPromptText(request.markdown, DRAFT_CHUNK_CONTEXT_MAX_CHARS);
    return `${sharedRules}

Task: Write the actual screenplay pages for ${beatLabel} of THIS specific script, using the living beat sheet and story-so-far below. Honor every PLANTED note on these and earlier beats, and set up anything later beats will need. Hit the PAGES budget for these beats. Pick up seamlessly from the previous pages' tail.

Output EXACTLY these three labeled sections, in this order, after the final marker:
PLOT_GOBLIN_PAGES:
<standard screenplay pages: scene headings, action, character cues, dialogue>
PLOT_GOBLIN_SUMMARY:
<2-3 sentences recapping what happened in these beats>
PLOT_GOBLIN_SETUPS:
<zero or more lines, each "- beat <number> | <thing planted that pays off in that beat>"; write the single word NONE if nothing was planted>

Living beat sheet and story context:
${chunkContext}`;
  }

  return `${sharedRules}

Task: Review this ${request.room ?? "screenplay"} room and give 1-2 concrete numbered example choices written specifically for THIS script — actual content, not a description of what the section is for. Use the exact room section heading before the colon when a choice should replace that section. If the answer is vague, ask one pointed follow-up question after the suggestions.

Room markdown:
${request.markdown ?? ""}`;
}
