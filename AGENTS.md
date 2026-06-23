<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Plot Goblin Project Context

Before doing any meaningful work in this repo, read `README.md`. It is the canonical project brief and should stay in context for product, design, copy, architecture, and implementation decisions.

## North Star

Plot Goblin is a funny, helpfully annoying screenplay development website. It should help a writer turn a messy movie idea into a usable story spine before writing pages.

The product should not become a generic blank markdown editor. It should guide the writer through premise, protagonist, want, stakes, false belief, opposition, theme, beats, and scenes.

## Locked Product Direction

- Default path: guided setup first, rooms second.
- MVP rooms: Premise, Characters, Theme, Beats, Scenes.
- Coming-soon rooms stay visible but greyed out: Relationships, World, Dialogue, Setups/Payoffs, Revision.
- Hybrid model: human-readable markdown plus structured data for diagnostics and future AI.
- Persistence: localStorage for MVP.
- Rooms: editable markdown textareas.
- Export: one giant markdown file first.
- AI: local Hermes bridge first; no public unauthenticated AI endpoint.
- AI behavior: suggestions and helpfully annoying follow-up questions, not silent rewrites.

## Visual Direction

Read `docs/plot-goblin-style-guide.md` before visual changes. The source-of-truth palette is `#313e3f`, `#567554`, `#9abd85`, `#e2e8e3`, `#e7ce7c`.

Preserve the current pale green editorial poster direction: mist background, dark swamp-green typography, simple goblin/page/quill silhouettes, rounded pill buttons, sparse navigation, and bold uppercase headlines with extra-heavy emphasis words.

Do not return to the older parchment/rust/orange direction unless Joe explicitly asks for it.

## Verification

For code changes, run:

```bash
npm test
npm run lint
npm run build
```

Then browser-check locally and inspect console errors before saying the work is done.
