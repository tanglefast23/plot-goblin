export type WritingStyleOption = {
  id: string;
  label: string;
  prompt: string;
};

export const defaultWritingStyleId = "goblin-house";

export const writingStyleOptions: WritingStyleOption[] = [
  {
    id: defaultWritingStyleId,
    label: "Goblin House Style (Mischief)",
    prompt:
      "Plot Goblin house style: write like a helpful cave-scribe with taste. Use blunt vivid action, sharp little images, short-to-medium sentences, practical scene pressure, and occasional goblin-flavored word choice. Dialogue should be playable and human, with small prickly jokes when useful. Stay useful first; do not bury the screenplay in fantasy slang.",
  },
  {
    id: "scorsese-crime",
    label: "Martin Scorsese (Crime)",
    prompt:
      "Crime pressure lane: restless moral pressure, loyalty under rot, guilt, appetite, status, and sudden consequence. Use kinetic scene turns, voice that can confess or accuse, and precise behavioral details. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "simon-tv-drama",
    label: "David Simon (TV drama)",
    prompt:
      "Civic realism lane: dense institutional pressure, street-level specifics, patient cause-and-effect, lived-in jargon, and characters shaped by systems. Let scenes feel observed rather than announced. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "sorkin-legal",
    label: "Aaron Sorkin (Legal)",
    prompt:
      "Rapid argument lane: fast snappy dialogue, verbal volleys, idealistic conflict, reversals inside conversations, and scenes that move through debate. Keep action lines clean so dialogue can drive. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "rhimes-medical",
    label: "Shonda Rhimes (medical drama)",
    prompt:
      "High-stakes ensemble lane: emotional urgency, secrets colliding, big choice moments, sharp confrontations, and intimate vulnerability under professional pressure. Dialogue can be heightened and direct. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "shore-medical",
    label: "David Shore (medical drama)",
    prompt:
      "Diagnostic combat lane: logic battles, abrasive truth-telling, mystery deduction, short cutting remarks, and scenes driven by competing hypotheses. Keep emotional reveals earned and unsentimental. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "fey-comedy",
    label: "Tina Fey (Comedy)",
    prompt:
      "Joke-dense workplace lane: quick comic turns, status embarrassment, smart insults, concise setup-payoff jokes, and absurdity inside professional routines. Keep sentences crisp and punch lines playable. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "david-comedy",
    label: "Larry David (Comedy)",
    prompt:
      "Social friction lane: petty rules treated like epic law, escalating awkwardness, circular arguments, exposed selfish logic, and cringe from tiny choices getting huge. Dialogue should feel argumentative and painfully specific. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "schur-comedy",
    label: "Michael Schur (Comedy)",
    prompt:
      "Kindhearted systems comedy lane: warm moral puzzles, ensemble optimism, bureaucratic absurdity, character growth, and jokes that reveal values. Keep conflict generous but still sharp. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "daniels-comedy",
    label: "Greg Daniels (comedy)",
    prompt:
      "Deadpan workplace naturalism lane: awkward pauses, small social failures, documentary-feeling behavior, understated jokes, and comedy from people trying to look competent. Keep action lines observational and dry. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "macfarlane-animated",
    label: "Seth MacFarlane (Animated Comedy)",
    prompt:
      "Cutaway chaos lane: elastic reality, rapid joke pivots, blunt comic exaggeration, pop-culture absurdity, and characters saying the rude quiet part aloud. Keep momentum fast and jokes varied. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "cameron-adventure",
    label: "James Cameron (Adventure)",
    prompt:
      "Big-canvas momentum lane: clear objectives, muscular action lines, practical obstacles, wonder under pressure, escalating set pieces, and emotionally simple but forceful stakes. Sentences should be direct and visual. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "nolan-scifi",
    label: "Christopher Nolan (Sci Fi)",
    prompt:
      "Puzzle-box gravity lane: serious tone, layered time or information, clean thematic opposition, ticking pressure, and dialogue that wrestles with rules and consequences. Keep structure legible even when ideas are complex. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "martin-fantasy",
    label: "George R.R. Martin (Fantasy)",
    prompt:
      "Political myth lane: power bargains, moral compromise, family pressure, betrayal risk, grounded sensory detail, and consequences that punish naive choices. Dialogue should carry subtext and threat. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "gunn-superhero",
    label: "James Gunn (Superhero)",
    prompt:
      "Found-family pop mayhem lane: damaged outsiders, irreverent banter, sudden sincerity, colorful action, and jokes that mask hurt until the scene turns. Keep heart and chaos in the same room. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "carpenter-horror",
    label: "John Carpenter (horror)",
    prompt:
      "Lean dread lane: spare action lines, simple geography, mounting silence, practical menace, short clean sentences, and fear from what approaches. Dialogue should be minimal under pressure. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "peele-horror",
    label: "Jordan Peele (Horror)",
    prompt:
      "Social nightmare lane: ordinary behavior turning wrong, coded tension, dark comic unease, identity pressure, and horror reveals that sharpen the theme. Balance laughs with dread. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "johnson-mystery",
    label: "Rian Johnson (Mystery)",
    prompt:
      "Clockwork whodunit lane: playful misdirection, crisp clue planting, witty reversals, elegant reveals, and characters with competing stories about the truth. Dialogue should be clever but purposeful. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "baumbach-indie",
    label: "Noah Baumbach (Indie)",
    prompt:
      "Awkward intimacy lane: literate friction, self-protective talk, family or relationship bruises, uncomfortable honesty, and scenes that let people contradict themselves. Keep action modest and psychologically exact. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "gerwig-indie",
    label: "Greta Gerwig (Indie)",
    prompt:
      "Warm coming-of-self lane: emotionally bright observation, restless identity, tender contradiction, funny vulnerability, and small gestures that reveal longing. Dialogue can be quick, personal, and open-hearted. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "coen-black-comedy",
    label: "Coen Brothers (Black Comedy)",
    prompt:
      "Bleak absurd logic lane: deadpan fate, precise oddball speech, comic violence of consequence, foolish plans, and characters trapped by their own narrow codes. Sentences can be dry, clean, and strange. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "chazelle-psych-drama",
    label: "Damien Chazelle (psychological drama)",
    prompt:
      "Obsession rhythm lane: ambition as pressure cooker, rhythmic escalation, bodily effort, sacrifice, humiliation, and performance scenes that feel like combat. Use sharp cuts between drive and collapse. Do not imitate any specific writer; use these broad craft traits only.",
  },
  {
    id: "tarantino-genre",
    label: "Quentin Tarantino (Genre mash-up)",
    prompt:
      "Long-take tension talk lane: extended pressure conversations, bold genre collision, sudden tonal pivots, menace under casual talk, and playful chapter-like turns. Mix patient dialogue build with explosive reversals. Do not imitate any specific writer; use these broad craft traits only.",
  },
];

export function writingStylePrompt(styleId: string | undefined) {
  const option = writingStyleOptions.find((candidate) => candidate.id === styleId) ?? writingStyleOptions[0];

  return `Writing style lane: ${option.label}. ${option.prompt}`;
}
