# Plot Goblin Visual Style Guide

Date: 2026-06-23
Status: source of truth for visual direction
Reference inputs:
- User-supplied color guide: `#313e3f`, `#567554`, `#9abd85`, `#e2e8e3`, `#e7ce7c`
- User-supplied reference screenshot: pale green editorial product hero with oversized green headline, simple silhouette figure, rounded CTA, and sparse navigation

## Design Thesis

Plot Goblin should feel like a bold editorial poster for a writing tool: simple, green, graphic, and a little mischievous. The reference look is clean and friendly, but not bland. It uses a flat pale background, a massive dark-green silhouette, oversized uppercase type, tiny navigation, and a single rounded action button.

For Plot Goblin, translate that into: a pale mist writing surface, dark swamp-green text, simple goblin silhouettes, rounded pill buttons, and bold titles where the most important words become even heavier.

Do not copy the coffee reference literally. Borrow the design grammar: poster composition, flat color, large silhouette, confident headline, and minimal controls.

## Reference Visual Analysis

### Composition

- The page is split into a left message zone and a right visual zone.
- The background is full-bleed, pale, and nearly flat.
- A thin vertical divider gives the hero a poster-grid feel.
- The right side is dominated by one oversized silhouette, not many decorative elements.
- The product pack overlaps the silhouette, creating depth without complex illustration.
- The top navigation is tiny and quiet, leaving the hero to do the work.

Plot Goblin adaptation:
- Use one strong hero idea per screen.
- Let the goblin silhouette, note card, screenplay page, or room artifact act as the main visual object.
- Prefer one large simple shape over clusters of small illustrations.
- Keep panels and cards useful, but avoid making the page feel like a grid of generic SaaS cards.

### Typography

- The headline is uppercase, compact, and heavy.
- Line breaks are deliberate and poster-like.
- The title has weight contrast: most words are bold, but key words are extra bold.
- Supporting copy is small, calm, and much narrower than the headline.
- Navigation labels are tiny uppercase text.

Plot Goblin adaptation:
- Use display headlines in a heavy sans style.
- Treat title emphasis as a system: wrap the most important words in an extra-heavy span.
- Keep title line-height tight, around `0.9` to `1`.
- Do not use negative letter spacing.
- Body copy should be short, quiet, and practical.

Example title treatment:

```txt
FEED THE GOBLIN
BEFORE THE SCRIPT
EATS YOU
```

Potential emphasis words:
- `GOBLIN`
- `SCRIPT`
- `STAKES`
- `WANT`
- `FAIL`
- `SCENES`

### Color

Reference screenshot behavior:
- Pale mint background.
- Dark green headline and silhouette.
- White product card.
- Small dark-green navigation.
- Rounded dark-green button with light text.

Plot Goblin palette:

| Role | Token | Hex | Usage |
|---|---|---:|---|
| Deep ink / silhouette | `--goblin-night` | `#313e3f` | Primary text, large silhouettes, outlines |
| Moss action green | `--goblin-moss` | `#567554` | Secondary type, icon fills, dark buttons |
| Lichen wash | `--goblin-lichen` | `#9abd85` | Soft panels, illustration fills, hover wash |
| Mist background | `--goblin-mist` | `#e2e8e3` | Page background, cards, inputs |
| Gold highlight | `--goblin-gold` | `#e7ce7c` | Primary CTA, selected states, small emphasis |

Rules:
- Backgrounds should be mostly mist, with lichen or gold used as a subtle wash.
- Text should usually be night, not pure black.
- Big silhouette shapes can be night or moss.
- Gold should be used sparingly for calls to action and important selected states.
- Avoid returning to parchment, rust, orange, beige, or brown as dominant colors.

### Shape Language

The reference uses very simple silhouette shapes:
- Hat: one bold block shape.
- Glasses: thick rounded outline.
- Product card: flat rectangle with soft shadow.
- Button: rounded capsule.

Plot Goblin adaptation:
- Build the goblin from simple silhouette parts: ears, hat/horns, brow, nose, quill, tooth.
- Keep shapes readable at small sizes.
- Use flat fills before gradients.
- Use thick outlines only when they improve recognition.
- Prefer a single oversized silhouette in hero art instead of detailed mascot rendering everywhere.

### Buttons And Controls

- Primary action is a rounded capsule.
- Text is tiny, uppercase, and bold.
- Button size is modest, not oversized.
- The CTA stands alone with generous empty space.

Plot Goblin adaptation:
- Primary buttons should be rounded pills.
- Use short action labels: `START`, `SHOP...` equivalent becomes `START SETUP`, `OPEN ROOMS`, `EXPORT`.
- Primary CTA can use gold fill with night text, or moss/night fill with mist text when stronger contrast is needed.
- Secondary buttons should stay quiet: mist fill, night border, night text.

### Layout Density

- Hero has lots of open space.
- Secondary copy is compact.
- Visual impact comes from scale contrast, not clutter.

Plot Goblin adaptation:
- Landing and guided setup screens should feel poster-like.
- Workspace screens can be denser, but should still use the same type, buttons, and color rules.
- Use cards for repeated room items and editor panels, not for every section.

## Plot Goblin Components

### Hero

Required ingredients:
- Tiny uppercase eyebrow.
- Oversized uppercase headline.
- Extra-bold emphasis words inside the headline.
- Short body paragraph.
- Rounded CTA row.
- One large goblin or screenplay silhouette.

Recommended hero structure:

```txt
[tiny nav]

PLOT GOBLIN
FEED THE GOBLIN
BEFORE THE SCRIPT
EATS YOU

Short practical copy...
[START SETUP] [ROOMS]

[large goblin silhouette / screenplay card]
```

### Mascot

The goblin should become simpler and more iconic:
- Use a strong head/hat/ear silhouette.
- Keep facial expression to brow, eyes, smirk, and one tooth.
- Use glasses, quill, or page card as optional writing-world props.
- Avoid horror detail, fur texture, claws, or chaotic decoration.
- At small sizes, the goblin should still read as a single recognizable mark.

### Cards

Cards should feel like pale paper labels over a green poster, not glass panels:
- Mist fill.
- Thin night border at low opacity.
- Soft shadow only when it helps layering.
- Small radius for work surfaces; rounded pills for buttons.
- Use lichen highlight blocks inside cards for guiding questions.

### Navigation

- Tiny uppercase labels.
- Minimal dividers.
- Brand mark can sit centered on marketing-style screens.
- Workspace navigation can remain practical and left/right aligned.

## Voice In The Visual System

The visual voice should match the product voice:
- Confident, not busy.
- Mischievous, not gross.
- Useful, not ornamental.
- Poster-like, not dashboard-first.

Good:
- `MAKE THE STAKES HURT`
- `WHO WANTS WHAT?`
- `THE GOBLIN SMELLS A PASSIVE PROTAGONIST`

Too much:
- Insults that make the product feel mean.
- Overly detailed fantasy language.
- Decorative goblin copy that does not help the writer.

## Implementation Notes

- Keep palette values in `src/app/globals.css`.
- Use RGB companion variables for transparent borders, washes, and shadows.
- Create a reusable headline emphasis pattern before repeating one-off spans.
- Prefer CSS Modules for page-specific composition.
- Future visual pass should update the landing page first, then guided setup, then rooms/workspace.
- Verify desktop and mobile screenshots after any visual pass.

## Do

- Use large, flat, simple silhouettes.
- Make headlines bold, uppercase, and deliberately wrapped.
- Make selected headline words extra-heavy.
- Use our green/mist/gold palette consistently.
- Use rounded pill buttons for primary actions.
- Keep supporting text small and calm.
- Make the goblin iconic enough to work as a logo shape.

## Avoid

- Beige parchment as the dominant look.
- Rust/orange as the main accent.
- Over-detailed fantasy illustration.
- Generic SaaS gradients.
- Nested cards.
- Decorative clutter around the hero.
- Long explanatory text blocks on first view.
