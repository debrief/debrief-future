# Tasks: Sensor-Aware Track Rendering in the Layers Panel

**Input**: Design documents from `/specs/179-sensor-aware-layers-rendering/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests (Vitest) included for all four cases + edge cases. Storybook E2E tests (Playwright) included for the new `TracksWithSensors` story across three theme variants.

**Organization**: US1 (P1) is the core implementation — it builds the four-case dispatcher, all new row kinds, and the Storybook story. US2-US4 are verification-only phases that confirm selection, visibility, and compound-track symmetry work correctly against the US1 implementation. No additional code changes needed for US2-US4 — they ride on existing `handleRowClick`, `hiddenIds`, and `hasChildSelected` wiring.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/179-sensor-aware-layers-rendering/evidence/`
**Media Directory**: `specs/179-sensor-aware-layers-rendering/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results summary | After all tests pass |
| usage-example.md | Storybook walkthrough of Cases A-D | After stories complete |
| screenshots/component-light.png | TracksWithSensors story, light theme | After E2E tests pass |
| screenshots/component-dark.png | TracksWithSensors story, dark theme | After E2E tests pass |
| screenshots/component-vscode.png | TracksWithSensors story, vscode theme | After E2E tests pass |
| screenshots/interaction.gif | Expand track → sensors → contacts flow | After E2E tests pass |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (complete) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (complete) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create evidence directory and confirm clean baseline before changes

- [ ] T001 Create evidence directories `specs/179-sensor-aware-layers-rendering/evidence/screenshots/`
- [ ] T002 Run `task verify` to confirm clean baseline before changes

**Checkpoint**: Baseline confirmed clean — ready to begin foundational changes

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Extend the `DisplayItem` type system, add formatting helpers, and update course padding — all three block every user story

- [ ] T003 Extend `DisplayItemType` union with `'group' | 'sensor' | 'contact'` values `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T004 [P] Add `formatBearing` helper for zero-padded 3-digit bearings with ambiguous slash-separated format `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T005 [P] Update `getPositionSublabel` to zero-pad course to 3 digits via `.padStart(3, '0')` (FR-018) `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T006 [P] Add `SensorData` and `SensorContact` to the import list from `../utils/types` or `@debrief/schemas` `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T007 [test] Update existing course-format assertions in tests to expect zero-padded values `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T008 Run `pnpm --filter @debrief/components test` to confirm existing tests pass with course-format refresh

**Checkpoint**: Foundation ready — new types and helpers available, existing tests green with refreshed assertions

---

## Phase 3: User Story 1 — Analyst verifies a freshly imported track carries sensor data (Priority: P1)

**Goal**: When a track has embedded sensors, expanding it shows `Positions (N)` + `Sensors (N)` group rows (Case C), or `Track Segments (N)` + `Sensors (N)` (Case D). Expanding a sensor shows individual contacts with formatted time and zero-padded bearing. Case A (no sensors) is unchanged.

**Independent Test**: Load fixture tracks for all 4 cases into the `TracksWithSensors` Storybook story. Expand each track and verify the correct group rows, sensor rows, and contact rows appear with proper labels and sublabels.

### Tests for User Story 1

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation

- [ ] T009 [P][test] Case A: simple track renders positions as direct children (unchanged except course padding) `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T010 [P][test] Case A: track with empty `sensors: []` falls through to Case A `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T011 [P][test] Case B: compound track gets `Track Segments (N)` wrapper at depth 1 `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T012 [P][test] Case C: track with sensors gets `Positions (N)` + `Sensors (N)` groups at depth 1 `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T013 [P][test] Case D: compound track with sensors gets `Track Segments (N)` + `Sensors (N)` groups `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T014 [P][test] Sensor rows use `name` as label and `"N contacts"` as sublabel `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T015 [P][test] Contact rows show zero-padded bearing sublabel (e.g. `045°`) `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T016 [P][test] Ambiguous bearing renders as single contact row with `"045° / 225°"` sublabel `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T017 [P][test] Zero-contact sensor shows `"0 contacts"` sublabel and `"No contacts"` placeholder on expand `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T018 [P][test] Group row labels include count in parentheses `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T019 [P][test] Contact rows render in input order (no sort applied) `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T020 [P][test] Sensor row IDs stable under `SensorData[]` reordering (keyed by name, not index) `shared/components/src/FeatureList/flattenFeatures.test.ts`

### Implementation for User Story 1

- [ ] T021 [US1] Implement four-case dispatcher in `flattenTrackChildren` based on `(hasSensors, segmentCount)` `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T022 [US1] Implement `flattenSensors` helper: emits sensor rows, each expandable to contacts `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T023 [US1] Implement `flattenContacts` helper: emits contact rows with `formatBearing`, handles zero-contact placeholder `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T024 [US1] Add `'contact'` to the info-icon type-check predicate in FeatureRow (FR-017) `shared/components/src/FeatureList/FeatureRow.tsx`
- [ ] T025 [US1] Create test fixtures: tracks for Cases A/B/C/D + edge cases (empty sensors, zero contacts, ambiguous bearing, large sensor) `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T026 [US1] Add `TracksWithSensors` Storybook story with all fixture tracks `shared/components/src/FeatureList/FeatureList.stories.tsx`
- [ ] T027 [US1] Run `pnpm --filter @debrief/components test` to confirm all unit tests pass

**Checkpoint**: All four cases render correctly; sensor/contact/group rows appear with correct labels, depths, and IDs. Info icon plumbed to contact rows.

---

## Phase 4: User Story 2 — Analyst selects sensors, contacts, and group rows (Priority: P2)

**Goal**: Clicking a sensor row, contact row, or group row adds exactly one path ID to `selectedIds`. `hasChildSelected` propagates through the new path scheme without modification.

**Independent Test**: In `FeatureList.test.tsx`, simulate clicks on sensor/contact/group rows and verify `onSelectionChange` receives exactly the clicked row's path ID.

### Tests for User Story 2

- [ ] T028 [P][test] Clicking a group row selects only the group path ID (no fan-out) `shared/components/src/FeatureList/FeatureList.test.tsx`
- [ ] T029 [P][test] Clicking a contact row selects only that contact's path ID `shared/components/src/FeatureList/FeatureList.test.tsx`
- [ ] T030 [P][test] `hasChildSelected` propagates: contact selected → parent sensor → parent Sensors group → parent track `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T031 [US2] Run `pnpm --filter @debrief/components test` to confirm selection tests pass

**Checkpoint**: Selection works for all new row kinds — no implementation changes required (rides on existing `handleRowClick`)

---

## Phase 5: User Story 3 — Analyst toggles visibility of individual sensors (Priority: P2)

**Goal**: Adding a sensor or contact path to `hiddenIds` renders the row with the hidden visual state. The existing `hiddenIds` mechanism extends to new row types for free.

**Independent Test**: In `FeatureList.test.tsx`, render a FeatureList with a sensor row's path in `hiddenIds` and verify the row renders with the hidden-state CSS class.

### Tests for User Story 3

- [ ] T032 [P][test] Sensor row in `hiddenIds` renders with hidden state `shared/components/src/FeatureList/FeatureList.test.tsx`
- [ ] T033 [P][test] Contact row in `hiddenIds` renders with hidden state `shared/components/src/FeatureList/FeatureList.test.tsx`
- [ ] T034 [US3] Run `pnpm --filter @debrief/components test` to confirm visibility tests pass

**Checkpoint**: Visibility toggles work for sensor and contact rows — no implementation changes required

---

## Phase 6: User Story 4 — Compound-track symmetry (Priority: P3)

**Goal**: All four cases (A/B/C/D) render coherently. Case B (no sensors, multiple segments) shows a `Track Segments` wrapper matching the symmetry of Case D.

**Independent Test**: In the `TracksWithSensors` story, expand each of the four case fixtures and verify the visual tree matches the case table in the spec.

### Verification for User Story 4

- [ ] T035 [US4] Verify Case B fixture in `TracksWithSensors` story renders `Track Segments (N)` wrapper with segments at depth 2
- [ ] T036 [US4] Verify Case D fixture renders both `Track Segments (N)` and `Sensors (N)` as sibling groups at depth 1

**Checkpoint**: All four cases verified — consistent visual hierarchy

---

## Phase 7: E2E Testing

**Purpose**: Automated Playwright tests covering the `TracksWithSensors` story across theme variants

> **PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

### Storybook E2E Tests

- [ ] T037 [P] Create Playwright test for TracksWithSensors story: expand track → verify group rows appear `shared/components/e2e/FeatureList.spec.ts`
- [ ] T038 [P] Add theme variant tests (light, dark, vscode) with screenshots captured to evidence `shared/components/e2e/FeatureList.spec.ts`
- [ ] T039 [P] Add interaction test: expand Sensors → expand sensor → verify contact rows `shared/components/e2e/FeatureList.spec.ts`
- [ ] T040 Capture interaction GIF showing expand track → sensors → contacts flow `specs/179-sensor-aware-layers-rendering/evidence/screenshots/interaction.gif`
- [ ] T041 Run Storybook E2E suite: `pnpm --filter @debrief/components test:e2e FeatureList`

**Checkpoint**: E2E tests pass — automated visual evidence captured for all themes

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, CI verification, and PR creation

### Final Verification

- [ ] T042 Run `task verify` to confirm full CI check passes (lint + typecheck + test)

### Evidence Collection (REQUIRED)

- [ ] T043 Capture test results using template (.specify/templates/evidence/test-summary-template.md) in `specs/179-sensor-aware-layers-rendering/evidence/test-summary.md`
- [ ] T044 Create usage demonstration (Storybook walkthrough of Cases A-D) in `specs/179-sensor-aware-layers-rendering/evidence/usage-example.md`
- [ ] T045 [P] Capture theme screenshots (light/dark/vscode) to `specs/179-sensor-aware-layers-rendering/evidence/screenshots/`
- [ ] T046 [P] Document E2E results in `specs/179-sensor-aware-layers-rendering/evidence/e2e-summary.md`

### Media Content

- [ ] T047 Create shipped blog post in `specs/179-sensor-aware-layers-rendering/media/shipped-post.md`
- [ ] T048 [P] Create LinkedIn shipped summary in `specs/179-sensor-aware-layers-rendering/media/linkedin-shipped.md`

### PR Creation

- [ ] T049 Create PR and publish blog: run /speckit.pr

**Task T049 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 — extends `DisplayItem` type, adds helpers, refreshes course format
- **US1 (Phase 3)**: Depends on Phase 2 — the core dispatcher + rendering implementation
- **US2 (Phase 4)**: Depends on Phase 3 — selection verification (no new code)
- **US3 (Phase 5)**: Depends on Phase 3 — visibility verification (no new code)
- **US4 (Phase 6)**: Depends on Phase 3 — compound-track symmetry verification (no new code)
- **E2E (Phase 7)**: Depends on Phase 3 — Playwright tests against the new story
- **Polish (Phase 8)**: Depends on Phases 3-7 — evidence, media, and PR

### User Story Dependencies

- **User Story 1 (P1)**: Core implementation — all other stories depend on this
- **User Story 2 (P2)**: Verification only — can run in parallel with US3 and US4 after US1 completes
- **User Story 3 (P2)**: Verification only — can run in parallel with US2 and US4 after US1 completes
- **User Story 4 (P3)**: Verification only — can run in parallel with US2 and US3 after US1 completes

### Parallel Opportunities

- T003/T004/T005/T006 (Foundation) can run in parallel (different concerns in the same file, but logically independent blocks)
- T009–T020 (US1 tests) can all run in parallel (independent test blocks)
- T028/T029/T030 (US2 tests) can run in parallel
- T032/T033 (US3 tests) can run in parallel
- T037/T038/T039 (E2E test creation) can run in parallel
- T045/T046 (evidence artifacts) can run in parallel
- T047/T048 (media content) can run in parallel
- Phases 4/5/6/7 can all run in parallel after Phase 3 completes

---

## Parallel Example: After Phase 3 Completes

```bash
# US2, US3, US4, and E2E can all start in parallel:
Task: "Clicking a group row selects only the group path" (T028)
Task: "Sensor row in hiddenIds renders with hidden state" (T032)
Task: "Verify Case B fixture renders Track Segments wrapper" (T035)
Task: "Create Playwright test for TracksWithSensors story" (T037)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Phase 1 (Setup) → Clean baseline confirmed
2. Complete Phase 2 (Foundation) → Types + helpers ready, existing tests green
3. Complete Phase 3 (US1) → Core implementation: 4-case dispatcher, sensor/contact/group rows, Storybook story
4. Complete Phases 4-6 (US2-US4) → Selection, visibility, symmetry verified (no new code — all ride on existing wiring)
5. Complete Phase 7 (E2E) → Automated Playwright evidence across 3 themes
6. Complete Phase 8 (Polish) → Evidence captured, media drafted, PR created

### Key Constraint

The implementation is concentrated in Phase 3 (US1). Phases 4-6 are **verification-only** — they confirm that selection, visibility, and compound-track symmetry work correctly against the US1 dispatcher without requiring additional code changes. This is because `FeatureList.tsx`'s `handleRowClick`, `hiddenIds`, and `hasChildSelected` wiring is path-agnostic and extends to new row kinds automatically via the path-scheme contract (FR-004, FR-009, FR-010).

---

## Notes

- [P] tasks = logically independent, can run in parallel
- [US1]–[US4] labels map tasks to specific user stories for traceability
- Each user story is independently testable after Phase 3 completes
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
