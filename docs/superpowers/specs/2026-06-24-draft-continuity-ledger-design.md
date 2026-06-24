# Draft Continuity Ledger — lock the names, dates, places, and props

**Date:** 2026-06-24
**Status:** Draft design for review
**Room affected:** Create the Script

## Problem

The chunked draft can stitch together alternate versions of the same generated idea. In
the recent script, Joe's last name drifted between Kaplan, Hart, and Callahan; the tryout
flyer appeared twice; the tryout timing shifted from next month to this Saturday; and the
pitching machine changed from Brenda to Deborah. The PDF exporter only exposes the
problem. The fix belongs in draft generation.

## Goal

Keep a small structured continuity ledger during full-script generation. Each chunk gets
the ledger before writing pages and must report any new continuity anchors it introduced.
The next chunk then treats those anchors as locked facts.

The ledger should track:

- **People:** canonical names, aliases, and short role notes such as protagonist,
  sister, coach, scout, or antagonist.
- **Named objects:** recurring props, machines, vehicles, documents, and other named things.
- **Locations:** named places and important repeated settings.
- **Events and dates:** tryouts, showcases, deadlines, appointments, and their canonical timing.
- **Open continuity warnings:** possible duplicates or conflicts the app should carry forward.

## Behavior

The app should seed the ledger from user-authored room material first. Characters and
guided setup answers win over names invented in generated pages. If the rooms say the
protagonist is Joe Kaplan, generated chunks may not rename him Joe Hart or Joe Callahan.

Generated chunks may add new anchors only when they are genuinely new. If a chunk invents
an anchor that looks like an existing one, it should reuse the existing anchor instead of
creating a duplicate. For example, a River Dogs tryout flyer discovered on the busted cage
fence should stay the single inciting-incident flyer; later chunks should not restage the
same discovery unless the beat sheet explicitly asks for a callback.

Dates should be normalized into practical language. If the ledger says the tryout is
Saturday, May 18, or "in four days," later chunks must not call it "next month." If exact
dates are unavailable, the ledger should still lock relative timing such as "this
Saturday" or "in four days."

Named objects should be treated like characters for continuity. If Joe names the pitching
machine Brenda early, the ledger should preserve Brenda, and later chunks should not rename
the same machine Deborah.

## Data Contract

Extend the chunk output contract with a fourth section:

```txt
PLOT_GOBLIN_LEDGER:
PEOPLE:
- Joe Kaplan | protagonist; one-armed pitcher
OBJECTS:
- Brenda | Joe's pitching machine
LOCATIONS:
- busted batting cage | Joe's recurring practice spot
EVENTS:
- River Dogs open tryout | this Saturday / Saturday, May 18; flyer found on the cage fence
WARNINGS:
- NONE
```

Each section may contain `NONE` when there are no additions. The app merges this section
into the saved `DraftRun.continuityLedger` after each successful chunk. Existing ledger
entries win over new conflicts unless the new line exactly matches a more specific
user-authored fact from the rooms.

## Prompt Rules

Every `chunk` prompt should include the current ledger in a dedicated section near the top
of the context:

```txt
## Continuity ledger (locked facts)
...
```

The prompt should explicitly say:

- Use canonical names from the ledger.
- Do not rename people, places, recurring objects, or events.
- Do not duplicate ledgered events as if they are new discoveries.
- Keep dates and relative timing consistent with the ledger.
- If a new named person, object, location, or dated event appears, add it to
  `PLOT_GOBLIN_LEDGER`.
- If the chunk notices a conflict, report it under `WARNINGS` instead of silently choosing
  a new version.

## Merge Rules

Merging should be conservative and deterministic:

- Normalize names by lowercasing and trimming punctuation for duplicate detection.
- Prefer existing entries when a new entry has the same normalized name.
- Prefer seeded room entries over generated entries.
- Treat a generated person with the same first name and same role note as a possible
  conflict, not a new person. `Joe Hart | protagonist` should become a warning when the
  seeded ledger already has `Joe Kaplan | protagonist`.
- Add genuinely new entries to the relevant category.
- Preserve warning lines so future chunks can avoid repeating the same mistake.

The first version does not need fuzzy matching or AI-based reconciliation. Exact
normalization plus the first-name/role guard is enough to stop the most visible failures.

## Testing

Add focused unit tests for:

- Parsing the new `PLOT_GOBLIN_LEDGER` chunk section.
- Merging new people, objects, locations, events, and warnings.
- Keeping existing seeded entries when a generated chunk proposes a conflicting value.
- Including the ledger in assembled chunk context.
- Prompt text that requires the model to preserve names, dates, locations, objects, and
  events and to avoid duplicate inciting incidents.
