# Plot Goblin

**Plot Goblin is a funny, helpfully annoying screenplay development website.**

It helps a writer turn a messy movie idea into a usable story spine before they start writing pages: premise, protagonist, stakes, theme, beats, and scenes.

This README is the canonical project brief. Read it before making product, copy, design, architecture, or implementation decisions.

---

## North Star

Plot Goblin should feel like a tiny structural menace sitting beside a screenwriter saying:

> “Cute idea. Now what does the character want, what happens if they fail, and why should anyone care?”

The goal is not to build another blank document editor. The goal is to help writers think better before they write.

Plot Goblin should help users:

1. Get a raw idea out of their head.
2. Turn it into working story notes.
3. Clarify protagonist, want, stakes, opposition, and false belief.
4. Produce a stronger logline.
5. Build a flexible beat spine.
6. Move into editable screenplay work rooms.
7. Export their work as markdown.
8. Eventually get AI co-writer feedback from local Hermes.

---

## Product Personality

Plot Goblin is:

- Funny, but useful first.
- Helpfully annoying by default.
- Structurally rigorous without being mean.
- Lightly goblin-branded, not maximum chaos.
- A creative writing tool, not a corporate SaaS dashboard.

Good voice:

> The goblin smells vague stakes. What gets worse if they fail?

Too much voice:

> Your protagonist has the dramatic urgency of a wet sock. Try again, coward.

Use the second kind sparingly, if ever. The product should be memorable, not exhausting.

---

## What We Are Building First

The agreed MVP direction is:

```txt
New Script
→ Guided setup
→ Working notes
→ Polished logline suggestions
→ Seeded room docs
→ Editable rooms
→ Export markdown
```

The default path is **guided setup first**, not free-roaming rooms first.

Reason: if the app starts with blank rooms, it becomes a prettier Notion. Plot Goblin should first establish the screenplay spine, then make the rooms useful.

Users can still skip directly to rooms, but the recommended path should be guided.

---

## Guided Setup Decisions

Locked decisions from our product discussion:

- Setup questions may be skipped.
- Skipped answers become `[Needs answer]`.
- After setup, show a summary page first: “Here is what the goblin thinks your movie is.”
- Working notes come first.
- Polished logline comes second.
- Polished logline should show 1–2 suggestions.
- The user confirms/accepts a suggestion; Plot Goblin should not silently rewrite their work.
- Persistence is localStorage for MVP.
- The MVP supports a single current script, not a project library.
- Rooms are editable markdown textareas.
- Autosave should be visible.
- Export should start as one giant markdown file.

The guided setup should cover:

```txt
Raw idea
Genre / movie promise
Audience feeling
Protagonist
Surface want
Stakes
False belief
Opposition
Ending direction
Structure preference
```

---

## MVP Rooms

Active rooms:

```txt
Premise
Characters
Theme
Beats
Scenes
```

Coming-soon rooms should remain visible but greyed out:

```txt
Relationships
World
Dialogue
Setups/Payoffs
Revision
```

This matters visually and strategically: the user should see the larger roadmap without being distracted by unavailable features.

---

## Hybrid Structure Philosophy

Plot Goblin uses a hybrid content model:

1. **Human-readable markdown** for the writer.
2. **Structured app data** for diagnostics, room ordering, prompts, future AI help, and export.

Do not make the app markdown-only. Markdown is flexible, but not enough for future story diagnostics.

Do not make the app formula-only. Screenwriters need structure, but they also need freedom.

Default structure should be familiar three-act / beat-spine pressure points:

```txt
Opening Image
Setup
Inciting Incident
Act One Break
Promise of the Premise
Midpoint
Bad Guys Close In
All Is Lost
Dark Night of the Soul
Act Three Break
Climax
Final Image
```

But users should eventually be able to rename, skip, add, reorder, or customize beats.

---

## AI Co-Writer Direction

Joe wants an AI co-writer, but safely.

Current chosen approach:

```txt
Option A — Local Hermes bridge first
```

Meaning:

- The public Vercel app should not expose an open AI endpoint.
- Local development on Joe’s Mac can call Hermes locally.
- The bridge should use Joe’s current Hermes default provider/model.
- It should eventually support the current default model, e.g. GPT 5.5 fast/high if configured that way in Hermes.
- Public Vercel + Hermes bridge may be explored later, but only with protection/rate limits.

AI behavior should be:

- Suggestions, not automatic rewrites.
- 1–2 concrete options.
- User confirms before changes are accepted.
- Helpfully annoying follow-up questions when the story is vague.

Avoid shipping a public unauthenticated AI route. That can burn tokens and leak model access.

---

## Visual Direction

### Current visual style guide

The canonical visual guide is [docs/plot-goblin-style-guide.md](docs/plot-goblin-style-guide.md).

The app should now stay in this lane:

- Pale mist/lichen background drawn from the goblin palette.
- Dark swamp-green text and silhouette shapes.
- Bold uppercase poster headlines.
- Extra-heavy emphasis on key words inside titles.
- Simple goblin/page/quill silhouettes instead of detailed fantasy illustration.
- Rounded pill buttons for primary actions.
- Gold used sparingly for CTAs and selected states.
- Playful but readable.
- Screenwriter/workshop atmosphere over productivity-dashboard atmosphere.

The current brand line is:

> Feed the goblin before the script eats you.

The mascot idea is a teasing goblin with writing/screenplay energy, not a horror creature.

### Style guide from Joe

Joe supplied:

- A five-color goblin palette: `#313e3f`, `#567554`, `#9abd85`, `#e2e8e3`, `#e7ce7c`.
- A reference look with pale green background, dark green typography, large simple silhouette art, rounded buttons, tiny uppercase navigation, and bold titles with even-heavier emphasis words.

Treat those as the visual source of truth. Do not return to the earlier parchment/rust direction unless Joe explicitly asks for it.

---

## UX Principles

- The first aha should be: “I finally have a clearer logline.”
- The second aha should be: “I can see the beat spine.”
- Every room should teach the story method, not just store notes.
- Empty states should nudge the writer toward better answers.
- The goblin should complain about vague stakes, passive protagonists, missing opposition, and unclear false beliefs.
- The UI should make localStorage persistence clear and encourage export.
- Export should be easy and obvious.

---

## Technical Shape

Current project:

```txt
Next.js App Router
TypeScript
Vitest
CSS Modules
Vercel deployment
GitHub repo: tanglefast23/plot-goblin
Public site: https://plot-goblin.vercel.app
```

Important files:

```txt
src/lib/storyRooms.ts              # typed room model and room metadata
src/lib/guidedSetup.ts             # guided setup questions + markdown generation
src/lib/hermesCowriter.ts          # Hermes co-writer prompt helpers
src/lib/projectStorage.ts          # localStorage persistence helpers
src/app/page.tsx                   # landing page
src/app/guided-setup/page.tsx      # guided setup route
src/app/rooms/page.tsx             # rooms dashboard
src/app/rooms/[slug]/page.tsx      # room editor route
src/app/api/hermes-cowriter/route.ts # local Hermes bridge route
content/rooms/*.md                 # starter room templates
```

Verification ladder:

```bash
npm test
npm run lint
npm run build
```

Then browser-check locally and inspect console errors.

---

## Current Known Implementation Notes

Recent local work added guided setup, room editing, localStorage persistence, export, and a local Hermes co-writer bridge.

Known unfinished/pending item:

- The local Hermes bridge can return Hermes CLI noise/reasoning text before the final answer.
- The intended fix is to require a `PLOT_GOBLIN_FINAL:` marker in the prompt and strip everything before that marker before returning output to the UI.

Before deploy, verify:

```txt
npm test
npm run lint
npm run build
local browser guided setup
local browser room editor
local Hermes bridge behavior
public Vercel route fails closed for Hermes bridge
```

---

## Non-Goals For Now

Do not build these until explicitly scoped:

- User accounts.
- Multiple script project library.
- Cloud database persistence.
- Public unauthenticated AI co-writing.
- Full screenplay formatting/pages.
- Collaboration.
- Payments.
- Mobile app.

---

## Working Rule

Before making meaningful changes to this project:

1. Read this README.
2. Preserve the North Star.
3. Keep the funny goblin voice useful, not distracting.
4. Keep the screenplay method stronger than the UI decoration.
5. Run verification before claiming the work is done.
