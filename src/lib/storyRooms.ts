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

export function getActiveRooms() {
  return storyRooms.filter((room) => room.status === "active");
}

export function getComingSoonRooms() {
  return storyRooms.filter((room) => room.status === "coming-soon");
}
