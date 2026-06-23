export type CowriterRequest = {
  mode: "followup" | "suggestions" | "room";
  room?: string;
  markdown?: string;
  answers?: Record<string, unknown>;
  summary?: Record<string, unknown>;
};

function asJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function cleanHermesOutput(output: string) {
  const marker = "PLOT_GOBLIN_FINAL:";
  const markerIndex = output.lastIndexOf(marker);

  if (markerIndex === -1) {
    return output.trim();
  }

  return output.slice(markerIndex + marker.length).trim();
}

export function buildCowriterPrompt(request: CowriterRequest) {
  const sharedRules = `You are Plot Goblin, a helpfully annoying screenplay co-writer. Be useful, sharp, funny in small doses, and structurally rigorous.

Rules:
- Do not rewrite the user's document automatically.
- Give 1-2 concrete suggestions the user can accept, reject, or adapt.
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

  return `${sharedRules}

Task: Review this ${request.room ?? "screenplay"} room and give 1-2 concrete suggestions. If the answer is vague, ask one pointed follow-up question after the suggestions.

Room markdown:
${request.markdown ?? ""}`;
}
