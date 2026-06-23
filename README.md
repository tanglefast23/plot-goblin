# Plot Goblin

A tiny structural menace for screenwriters.

Plot Goblin helps a writer shape a screenplay before writing pages: premise, characters, theme, beats, and scenes. The MVP uses guided three-act defaults while keeping the structure flexible enough to rename, skip, add, or reorder beats.

## MVP rooms

- Premise
- Characters
- Theme
- Beats
- Scenes

Coming-soon rooms are visible but greyed out: Relationships, World, Dialogue, Setups/Payoffs, and Revision.

## Local development

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

## Project shape

- `src/lib/storyRooms.ts` — typed room model and hybrid structure settings
- `content/rooms/*.md` — markdown starter files for each room
- `src/app/page.tsx` — homepage/workroom overview
