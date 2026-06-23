export type CowriterRequest = {
  mode: "followup" | "suggestions" | "room" | "beat";
  room?: string;
  beat?: string;
  beatMarkdown?: string;
  markdown?: string;
  answers?: Record<string, unknown>;
  summary?: Record<string, unknown>;
};

function asJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
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
- Do not rewrite the user's document automatically.
- Give 1-2 concrete suggestions the user can accept, reject, or adapt.
- When giving example choices, number each choice and use this format when possible: 1. Section heading: Replacement text.
- Write the ACTUAL content for THIS script: name the protagonist, dramatize specific events, images, and turns. Never restate what a beat, field, or room is "for" — fulfill it.
- Treat any instruction-style or placeholder text (for example "Establish the world, the want, the lie...") as a task to complete with specifics, not text to paraphrase.
- Ground every specific in the other rooms: pull the want, stakes, false belief, opposition, and theme from the full script context.
- When a needed detail is still blank, invent one vivid specific that fits what is already known and mark it (assumed). Prefer a concrete invented choice over a generic description.
- Focus on screenplay fundamentals: visible want, stakes, false belief, opposition, theme pressure, beat turns, and scene change.
- Keep the answer concise.
- Start the final answer with PLOT_GOBLIN_FINAL: so the app can strip Hermes CLI noise.`;

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

  if (request.mode === "beat") {
    const beatName = request.beat ?? "selected";

    return `${sharedRules}

Task: Write the actual ${beatName} beat for THIS specific script. Dramatize what concretely happens in this beat using the protagonist, want, lie, stakes, opposition, and theme from the full script below. Do not paraphrase the current beat text and do not explain what the ${beatName} beat is for. Return one numbered option only, using this exact format: 1. ${beatName}: Replacement text.

Current ${beatName} beat text (this is usually an instruction telling you what to accomplish — fulfill it with specifics, do not echo it):
${request.beatMarkdown ?? ""}

Full script markdown (your source of truth for character, want, lie, stakes, opposition, and theme):
${request.markdown ?? ""}`;
  }

  return `${sharedRules}

Task: Review this ${request.room ?? "screenplay"} room and give 1-2 concrete numbered example choices written specifically for THIS script — actual content, not a description of what the section is for. Use the exact room section heading before the colon when a choice should replace that section. If the answer is vague, ask one pointed follow-up question after the suggestions.

Room markdown:
${request.markdown ?? ""}`;
}
