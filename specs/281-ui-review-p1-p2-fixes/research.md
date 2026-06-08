# Phase 0 Research: UI Review Follow-up — Remaining P1 & All P2 Fixes

This feature is bug/polish work against existing code, so "research" here is
**root-cause confirmation** for each item plus the decision on the fix approach.
All findings come from reading the current source on `main`/the feature branch.

---

## P1.3 — HC-light header link contrast

**Decision**: Route `.web-shell__header-link` through a theme-aware link token
and add a non-colour affordance (underline + weight) in high-contrast modes.

**Rationale**:
- `apps/web-shell/src/App.css:81-92` hard-codes
  `color: var(--vscode-textLink-foreground, #3794ff)` with
  `text-decoration: none`. It bypasses the Debrief token layer entirely.
- `shared/components/src/styles/tokens.css:157-172` defines the HC-light
  variant. `--debrief-color-primary` resolves to `#0F4A85` there, but the
  header link never consumes it, and even `#0F4A85` on a near-white header may
  not clear 7:1 depending on the actual header background.
- WCAG AAA (7:1 for normal text) is the platform's stated HC bar (review P1.3).
  Colour alone is also insufficient for link identification — an underline /
  weight is the robust fix and auto-applies to future links (FR-003).

**Alternatives considered**:
- *Per-link inline styling* — rejected; violates FR-003 (future links wouldn't
  inherit) and the constitution's preference for shared treatment.
- *Bump the existing colour only* — rejected; the review explicitly asks for a
  non-colour affordance, and a pure colour swap is fragile against header-bg
  changes.

---

## P1.4 — properties-screenshots E2E flake

**Decision**: Add an actionability gate (`expect(firstRow).toBeVisible()` +
optional `scrollIntoViewIfNeeded()`) immediately before the row click in both
the screenshot loop and the interaction-video test; keep the existing 15 s
form-wait.

**Rationale**:
- `apps/web-shell/playwright/tests/properties-screenshots.spec.ts:96-105` waits
  only for the row to *exist in the DOM*, then `.first().click()` immediately,
  then waits for `properties-form`. The list is **virtualised**
  (`ExerciseListView` uses `@tanstack/react-virtual`), so the row node can be
  re-created / its click handler not yet attached at the moment of click — the
  click is swallowed and the subsequent form-wait times out (the review's
  observed ~2/13 flake). The wait gate is on the wrong event (form appearance
  *after* the click) rather than row-readiness *before* it.
- Gating on visibility lets Playwright's auto-waiting actionability checks settle
  the virtualised row before clicking. This is the review's recommended two-line
  fix and matches FR-006.

**Alternatives considered**:
- *Increase the form-wait timeout* — rejected; masks real breakage (FR-007) and
  doesn't address the swallowed click.
- *Disable virtualisation in test* — rejected; changes the thing under test and
  is more invasive than the gate.

---

## P2.1 — Analysis layout scaling

**Decision**: Replace the static `DEFAULT_LAYOUT_CONFIG` with a
`getDefaultLayout(viewportWidth)` builder that computes the sidebar width as a
percentage derived from a target px width per viewport band (~280 px ≤1366,
~360–400 px ≥1600, interpolated between), clamped so the map keeps the majority.
Bump `LAYOUT_VERSION` so legacy fixed-25% saved layouts fall back to the new
default.

**Rationale**:
- `shared/components/src/PanelWorkspace/defaultLayout.ts:44-110` is a static
  `row` with sidebar `width: 25` / content `width: 75`. A flat percentage gives
  an unpredictable px rail and doesn't match the review's target bands; the
  longest tool name ("Apply Symbol Style") truncates because the rail width is
  not chosen against tool-label length.
- GoldenLayout v2 sizes siblings by relative `width` numbers; computing the
  sidebar percentage from `targetPx / viewportWidth` at build time gives a
  px-accurate rail while staying within GL's percentage model (the review's
  exact suggestion).
- A `LAYOUT_VERSION` bump is the established mechanism
  (`layoutPersistence.ts`) for invalidating stale persisted layouts safely
  (Article I — no silent breakage).

**Alternatives considered**:
- *CSS `min-width` on the sidebar only* — rejected; GL controls panel sizing
  imperatively, so CSS min-width fights the layout engine and doesn't set the
  default split.
- *Live ResizeObserver re-flow on every window resize* — deferred; the spec
  requires correctness on open/reset only (Assumptions), and continuous re-flow
  risks clobbering a user's manual resize. Can be a future enhancement.

---

## P2.2 — Properties reachable at 720-tall

**Decision**: Add a height-conditional adaptation in `ActivityPanel` — when
available height is below a ~720 px-derived threshold **and** a feature is
selected, auto-collapse the upper flexible sections (Tools, then Layers) using
the existing `PaneSection` collapse primitive so Properties becomes visible;
no adaptation at ≥900 px.

**Rationale**:
- `ActivityPanel.tsx` stacks Time Controller (fixed), Tools (flex), Layers
  (flex), Properties (fixed) vertically. At 720 px the Properties section falls
  below the fold with no signal, so users miss it entirely (review P2.2).
- The component already has per-section collapse (`PaneSection` toggles), so the
  adaptation reuses an existing, user-overridable primitive rather than
  introducing a new layout mode — lowest-risk, smallest surface.
- Gating on available height (not a hard viewport media query) keeps the
  behaviour correct when the panel is resized within a tall window (FR-013).

**Alternatives considered**:
- *Float Properties into a separate right-side dock* — rejected for this feature;
  larger structural change, and the VS Code host mirrors this panel (out of
  scope to diverge).
- *Always-visible "scroll for more" chevron only* — viable but weaker; a passive
  hint is less reliable than making Properties actually visible. May be added as
  a complement.

---

## P2.3 — Catalog timeline+map collapsibility

**Decision**: Treat as discoverability + first-run default + persistence
verification. Keep the existing hide/restore machinery; make the collapse
control obviously labelled (chevron + tooltip), ensure restore is equally
visible, lock persistence with a test, and apply the agreed first-run default.

**Rationale**:
- `StacBrowser.tsx` already injects a per-panel **hide** button into Timeline/Map
  GL headers (lines ~836+), exposes filter-bar restore chips, and rebuilds the
  layout via `buildLayoutForVisiblePanels(hidden)` (lines 191-209). The whole GL
  layout persists via `BROWSER_LAYOUT_KEY` (lines 121-122, 237-258), so a
  collapsed row should already survive reload.
- The review's complaint is that the collapse is **not discoverable** (a bare
  minus glyph) and there's no deliberate first-run default — not that collapse is
  absent. So the work is affordance + default + a regression test, not new
  collapse logic. This keeps scope minimal (review status: "Unchanged" but
  mechanism partly present).

**Alternatives considered**:
- *Build a brand-new collapsible panel system* — rejected; duplicates existing
  capability. The review even notes "the Reset Layout button proves the panel
  system supports it; expose the toggle."

---

## P2.4 — Thumbnail S/M/L toggle no-op

**Decision**: Call `virtualizer.measure()` when `rowHeight` changes in
`ExerciseListView`, ensure thumbnail imagery scales with the size config (not
only row height), and persist `thumbnailSize` to `localStorage`.

**Rationale**:
- `ExerciseListView.tsx:53` reads `rowHeight` from
  `THUMBNAIL_SIZE_CONFIGS[thumbnailSize]` and feeds it to the virtualizer's
  `estimateSize` (lines 77-82). The toggle *does* propagate: `StacBrowser.tsx`
  rebuilds `contextValue` with `thumbnailSize` in deps (line 767) and the GL
  bridge re-renders the list panel on context change (lines 770-778). So the
  prop reaches the component.
- **The bug is the virtualizer**: `@tanstack/react-virtual` caches measured item
  sizes and does **not** re-measure when the `estimateSize` function reference
  changes — it keeps the old heights, so the list looks unchanged. Calling
  `virtualizer.measure()` on `rowHeight` change resets the cache and re-flows.
- Separately, `thumbnailSize` initialises to `'small'`
  (`StacBrowser.tsx:660`) and is **never written to `localStorage`**, so FR-020
  (persistence) is unmet. Add a versioned preference key + hydrate on mount.
- `THUMBNAIL_SIZE_CONFIGS` already carries `rasterWidth/Height` +
  `spatialWidth/Height` per size, so scaling the imagery is a matter of ensuring
  the row renderer consumes those (they exist; verify they're applied — FR-018).

**Alternatives considered**:
- *Remove the toggle* (the review's fallback) — rejected; the capability is
  desired and the fix is small.
- *Replace virtualisation with plain rendering* — rejected; the list can be long
  (11+ Saxon Warrior datasets and growing); virtualisation stays.

---

## Cross-cutting decisions

- **No new runtime dependencies** (Article IX). `@axe-core/playwright` for the
  P1.3 contrast audit is already a dev-dependency used by the spec-navigator and
  backlog-navigator E2E suites.
- **Persistence is UI-preference state**, not domain data — `localStorage` use
  is consistent with existing layout/split persistence and outside Article IV.4.
- **Saved-layout safety** (Article I): every default-changing item (P2.1, P2.3,
  P2.4) must degrade gracefully for users with pre-existing persisted
  state — version bumps / additive keys, never a silent broken render.
- **Evidence-first** (Articles VI/VII): the Playwright specs are the producers of
  the before/after screenshots that satisfy FR-022 and the blog post.
