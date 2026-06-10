# Tasks: UI Review Follow-up — Remaining P1 & All P2 Fixes

**Feature**: `281-ui-review-p1-p2-fixes` | **Branch**: `claude/pensive-cerf-XEoXN`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> Six independent UI-quality fixes (2 remaining P1, all 4 P2). Each user story is
> independently testable and shippable. The 13 binding decisions from
> `/speckit.review` (see plan.md → **Review Decisions**) are encoded inline below
> and referenced as `[Decision #N]`.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E
> tasks because you think browsers can't be installed. The project bundles
> `@sparticuz/chromium` via npm. Standard browser CDN downloads are blocked (403),
> but the bundled binary works fully. Run
> `cd apps/web-shell && node run-playwright.mjs <spec-basename>` to extract and
> configure. Full details: `docs/project_notes/playwright-installation-research.md`.

## Evidence Requirements

**Evidence Directory**: `specs/281-ui-review-p1-p2-fixes/evidence/`
**Media Directory**: `specs/281-ui-review-p1-p2-fixes/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results (unit + E2E), YAML front matter | After all tests pass |
| usage-example.md | How each fix manifests for an analyst (per-item walkthrough) | After all stories complete |
| screenshots/header-hc-light.png | Header links in HC-light, post-fix (P1.3) | After US1 |
| screenshots/analysis-1920.png | Analysis layout at 1920 — full tool names, map majority (P2.1) | After US3 |
| screenshots/analysis-1366.png | Analysis layout at ≤1366 — ~280px rail (P2.1) | After US3 |
| screenshots/properties-720.png | Properties reachable at 1280×720 (P2.2) | After US4 |
| screenshots/catalog-collapse.png | Catalog bottom row collapsed, list expanded (P2.3) | After US5 |
| screenshots/thumbnail-sizes.png | S/M/L exercise rows side-by-side (P2.4) | After US6 |
| screenshots/interaction.gif | Catalog collapse + thumbnail resize flow (<5s, <2MB) | After US5/US6 |
| flake-proof.txt | 10× no-retry run output for properties-screenshots (P1.4, SC-002) | After US2 |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| evidence/opening-context.md | Cached opener (What We're Building, How It Fits, Key Decisions) | ✅ During /speckit.plan |
| media/shipped-post.md | Feature post combining cached opener + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR #667 in debrief-future (already open — updated with evidence) | Final task |
| Blog PR | PR in debrief.github.io with shipped-post.md | Triggered by /speckit.pr |

## Phase 1: Setup & Test Infrastructure

**Goal**: Prepare shared test scaffolding before touching product code. No product behaviour changes here.

- [x] T001 [P] Add `thumbnail-size-{small,medium,large}` and bottom-row collapse/restore selectors to the catalog page object `apps/web-shell/playwright/pages/CatalogPage.ts`
- [x] T002 [P] Add activity-column rail-width + tool-label and Properties-reachability helpers to the analysis page object `apps/web-shell/playwright/pages/AnalysisPage.ts`
- [x] T003 [P] Add `.web-shell__header-link` + `[data-theme]` switch helpers to the Stac browser page object `apps/web-shell/playwright/pages/StacBrowserPage.ts`

**Parallel**: T001, T002, T003 touch different page-object files — run together.

## Phase 2: Foundational (shared test infrastructure)

**Goal**: Cross-cutting test-hygiene change relied on by the US3/US4/US6 unit suites. ⚠️ Blocks the unit-test tasks in those stories.

- [x] T004 Add `localStorage.clear()` to `beforeEach`/`afterEach` in the shared component unit test setup so persistence-touching suites don't bleed state `[Decision #11]` `shared/components/vitest.setup.ts`

> If no shared `vitest.setup.ts` exists, add the `localStorage.clear()` hooks
> directly to each persistence-touching suite created in Phases 5/8 instead, and
> mark T004 done by inclusion. Existing `ExerciseListView.test.tsx` and
> `__tests__/ThumbnailSizeToggle.test.tsx` must also get the clear hook.

## Phase 3: US1 — Readable header links in HC-light (P1.3)

**Story goal**: Header nav links meet ≥7:1 contrast in HC-light and carry a non-colour affordance, applied at the shared token/class level (FR-001–FR-004).

**Independent test**: Switch web-shell to HC-light; axe-core measures every `.web-shell__header-link` at ≥7:1; visual check confirms underline/weight affordance; no regression in light/dark/HC-dark.

### Tests

- [x] T005 [test] Write the HC-light contrast audit E2E: set HC-light, run axe-core `color-contrast` against the real themed root, assert 0 violations on header links (SC-001); screenshot all four themes for regression `apps/web-shell/playwright/tests/ui-review-contrast.spec.ts`

### Implementation

- [x] T006 Point `.web-shell__header-link` at `var(--debrief-color-primary)` (drop the raw `--vscode-textLink-foreground`) and add `[data-theme^='high-contrast'] .web-shell__header-link` underline + heavier weight `[Decision #4]` `apps/web-shell/src/App.css`
- [x] T007 Verify/confirm `--debrief-color-primary` HC-light value (`#0F4A85`) clears 7:1 on the header background; **only if the audit fails**, add a dedicated darker HC link token here and consume it from App.css `[Decision #4]` `shared/components/src/styles/tokens.css`
- [x] T008 Run `cd apps/web-shell && node run-playwright.mjs ui-review-contrast` and confirm SC-001 passes; capture `screenshots/header-hc-light.png` into evidence `apps/web-shell/playwright/tests/ui-review-contrast.spec.ts`

**Checkpoint**: HC-light header links ≥7:1 with affordance; other themes unregressed. US1 shippable.

## Phase 4: US2 — Reliable properties-screenshots E2E (P1.4)

**Story goal**: `properties-screenshots` passes first-attempt 10/10 with retries off, by gating on a reliably-present, actionable anchor before the row-click — without masking real breakage (FR-005–FR-007).

**Independent test**: Run the suite 10× with `retries: 0`; 100% first-attempt pass.

### Implementation

- [x] T009 Gate the row-click on actionability before clicking: `await expect(firstRow).toBeVisible()` (+ `scrollIntoViewIfNeeded()` if needed) then `firstRow.click()`; keep the existing 15s `properties-form` wait so genuine breakage still fails loudly. Apply the same gate to the interaction-video test `[FR-006/FR-007]` `apps/web-shell/playwright/tests/properties-screenshots.spec.ts`
- [x] T010 Configure the `properties-screenshots` suite to run at `retries: 0` in CI (project/grep override) so a future re-flake fails loudly instead of being retried away `[Decision #8]` `apps/web-shell/playwright/playwright.config.ts`

### Verification

- [x] T011 Run the suite 10× consecutively with retries disabled via `cd apps/web-shell && node run-playwright.mjs properties-screenshots`; confirm 10/10 first-attempt pass (SC-002) and save the run output to `specs/281-ui-review-p1-p2-fixes/evidence/flake-proof.txt`

**Checkpoint**: SC-002 met; flake proven gone with retries off. US2 shippable.

## Phase 5: US3 — Analysis layout scales to wide screens (P2.1)

**Story goal**: The default analysis-view activity-column width scales with the workspace **container** width via discrete bands; saved layouts respected; map keeps the majority (FR-008–FR-011).

**Independent test**: Open analysis at 1280/1440/1920 — rail ≈280px at ≤1366, ≈360–400px at ≥1600 with no truncated tool name, map majority at all widths; a saved custom layout is used verbatim.

### Tests

- [x] T012 [P][test] Unit-test `getDefaultLayout(width)`: discrete bands (≤1366→~280px, ≥1600→~360–400px, middle band), `sidebarWidthPct < contentWidthPct` for width ≥1024, pure (no `window` access) `[Decision #7]` `shared/components/src/PanelWorkspace/defaultLayout.test.ts`
- [x] T013 [P][test] Unit-test the version bump: `loadLayout()` returns `null` for a persisted layout at the old `LAYOUT_VERSION` (legacy fixed-25% discarded) `shared/components/src/PanelWorkspace/layoutPersistence.test.ts`
- [x] T014 [test] E2E layout-scaling spec: assert rail width per band, 0 ellipsised tool labels at ≥1600 (SC-003), ~280px rail + map majority at ≤1366 (SC-004), and a saved layout respected (FR-011) `apps/web-shell/playwright/tests/ui-review-layout.spec.ts`

### Implementation

- [x] T015 Replace the static `DEFAULT_LAYOUT_CONFIG` with `getDefaultLayout(containerWidth: number): LayoutConfig` using discrete bands; derive `DEFAULT_LAYOUT_CONFIG = getDefaultLayout(BASELINE_WIDTH)` as the single panel-tree source; type GL content as `LayoutItemConfig[]` (no `any`) `[Decisions #1, #7]` `shared/components/src/PanelWorkspace/defaultLayout.ts`
- [x] T016 Bump `LAYOUT_VERSION` so legacy fixed-25% saved layouts fall back to the responsive default `shared/components/src/PanelWorkspace/layoutPersistence.ts`
- [x] T017 Switch **all three** `PanelWorkspace` call sites (parse-fail fallback, no-saved-layout, Reset Layout) to `getDefaultLayout(containerWidth)`, reading `containerRef.current.clientWidth` **once** at GL init / reset (not `window.innerWidth`) `[Decisions #1, #3, #13]` `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`

### Verification

- [x] T018 Run `cd apps/web-shell && node run-playwright.mjs ui-review-layout`; confirm SC-003/SC-004; capture `screenshots/analysis-1920.png` and `screenshots/analysis-1366.png` into evidence `apps/web-shell/playwright/tests/ui-review-layout.spec.ts`

**Parallel**: T012, T013 are independent unit files. T015→T016→T017 are sequential (same/linked modules + call sites). **Checkpoint**: US3 shippable.

## Phase 6: US4 — Properties discoverable on short laptops (P2.2)

**Story goal**: At ~720px-tall viewports with a feature selected, Properties is reachable via a discoverable adaptation; no adaptation ≥900px; manual toggles always win and nothing is persisted (FR-012, FR-013).

**Independent test**: Open analysis at 1280×720, select a feature — Properties is visible/reachable without prior scroll knowledge; at ≥900px no adaptation forced.

### Tests

- [x] T019 [test] Invariant unit test: with container height stubbed `< threshold` and a feature selected, adaptation collapses Tools/Layers **internally**, never calls `onCollapseStateChange`, is a no-op when `collapseState` is controlled, and is a no-op at ≥900px `[Decisions #2, #9]` `shared/components/src/ActivityPanel/__tests__/ActivityPanel.shortHeight.test.tsx`
- [x] T020 [test] Extend the E2E layout spec: at 1280×720 with a feature selected, assert `properties-form` is reachable (SC-005) `apps/web-shell/playwright/tests/ui-review-layout.spec.ts`

### Implementation

- [x] T021 Add the short-height adaptation: when **uncontrolled** AND container `clientHeight` (read once, `[Decision #13]`) `< threshold` AND a feature is selected, set the initial internal `collapseState` to collapse upper flex sections (Tools, then Layers) so Properties is visible; never call `onCollapseStateChange`; no-op when controlled or ≥900px `[Decisions #2, #13]` `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [x] T022 [P] (Optional, confirm at this point) Add a constrained-height `ActivityPanel` Storybook story demonstrating Properties reachable, for the blog aside `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx`

### Verification

- [x] T023 Run `cd apps/web-shell && node run-playwright.mjs ui-review-layout`; confirm SC-005; capture `screenshots/properties-720.png` into evidence `apps/web-shell/playwright/tests/ui-review-layout.spec.ts`

**Checkpoint**: US4 shippable; the never-persist/respect-controlled invariant is locked by T019.

## Phase 7: US5 — Catalog timeline+map row discoverably collapsible (P2.3)

**Story goal**: Make the existing collapse/restore of the timeline+map row discoverable, sensibly defaulted (shown once a dataset context exists), and persisted across reloads (FR-014–FR-017).

**Independent test**: From the catalog, activate a clearly-visible collapse control → list expands; restore control returns the row; state survives reload.

### Tests

- [x] T024 [test] E2E catalog spec: discoverable collapse control collapses the row and grows the list, restore control returns it, and the state survives a reload (SC-006) `apps/web-shell/playwright/tests/ui-review-catalog.spec.ts`

### Implementation

- [x] T025 Replace the `const content: any[]` + `eslint-disable` in `buildLayoutForVisiblePanels` with the proper GoldenLayout item type while in this function `[Decision #6]` `shared/components/src/StacBrowser/StacBrowser.tsx`
- [x] T026 Make the collapse affordance discoverable (labelled chevron + tooltip rather than a bare glyph) and ensure the restore control is equally visible; apply the first-run default (bottom row **shown** once a dataset context exists) when no saved layout exists, and have Reset Layout reapply it `[FR-014/FR-015/FR-017]` `shared/components/src/StacBrowser/StacBrowser.tsx`

### Verification

- [x] T027 Run `cd apps/web-shell && node run-playwright.mjs ui-review-catalog`; confirm SC-006; capture `screenshots/catalog-collapse.png` into evidence `apps/web-shell/playwright/tests/ui-review-catalog.spec.ts`

**Note**: T025 and T026 edit the same file — keep sequential. **Checkpoint**: US5 shippable.

## Phase 8: US6 — Thumbnail S/M/L toggle visibly resizes list (P2.4)

**Story goal**: Selecting S/M/L visibly resizes the exercise-list items (thumbnail + row) and the choice persists across reloads (FR-018–FR-020).

**Independent test**: Click S, then M, then L — items visibly change size at each step; reload remembers the choice.

### Tests

- [x] T028 [P][test] Unit-test the typed persistence helper: writes the size, narrows a stored value to the `ThumbnailSize` union on read, falls back to `'small'` on any unexpected value; versioned key `[Decisions #5, #11]` `shared/components/src/StacBrowser/thumbnailSizePreference.test.ts`
- [x] T029 [P][test] Unit-test that `virtualizer.measure()` fires on `rowHeight` change via a spy (and is gated to the `[rowHeight]` effect, not per render) `[Decisions #10, #12]` `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T030 [test] E2E catalog spec: S/M/L produce visibly distinct row heights and the choice survives reload (SC-007) `apps/web-shell/playwright/tests/ui-review-catalog.spec.ts`

### Implementation

- [x] T031 [P] Add the typed, versioned `thumbnailSize` read/write helper (narrow to union on read, fall back to `'small'`) `[Decision #5]` `shared/components/src/StacBrowser/thumbnailSizePreference.ts`
- [x] T032 Call `virtualizer.measure()` only inside `useEffect(..., [rowHeight])` (never in the render path) so a size change re-flows the list; ensure thumbnail imagery scales via `THUMBNAIL_SIZE_CONFIGS[size]`, not only row height `[Decisions #10, #12]` `shared/components/src/ExerciseListView/ExerciseListView.tsx`
- [x] T033 Hydrate `thumbnailSize` from the helper on mount and persist on change in `StacBrowser` `[FR-020]` `shared/components/src/StacBrowser/StacBrowser.tsx`

### Verification

- [x] T034 Run `cd apps/web-shell && node run-playwright.mjs ui-review-catalog`; confirm SC-007; capture `screenshots/thumbnail-sizes.png` and the `screenshots/interaction.gif` (collapse + resize flow) into evidence `apps/web-shell/playwright/tests/ui-review-catalog.spec.ts`

**Parallel**: T028, T029 (different test files); T031 is independent of T032. T033 depends on T031. **Checkpoint**: US6 shippable.

## Phase 9: Polish & Cross-Cutting Concerns

### Regression guard

- [x] T035 Run the full local CI gate (`task verify`, then the Playwright step) and confirm no regression in the resolved P1 items or other catalog/analysis/storyboard/log surfaces (SC-008) `apps/web-shell/playwright/tests/`

### Evidence Collection

- [x] T036 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (`git_sha`, `captured_at`, pass/fail/skip counts) `specs/281-ui-review-p1-p2-fixes/evidence/test-summary.md`
- [x] T037 [P] Create the per-item usage demonstration (how each fix manifests for an analyst) `specs/281-ui-review-p1-p2-fixes/evidence/usage-example.md`
- [x] T038 [P] Confirm all screenshots + `interaction.gif` (<5s, <2MB) + `flake-proof.txt` are present in `specs/281-ui-review-p1-p2-fixes/evidence/screenshots/`

### Media Content

- [x] T039 Create the feature blog post via the Content Specialist agent — first three sections copied verbatim from `evidence/opening-context.md`, remaining sections from evidence `specs/281-ui-review-p1-p2-fixes/media/shipped-post.md`

### PR Creation

- [x] T040 Create PR and publish blog: run `/speckit.pr` (updates the already-open PR #667 with evidence; opens the debrief.github.io blog PR)

**Task T040 must run last. It depends on all evidence (T036–T038) and media (T039) tasks being complete.**

## Dependencies

**Story independence**: US1–US6 are independent and can ship in any order. The
recommended order follows priority: **US1 (P1.3) → US2 (P1.4) → US3 (P2.1) →
US4 (P2.2) → US5 (P2.3) → US6 (P2.4)**.

**Hard dependencies**:
- Phase 1 (page objects) precedes the E2E tasks that use them (T005, T014, T020, T024, T030).
- T004 (localStorage hygiene) precedes the persistence-touching unit suites (T028, T029, and the existing thumbnail/exercise suites).
- **US3 internal**: T015 → T016 → T017 (linked modules + the three call sites).
- **US4 internal**: T021 before T020/T023 verification; T019 can be written first (TDD).
- **US5 internal**: T025 → T026 (same file); both before T024/T027.
- **US6 internal**: T031 → T033 (helper before consumer); T032 independent; tests before/with impl per TDD.
- **Polish**: T035 after all stories; T036–T039 after T035; **T040 last** (depends on all).

**No cross-story code coupling** — different files per story except StacBrowser.tsx
(shared by US5 T025/T026 and US6 T033 — sequence those edits).

## Implementation Strategy

**Incremental delivery** — each user story is an independently shippable
increment with its own E2E proof and evidence screenshot. Suggested cadence:

1. **MVP slice (accessibility + reliability)**: US1 + US2 first — these are the
   remaining P1 items (contrast + flake) and unblock CI confidence.
2. **Layout polish**: US3 then US4 — both touch `PanelWorkspace`/`ActivityPanel`
   and share the `ui-review-layout.spec.ts` E2E file.
3. **Catalog polish**: US5 then US6 — both touch `StacBrowser`/`ExerciseListView`
   and share the `ui-review-catalog.spec.ts` E2E file; sequence the two
   `StacBrowser.tsx` edits.
4. **Polish phase**: regression gate, evidence, blog post, PR.

**TDD posture**: where a `[test]` task precedes its implementation, write the
failing test first (esp. T019 invariant, T012/T013/T028/T029 unit tests).

**Parallelisation**: Phase 1 page objects (T001–T003) run together; within
stories, `[P]`-tagged unit-test files run together. Two developers could take the
layout pair (US3/US4) and the catalog pair (US5/US6) concurrently with no file
conflicts.

**Pre-push gate**: run `task verify` + the Playwright wrappers (per CLAUDE.md
"Before Pushing") before each push; the PR (#667) is already open and updated on
push. Per `/speckit.review`, the `properties-screenshots` suite runs at
`retries: 0` (T010) so the de-flake stays honest in CI.

