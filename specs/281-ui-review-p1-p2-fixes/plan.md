# Implementation Plan: UI Review Follow-up — Remaining P1 & All P2 Fixes

**Branch**: `281-ui-review-p1-p2-fixes` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/281-ui-review-p1-p2-fixes/spec.md`

## Summary

Six independent UI-quality fixes drawn from the 2026-04-26 UI review (re-walked
2026-06-06): the two still-open P1 items and all four P2 items. Each is a small,
surgical change to existing web-shell / shared-component code — no new runtime
dependencies, no schema change, no service change. The work splits cleanly into
four touch areas:

1. **Theme tokens / CSS** (P1.3) — give web-shell header links a high-contrast
   token + non-colour affordance so they meet WCAG AAA (7:1) in HC-light.
2. **Playwright test reliability** (P1.4) — re-gate the `properties-screenshots`
   spec so the row-click is preceded by an actionability wait, killing the flake.
3. **GoldenLayout default layout** (P2.1, P2.2) — make the analysis-view default
   split a function of viewport width, and make the Properties section reachable
   at short heights.
4. **Catalog StacBrowser** (P2.3, P2.4) — make the timeline+map collapse
   discoverable + persisted + sensibly defaulted, and make the thumbnail S/M/L
   toggle actually resize the list (virtualizer re-measure + preference
   persistence).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, Article XV); React 18.x. No
Python change.
**Primary Dependencies**: `golden-layout` v2 (analysis + catalog layouts),
`@tanstack/react-virtual` (exercise-list virtualisation), `@debrief/components`
(`PanelWorkspace`, `ActivityPanel`, `StacBrowser`, `ExerciseListView`,
`ThumbnailSizeToggle`), web-shell `App.tsx`/`App.css`, `@playwright/test` +
`@axe-core/playwright` (contrast audit). **No new runtime dependencies.**
**Storage**: Browser `localStorage` for UI layout + view preferences (existing
pattern — `BROWSER_LAYOUT_KEY`, `LAYOUT_STORAGE_KEY`/`LAYOUT_VERSION`,
`SPLIT_STORAGE_KEY`). This is ephemeral UI state, not domain/plot data, so it is
**not** subject to the Article IV.4 writer-abstraction rule.
**Testing**: Vitest (unit — layout-builder + persistence pure functions),
Playwright (web-shell E2E — flake fix, layout/viewport evidence, collapse +
thumbnail behaviour, axe contrast audit), Storybook + Playwright (ActivityPanel
short-height behaviour where applicable).
**Target Platform**: Web-shell (browser SPA). Shared-component changes
(`PanelWorkspace` default layout, `ActivityPanel`, `StacBrowser`,
`ExerciseListView`) also benefit the VS Code host transparently, but no
VS Code-host-specific layout work is in scope.
**Project Type**: Web (frontend monorepo — pnpm workspaces).
**Performance Goals**: No regression to the review's measured cold-load (<1.5 s
analysis render); layout/preference changes must reflow without visible jank.
**Constraints**: Offline-only (Article I); strict typing, no new `any` (Article
XV); existing saved layouts must not break (graceful version handling).
**Scale/Scope**: 4 touch areas, ~6 source files changed, ~4 test files
added/modified. No data-model or API surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status |
|---------|-----------|--------|
| I. Defence-Grade Reliability | All changes are offline, client-side. No network introduced. Saved-layout version handling avoids silent breakage. | ✅ Pass |
| II. Schema Integrity | No schema touched. | ✅ N/A |
| III. Data Sovereignty | No data transformation; no provenance surface affected. | ✅ N/A |
| IV. Architectural Boundaries | Changes are frontend-only display/orchestration. `localStorage` use is **UI preference state** (layout, thumbnail size), not domain data — IV.4 writer-abstraction applies to plot/STAC writes, which are untouched. No new divergent persistence path for domain data. | ✅ Pass |
| V. Extensibility | No extension surface changed. | ✅ N/A |
| VI. Testing | Each story ships unit and/or E2E coverage; P1.4 *is* a test-reliability fix. Visual evidence captured. | ✅ Pass (planned) |
| VII. Test-Driven AI Collaboration | Acceptance scenarios + success criteria are the executable definition of done; contrast audit and 10×-no-retry run are machine-verifiable. | ✅ Pass |
| VIII. Documentation | Plan + research + quickstart; ADR not required (no architectural decision — all reuse existing patterns). Evidence + blog opener captured. | ✅ Pass |
| IX. Dependencies | **No new runtime dependencies.** `@axe-core/playwright` already used by spec-/backlog-navigator E2E. | ✅ Pass |
| X. Security | No secrets, no network. | ✅ N/A |
| XI. Internationalisation | No new hard-coded user-facing strings beyond existing patterns; any new control labels (collapse/restore) use the same inline-string convention as the surrounding code (no i18n framework exists yet). | ✅ Pass (consistent) |
| XV. Strict Type Safety | No new `any`. The catalog layout builder currently has one `eslint-disable @typescript-eslint/no-explicit-any` for GL content arrays; new code will use a typed `LayoutItemConfig[]` instead of widening that pattern. | ✅ Pass |

**No violations. No Complexity Tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/281-ui-review-p1-p2-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 — root-cause findings & decisions per item
├── data-model.md        # Phase 1 — UI state/config entities (no DB)
├── quickstart.md        # Phase 1 — how to verify each fix
├── contracts/
│   └── module-contracts.md  # Changed module interfaces (layout fn, persistence keys, tokens)
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit.specify)
└── evidence/
    ├── opening-context.md   # Cached blog opener (Phase 2)
    └── screenshots/         # Captured by Playwright specs (FR-022)
```

### Source Code (repository root)

```text
apps/web-shell/
├── src/
│   ├── App.tsx                     # Header links markup (P1.3); analysis-view PanelWorkspace mount (P2.1/P2.2)
│   └── App.css                     # .web-shell__header-link styling (P1.3)
└── playwright/
    └── tests/
        ├── properties-screenshots.spec.ts   # P1.4 — re-gate the row-click
        ├── ui-review-layout.spec.ts          # NEW — P2.1/P2.2 viewport evidence
        ├── ui-review-catalog.spec.ts         # NEW — P2.3 collapse + P2.4 thumbnail evidence
        └── ui-review-contrast.spec.ts        # NEW — P1.3 axe contrast audit (HC-light)

shared/components/
├── src/
│   ├── PanelWorkspace/
│   │   ├── defaultLayout.ts        # P2.1 — make default a fn of viewport width
│   │   └── layoutPersistence.ts    # P2.1 — respect saved layout / version guard (verify)
│   ├── ActivityPanel/
│   │   └── ActivityPanel.tsx       # P2.2 — short-height adaptation (auto-collapse / reach Properties)
│   ├── StacBrowser/
│   │   ├── StacBrowser.tsx         # P2.3 collapse discoverability+persist; P2.4 thumbnail state persist
│   │   └── ThumbnailSizeToggle.tsx # P2.4 — (likely unchanged; affordance only)
│   ├── ExerciseListView/
│   │   └── ExerciseListView.tsx    # P2.4 — virtualizer.measure() on rowHeight change
│   └── styles/
│       └── tokens.css              # P1.3 — HC link token (--debrief-link-hc or equivalent)
└── e2e/                            # (optional) ActivityPanel short-height story test
```

**Structure Decision**: Pure frontend monorepo change. The fixes live in
`apps/web-shell` (header markup/styling, mount point, Playwright specs) and
`shared/components` (the four reusable surfaces: PanelWorkspace, ActivityPanel,
StacBrowser, ExerciseListView). No new packages, no service or schema directory
involved.

## Implementation approach per item

### P1.3 — HC-light header link contrast (US1)

- **Current state**: `.web-shell__header-link` (App.css:81) uses
  `color: var(--vscode-textLink-foreground, #3794ff)` with `text-decoration:
  none`. In HC-light, `tokens.css` sets `--debrief-color-primary:
  var(--vscode-textLink-foreground, #0F4A85)` but the header link uses the raw
  VS Code var, not the Debrief token, and has no underline.
- **Change**: introduce a theme-aware link token (e.g. `--debrief-link-fg` with
  an HC override) consumed by `.web-shell__header-link`, and add an
  underline + weight in HC modes (`[data-theme^='high-contrast'] .web-shell__header-link`).
  Applied at the shared class/token level so all three links (and future ones)
  inherit it (FR-003). Verify ≥7:1 against the HC-light header background.
- **Verify**: axe-core contrast audit in HC-light (SC-001) + visual evidence in
  all four themes (no regression, FR-004).

### P1.4 — properties-screenshots flake (US2)

- **Current state** (`properties-screenshots.spec.ts:96-105`): waits for
  `exercise-list-item-row` to exist, then immediately `.first().click()`, then
  waits for `properties-form`. The row is rendered inside a **virtualised** list
  (TanStack) and the click can race list re-render / handler attachment — the
  form-wait then times out intermittently.
- **Change**: gate on the row being *actionable* before the click —
  `await expect(firstRow).toBeVisible()` (and, if needed,
  `await firstRow.scrollIntoViewIfNeeded()`) — and use Playwright's
  actionability-aware `firstRow.click()` which already auto-waits. Keep the
  existing 15 s form-wait so genuine breakage still fails loudly (FR-007). Apply
  the same gate to the interaction-video test (lines 131-138).
- **Verify**: 10 consecutive runs, retries disabled, 100% first-attempt pass
  (SC-002). Note: this is a test-only change; no product behaviour changes.

### P2.1 — Analysis layout scales to wide screens (US3)

- **Current state** (`PanelWorkspace/defaultLayout.ts`): static
  `DEFAULT_LAYOUT_CONFIG` with sidebar `width: 25` / content `width: 75`. A flat
  percentage gives an unpredictable px rail and doesn't honour the review's
  target px bands.
- **Change**: replace the static export with a `getDefaultLayout(viewportWidth:
  number): LayoutConfig` that computes the sidebar width *percentage* from a
  target px width per band — ~280 px at ≤1366, growing to ~360–400 px at
  ≥1600 (interpolated between) — clamped so the map always keeps the majority
  (FR-010). Keep `DEFAULT_LAYOUT_CONFIG` as a back-compat default
  (`getDefaultLayout(window.innerWidth)` equivalent) for existing importers.
  `PanelWorkspace` calls the function when building the *fresh* default (only
  when `loadLayout()` returns nothing or a stale version — FR-011). Bump
  `LAYOUT_VERSION` so pre-existing fixed-25% saved layouts fall back to the
  responsive default rather than persisting the old split.
- **Verify**: at ≥1600 the longest tool name renders without ellipsis (SC-003);
  at ≤1366 the rail is ~280 px and the map keeps the majority (SC-004); a saved
  custom layout is respected (FR-011).

### P2.2 — Properties reachable at 720-tall (US4)

- **Current state** (`ActivityPanel.tsx`): Time Controller / Tools / Layers /
  Properties stack vertically inside the Activity tab. At ~720 px tall the
  Properties section sits below the fold with no signal it exists; reaching it
  needs the user to know the column scrolls.
- **Change**: add a height-conditional adaptation. Preferred approach
  (confirmed in research): when the available activity-panel height is below a
  threshold (~ derived from a 720 px viewport) **and** a feature is selected,
  auto-collapse the upper flexible sections (Tools, and Layers if still needed)
  so the Properties section is visible; the existing per-section collapse
  primitive (`PaneSection`) is reused, so it remains manually overridable.
  Adaptation is gated on available height (no effect ≥900 px — FR-013).
- **Verify**: at 1280×720 with a feature selected, Properties is visible/reachable
  without prior scroll knowledge (SC-005); at ≥900 px no adaptation forced.

### P2.3 — Catalog timeline+map row collapsible & discoverable (US5)

- **Current state** (`StacBrowser.tsx`): a per-panel **hide** button is injected
  into the Timeline/Map GL headers, and filter-bar "+ Timeline"/"+ Map" restore
  chips exist; `buildLayoutForVisiblePanels(hidden)` rebuilds the layout, and the
  whole GL layout (including which panels are present) persists via
  `BROWSER_LAYOUT_KEY`. So collapse/restore + persistence largely exist; the gap
  is **discoverability** and a sensible **first-run default**.
- **Change**: (a) make the collapse affordance obvious — a clearly-labelled
  collapse control on the bottom row (e.g. a chevron with tooltip) rather than a
  bare minus glyph; ensure the restore control is equally visible. (b) Confirm
  the hidden-panel state survives reload (it should via layout save — add a test
  to lock it in, FR-016). (c) Apply the agreed first-run default (bottom row
  **shown** once a dataset context exists; see Assumptions) when no saved layout
  exists (FR-017). Reset Layout reapplies this default.
- **Verify**: collapse expands the list and restore brings the row back, state
  survives reload (SC-006).

### P2.4 — Thumbnail S/M/L toggle resizes the list (US6)

- **Root cause** (confirmed): `ExerciseListView` *does* receive the new
  `thumbnailSize` (the GL bridge re-renders the panel on context change,
  `StacBrowser.tsx:770-778`) and recomputes `rowHeight`
  (`ExerciseListView.tsx:53`), but the `@tanstack/react-virtual` virtualizer
  caches item measurements and does **not** re-measure when `estimateSize`
  changes — so rows keep their old heights. Separately, `thumbnailSize` defaults
  to `'small'` and is **never persisted** (`StacBrowser.tsx:660`).
- **Change**: (a) in `ExerciseListView`, call `virtualizer.measure()` in a
  `useEffect` keyed on `rowHeight` so a size change re-flows the list (also
  ensure the thumbnail imagery itself scales with the size config, not only row
  height — FR-018). (b) persist `thumbnailSize` to `localStorage` (new key,
  versioned alongside the others) and hydrate it on mount (FR-020). The toggle's
  active-state indication already exists and is correct (FR-019).
- **Verify**: S/M/L each produce a visibly distinct item size and the choice
  survives reload (SC-007).

## Media Components

The change touches three reusable visual surfaces with existing Storybook
stories. The most demonstrable for the blog post is the catalog thumbnail-size
behaviour and the responsive analysis layout, but those are best shown via
web-shell workflow screenshots (below) rather than isolated Storybook stories.
The one component-level story worth bundling is the `ActivityPanel` short-height
behaviour, if a constrained-height story is added.

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ActivityPanel (short-height) | `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx` | `activity-panel.js` | Show Properties reachable at constrained height (P2.2) |

**Inclusion Criteria Applied**:
- [x] Significant visual change (P2.2 adaptation, P2.4 resize)
- [ ] New visual component
- [x] Interactive demo adds narrative value (thumbnail resize, collapse)

**Bundleability Verified**:
- [x] Stories exist in Storybook (ActivityPanel, StacBrowser, ExerciseListView)
- [x] Components render standalone
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-activitypanel`

> Author confirmation: the primary blog narrative will lean on **web-shell
> workflow screenshots** (catalog + analysis at multiple viewports/themes), with
> the ActivityPanel story as an optional interactive aside. Confirm during
> `/speckit.tasks` whether to add the constrained-height story.

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ActivityPanel.stories.tsx` (constrained height) | Properties section reachable at ~720px-equivalent height | light, dark | none (layout assertion) |

**Testing Strategy**:
- [x] Component renders correctly in theme variants
- [x] Properties section visible/reachable under constrained height
- [x] Accessibility attributes present (existing `data-testid`s reused)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ActivityPanel.spec.ts` (only if a
constrained-height story is added; otherwise P2.2 is covered by the web-shell
`ui-review-layout.spec.ts` at a real 1280×720 viewport).

## Web-Shell E2E Testing

This is the primary evidence path (FR-022). All in-scope behaviours are
verifiable by driving the real web-shell at specific viewports/themes.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| HC-light header contrast | header links | `.web-shell__header-link`, `[data-theme]` | set HC-light, run axe contrast, screenshot |
| Properties row open (de-flaked) | StacBrowser list, properties slot | `[data-testid="exercise-list-item-row"]`, `[data-testid="properties-form"]` | gate→click→assert form, 10× |
| Analysis layout scaling | PanelWorkspace, ActivityPanel, MapView | `[data-testid="panel-workspace"]`, activity tool labels, `.leaflet-container` | open plot at 1280/1440/1920, assert rail width + no tool-name truncation |
| Properties reachable (720-tall) | ActivityPanel | activity sections, `[data-testid="properties-form"]` | open plot at 1280×720, select feature, assert Properties reachable |
| Catalog row collapse | StacBrowser timeline/map | collapse/restore controls, `[data-testid="stac-browser-list"]` | collapse, assert list grows, reload, assert persisted |
| Thumbnail resize | ExerciseListView | `[data-testid="thumbnail-size-{small,medium,large}"]`, `[data-testid="exercise-list-item-row"]` | click L/M/S, assert row height changes, reload, assert persisted |

**Testing Strategy**:
- [x] Workflows run end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended (reuse
  `CatalogPage` / `AnalysisPage`) for new selectors rather than duplicating
- [x] Screenshots written directly into `specs/281-ui-review-p1-p2-fixes/evidence/screenshots/`
  following the path pattern in `properties-screenshots.spec.ts`

**Test File Location**: `apps/web-shell/playwright/tests/ui-review-*.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs ui-review-layout` (etc.)
- Local: `pnpm --filter @debrief/web-shell test ui-review-layout`

## Complexity Tracking

No constitution violations — section intentionally empty.
