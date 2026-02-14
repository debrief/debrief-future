# Tasks: Feature Format Menu

**Input**: Design documents from `/specs/097-feature-format-menu/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included per plan.md — Storybook stories for components, unit tests for format logic, Playwright for e2e.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/097-feature-format-menu/evidence/`
**Media Directory**: `specs/097-feature-format-menu/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Unit test results + coverage for format service, style property map, presets | After all tests pass |
| usage-example.md | Step-by-step walkthrough: open menu, select colour, verify map update | After US1 complete |
| screenshots/cascading-menu-light.png | CascadingMenu in light theme | After Storybook stories created |
| screenshots/cascading-menu-dark.png | CascadingMenu in dark theme | After Storybook stories created |
| screenshots/format-menu-track.png | FormatMenu showing track properties | After FormatMenu complete |
| screenshots/format-menu-batch.png | FormatMenu showing mixed-type batch with greyed-out items | After US3 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (done) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (done) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directories, barrel exports, and shared data definitions that all user stories depend on.

- [ ] T001 Create CascadingMenu component directory with barrel export `shared/components/src/CascadingMenu/index.ts`
- [ ] T002 [P] Create FormatMenu component directory with barrel export `shared/components/src/FormatMenu/index.ts`
- [ ] T003 [P] Create format service directory with barrel export `services/session-state/src/format/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data definitions, presets, style property maps, the generic CascadingMenu component, and the format service — all of which MUST be complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

### Preset Data & Style Mapping

- [ ] T004 Define 16-colour preset palette with ids, labels, hex values, and swatches `shared/components/src/FormatMenu/presetPalette.ts`
- [ ] T005 [P] Define numeric presets (line weight, opacity, radius, dash patterns) in presetPalette `shared/components/src/FormatMenu/presetPalette.ts`
- [ ] T006 Define style property map per FeatureKindEnum (TRACK, POINT, CIRCLE, RECTANGLE, POLY, LINE, VECTOR, etc.) `services/session-state/src/format/stylePropertyMap.ts`
- [ ] T007 [test] Unit test style property map returns correct properties per kind `services/session-state/src/format/__tests__/stylePropertyMap.test.ts`

### CascadingMenu Component

- [ ] T008 Implement CascadingMenu component with hover-cascade sub-menus, 150ms hover delay, viewport repositioning `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [ ] T009 [P] Add CascadingMenu CSS (fixed positioning, z-index, submenu transitions, theme support) `shared/components/src/CascadingMenu/CascadingMenu.css`
- [ ] T010 Add keyboard navigation: Up/Down within level, Right opens submenu, Left closes submenu, Escape dismisses, Enter selects `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [ ] T011 Add click-outside dismiss handler `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [ ] T012 Create CascadingMenu Storybook stories: default, with colour swatches, with disabled items, keyboard-navigable, viewport-edge repositioning `shared/components/src/CascadingMenu/CascadingMenu.stories.tsx`

### Format Service Core

- [ ] T013 Add `updateFeatureStyle` action to FeaturesSlice in session-state store `services/session-state/src/store/slices/features.ts`
- [ ] T014 Implement formatService.applyStyleChange — read previous value, mutate style, record provenance, persist via stacService `services/session-state/src/format/formatService.ts`
- [ ] T015 [P] Implement formatService.getEditableProperties — look up StylePropertyMap by feature kind `services/session-state/src/format/formatService.ts`
- [ ] T016 [P] Implement formatService.buildMenuItems — convert StylePropertyDescriptors to CascadingMenuItems `services/session-state/src/format/formatService.ts`
- [ ] T017 [P] Implement formatService.getCurrentValue — read dot-path from feature.properties.style `services/session-state/src/format/formatService.ts`
- [ ] T018 [test] Unit test formatService.applyStyleChange records provenance and returns previous values `services/session-state/src/format/__tests__/formatService.test.ts`
- [ ] T019 [P][test] Unit test formatService.buildMenuItems creates correct menu tree `services/session-state/src/format/__tests__/formatService.test.ts`

**Checkpoint**: Foundation ready — CascadingMenu renders, format service applies changes, presets defined. User story implementation can now begin.

---

## Phase 3: User Story 1 — Format a Single Feature via Row Icon (Priority: P1) MVP

**Goal**: Analyst clicks format icon on a feature row in Layers panel, selects a style value from the cascading menu, and the feature updates immediately on the map with a provenance entry recorded.

**Independent Test**: Load a plot with at least one track, click the format icon, select a colour from the sub-menu, verify the track changes colour on the map and a provenance log entry is created.

### E2E Tests for User Story 1

- [ ] T020 [P] Create Playwright test for CascadingMenu: rendering, keyboard nav, hover-cascade, Escape dismiss `shared/components/e2e/CascadingMenu.spec.ts`
- [ ] T021 [P] Add CascadingMenu theme variant tests (light, dark, vscode) `shared/components/e2e/CascadingMenu.spec.ts`

### Implementation for User Story 1

- [ ] T022 Implement FormatMenu component: wraps CascadingMenu, calls formatService.buildMenuItems for the feature's kind, calls applyStyleChange on leaf select, calls onDismiss on close `shared/components/src/FormatMenu/FormatMenu.tsx`
- [ ] T023 [P] Add FormatMenu CSS (anchored to icon, colour swatch rendering, current-value indicator) `shared/components/src/FormatMenu/FormatMenu.css`
- [ ] T024 [P] Create formatMenuItems helper: maps property descriptors to CascadingMenuItems, highlights current value, renders colour swatches `shared/components/src/FormatMenu/formatMenuItems.ts`
- [ ] T025 Add format icon button to FeatureRow — visible for feature kinds with editable properties, hidden for NARRATIVE/TEXT/SYSTEM `shared/components/src/FeatureList/FeatureRow.tsx`
- [ ] T026 Wire FeatureRow format icon click to open FormatMenu anchored to the icon position `shared/components/src/FeatureList/FeatureRow.tsx`
- [ ] T027 Ensure MapView re-renders when properties.style changes on any feature (verify existing featureStyle function reads updated style) `shared/components/src/MapView/MapView.tsx`
- [ ] T028 Ensure FeatureRow colour indicator updates to reflect new style after format change `shared/components/src/FeatureList/FeatureRow.tsx`
- [ ] T029 Create FormatMenu Storybook stories: track properties, point properties, polygon properties, colour palette rendering `shared/components/src/FormatMenu/FormatMenu.stories.tsx`
- [ ] T030 [P] Create Playwright test for FormatMenu: property list per kind, colour selection, current value highlight `shared/components/e2e/FormatMenu.spec.ts`
- [ ] T031 [P] Add FormatMenu theme variant tests (light, dark, vscode) `shared/components/e2e/FormatMenu.spec.ts`

**Checkpoint**: User Story 1 complete — single-feature formatting from row icon works end-to-end.

---

## Phase 4: User Story 2 — Format Individual Track Points (Priority: P2)

**Goal**: Analyst expands a track in Layers panel, clicks the format icon on an individual point row, changes the point's symbol/colour, and only that point updates on the map.

**Independent Test**: Load a plot with a track, expand it to show point rows, click the format icon on one point, change its symbol to diamond, verify only that point changes and other points are unaffected.

### Schema Extension

- [ ] T032 Extend PositionStyleOverride in styling.yaml with fill_color, stroke_color, radius, fill_opacity, stroke_opacity (all nullable) `shared/schemas/src/linkml/styling.yaml`
- [ ] T033 Regenerate Pydantic models, JSON Schema, and TypeScript types from updated LinkML schema
- [ ] T034 [test] Run schema adherence tests to verify generated schemas match LinkML source

### Implementation for User Story 2

- [ ] T035 Add format icon to point rows when track is expanded in FeatureList — uses point-specific properties from stylePropertyMap `shared/components/src/FeatureList/FeatureRow.tsx`
- [ ] T036 Implement per-point applyStyleChange path in formatService: creates/updates position_style_overrides[index] instead of track-level style `services/session-state/src/format/formatService.ts`
- [ ] T037 Update PositionSymbolsLayer to read new override fields (fill_color, stroke_color, radius, fill_opacity, stroke_opacity) from resolvePositionStyle cascade `shared/components/src/MapView/PositionSymbolsLayer.tsx`
- [ ] T038 Update resolvePositionStyle in time.ts to apply the new nullable colour/size override fields `shared/components/src/utils/time.ts`
- [ ] T039 [test] Unit test per-point formatService records positionIndex in provenance and doesn't affect other points `services/session-state/src/format/__tests__/formatService.test.ts`
- [ ] T040 [P][test] Unit test resolvePositionStyle correctly applies new fill_color/stroke_color/radius overrides `shared/components/src/utils/__tests__/time.test.ts`
- [ ] T041 Verify that a track-level format change does NOT overwrite existing per-point overrides (FR-009) `services/session-state/src/format/__tests__/formatService.test.ts`

**Checkpoint**: User Story 2 complete — per-point formatting works independently of track-level formatting.

---

## Phase 5: User Story 3 — Batch Format via Toolbar Button (Priority: P3)

**Goal**: Analyst selects multiple features, clicks the format toolbar button, sees the union of properties with inapplicable ones greyed out, applies a colour change, and all features update.

**Independent Test**: Load a plot with a track and a point location, select both, click the toolbar format button, select green, verify both update and a single provenance entry references both.

### Implementation for User Story 3

- [ ] T042 Add format button to LayersToolbar selection-scoped group, disabled when no features selected `shared/components/src/LayersToolbar/LayersToolbar.tsx`
- [ ] T043 Implement batch buildMenuItems in formatService: compute union of properties across feature kinds, mark inapplicable properties as disabled with tooltip (FR-010, FR-011) `services/session-state/src/format/formatService.ts`
- [ ] T044 Wire toolbar format button click to open FormatMenu with multiple featureIds and featureKinds `shared/components/src/LayersToolbar/LayersToolbar.tsx`
- [ ] T045 Implement batch applyStyleChange: single activityId for all features, skip features where property doesn't apply (FR-013) `services/session-state/src/format/formatService.ts`
- [ ] T046 [test] Unit test batch buildMenuItems produces union with correct disabled/enabled state `services/session-state/src/format/__tests__/formatService.test.ts`
- [ ] T047 [P][test] Unit test batch applyStyleChange creates single provenance entry for all features `services/session-state/src/format/__tests__/formatService.test.ts`
- [ ] T048 Add FormatMenu Storybook story for batch mode: mixed-type selection with greyed-out properties `shared/components/src/FormatMenu/FormatMenu.stories.tsx`

**Checkpoint**: User Story 3 complete — batch formatting from toolbar works for mixed-type selections.

---

## Phase 6: User Story 4 — Format a Non-Track Feature (Priority: P3)

**Goal**: Analyst clicks format icon on a reference location or annotation, sees the correct set of properties for that feature kind, and applies a style change.

**Independent Test**: Load a plot with a reference location (point), click its format icon, verify properties shown are symbol shape, fill colour, stroke colour, size — not track-specific properties like line dash.

### Implementation for User Story 4

- [ ] T049 Verify stylePropertyMap returns correct properties for POINT kind (symbol shape, fill colour, fill opacity, stroke colour, weight, radius) `services/session-state/src/format/stylePropertyMap.ts`
- [ ] T050 [P] Verify stylePropertyMap returns correct properties for CIRCLE, RECTANGLE, POLY kinds (fill colour, fill opacity, stroke colour, stroke weight, dash pattern) `services/session-state/src/format/stylePropertyMap.ts`
- [ ] T051 [P] Verify stylePropertyMap returns correct properties for LINE, MULTI_POINT kinds (stroke colour, weight, opacity, dash pattern) `services/session-state/src/format/stylePropertyMap.ts`
- [ ] T052 Verify format icon hidden for NARRATIVE, TEXT, SYSTEM features (FR-015) `shared/components/src/FeatureList/FeatureRow.tsx`
- [ ] T053 [test] Unit test all feature kind → property mappings cover every FeatureKindEnum value `services/session-state/src/format/__tests__/stylePropertyMap.test.ts`
- [ ] T054 Add FormatMenu Storybook story for point location and polygon annotation `shared/components/src/FormatMenu/FormatMenu.stories.tsx`

**Checkpoint**: User Story 4 complete — all supported feature kinds show correct properties, unsupported kinds hide format icon.

---

## Phase 7: Edge Cases & Hardening

**Purpose**: Address all edge cases from the spec and ensure robustness.

- [ ] T055 Verify cascading sub-menu repositions when near viewport edge (open left instead of right, above instead of below) — FR-016 `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [ ] T056 [P] Verify menu closes on click-outside and Escape key (FR-017) `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [ ] T057 [P] Handle persistence failure: show warning notification if stacService.writeGeoJson fails, keep in-memory change applied `services/session-state/src/format/formatService.ts`
- [ ] T058 [P] Ensure all menu labels use I18N keys (FR-018) — audit all hard-coded strings in FormatMenu and CascadingMenu `shared/components/src/FormatMenu/FormatMenu.tsx`
- [ ] T059 [P] Add aria-label, role="menu", role="menuitem", aria-haspopup, aria-expanded attributes to CascadingMenu for accessibility `shared/components/src/CascadingMenu/CascadingMenu.tsx`

**Checkpoint**: All edge cases handled, accessibility attributes in place.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation.

### Evidence Collection

- [ ] T060 Create evidence directory `specs/097-feature-format-menu/evidence/`
- [ ] T061 Capture test summary with pass/fail counts and coverage in `specs/097-feature-format-menu/evidence/test-summary.md`
- [ ] T062 Record usage example: step-by-step single-feature format walkthrough in `specs/097-feature-format-menu/evidence/usage-example.md`
- [ ] T063 [P] Capture CascadingMenu Storybook screenshots (light, dark, vscode themes) to `specs/097-feature-format-menu/evidence/screenshots/`
- [ ] T064 [P] Capture FormatMenu Storybook screenshots (track, point, polygon, batch modes) to `specs/097-feature-format-menu/evidence/screenshots/`

### E2E Evidence Collection

- [ ] T065 Run full e2e suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T066 [P] Capture theme variant screenshots to `specs/097-feature-format-menu/evidence/screenshots/`
- [ ] T067 Document e2e results in `specs/097-feature-format-menu/evidence/e2e-summary.md`

### Media Content

- [ ] T068 Create shipped blog post in `specs/097-feature-format-menu/media/shipped-post.md`
- [ ] T069 [P] Create LinkedIn shipped summary in `specs/097-feature-format-menu/media/linkedin-shipped.md`

### PR Creation

- [ ] T070 Create PR and publish blog: run /speckit.pr

**Task T070 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational + schema extension (T032-T034). Can run in parallel with US1.
- **User Story 3 (Phase 5)**: Depends on Foundational. Can run in parallel with US1/US2, but benefits from US1 FormatMenu existing.
- **User Story 4 (Phase 6)**: Depends on Foundational + stylePropertyMap (T006). Can run in parallel with other stories.
- **Edge Cases (Phase 7)**: Depends on all user stories being complete
- **Polish (Phase 8)**: Depends on all phases including edge cases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only — no dependency on other stories
- **User Story 2 (P2)**: Foundation + schema extension. FormatMenu from US1 is reused, so US1 should complete first in practice.
- **User Story 3 (P3)**: Foundation + US1 (FormatMenu). Toolbar integration is new; batch logic in formatService is independent.
- **User Story 4 (P3)**: Foundation only — validates property map correctness. Lightweight, can run early.

### Within Each User Story

- Schema/data changes before service logic
- Service logic before component wiring
- Component wiring before Storybook stories
- Tests can be written in parallel with implementation

### Parallel Opportunities

- Phase 1: All three setup tasks (T001-T003) run in parallel
- Phase 2: T004+T005 parallel; T008+T009 parallel; T015+T016+T017 parallel; T018+T019 parallel
- Phase 3: T020+T021 parallel; T023+T024 parallel; T030+T031 parallel
- Phase 4: T039+T040 parallel; T032 must complete before T033 before T034
- Phase 5: T046+T047 parallel
- Phase 6: T049+T050+T051 parallel; T053 after all three
- Phase 8: T063+T064 parallel; T066+T067 parallel; T068+T069 parallel

---

## Parallel Example: Phase 2 Foundation

```bash
# Parallel group 1: Presets (different sections of same file)
Task T004: "Define 16-colour preset palette"
Task T005: "Define numeric presets"

# Parallel group 2: CascadingMenu (component + CSS)
Task T008: "Implement CascadingMenu component"
Task T009: "Add CascadingMenu CSS"

# Parallel group 3: Format service query methods
Task T015: "Implement getEditableProperties"
Task T016: "Implement buildMenuItems"
Task T017: "Implement getCurrentValue"

# Parallel group 4: Format service tests
Task T018: "Unit test applyStyleChange"
Task T019: "Unit test buildMenuItems"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (CascadingMenu + format service + presets)
3. Complete Phase 3: User Story 1 (format icon on row, single-feature format)
4. **STOP and VALIDATE**: Click format icon on a track, change colour, verify map update + provenance entry
5. Demo ready — single-feature formatting works

### Incremental Delivery

1. Setup + Foundation → CascadingMenu and format infrastructure ready
2. Add User Story 1 → Single-feature formatting from row icon (MVP!)
3. Add User Story 4 → Non-track features get correct property menus (lightweight)
4. Add User Story 2 → Per-point formatting with schema extension
5. Add User Story 3 → Batch formatting from toolbar with mixed-type handling
6. Edge cases + Polish → Hardening, evidence, media, PR

### Suggested MVP Scope

**User Story 1** is the natural MVP — it delivers the core experience (format icon, cascading menu, immediate map update, provenance) and validates the entire stack from CascadingMenu through formatService to MapView re-rendering.

---

## Notes

- [P] tasks = different files, no dependencies
- [test] tasks = test files
- [US#] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
