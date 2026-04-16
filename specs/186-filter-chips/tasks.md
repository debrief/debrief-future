# Tasks: Filter Bar Platform Chips

**Input**: Design documents from `/specs/186-filter-chips/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/*.md ✓, quickstart.md ✓
**Feature type**: UI Component (React component library under `shared/components/`)

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/186-filter-chips/evidence/`
**Media Directory**: `specs/186-filter-chips/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest + Playwright results (template at `.specify/templates/evidence/test-summary-template.md`) with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) and key scenarios verified | After Phases 3–6 complete |
| `evidence/usage-example.md` | Worked example: TypeScript snippet wiring `FilterBar` with a preset platform chip, showing chip label, filtered count, and emitted CQL2 JSON | After Story 1 complete |
| `evidence/screenshots/component-light.png` | Storybook "With Platform Chip" rendered in light theme | After Storybook story ships |
| `evidence/screenshots/component-dark.png` | Storybook "With Platform Chip" rendered in dark theme | After Storybook story ships |
| `evidence/screenshots/component-vscode.png` | Storybook "With Platform Chip" rendered in vscode theme | After Storybook story ships |
| `evidence/screenshots/interaction.gif` | < 5s GIF: click (+) → Platform → nationality=GB + domain=subsurface → confirm → filtered result | After Playwright E2E passes |
| `evidence/cql2-roundtrip-sample.json` | Real CQL2 JSON produced by a platform chip (mirrors `contracts/cql2-roundtrip.md`) | After Story 4 complete |
| `evidence/e2e-summary.md` | Playwright summary (rendering / themes / interactions) | After Polish E2E run |

### Media Content

| Artifact | Description | Status |
|----------|-------------|--------|
| `media/planning-post.md` | Blog post announcing the feature | ✅ Already drafted during `/speckit.plan` |
| `media/linkedin-planning.md` | LinkedIn summary for planning | ✅ Already drafted during `/speckit.plan` |
| `media/shipped-post.md` | Blog post celebrating completion | Created in Polish phase (Content Specialist agent) |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | Created in Polish phase (Content Specialist agent) |

### PR Creation

| Action | Description | When |
|--------|-------------|------|
| Feature PR (`debrief/debrief-future`) | PR with evidence, test summary, screenshots, and GIF | Final task (`/speckit.pr`) |
| Blog PR (`debrief.github.io`) | Cross-repo PR publishing `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure the development environment is ready. This feature introduces zero new runtime dependencies (per plan.md Constraints), so setup is minimal.

- [x] T001 Confirm clean working tree on branch `claude/speckit-task-186-ohOP7` and a fresh `pnpm install` at repo root `pnpm-lock.yaml`
- [x] T002 [P] Verify `@debrief/components` builds and its Storybook starts: `pnpm --filter @debrief/components storybook` (no code change) `shared/components/package.json`
- [x] T003 [P] Verify Playwright can launch with bundled Chromium: `node apps/web-shell/run-playwright.mjs --help` `apps/web-shell/run-playwright.mjs`

**Checkpoint**: Repo is installed, component library builds, Storybook runs, Playwright bundled browser is usable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend core types, constants, and the `FilterType` enum that every user story downstream relies on. These changes are additive and must land before any story can progress.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [x] T004 Extend `FilterType` with `'platform'` literal per contract `shared/components/src/filter-engine/types.ts`
- [x] T005 Extend `InputMethod` with `'compound'` literal per contract `shared/components/src/FilterBar/types.ts`
- [x] T006 Add `SimpleLozengeItem` / `PlatformLozengeItem` discriminated union with `shape: 'simple' | 'platform'` + `PlatformAttributes = Partial<Record<PlatformField, string>>` `shared/components/src/FilterBar/types.ts`
- [x] T007 Add three new reducer action types (`ADD_PLATFORM_LOZENGE`, `EDIT_PLATFORM_LOZENGE`, `ADD_CHILD_PLATFORM_LOZENGE`) to `FilterBarAction` union `shared/components/src/FilterBar/types.ts`
- [x] T008 [P] Add `FILTER_TYPE_OPTIONS` entry `{ type: 'platform', label: 'Platform', inputMethod: 'compound' }` and platform-specific UI strings (attribute labels, hint text, empty-state copy) `shared/components/src/FilterBar/constants.ts`
- [x] T009 [P] Extend `getFilterTypeLabel` to return `'Platform'` for the new filter type `shared/components/src/FilterBar/constants.ts`
- [x] T010 Extend `DistinctValuesMap` to include a `platform` sub-object (`nationality | domain | vessel_role | vessel_type` arrays) per contract `shared/components/src/FilterBar/useDistinctValues.ts`
- [x] T011 [P] Ensure existing consumers of `LozengeItem.value` narrow on `item.shape === 'simple'` (compile-time sweep — fix any call sites revealed by `tsc --noEmit`) `shared/components/src/FilterBar/*.tsx`

**Checkpoint**: Types compile cleanly under `strict: true`; `pnpm --filter @debrief/components typecheck` green. User-story phases may now proceed in parallel.

---

## Phase 3: User Story 1 — Build a compound "same platform" chip (Priority: P1)

**Goal**: An analyst can open the add-filter menu, pick "Platform", select a subset of attributes (e.g. `nationality=GB`, `domain=subsurface`), and confirm a single chip that filters the catalog to plots where *the same platform record* satisfies all selected attributes.

**Independent Test**: Using the catalog fixture containing (a) a plot with a British frigate, (b) a plot with a German frigate + British surface ship, (c) a plot with a British submarine — a chip `{nationality: 'GB', vessel_role: 'frigate'}` returns only (a). Verifiable from the new Storybook story with no other chips active.

### Unit tests for User Story 1 ⚠️ (write first, ensure they FAIL)

> Mapping: test IDs (U##) trace to `contracts/test-list.md`.

- [x] T012 [P] [US1][test] U1 — `ADD_PLATFORM_LOZENGE {nationality:'GB'}` appends a `shape:'platform'` lozenge with correct attributes `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T013 [P] [US1][test] U2 — reducer no-ops on `ADD_PLATFORM_LOZENGE` with empty attributes; helper `addPlatformLozenge` refuses to dispatch `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T014 [P] [US1][test] U9 — `toFilterExpression` maps single-attribute lozenge to one `ArrayFilterPredicate` with bare `comparison` `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T015 [P] [US1][test] U10 — `toFilterExpression` maps two-attribute lozenge to `ArrayFilterPredicate` with `and` of two comparisons `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T016 [P] [US1][test] U14 + U15 — `computeDistinctValues` produces `platform` sub-object with de-duplicated sorted arrays for each supported attribute `shared/components/src/FilterBar/__tests__/useDistinctValues.test.ts`
- [x] T017 [P] [US1][test] U16 — empty-catalogue distinct-values returns empty platform arrays `shared/components/src/FilterBar/__tests__/useDistinctValues.test.ts`
- [x] T018 [P] [US1][test] U17 — `PlatformValueEditor` renders one picker per supported attribute (nationality, domain, vessel_role, vessel_type, vessel_class) `shared/components/src/FilterBar/__tests__/PlatformValueEditor.test.tsx`
- [x] T019 [P] [US1][test] U18 — confirm button disabled until at least one attribute has a value `shared/components/src/FilterBar/__tests__/PlatformValueEditor.test.tsx`
- [x] T020 [P] [US1][test] U22 + U23 — Escape key and click-outside both call `onCancel` `shared/components/src/FilterBar/__tests__/PlatformValueEditor.test.tsx`
- [x] T021 [P] [US1][test] U31 — `filterExpressionToCql2Json` of one platform lozenge produces exactly one `array_filter` node with documented shape `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [x] T022 [P] [US1][test] U36 + U37 — integration: platform chip against fixture catalog returns only the item whose *same* platform satisfies all conditions `shared/components/src/FilterBar/__tests__/integration.test.ts`
- [x] T023 [P] [US1][test] U42 + U43 — "Platform" entry appears in filter-type menu; selecting it opens `PlatformValueEditor` `shared/components/src/FilterBar/__tests__/FilterBar.test.tsx`
- [x] T024 [P] [US1][test] U44 + U45 — `onFilteredItems` and `onExpressionChange` fire with correct subset + `arrayFilters` payload `shared/components/src/FilterBar/__tests__/FilterBar.test.tsx`

### E2E tests for User Story 1 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [x] T025 [US1][test] E1 — Playwright test: click (+) → Platform → pick nationality=GB → pick domain=subsurface → confirm → chip appears + filtered count correct `shared/components/e2e/FilterBar.spec.ts`
- [x] T026 [P] [US1][test] E7 — Theme variants snapshot (light, dark, vscode) for the "With Platform Chip" story `shared/components/e2e/FilterBar.spec.ts`

### Implementation for User Story 1

- [x] T027 [US1] Implement `PlatformValueEditor` component (popover, per-attribute pickers — reuse `SearchableCascadingMenu` for `vessel_class`, flat dropdowns for the rest, confirm/cancel buttons, Escape/click-outside closure) `shared/components/src/FilterBar/PlatformValueEditor.tsx`
- [x] T028 [US1] Extend `useDistinctValues` / `computeDistinctValues` to emit the `platform` sub-object over `items[*].debrief:platforms` (dedupe + locale-sort) `shared/components/src/FilterBar/useDistinctValues.ts`
- [x] T029 [US1] Extend `useFilterBar` reducer with `ADD_PLATFORM_LOZENGE` branch (appends `{kind:'lozenge', shape:'platform', …}` at top level; rejects empty attributes) and add `addPlatformLozenge` helper `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T030 [US1] Extend `useFilterBar.toFilterExpression` to emit one `ArrayFilterPredicate` per platform lozenge (single-comparison shortcut; AND wrap when ≥2 attributes) `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T031 [US1] Wire `FilterBar` to open `PlatformValueEditor` (not `ValueEditor`) when `filterType === 'platform'` is selected from the add-filter menu `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T032 [US1] Dispatch from `ValueEditor` or parallel state so the platform branch never lands in the simple editor (preferred: keep editors independent — see contract §Consumers) `shared/components/src/FilterBar/ValueEditor.tsx`
- [x] T033 [US1] Render platform chip label in `Lozenge` ordered (nationality → domain → vessel_role → vessel_type → vessel_class), resolving `vessel_class` via `resolveTaxonomyLabel` `shared/components/src/FilterBar/Lozenge.tsx`
- [x] T034 [US1] Add distinguishing icon + tint for platform chips (additive styling only — no regression to #127 visual snapshots) `shared/components/src/FilterBar/Lozenge.css`
- [x] T035 [US1] Add Storybook story *"With Platform Chip"* with preset compound chip + a small fixture catalog that demonstrates the joined-query result set `shared/components/src/FilterBar/FilterBar.stories.tsx`
- [x] T036 [US1] Run unit + integration suite and confirm all P1 tests green: `pnpm --filter @debrief/components test`

**Checkpoint**: User Story 1 is fully functional — analyst can build a compound platform chip and see correctly filtered results in Storybook. All U1/U2/U9/U10/U14–U18/U22/U23/U31/U36/U37/U42–U45 and E1/E7 pass. Story 1 is independently demoable.

---

## Phase 4: User Story 2 — Edit, negate, and remove a platform chip (Priority: P1)

**Goal**: A platform chip supports the full chip lifecycle: click-to-edit (with pre-filled editor), toggle-negate ("NOT a British submarine"), and remove. Editing preserves the chip's identity (UUID + position) and only replaces its compound predicate.

**Independent Test**: Build a platform chip `{nationality:'GB', vessel_role:'frigate'}`. Click the chip, change nationality to US, confirm — label and results update. Toggle negation — result set inverts. Remove — results return to baseline.

### Unit tests for User Story 2 ⚠️ (write first, ensure they FAIL)

- [x] T037 [P] [US2][test] U3 — `EDIT_PLATFORM_LOZENGE` replaces attributes without changing id or position `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T038 [P] [US2][test] U4 — `TOGGLE_NEGATE` on a platform lozenge flips `negated` without mutating `attributes` `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T039 [P] [US2][test] U5 — `REMOVE_LOZENGE` removes a platform lozenge by id `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T040 [P] [US2][test] U11 — `toFilterExpression` preserves `negated` from the lozenge to the `ArrayFilterPredicate` `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T041 [P] [US2][test] U19 — clearing an attribute picker removes that attribute from the confirmed map `shared/components/src/FilterBar/__tests__/PlatformValueEditor.test.tsx`
- [x] T042 [P] [US2][test] U20 — `PlatformValueEditor` pre-fills from `initialAttributes` in edit mode `shared/components/src/FilterBar/__tests__/PlatformValueEditor.test.tsx`
- [x] T043 [P] [US2][test] U21 — Cancel closes the editor without calling `onConfirm` `shared/components/src/FilterBar/__tests__/PlatformValueEditor.test.tsx`
- [x] T044 [P] [US2][test] U27 — Platform chip with `negated:true` shows NOT prefix `shared/components/src/FilterBar/__tests__/Lozenge.test.tsx`
- [x] T045 [P] [US2][test] U28 — clicking platform chip body opens `PlatformValueEditor` (not the simple `ValueEditor`) `shared/components/src/FilterBar/__tests__/Lozenge.test.tsx`
- [x] T046 [P] [US2][test] U29 — platform chip remove button dispatches `REMOVE_LOZENGE` `shared/components/src/FilterBar/__tests__/Lozenge.test.tsx`

### E2E tests for User Story 2 🎭

- [x] T047 [P] [US2][test] E2 — Playwright: click chip → change nationality to US → confirm → label + filtered count update `shared/components/e2e/FilterBar.spec.ts`
- [x] T048 [P] [US2][test] E3 — Playwright: negate chip → NOT shown → result set flips `shared/components/e2e/FilterBar.spec.ts`
- [x] T049 [P] [US2][test] E4 — Playwright: editor blocks confirm with zero attributes `shared/components/e2e/FilterBar.spec.ts`
- [x] T050 [P] [US2][test] E5 — Playwright: remove chip → filter bar returns to baseline `shared/components/e2e/FilterBar.spec.ts`

### Implementation for User Story 2

- [x] T051 [US2] Extend `useFilterBar` reducer with `EDIT_PLATFORM_LOZENGE` branch (replaces attributes, preserves id + position + negation flag) and add `editPlatformLozenge` helper `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T052 [US2] Ensure existing `TOGGLE_NEGATE` reducer branch narrows correctly over the union and preserves `shape: 'platform'` (data-model.md state transitions) `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T053 [US2] Ensure existing `REMOVE_LOZENGE` branch works unchanged for platform chips (verify via U5 test) `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T054 [US2] Wire `Lozenge` click-to-edit: open `PlatformValueEditor` pre-filled with current `attributes` and dispatch `EDIT_PLATFORM_LOZENGE` on confirm `shared/components/src/FilterBar/Lozenge.tsx`
- [x] T055 [US2] Ensure `Lozenge` renders `NOT` prefix for negated platform chips using the same visual treatment as simple chips `shared/components/src/FilterBar/Lozenge.tsx`
- [x] T056 [US2] Run unit + E2E suites and confirm all P1-lifecycle tests green: `pnpm --filter @debrief/components test` + `pnpm --filter @debrief/components test:e2e FilterBar`

**Checkpoint**: Stories 1 AND 2 both work independently. Analyst can build, edit, negate, and remove a platform chip with parity to existing chip types.

---

## Phase 5: User Story 3 — Combine platform chips with existing chips and OR containers (Priority: P2)

**Goal**: Platform chips compose with other chip types using the filter bar's existing top-level-AND / OR-container-OR semantics. A platform chip can be dragged into an OR container and back out. Two platform chips inside an OR produce "either/or" behaviour; two at top level produce "both" behaviour.

**Independent Test**: In Storybook, build one platform chip + one tag chip — both AND. Drag both into an OR container — items match either. Drag one out — back to AND. All three configurations produce the expected result sets on the fixture catalog.

### Unit tests for User Story 3 ⚠️ (write first, ensure they FAIL)

- [x] T057 [P] [US3][test] U6 — `ADD_CHILD_PLATFORM_LOZENGE` appends a platform lozenge inside an OR container `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T058 [P] [US3][test] U7 — `MOVE_TO_CONTAINER` moves a platform lozenge from top level into an OR container `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T059 [P] [US3][test] U8 — `MOVE_TO_TOP_LEVEL` moves a platform lozenge out of an OR container `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T060 [P] [US3][test] U12 — Platform lozenges inside an OR container produce a single OR group in the output expression `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T061 [P] [US3][test] U30 — Platform chip is draggable with the same dnd-kit setup as simple chips `shared/components/src/FilterBar/__tests__/Lozenge.test.tsx`
- [x] T062 [P] [US3][test] U38 — integration: two top-level platform chips AND together → only items matching both `shared/components/src/FilterBar/__tests__/integration.test.ts`
- [x] T063 [P] [US3][test] U39 — integration: two platform chips in an OR container → items matching either `shared/components/src/FilterBar/__tests__/integration.test.ts`
- [x] T064 [P] [US3][test] U40 — integration: negated platform chip excludes matching items AND includes items with empty `debrief:platforms` `shared/components/src/FilterBar/__tests__/integration.test.ts`
- [x] T065 [P] [US3][test] U41 — integration: platform chip `vessel_role:'frigate'` matches `type23` via taxonomy expansion (verifies delegation to #185 through the FilterBar entry point) `shared/components/src/FilterBar/__tests__/integration.test.ts`
- [x] T066 [P] [US3][test] U46 — component: platform chip alongside tag chip ANDs correctly `shared/components/src/FilterBar/__tests__/FilterBar.test.tsx`

### E2E tests for User Story 3 🎭

- [x] T067 [P] [US3][test] E6 — Playwright: drag platform chip into OR container and out again `shared/components/e2e/FilterBar.spec.ts`

### Implementation for User Story 3

- [x] T068 [US3] Extend `useFilterBar` reducer with `ADD_CHILD_PLATFORM_LOZENGE` branch (appends platform lozenge inside an existing OR container by id) and add `addChildPlatformLozenge` helper `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T069 [US3] Widen `MOVE_TO_CONTAINER` and `MOVE_TO_TOP_LEVEL` reducer branches to accept `PlatformLozengeItem` (union-safe narrowing; no new logic) `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T070 [US3] Extend `toFilterExpression` to group platform lozenges that share an OR container into a single OR group of `ArrayFilterPredicate`s (delegating to the same path as simple chips in ORs) `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T071 [US3] Ensure `OrContainer.tsx` widens its child rendering to the new `LozengeItem` union (pure type widening — dnd-kit props stay the same) `shared/components/src/FilterBar/OrContainer.tsx`
- [x] T072 [US3] Extend the OR-container story to demonstrate "British submarines OR German frigates" using two platform chips `shared/components/src/FilterBar/FilterBar.stories.tsx`
- [x] T073 [US3] Run composition test suite and confirm all US3 tests green: `pnpm --filter @debrief/components test`

**Checkpoint**: Stories 1, 2, AND 3 all work independently. Platform chips compose correctly with every other chip type and with the OR container.

---

## Phase 6: User Story 4 — Re-open a saved filter that contains a platform chip (Priority: P3)

**Goal**: A filter configuration containing a platform chip saves and restores losslessly: the restored bar shows the same chip with the same attributes, produces the identical filtered item set, and emits identical CQL2 JSON. Pre-feature saved filters (simple chips only) continue to restore correctly.

**Independent Test**: Build a filter with one platform chip + one simple chip, save it (#128 flow), clear the bar, restore — attributes, negation, filtered item IDs, and emitted CQL2 JSON are identical.

### Unit tests for User Story 4 ⚠️ (write first, ensure they FAIL)

- [x] T074 [P] [US4][test] U13 — `SET_STATE` restore of a pre-feature saved filter (no `shape` field) coerces all lozenges to `shape:'simple'` (backwards compatibility) `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T075 [P] [US4][test] U32 — deserialise a FilterBar-emitted CQL2 JSON → reconstructs the same platform lozenge attributes `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [x] T076 [P] [US4][test] U33 — deserialise an `array_filter` with OR sub-predicate → restore declines (throws or returns error), no lozenge produced `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [x] T077 [P] [US4][test] U34 — deserialise an `array_filter` with unknown field → restore declines `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [x] T078 [P] [US4][test] U35 — deserialise negation wrapper around `array_filter` → platform lozenge with `negated:true` `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [x] T079 [P] [US4][test] U47 — pre-feature saved filter containing only simple chips restores correctly (no regression against #127/#128 fixtures) `shared/components/src/FilterBar/__tests__/FilterBar.test.tsx`

### E2E tests for User Story 4 🎭

- [x] T080 [P] [US4][test] E8 — Playwright: save filter with platform chip → clear → restore → attributes identical `shared/components/e2e/SavedFilters.spec.ts`
- [x] T081 [P] [US4][test] E9 — Playwright: CQL2 JSON emitted before save equals CQL2 JSON emitted after restore `shared/components/e2e/SavedFilters.spec.ts`

### Implementation for User Story 4

- [x] T082 [US4] Extend `cql2-json.ts` deserialiser to detect `array_filter(debrief:platforms, predicate)` and reconstruct a `shape:'platform'` lozenge; flatten single-`comparison` or AND-of-comparisons predicates into `PlatformAttributes`; throw on OR / nested AND / unknown fields `shared/components/src/filter-engine/cql2-json.ts`
- [x] T083 [US4] Route deserialisation errors through the existing `FILTER_ERROR_MESSAGE` banner (partial-restore log) — no silent drops per Constitution I.3 `shared/components/src/FilterBar/useSavedFilters.ts`
- [x] T084 [US4] Add `shape:'simple'` coercion for any `kind:'lozenge'` entry missing `shape` in the restore hook (no version bump; forward-compatible) `shared/components/src/FilterBar/useSavedFilters.ts`
- [x] T085 [US4] Add a Storybook story "Platform chip round-trip" in `SavedFilters.stories.tsx` that demonstrates save → clear → restore with a platform chip `shared/components/src/FilterBar/SavedFilters.stories.tsx`
- [x] T086 [US4] Run round-trip test suite and confirm all US4 tests green: `pnpm --filter @debrief/components test`

**Checkpoint**: All four user stories are independently functional. Saved filters round-trip losslessly; pre-feature saved filters still restore cleanly.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Regression gates, documentation, evidence collection, media content, and PR creation. No new feature work lands here.

### Regression & Performance

- [x] T087 [P][test] P1 — Performance check: filtering 500 items with one active platform chip completes within the existing FilterBar envelope (baseline from #127) `shared/components/src/FilterBar/__tests__/performance.test.ts`
- [x] T088 [test] P2 — Full pre-existing filter-bar unit + E2E suite passes unchanged (regression against #127/#128 fixtures): `pnpm --filter @debrief/components test && pnpm --filter @debrief/components test:e2e`
- [x] T089 Run the complete CI check from repo root per CLAUDE.md "Before Pushing": `task verify` (or the four-step fallback)

### Documentation

- [x] T090 [P] Add CHANGELOG entry summarising the new platform chip, the additive `FilterType` / `LozengeItem` changes, and the pre-v4.0.0 backwards-loadable migration `CHANGELOG.md`
- [x] T091 [P] Cross-link this feature from the FilterBar README / MIGRATION notes so consumers discover the new chip `shared/components/src/FilterBar/README.md`

### Evidence Collection (REQUIRED)

- [x] T092 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) and a narrative of key scenarios verified `specs/186-filter-chips/evidence/test-summary.md`
- [x] T093 Create usage demonstration: minimal TypeScript snippet wiring FilterBar with a preset platform chip + expected chip label + filtered-count + emitted CQL2 JSON `specs/186-filter-chips/evidence/usage-example.md`
- [x] T094 [P] Capture Storybook light-theme screenshot of "With Platform Chip" story `specs/186-filter-chips/evidence/screenshots/component-light.png`
- [x] T095 [P] Capture Storybook dark-theme screenshot of "With Platform Chip" story `specs/186-filter-chips/evidence/screenshots/component-dark.png`
- [x] T096 [P] Capture Storybook vscode-theme screenshot of "With Platform Chip" story `specs/186-filter-chips/evidence/screenshots/component-vscode.png`
- [x] T097 Capture interaction GIF (< 5s, < 2MB) of the primary user flow (open menu → Platform → nationality=GB + domain=subsurface → confirm → filtered result) via Playwright `recordVideo` and ffmpeg conversion `specs/186-filter-chips/evidence/screenshots/interaction.gif`
- [x] T098 [P] Capture a live CQL2 round-trip sample (serialise + parse of a real platform chip) for direct comparison with `contracts/cql2-roundtrip.md` `specs/186-filter-chips/evidence/cql2-roundtrip-sample.json`
- [x] T099 Document Playwright E2E results (pass/fail per suite + captured screenshot list) `specs/186-filter-chips/evidence/e2e-summary.md`

### Media Content

- [x] T100 Create shipped blog post via the Content Specialist agent (`.claude/agents/media/content.md`): What We Built / Screenshots / Lessons Learned / What's Next `specs/186-filter-chips/media/shipped-post.md`
- [x] T101 [P] Create LinkedIn shipped summary (150–200 words, hook opening, links to full post) via the Content Specialist agent `specs/186-filter-chips/media/linkedin-shipped.md`

### PR Creation

- [x] T102 Create PR and publish blog: run `/speckit.pr`

**Task T102 must run last. It depends on every evidence and media task (T092–T101) being complete, and it creates both the feature PR in `debrief/debrief-future` and the cross-repo blog PR in `debrief.github.io`.**

---

## Dependencies

### Phase dependencies

- **Phase 1 (Setup)** — no dependencies; can start immediately.
- **Phase 2 (Foundational)** — depends on Phase 1; **BLOCKS every user story**. Type extensions (`FilterType`, `LozengeItem` union, `FilterBarAction`, `DistinctValuesMap`, constants) must land before any reducer / editor / renderer can compile.
- **Phase 3 (US1, P1)** — depends on Phase 2. Delivers the core compound chip end-to-end.
- **Phase 4 (US2, P1)** — depends on Phase 2 for types; can proceed in parallel with Phase 3 for reducer branches and Lozenge rendering, but the shared `PlatformValueEditor` lands in Phase 3 and is reused by Phase 4 (click-to-edit). Sequential execution is simplest.
- **Phase 5 (US3, P2)** — depends on Phase 3 (needs `PlatformLozengeItem` + `toFilterExpression` changes landed) before the OR-container branches work. Can proceed in parallel with Phase 4.
- **Phase 6 (US4, P3)** — depends on Phase 3 for the emission path (need a CQL2 JSON to round-trip first); independent of Phases 4 and 5 for unit tests.
- **Phase 7 (Polish)** — depends on all four user-story phases. T087–T088 (regression) must pass before T092 (test summary capture). T102 (`/speckit.pr`) is the final task.

### Within each user-story phase

- All tests marked `[test]` (and every `[P][test]` task) MUST be written and MUST FAIL before any implementation task in the same phase starts (Constitution VII).
- Reducer changes precede editor / renderer changes.
- Storybook story lands alongside the renderer — Playwright E2E depends on it.
- Each phase ends with a green unit + (where applicable) E2E run before the next phase starts.

### Parallel opportunities

- **Phase 1**: T002 and T003 are independent.
- **Phase 2**: T008, T009, T011 are independent of each other (different files or distinct logical surfaces).
- **Phase 3 tests**: T012–T024 all run in parallel — each touches a distinct test file or a distinct `describe` block.
- **Phase 3 E2E**: T025 and T026 are independent Playwright specs.
- **Phase 4 tests**: T037–T046 in parallel; E2E T047–T050 in parallel.
- **Phase 5 tests**: T057–T066 in parallel; Lozenge dnd test (T061) independent of integration tests (T062–T065).
- **Phase 6 tests**: T074–T079 in parallel; E2E T080–T081 in parallel.
- **Phase 7**: Regression (T087) can run in parallel with documentation (T090–T091). Evidence screenshots (T094–T096) and round-trip sample (T098) run in parallel once screenshots are available. Shipped blog + LinkedIn (T100–T101) run in parallel.

### External dependencies (already complete per spec.md)

- **#127** FilterBar lozenge UI — provides chip infrastructure reused as-is.
- **#128** Saved filter configurations — provides persistence path for Story 4.
- **#181** LinkML `debrief:platforms` shape — provides the data surface queried.
- **#185** CQL2 `array_filter` evaluator + serialiser — consumed as-is; this feature adds no engine code.

---

## Implementation Strategy

### Incremental delivery

1. **Setup (Phase 1)** — confirm environment, Storybook, Playwright bundled Chromium work. No code changes.
2. **Foundation (Phase 2)** — land the additive type changes (`FilterType`, `LozengeItem` union, `FilterBarAction`, `DistinctValuesMap`, constants). Compile-clean under `strict: true`. Merge-safe on its own: existing simple chips continue to work.
3. **Story 1 (Phase 3)** — demoable milestone. Analyst can build a compound platform chip and see correctly filtered results in the Storybook "With Platform Chip" story. This is the headline capability and unblocks stakeholder review.
4. **Story 2 (Phase 4)** — parity milestone. Platform chip gains edit / negate / remove lifecycle.
5. **Story 3 (Phase 5)** — composition milestone. Platform chips compose with tag / duration / etc. chips and with the OR container.
6. **Story 4 (Phase 6)** — durability milestone. Saved filters containing platform chips round-trip losslessly; pre-feature saved filters still restore.
7. **Polish (Phase 7)** — regression, evidence, media, PR.

### Test-first discipline (per Constitution VII)

Every unit / integration / E2E task in a story-phase is written **before** its corresponding implementation task, must FAIL before implementation lands, and must PASS once implementation lands. The tests in `contracts/test-list.md` are the authoritative checklist; every U## and E## identifier appears on a task in this file.

### Parallel team strategy

With two or more developers:

1. Developer A lands Phase 2 (types) — blocks everyone.
2. Once Phase 2 is green, Developer A takes Phase 3 (Story 1 — compound chip); Developer B takes Phase 4 (Story 2 — lifecycle) in parallel, using the types from Phase 2 and coordinating on `Lozenge.tsx` via atomic edits.
3. After Story 1 lands, Developer B (or C) takes Phase 5 (OR composition) in parallel with Developer A on Phase 6 (round-trip).
4. Polish phase is a single-developer task: regression + evidence + media + PR.

### Risk controls

- No new runtime dependencies (plan.md Constraints). Any attempt to add one fails lint/review.
- Additive-only styling on `Lozenge.css` — no mutation of existing tokens — to preserve #127 visual snapshots.
- Pre-v4.0.0 per Constitution XIV: the extended `LozengeItem` shape is a breaking change to saved filters, but the backwards-loadable `shape: 'simple'` coercion (T084 / U13) keeps the spirit of "no silent failures".
- CQL2 round-trip declines lossy shapes (OR sub-predicate, nested AND, unknown field) via explicit restore errors (T083 / U33 / U34) rather than silent drop.
