# Scenes Vertical Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Scenes room's horizontal scene-card strip with a left-side vertical rail that defaults to readable rectangular tiles and toggles into compact square tiles.

**Architecture:** Keep the existing `SceneBoard` component and markdown-backed scene helpers. Add local rail-density state in `SceneBoard`, update its markup to render a vertical rail before the editor, and update `workspace.module.css` for the new layout. Add focused component tests around ordering, toggle behavior, selection stability, and reorder persistence.

**Tech Stack:** Next.js App Router, React client component state, CSS Modules, Vitest, Testing Library.

---

### Task 1: Add Scene Rail Tests

**Files:**
- Modify: `src/components/RoomEditorClient.test.tsx`

- [ ] **Step 1: Write failing tests**

Add tests near the existing scene-card tests:

```tsx
it("renders saved scenes in a vertical rail with the add tile first", async () => {
  routeState.slug = "scenes";
  const project = buildScriptBase({});
  project.rooms.scenes = project.rooms.scenes.replace(
    "- [needs your answer] Open with a scene that makes [needs your answer] visible before [needs your answer] fully arrives",
    "- Opening Image\n- Midpoint",
  );
  window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

  render(<RoomEditorClient />);

  const rail = await screen.findByRole("navigation", { name: "Scene timeline" });
  expect(within(rail).getByRole("button", { name: "Use compact scene rail" })).toBeTruthy();
  const buttons = within(rail).getAllByRole("button");
  expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
    "Use compact scene rail",
    "Start new scene",
    expect.stringContaining("Opening Image"),
    expect.stringContaining("Midpoint"),
  ]);
});
```

```tsx
it("toggles the scene rail between rectangular and compact square modes without changing selection", async () => {
  routeState.slug = "scenes";
  const project = buildScriptBase({});
  project.rooms.scenes = project.rooms.scenes.replace(
    "- [needs your answer] Open with a scene that makes [needs your answer] visible before [needs your answer] fully arrives",
    "- Opening Image\n- Midpoint",
  );
  window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

  render(<RoomEditorClient />);

  fireEvent.click(await screen.findByRole("button", { name: /Midpoint/ }));
  expect(screen.getByRole("textbox", { name: "Scene title" })).toHaveValue("Midpoint");

  fireEvent.click(screen.getByRole("button", { name: "Use compact scene rail" }));
  expect(screen.getByRole("navigation", { name: "Scene timeline" }).className).toContain("sceneRailCompact");
  expect(screen.getByRole("button", { name: "Use readable scene rail" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Scene title" })).toHaveValue("Midpoint");

  fireEvent.click(screen.getByRole("button", { name: "Use readable scene rail" }));
  expect(screen.getByRole("navigation", { name: "Scene timeline" }).className).not.toContain("sceneRailCompact");
  expect(screen.getByRole("textbox", { name: "Scene title" })).toHaveValue("Midpoint");
});
```

- [ ] **Step 2: Verify red**

Run:

```bash
npm test -- src/components/RoomEditorClient.test.tsx -t "scene rail"
```

Expected: FAIL because there is no `Scene timeline` navigation or compact-toggle behavior yet.

### Task 2: Implement Scene Rail Markup And State

**Files:**
- Modify: `src/components/RoomEditorClient.tsx`

- [ ] **Step 1: Add local rail-density state**

Inside `SceneBoard`, add:

```tsx
const [sceneRailCompact, setSceneRailCompact] = useState(false);
```

- [ ] **Step 2: Replace the horizontal strip wrapper with the vertical rail**

Keep the existing scene actions, but render:

```tsx
<div className={styles.sceneBoardLayout}>
  <nav
    aria-label="Scene timeline"
    className={`${styles.sceneRail} ${sceneRailCompact ? styles.sceneRailCompact : ""}`}
  >
    <button
      aria-label={sceneRailCompact ? "Use readable scene rail" : "Use compact scene rail"}
      aria-pressed={sceneRailCompact}
      className={styles.sceneRailToggle}
      onClick={() => setSceneRailCompact((current) => !current)}
      type="button"
    >
      <span>{sceneRailCompact ? "Wide" : "Compact"}</span>
      <span aria-hidden="true" className={styles.sceneRailToggleKnob} />
    </button>
    <button aria-label="Start new scene" className={styles.sceneAddTile} ...>+</button>
    {sceneCards.map(...)}
  </nav>
  <div className={styles.sceneDraftPanel}>...</div>
</div>
```

Use existing click, drag, drop, and active-card logic unchanged.

- [ ] **Step 3: Verify green for focused tests**

Run:

```bash
npm test -- src/components/RoomEditorClient.test.tsx -t "scene rail"
```

Expected: PASS.

### Task 3: Style The Rail

**Files:**
- Modify: `src/app/workspace.module.css`

- [ ] **Step 1: Replace horizontal strip styles**

Add a two-column `.sceneBoardLayout`, a readable `.sceneRail`, a `.sceneRailCompact` modifier, and a `.sceneRailToggle`.

Keep tile shape stable:

```css
.sceneBoardLayout {
  display: grid;
  grid-template-columns: 142px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.sceneRail {
  display: grid;
  max-height: min(72vh, 720px);
  gap: 10px;
  overflow-y: auto;
}

.sceneRailCompact {
  grid-template-columns: 74px;
}
```

Adjust `.sceneAddTile` and `.sceneMiniCard` so rectangular mode uses a fixed rail width and compact mode uses square tiles.

- [ ] **Step 2: Add responsive fallback**

On small screens, place the rail above the editor as a compact grid that wraps instead of forcing a hidden horizontal strip.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- src/components/RoomEditorClient.test.tsx -t "scene"
```

Expected: PASS.

### Task 4: Verify And Browser Check

**Files:**
- No source changes unless verification exposes an issue.

- [ ] **Step 1: Run full checks**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 2: Browser-check `/rooms/scenes`**

Run the local app and inspect `/rooms/scenes` on desktop and mobile widths. Confirm:

- Rail is on the left at desktop width.
- Toggle switches rectangular and compact modes.
- `+` tile stays above saved scenes.
- Scene selection and editor content survive the toggle.
- No console errors.
