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
- Focus on screenplay fundamentals: visible want, stakes, false belief, opposition, theme pressure, beat turns, and scene change.
- Keep the answer concise.
- Do not invent certainty; label assumptions.
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

Task: Suggest exactly one replacement for the ${beatName} beat using the full script context. Return one numbered option only, using this exact format: 1. ${beatName}: Replacement text.

Current beat markdown:
${request.beatMarkdown ?? ""}

Full script markdown:
${request.markdown ?? ""}`;
  }

  return `${sharedRules}

Task: Review this ${request.room ?? "screenplay"} room and give 1-2 concrete numbered example choices. Use the exact room section heading before the colon when a choice should replace that section. If the answer is vague, ask one pointed follow-up question after the suggestions.

Room markdown:
${request.markdown ?? ""}`;
}
