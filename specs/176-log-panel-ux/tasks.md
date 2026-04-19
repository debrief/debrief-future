---

description: "Task list for Feature 176 — Analysis Log Panel Rich Card UX"
---

# Tasks: Analysis Log Panel — Rich Card UX

**Input**: Design documents from `/specs/176-log-panel-ux/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/log-panel-types.ts, quickstart.md

**Tests**: Tests are REQUIRED for this feature — vitest unit, vitest component, Storybook stories, Playwright E2E (component + VS Code webview).

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the rich-card LogPanel works as expected. These feed the PR description, the shipped blog post, and the LinkedIn announcement.

**Evidence Directory**: `specs/176-log-panel-ux/evidence/`
**Media Directory**: `specs/176-log-panel-ux/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | YAML front matter + pass/fail counts for vitest (unit + component) and Playwright (component + webview) suites | After all tests pass |
| `evidence/usage-example.md` | Code snippet showing how a host renders `<LogPanel>` with a sample timeline including all 5 categories and chip types, with expected rendered output described | After all user stories complete |
| `evidence/screenshots/component-light.png` | Storybook capture of LogPanel rich cards in `light` theme variant | After Story 1+2 implemented |
| `evidence/screenshots/component-dark.png` | Storybook capture in `dark` theme variant | After Story 1+2 implemented |
| `evidence/screenshots/component-vscode.png` | Storybook capture in `vscode` theme variant (primary target) | After Story 1+2 implemented |
| `evidence/screenshots/interaction.gif` | < 5s, < 2MB GIF showing card selection + tab switching across all 4 view modes (Timeline → By Feature → Compact → Detailed) | After Story 3+4 implemented |
| `evidence/screenshots/disabled-state.png` | Storybook capture of a disabled card with the "disabled" badge at 50% opacity | After Story 5 implemented |
| `evidence/screenshots/edge-cases.png` | Storybook capture showing unknown tool, no-parameters, and snapshot rendering side-by-side | After Story 6 implemented |
| `evidence/e2e-summary.md` | Component + webview Playwright pass/fail counts with screenshots referenced | After E2E run |
| `evidence/webview-e2e-summary.md` | VS Code webview Playwright result for `tests/e2e/test-log-panel.spec.ts` | After webview E2E run |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature | Already produced during /speckit.plan |
| `media/linkedin-planning.md` | LinkedIn summary for planning | Already produced during /speckit.plan |
| `media/shipped-post.md` | Blog post celebrating shipped rich-card UX | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped feature | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` linking spec, plan, evidence, screenshots | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` publishing `shipped-post.md` | Triggered automatically by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: Confirm the LogPanel module is ready for the redesign — no new packages or dependencies are introduced (per plan.md "No new external dependencies").

- [ ] T001 Verify `shared/components/src/LogPanel/` builds clean before any change: run `pnpm --filter @debrief/components build` and capture any pre-existing warnings to baseline against `specs/176-log-panel-ux/evidence/baseline-build.txt`
- [ ] T002 [P] Confirm vitest config picks up new `__tests__/` files in `shared/components/vitest.config.ts`
- [ ] T003 [P] Confirm Storybook config registers stories under `shared/components/src/LogPanel/*.stories.tsx` in `shared/components/.storybook/main.ts`

**Checkpoint**: Toolchain verified; we can begin foundational refactors with a known-clean baseline.

---

## Phase 2: Foundation

**Purpose**: Land the shared types, i18n strings, static config, and CSS scaffolding that every user story below depends on. No user story can start until this phase is complete.

**⚠️ CRITICAL**: All P1/P2/P3 stories depend on the new `ToolCategory`, `ParamType`, and `RichViewMode` types plus the strings table.

### Types & Contracts

- [ ] T004 Add `ToolCategory`, `ToolCategoryConfig`, `ToolCategoryMap`, `ParamType`, `ParamChipData`, and `RichViewMode` types (mirroring `specs/176-log-panel-ux/contracts/log-panel-types.ts`) and remove the old `PresentationMode` union from `shared/components/src/LogPanel/types.ts`
- [ ] T005 [P] Add the new tool category, parameter type, view-mode tab labels, "No parameters", "Manual checkpoint", "disabled", and rationale aria-labels to `shared/components/src/LogPanel/strings.ts`

### Static Config

- [ ] T006 [P] Create the static `TOOL_CATEGORIES` config map (5 categories with background colours `#dbeafe`/`#ede9fe`/`#dcfce7`/`#fff7ed`/`#fef9c3` + glyphs from data-model.md §ToolCategory) and `getToolCategoryConfig()` helper with neutral grey fallback in `shared/components/src/LogPanel/toolCategories.ts`

### Utilities

- [ ] T007 [P] Create `inferParamType(value: unknown): ParamType | null` heuristic (colour-name regex, number, boolean, range object `{min, max, unit}`, enum string fallback per research.md R2) in `shared/components/src/LogPanel/paramTypeInference.ts`
- [ ] T008 Update `formatDuration` to emit `Xms` when < 1000ms and `X.Xs` (single-decimal) when ≥ 1s, plus add `formatTimestampUtc(iso: string): string` returning `HH:MM:SS UTC`, and add `formatParamChip(label, value, schemaType?, isDefault?): ParamChipData` in `shared/components/src/LogPanel/utils.ts`

### Tests for Foundation

- [ ] T009 [P][test] Unit tests for `inferParamType` covering all 5 types + null fallback + null/undefined input in `shared/components/src/LogPanel/__tests__/paramTypeInference.test.ts`
- [ ] T010 [P][test] Unit tests for `formatDuration` (450ms → "450ms", 2300ms → "2.3s", missing → undefined) and `formatTimestampUtc` (UTC suffix, padded HH:MM:SS) in `shared/components/src/LogPanel/__tests__/formatDuration.test.ts`
- [ ] T011 [P][test] Unit tests for `formatParamChip` covering schema-type override, heuristic fallback, plain-text fallback, and `isNonDefault` derivation in `shared/components/src/LogPanel/__tests__/formatParamChip.test.ts`

### CSS Scaffolding

- [ ] T012 Add base CSS classes (`.log-panel__entry--rich`, `.log-panel__row--header/meta/params`, `.log-panel__chip`, `.log-panel__track-badge`, `.log-panel__category-icon`, `.log-panel__non-default-marker`) and CSS variables for category background colours in `shared/components/src/LogPanel/LogPanel.css`

### Parallel Example: Foundation

```bash
# After T004 lands, these can run in parallel:
Task: "T005 strings.ts additions"
Task: "T006 toolCategories.ts static map"
Task: "T007 paramTypeInference.ts heuristic"
Task: "T009 paramTypeInference.test.ts"
Task: "T010 formatDuration.test.ts"
```

**Checkpoint**: Types, strings, static config, utility functions, and CSS variables are in place. All P1/P2/P3 stories may now begin in parallel.

---

## Phase 3: User Story 1 — Browse Analysis History (Priority: P1)

**Goal**: Each PROV log entry renders as a 3-row card (header / meta / params) with step number, tool category icon, tool name, optional rationale icon, track badge(s), timestamp, and duration — newest-first by default.

**Independent Test**: Load a Storybook story or sample plot with 5+ logged operations and verify each card displays the correct tool name, category icon, step number, track badge(s), UTC timestamp, and `Xms`/`X.Xs` duration in newest-first order. Hovering the rationale icon shows the rationale tooltip.

### Component Tests for User Story 1

- [ ] T013 [P][US1][test] Component test for `LogEntry` 3-row anatomy: asserts header row contains step number, category icon, tool name, optional rationale icon; meta row contains track badge(s), timestamp, optional duration; params row container is present in `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx`
- [ ] T014 [P][US1][test] Component test for `ToolCategoryIcon` rendering all 5 categories + neutral fallback, plus `aria-label` per category in `shared/components/src/LogPanel/__tests__/ToolCategoryIcon.test.tsx`
- [ ] T015 [P][US1][test] Component test for `TrackBadge` rendering platform name, multiple-badge wrapping, and `aria-label` in `shared/components/src/LogPanel/__tests__/TrackBadge.test.tsx`
- [ ] T016 [P][US1][test] Component test for newest-first ordering and rationale tooltip visibility in `shared/components/src/LogPanel/__tests__/LogPanelOrdering.test.tsx`

### E2E Tests for User Story 1 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T017 [P][US1][test] Playwright story-render test asserting header/meta/params rows exist for each card in the Rich Card story in `shared/components/e2e/LogPanel.spec.ts`
- [ ] T018 [P][US1][test] Add light + vscode theme variant assertions for the Rich Card story in `shared/components/e2e/LogPanel.spec.ts`

### Implementation for User Story 1

- [ ] T019 [P][US1] Create `ToolCategoryIcon.tsx` (18×18 coloured square with glyph, accepts `category: ToolCategory | null`, applies `aria-label` from `strings.ts`, falls back to neutral grey) in `shared/components/src/LogPanel/ToolCategoryIcon.tsx`
- [ ] T020 [P][US1] Create `TrackBadge.tsx` (pill label, `aria-label`, supports flex-wrap inside meta row) in `shared/components/src/LogPanel/TrackBadge.tsx`
- [ ] T021 [US1] Restructure `LogEntry.tsx` front face into three rows: header (`<div class="log-panel__row--header">` with step number, `<ToolCategoryIcon>`, tool name, rationale icon if `entry.rationale` is non-empty), meta (`<div class="log-panel__row--meta">` with one `<TrackBadge>` per `used[]` platform, UTC timestamp, formatted duration), and params (placeholder container — chips wired up in US2). Preserve existing `CardFlip`/`EditFace` integration in `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T022 [US1] Wire newest-first ordering and pass tool-category resolution from `getToolCategoryConfig()` for each entry in `shared/components/src/LogPanel/LogTimeline.tsx`
- [ ] T023 [US1] Update `LogPanel.stories.tsx` Rich Card story with at least 5 sample entries spanning all 5 categories, varied durations (250ms / 2.3s / no duration), and at least one rationale-bearing entry in `shared/components/src/LogPanel/LogPanel.stories.tsx`
- [ ] T024 [US1] Add CSS rules for header/meta layout, rationale icon hover tooltip, and step-number styling in `shared/components/src/LogPanel/LogPanel.css`

**Checkpoint**: User Story 1 is independently demonstrable in Storybook. Cards render with icons, badges, timestamps, and durations; rationale tooltip appears on hover.

---

## Phase 4: User Story 2 — Understand Parameter Values at a Glance (Priority: P1)

**Goal**: Each parameter value renders as a `ParameterChip` with a type-appropriate icon prefix (colour swatch / `#` / `≡` / `↔` / `⊤`/`⊥`), the formatted value, and a red dot marker when the value is non-default.

**Independent Test**: Load a Storybook story containing one of each chip type (colour, number with unit, boolean true/false, range with unit, enum, fallback string) and verify the icon prefix, formatted text, and non-default marker render correctly.

### Component Tests for User Story 2

- [ ] T025 [P][US2][test] Component test for `ParameterChip` covering all 5 ParamTypes + plain-text fallback, asserting icon prefix and `aria-label` for each in `shared/components/src/LogPanel/__tests__/ParameterChip.test.tsx`
- [ ] T026 [P][US2][test] Component test asserting non-default red dot marker (`.log-panel__non-default-marker`) appears when `chip.isNonDefault === true` and is absent otherwise in `shared/components/src/LogPanel/__tests__/ParameterChipNonDefault.test.tsx`
- [ ] T027 [P][US2][test] Component test asserting numeric chip with unit renders as `# 30 s`, range chip renders as `↔ 10 m – 200 m`, boolean true renders as `⊤ yes`, boolean false renders as `⊥ no`, colour chip renders swatch + name in `shared/components/src/LogPanel/__tests__/ParameterChipFormatting.test.tsx`

### E2E Tests for User Story 2 🎭

- [ ] T028 [P][US2][test] Playwright assertions for chip type variants on the ParameterChip story (colour swatch visible, `#` prefix, `↔` prefix, `⊤`/`⊥` prefix, non-default red dot) in `shared/components/e2e/ParameterChip.spec.ts`

### Implementation for User Story 2

- [ ] T029 [P][US2] Create `ParameterChip.tsx` consuming `ParamChipData`, rendering the icon prefix (or colour swatch span for `paramType === 'colour'`), the formatted value, and a `<span class="log-panel__non-default-marker">●</span>` when `isNonDefault` is true; sets `aria-label` from strings table in `shared/components/src/LogPanel/ParameterChip.tsx`
- [ ] T030 [P][US2] Create `ParameterChip.stories.tsx` covering all 5 chip types (default + non-default), null/undefined fallback, and missing tool schema in `shared/components/src/LogPanel/ParameterChip.stories.tsx`
- [ ] T031 [US2] Wire the params row in `LogEntry.tsx` to map `entry.parameters` through `formatParamChip` (using the schema cache when available, heuristic fallback otherwise) and render one `<ParameterChip>` per entry in `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T032 [US2] Add CSS for `.log-panel__chip` (icon prefix slot, swatch, value), `.log-panel__non-default-marker` (red dot ●), and chip wrap behaviour in `shared/components/src/LogPanel/LogPanel.css`
- [ ] T033 [US2] Extend `LogPanel.stories.tsx` Rich Card story so at least one card showcases each chip type and one chip has `isNonDefault === true` in `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: User Story 2 is independently demonstrable. Cards now show typed parameter chips with red-dot markers for non-default values.

---

## Phase 5: User Story 3 — Select a Card for Focus (Priority: P2)

**Goal**: Clicking a card selects it (highlighted border + background, `aria-selected="true"`); only one card is selected at a time; disabled cards are still selectable; selection is local UI state.

**Independent Test**: In Storybook, click cards in sequence and verify visual selection state toggles correctly with exactly one card highlighted at a time, including when clicking a disabled card.

### Component Tests for User Story 3

- [ ] T034 [P][US3][test] Component test asserting click handler updates selection state, only one card has `aria-selected="true"`, and disabled cards are also selectable in `shared/components/src/LogPanel/__tests__/LogPanelSelection.test.tsx`
- [ ] T035 [P][US3][test] Keyboard test asserting `Enter` and `Space` on a focused card toggles selection in `shared/components/src/LogPanel/__tests__/LogPanelSelectionKeyboard.test.tsx`

### E2E Tests for User Story 3 🎭

- [ ] T036 [P][US3][test] Playwright test in `shared/components/e2e/LogPanel.spec.ts` clicks card A then card B, asserting selection moves and highlight CSS applies

### Implementation for User Story 3

- [ ] T037 [US3] Add `selectedEntryId` local state (or controlled prop) and `onSelectEntry` callback to `LogPanel.tsx`; pass `isSelected` and `onSelect` down to `LogEntry`/`LogTimeline`/`LogByFeature` in `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T038 [US3] In `LogEntry.tsx` apply `aria-selected` and the `log-panel__entry--selected` class when `isSelected`, and bind `onClick`/keyboard handlers (without blocking disabled cards) in `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T039 [US3] Add CSS rules for `.log-panel__entry--selected` (highlighted border + background, focus-visible outline) in `shared/components/src/LogPanel/LogPanel.css`

**Checkpoint**: User Story 3 is independently demonstrable. Single-selection works across Timeline view (will be re-tested under all view modes once US4 lands).

---

## Phase 6: User Story 4 — Switch Between View Modes (Priority: P2)

**Goal**: A 4-tab bar (Timeline / By Feature / Compact / Detailed) using ARIA `tablist`/`tab`/`tabpanel` switches the panel layout. Compact omits the params row; Detailed adds expanded `used[]` and `generated[]` feature ID lists.

**Independent Test**: Click each of the 4 tabs and verify Timeline shows full cards newest-first, By Feature groups under collapsible track headers, Compact shows header+meta only, Detailed shows full card + feature ID lists. Each switch should complete in < 100ms (per plan.md performance goal).

### Component Tests for User Story 4

- [ ] T040 [P][US4][test] Component test asserting `LogActionBar` renders 4 tabs with `role="tab"` inside a `role="tablist"`, only one has `aria-selected="true"`, and ←/→ arrow keys move selection in `shared/components/src/LogPanel/__tests__/LogActionBar.test.tsx`
- [ ] T041 [P][US4][test] Component test asserting Compact view omits the params row and Detailed view renders `used[]`/`generated[]` lists in `shared/components/src/LogPanel/__tests__/LogPanelViewModes.test.tsx`
- [ ] T042 [P][US4][test] Component test asserting `By Feature` view groups entries under track-name headers in `shared/components/src/LogPanel/__tests__/LogByFeature.test.tsx`

### E2E Tests for User Story 4 🎭

- [ ] T043 [P][US4][test] Playwright test cycling all 4 tabs in `shared/components/e2e/LogPanel.spec.ts` and asserting each tabpanel renders the expected layout

### VS Code Webview E2E Tests for User Story 4 🖥️

- [ ] T044 [P][US4][test] Update `tests/e2e/models/logPanelPage.ts` (or create) with selectors for the 4 tabs and tabpanel content
- [ ] T045 [P][US4][test] Create webview Playwright spec exercising all 4 tabs after opening a sample plot in `tests/e2e/test-log-panel.spec.ts`
- [ ] T046 [US4][test] Run webview e2e: `xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts test-log-panel`

### Implementation for User Story 4

- [ ] T047 [US4] Replace `ViewMode` (`'timeline' | 'by-feature'`) and remove `PresentationMode` from the panel; the unified `RichViewMode` now drives a single tab bar — update default + props in `shared/components/src/LogPanel/types.ts`
- [ ] T048 [US4] Refactor `LogActionBar.tsx` to render the 4 tabs as a `role="tablist"` with each tab as `role="tab"` (`aria-selected`, `aria-controls`, `tabIndex` roving); accepts `viewMode` + `onViewModeChange` and reads tab labels from `strings.ts` in `shared/components/src/LogPanel/LogActionBar.tsx`
- [ ] T049 [US4] In `LogPanel.tsx`, render a single `role="tabpanel"` whose contents switch between Timeline/By Feature layout components and apply Compact (hide params row) or Detailed (show feature ID lists) modifiers in `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T050 [US4] Update `LogTimeline.tsx` and `LogByFeature.tsx` to accept the unified `viewMode` prop and forward `compact`/`detailed` modifiers down to `LogEntry` in `shared/components/src/LogPanel/LogTimeline.tsx` and `shared/components/src/LogPanel/LogByFeature.tsx`
- [ ] T051 [US4] In `LogEntry.tsx`, conditionally hide the params row when `viewMode === 'compact'` and conditionally render `used[]`/`generated[]` feature ID lists when `viewMode === 'detailed'` in `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T052 [US4] Add CSS for `.log-panel__tablist`, `.log-panel__tab[aria-selected="true"]`, and `.log-panel__entry--compact` / `.log-panel__entry--detailed` modifiers in `shared/components/src/LogPanel/LogPanel.css`
- [ ] T053 [US4] Remove `PresentationMode` state from VS Code host: update `apps/vscode/src/webview/web/logPanel.tsx` to use the unified `RichViewMode`
- [ ] T054 [US4] Remove `PresentationMode`-related message types and pass-through new fields in `apps/vscode/src/views/logPanelView.ts`
- [ ] T055 [US4] Add a `LogPanel.stories.tsx` story per view mode (Timeline / By Feature / Compact / Detailed) using the same sample data in `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: User Story 4 is independently demonstrable. All 4 tabs work in Storybook + the VS Code webview; no `PresentationMode` references remain.

---

## Phase 7: User Story 5 — Identify Disabled Operations (Priority: P3)

**Goal**: Disabled entries (`disabled === true`) render at 50% opacity with a red-tinted "disabled" badge in the meta row. They remain interactive (selectable) and still display their parameter chips.

**Independent Test**: In Storybook, render a sample log with one disabled entry; verify the card is at 50% opacity, shows the "disabled" badge in the meta row, can still be selected via click, and shows its parameter chips normally.

### Component Tests for User Story 5

- [ ] T056 [P][US5][test] Component test asserting disabled entry has `.log-panel__entry--disabled` class with 50% opacity, the disabled badge is present in the meta row, the card remains clickable and selectable, and parameters still render in `shared/components/src/LogPanel/__tests__/LogEntryDisabled.test.tsx`

### Implementation for User Story 5

- [ ] T057 [US5] In `LogEntry.tsx`, add a "disabled" badge component to the meta row when `entry.disabled === true`, apply the `.log-panel__entry--disabled` class on the card root, and ensure click/keyboard handlers still fire in `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T058 [US5] Add CSS for `.log-panel__entry--disabled` (`opacity: 0.5`, no `pointer-events: none`) and `.log-panel__disabled-badge` (red-tinted background, `aria-label`) in `shared/components/src/LogPanel/LogPanel.css`
- [ ] T059 [US5] Add a Storybook story showing a disabled entry alongside enabled ones in `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: User Story 5 is independently demonstrable. Disabled cards are visually distinct yet still interactive.

---

## Phase 8: User Story 6 — Graceful Handling of Unknown or Incomplete Data (Priority: P3)

**Goal**: Unknown tools render with a neutral grey icon and the tool name verbatim. Entries with no parameters show "No parameters" in muted italic. Snapshot entries show "Manual checkpoint" in muted italic and omit duration. Empty rationale strings are treated as absent. Missing duration is silently omitted. Empty log shows the centred "No operations recorded yet." message.

**Independent Test**: Render Storybook stories containing (a) an entry for an unknown tool, (b) an entry with empty parameters, (c) a snapshot entry, (d) an entry with empty rationale, (e) an entry missing `execution_duration`, and (f) an empty log; verify each renders gracefully without errors.

### Component Tests for User Story 6

- [ ] T060 [P][US6][test] Component test asserting unknown tool renders neutral grey icon, tool name verbatim, and raw parameter values as plain string chips in `shared/components/src/LogPanel/__tests__/LogEntryUnknownTool.test.tsx`
- [ ] T061 [P][US6][test] Component test asserting empty parameters renders "No parameters" muted italic and snapshot entries render "Manual checkpoint" muted italic with no duration in `shared/components/src/LogPanel/__tests__/LogEntryEdgeStates.test.tsx`
- [ ] T062 [P][US6][test] Component test asserting empty `rationale` hides the rationale icon and missing `execution_duration` omits the duration field in `shared/components/src/LogPanel/__tests__/LogEntryOptionalFields.test.tsx`
- [ ] T063 [P][US6][test] Component test asserting the empty-state message "No operations recorded yet." is rendered when `entries.length === 0` in `shared/components/src/LogPanel/__tests__/LogPanelEmptyState.test.tsx`
- [ ] T064 [P][US6][test] Component test asserting multiple track badges wrap onto a second line when the meta row overflows (uses CSS `flex-wrap`) in `shared/components/src/LogPanel/__tests__/LogEntryMultiTrack.test.tsx`

### Implementation for User Story 6

- [ ] T065 [US6] In `LogEntry.tsx`, branch the params row to render the muted-italic placeholder when parameters are empty or when `entry.kind === 'snapshot'` ("Manual checkpoint"), and skip the duration in the meta row for snapshots and missing duration in `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T066 [US6] In `LogEntry.tsx`, treat empty/whitespace-only `rationale` as absent (no rationale icon) in `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T067 [US6] In `LogPanel.tsx`, render the centred empty-state message from `strings.ts` when `entries.length === 0` in `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T068 [US6] Add CSS for `.log-panel__placeholder` (muted italic) and ensure `.log-panel__row--meta` uses `flex-wrap: wrap` so multiple track badges wrap gracefully in `shared/components/src/LogPanel/LogPanel.css`
- [ ] T069 [US6] Add Storybook stories for: unknown tool, no-parameters, snapshot, multi-track, and empty log in `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: All 6 user stories are independently demonstrable. The panel handles every documented edge case without errors.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting verification, accessibility audit, evidence capture, media content, and PR creation. Nothing here may start until Stories 1–6 are done.

### Cross-Cutting Verification

- [ ] T070 [P] Run full lint + typecheck + test suite (`task verify` or the four-step fallback in CLAUDE.md "Before Pushing"); fix any regression in `shared/components/src/LogPanel/`
- [ ] T071 [P] Accessibility audit pass (axe-core via Storybook addon or Playwright `@axe-core/playwright`) covering Rich Card story; record violations + fixes in `specs/176-log-panel-ux/evidence/a11y-audit.md`
- [ ] T072 [P] Performance smoke: render 100+ log entries in Storybook; capture frame stats and confirm no scroll lag in `specs/176-log-panel-ux/evidence/performance-smoke.md`

### Evidence Collection (REQUIRED)

- [ ] T073 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/176-log-panel-ux/evidence/test-summary.md` (must include YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`)
- [ ] T074 Create usage demonstration showing `<LogPanel>` host integration + sample timeline + expected rendered output in `specs/176-log-panel-ux/evidence/usage-example.md`
- [ ] T075 [P] Capture light-theme Storybook screenshot in `specs/176-log-panel-ux/evidence/screenshots/component-light.png`
- [ ] T076 [P] Capture dark-theme Storybook screenshot in `specs/176-log-panel-ux/evidence/screenshots/component-dark.png`
- [ ] T077 [P] Capture vscode-theme Storybook screenshot in `specs/176-log-panel-ux/evidence/screenshots/component-vscode.png`
- [ ] T078 Capture interaction GIF (< 5s, < 2MB) showing card selection + cycling all 4 view tabs in `specs/176-log-panel-ux/evidence/screenshots/interaction.gif`
- [ ] T079 [P] Capture disabled-state Storybook screenshot in `specs/176-log-panel-ux/evidence/screenshots/disabled-state.png`
- [ ] T080 [P] Capture edge-cases (unknown tool / no params / snapshot) Storybook screenshot in `specs/176-log-panel-ux/evidence/screenshots/edge-cases.png`

### E2E Evidence Collection (REQUIRED for UI components) 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T081 Run full component e2e suite: `pnpm --filter @debrief/components test:e2e LogPanel ParameterChip`
- [ ] T082 Document component e2e results (suite, passed/failed/skipped, screenshots referenced) in `specs/176-log-panel-ux/evidence/e2e-summary.md`

### VS Code Webview E2E Evidence Collection (REQUIRED) 🖥️

- [ ] T083 Run webview e2e: `xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts test-log-panel`
- [ ] T084 Capture webview workflow screenshots (panel open, tab switching) in `tests/e2e/evidence/176-log-panel/`
- [ ] T085 Document webview e2e results in `specs/176-log-panel-ux/evidence/webview-e2e-summary.md`

### Media Content

- [ ] T086 Spawn the Content Specialist (`.claude/agents/media/content.md`) and create the shipped blog post (What We Built / Screenshots / Lessons Learned / What's Next, referencing the captured screenshots + interaction GIF) in `specs/176-log-panel-ux/media/shipped-post.md`
- [ ] T087 [P] Create LinkedIn shipped summary (150–200 words, hook opening, link to full post) in `specs/176-log-panel-ux/media/linkedin-shipped.md`

### PR Creation

- [ ] T088 Create PR and publish blog: run `/speckit.pr`

**Task T088 must run last. It depends on every evidence (T070–T085) and media (T086–T087) task being complete; it both opens the feature PR in `debrief/debrief-future` and the cross-repo blog PR in `debrief.github.io`.**

---

## Dependencies

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately.
- **Phase 2 (Foundation)**: Depends on Phase 1. **Blocks all user-story phases** because every story consumes the new types, strings, and CSS variables from Phase 2.
- **Phase 3 (US1 — P1)**: Depends on Phase 2. Independently demonstrable.
- **Phase 4 (US2 — P1)**: Depends on Phase 2; integrates into the US1 card structure (T031 edits the same `LogEntry.tsx` file that US1 introduced — must run after T021).
- **Phase 5 (US3 — P2)**: Depends on Phase 2; cleanest after US1's `LogEntry.tsx` exists, but the selection mechanics are cross-cutting and can be developed against the foundational structure.
- **Phase 6 (US4 — P2)**: Depends on Phase 2. Removes `PresentationMode`, so coordinate with US1 changes to `LogEntry.tsx` (the `compact`/`detailed` modifier props in T051 share the file with US1's restructuring in T021 — sequence US1 before US4 to avoid merge churn).
- **Phase 7 (US5 — P3)**: Depends on Phase 2 and US1 (the disabled badge lives in the meta row introduced by US1).
- **Phase 8 (US6 — P3)**: Depends on Phase 2 and US1+US2 (edge-case rendering layered on top of full card + chip rendering).
- **Phase 9 (Polish)**: Depends on Stories 1–6 being complete. T088 (PR creation) is the very last task and depends on all other Polish tasks.

### User Story Order (recommended sequential walk)

1. **US1 (P1)** — Browse Analysis History  → unblocks the visual scaffold all other stories layer onto.
2. **US2 (P1)** — Parameter Chips  → tightly coupled to US1 cards.
3. **US4 (P2)** — View Mode Tabs  → take this before US3/US5/US6 because it removes `PresentationMode` and reshapes `LogEntry` props.
4. **US3 (P2)** — Card Selection.
5. **US5 (P3)** — Disabled Operations.
6. **US6 (P3)** — Edge Cases.

### Same-File Conflicts to Sequence

- `LogEntry.tsx` is touched by T021 (US1), T031 (US2), T038 (US3), T051 (US4), T057 (US5), T065/T066 (US6). Sequence stories per the order above; do not mark these tasks `[P]` across stories.
- `LogPanel.css` is touched by T012, T024, T032, T039, T052, T058, T068. Append-only edits within distinct selectors are mostly conflict-free, but treat as a coordination point.
- `LogPanel.stories.tsx` is touched by T023, T033, T055, T059, T069. Coordinate by story.

### Within Each User Story

- Tests written FIRST and asserted FAILING before implementation (project rule per CLAUDE.md).
- Sub-components (`ToolCategoryIcon`, `TrackBadge`, `ParameterChip`) before they're consumed by `LogEntry.tsx`.
- Storybook stories last in each story to demonstrate the result.

### Parallel Opportunities

- All `[P]` tasks within the same phase (different files, no shared writes).
- Phase 2 utilities (T005, T006, T007) and their tests (T009, T010, T011) can run fully in parallel after T004.
- US1, US2, US3 can in principle proceed in parallel by separate developers, but watch the `LogEntry.tsx` and `LogPanel.css` choke points.
- Polish-phase screenshot captures (T075–T080) are all `[P]` once stories are done.

---

## Implementation Strategy

### Incremental Delivery

1. **Land Foundation (Phases 1–2)** — types, strings, static config, utility functions, CSS scaffolding. CI green.
2. **Land US1 (P1)** — 3-row card anatomy, category icons, track badges, formatted timestamp + duration. The panel already looks like a "rich" panel even without chips. Demo in Storybook.
3. **Land US2 (P1)** — type-aware parameter chips with non-default markers. Now cards convey full operation context. Demo in Storybook.
4. **Land US4 (P2) before US3/US5/US6** — perform the `PresentationMode` deletion + 4-tab `LogActionBar` early so subsequent edits to `LogEntry.tsx` do not need rework. Update VS Code host (`logPanelView.ts`, `logPanel.tsx`).
5. **Land US3 (P2)** — card selection on top of the now-stable structure.
6. **Land US5 (P3)** — disabled-state visual treatment.
7. **Land US6 (P3)** — edge-case rendering polish + empty state.
8. **Polish (Phase 9)** — verify, capture evidence, write shipped post + LinkedIn summary, run `/speckit.pr`.

### Parallel Team Strategy

With multiple developers (after Phase 2 lands):

- **Developer A**: US1 → US4 → coordinates `LogEntry.tsx` and `LogPanel.css` integration.
- **Developer B**: US2 (sub-components: `ParameterChip`, `paramTypeInference`) — minimal collisions with A.
- **Developer C**: US3 + US5 + US6 — selection, disabled badge, and edge-case branches feed into A's `LogEntry.tsx`. Coordinate via PR review.

Polish phase is single-developer or split: evidence capture (T075–T080) is fully parallel; T088 must run last.

### Sequencing Rationale

The spec's six stories share two implementation focal points: `LogEntry.tsx` (the card) and `LogPanel.tsx` + `LogActionBar.tsx` (the chrome). Sequencing US4 before US3/US5/US6 minimises rework: removing `PresentationMode` and finalising the tabpanel layout once means the disabled-badge, selection, and edge-case branches in `LogEntry.tsx` only need to be written against the final structure. The independence of each story's *test* surface is preserved, even though their *source* surfaces overlap.

---

## Notes

- `[P]` = different files, no dependencies — safe to run in parallel.
- `[US#]` label maps each task to its user story for traceability.
- `[test]` label flags tasks that must FAIL before their implementation lands.
- Each user story remains independently demonstrable in Storybook even though source files overlap.
- Commit after each task or logical group; never skip lint/typecheck (run `task verify` before pushing).
- T088 (`/speckit.pr`) MUST be the final task — it depends on all evidence + media artefacts being in place.
