import { writingStylePrompt } from "./writingStyles";

export type CowriterRequest = {
  mode: "followup" | "suggestions" | "logline" | "room" | "beat" | "draft" | "scene" | "scene-suggest";
  room?: string;
  beat?: string;
  beatMarkdown?: string;
  markdown?: string;
  sceneList?: string;
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

  return `

Movie-kind weight:
- Current movie kind: ${movieKind}.
- Treat the current movie kind as a high-priority creative constraint for every suggestion, follow-up question, beat, room fill, and draft choice.
- Comedy choices should be genuinely funny through premise-specific situations, reversals, jokes, embarrassment, irony, and comic escalation.
- Horror choices should prioritize dread, suspense, vulnerability, ominous images, threat logic, and scary turns when the story calls for it.
- Drama choices should stay serious, emotionally specific, consequential, and character-driven.
- Romance choices should heighten longing, chemistry, vulnerability, and emotional risk.
- Thriller choices should sharpen danger, pressure, reversals, clocks, secrets, and suspicion.
- Sci-fi and fantasy choices should make the speculative promise matter through rules, wonder, costs, and story consequences.
- Hybrid genres must honor each selected promise instead of flattening everything into generic drama.
- When generating screenplay pages, keep the selected movie kind visible in scene ideas, dialogue lane, tension, set pieces, pacing, and payoffs.`;
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
  const sharedRules = `You are Plot Goblin, a helpfully annoying screenplay co-writer. Be useful, sharp, funny in small doses, and structurally rigorous.

Rules:
- Do not rewrite the user's document automatically unless the explicit task is to draft screenplay pages.
- Give 1-2 concrete suggestions the user can accept, reject, or adapt when the task is suggestions/room/beat help.
- When giving example choices, number each choice and use this format when possible: 1. Section heading: Replacement text.
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

    return `${sharedRules}

Task: Write the actual ${beatName} beat for THIS specific script. Dramatize what concretely happens in this beat using the protagonist, want, lie, stakes, opposition, and theme from the full script below. Do not paraphrase the current beat text and do not explain what the ${beatName} beat is for. Keep the replacement succinct and use simple words. Return one numbered option only, using this exact format: 1. ${beatName}: Replacement text.

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

  return `${sharedRules}

Task: Review this ${request.room ?? "screenplay"} room and give 1-2 concrete numbered example choices written specifically for THIS script — actual content, not a description of what the section is for. Use the exact room section heading before the colon when a choice should replace that section. If the answer is vague, ask one pointed follow-up question after the suggestions.

Room markdown:
${request.markdown ?? ""}`;
}
