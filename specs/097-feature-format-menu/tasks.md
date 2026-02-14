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
| e2e-summary.md | Playwright E2E test results with pass/fail counts | After E2E suite passes |
| screenshots/format-menu-open.png | FormatMenu open state screenshot | Playwright screenshot capture |
| screenshots/format-menu-colour-submenu.png | Colour submenu open screenshot | Playwright screenshot capture |
| screenshots/format-menu-after-colour-change.png | After colour change screenshot | Playwright screenshot capture |

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

- [x] T001 Create CascadingMenu component directory with barrel export `shared/components/src/CascadingMenu/index.ts`
- [x] T002 [P] Create FormatMenu component directory with barrel export `shared/components/src/FormatMenu/index.ts`
- [x] T003 [P] Create format service directory with barrel export `services/session-state/src/format/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data definitions, presets, style property maps, the generic CascadingMenu component, and the format service — all of which MUST be complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

### Preset Data & Style Mapping

- [x] T004 Define 16-colour preset palette with ids, labels, hex values, and swatches `shared/components/src/FormatMenu/presetPalette.ts`
- [x] T005 [P] Define numeric presets (line weight, opacity, radius, dash patterns) in presetPalette `shared/components/src/FormatMenu/presetPalette.ts`
- [x] T006 Define style property map per FeatureKindEnum (TRACK, POINT, CIRCLE, RECTANGLE, POLY, LINE, VECTOR, etc.) `services/session-state/src/format/stylePropertyMap.ts`
- [x] T007 [test] Unit test style property map returns correct properties per kind `services/session-state/src/format/__tests__/stylePropertyMap.test.ts`

### CascadingMenu Component

- [x] T008 Implement CascadingMenu component with hover-cascade sub-menus, 150ms hover delay, viewport repositioning `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [x] T009 [P] Add CascadingMenu CSS (fixed positioning, z-index, submenu transitions, theme support) `shared/components/src/CascadingMenu/CascadingMenu.css`
- [x] T010 Add keyboard navigation: Up/Down within level, Right opens submenu, Left closes submenu, Escape dismisses, Enter selects `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [x] T011 Add click-outside dismiss handler (fixed: ignores clicks on sibling submenus via `.debrief-cascading-menu` closest check) `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [ ] T012 Create CascadingMenu Storybook stories: default, with colour swatches, with disabled items, keyboard-navigable, viewport-edge repositioning `shared/components/src/CascadingMenu/CascadingMenu.stories.tsx`

### Format Service Core

- [x] T013 Add `notifyStyleChange` action to FeaturesSlice in session-state store `services/session-state/src/store/slices/features.ts`
- [x] T014 Implement formatService.applyStyleChange — read previous value, mutate style, record provenance, persist via stacService `services/session-state/src/format/formatService.ts`
- [x] T015 [P] Implement formatService.getEditableProperties — look up StylePropertyMap by feature kind `services/session-state/src/format/formatService.ts`
- [x] T016 [P] Implement formatService.buildMenuItems — convert StylePropertyDescriptors to CascadingMenuItems `services/session-state/src/format/formatService.ts`
- [x] T017 [P] Implement formatService.getCurrentValue — read dot-path from feature.properties.style `services/session-state/src/format/formatService.ts`
- [x] T018 [test] Unit test formatService.applyStyleChange records provenance and returns previous values `services/session-state/src/format/__tests__/formatService.test.ts`
- [x] T019 [P][test] Unit test formatService.buildMenuItems creates correct menu tree `services/session-state/src/format/__tests__/formatService.test.ts`

**Checkpoint**: Foundation ready — CascadingMenu renders, format service applies changes, presets defined. User story implementation can now begin.

---

## Phase 3: User Story 1 — Format a Single Feature via Row Icon (Priority: P1) MVP

**Goal**: Analyst clicks format icon on a feature row in Layers panel, selects a style value from the cascading menu, and the feature updates immediately on the map with a provenance entry recorded.

**Independent Test**: Load a plot with at least one track, click the format icon, select a colour from the sub-menu, verify the track changes colour on the map and a provenance log entry is created.

### E2E Tests for User Story 1

- [x] T020 [P] Create Playwright test for FormatMenu: format icon visible, cascading menu opens, colour selection updates indicator bar `shared/components/e2e/FormatMenu.spec.ts`
- [ ] T021 [P] Create Playwright test for CascadingMenu: rendering, keyboard nav, hover-cascade, Escape dismiss `shared/components/e2e/CascadingMenu.spec.ts`

### Implementation for User Story 1

- [x] T022 Implement FormatMenu component: wraps CascadingMenu, calls buildFormatMenuItems for the feature's kind, calls onFormatChange on leaf select, calls onDismiss on close `shared/components/src/FormatMenu/FormatMenu.tsx`
- [x] T023 [P] Add FormatMenu CSS (anchored to icon, colour swatch rendering, current-value indicator) `shared/components/src/FormatMenu/FormatMenu.css`
- [x] T024 [P] Create formatMenuItems helper: maps property descriptors to CascadingMenuItems, highlights current value, renders colour swatches `shared/components/src/FormatMenu/formatMenuItems.ts`
- [x] T025 Add format icon button to FeatureRow — visible for feature kinds with editable properties, hidden for non-editable kinds `shared/components/src/FeatureList/FeatureRow.tsx`
- [x] T026 Wire FeatureRow format icon click to open FormatMenu anchored to the icon position `shared/components/src/FeatureList/FeatureRow.tsx`
- [x] T027 Ensure MapView re-renders when properties.style changes on any feature (revision-based GeoJSON key forces re-mount) `shared/components/src/MapView/MapView.tsx`
- [x] T028 Ensure FeatureRow colour indicator updates to reflect new style after format change `shared/components/src/FeatureList/FeatureRow.tsx`
- [x] T029 Create FormatMenuHarness Storybook story for interactive E2E testing `shared/components/src/FormatMenu/FormatMenuHarness.stories.tsx`
- [ ] T030 Create standalone FormatMenu Storybook stories: track properties, point properties, polygon properties, colour palette rendering `shared/components/src/FormatMenu/FormatMenu.stories.tsx`
- [x] T031 Wire ActivityPanel to open FormatMenu from FeatureRow format icon clicks `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [x] T032 Wire ActivityPanel to emit `layer:format` message on format change `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [x] T033 Add `layer:format` message handler in web-shell `apps/web-shell/src/App.tsx`
- [x] T034 Add `layer:format` message handler in VS Code extension `apps/vscode/src/views/activityPanelView.ts`
- [x] T035 [test] Create format-diagnostic unit test verifying getFeatureColor reads updated style after applyStyleChange `shared/components/src/FormatMenu/format-diagnostic.test.ts`

**Checkpoint**: User Story 1 complete — single-feature formatting from row icon works end-to-end.

---

## Phase 4: User Story 2 — Format Individual Track Points (Priority: P2)

**Goal**: Analyst expands a track in Layers panel, clicks the format icon on an individual point row, changes the point's symbol/colour, and only that point updates on the map.

**Independent Test**: Load a plot with a track, expand it to show point rows, click the format icon on one point, change its symbol to diamond, verify only that point changes and other points are unaffected.

### Schema Extension

- [ ] T036 Extend PositionStyleOverride in styling.yaml with fill_color, stroke_color, radius, fill_opacity, stroke_opacity (all nullable) `shared/schemas/src/linkml/styling.yaml`
- [ ] T037 Regenerate Pydantic models, JSON Schema, and TypeScript types from updated LinkML schema
- [ ] T038 [test] Run schema adherence tests to verify generated schemas match LinkML source

### Implementation for User Story 2

- [ ] T039 Add format icon to point rows when track is expanded in FeatureList — uses point-specific properties from stylePropertyMap `shared/components/src/FeatureList/FeatureRow.tsx`
- [x] T040 Implement per-point applyStyleChange path in formatService: creates/updates position_style_overrides[index] instead of track-level style `services/session-state/src/format/formatService.ts`
- [ ] T041 Update PositionSymbolsLayer to read new override fields (fill_color, stroke_color, radius, fill_opacity, stroke_opacity) from resolvePositionStyle cascade `shared/components/src/MapView/PositionSymbolsLayer.tsx`
- [ ] T042 Update resolvePositionStyle in time.ts to apply the new nullable colour/size override fields `shared/components/src/utils/time.ts`
- [x] T043 [test] Unit test per-point formatService records positionIndex in provenance and doesn't affect other points `services/session-state/src/format/__tests__/formatService.test.ts`
- [ ] T044 [P][test] Unit test resolvePositionStyle correctly applies new fill_color/stroke_color/radius overrides `shared/components/src/utils/__tests__/time.test.ts`
- [x] T045 Verify that a track-level format change does NOT overwrite existing per-point overrides (FR-009) `services/session-state/src/format/__tests__/formatService.test.ts`

**Checkpoint**: User Story 2 complete — per-point formatting works independently of track-level formatting.

---

## Phase 5: User Story 3 — Batch Format via Toolbar Button (Priority: P3)

**Goal**: Analyst selects multiple features, clicks the format toolbar button, sees the union of properties with inapplicable ones greyed out, applies a colour change, and all features update.

**Independent Test**: Load a plot with a track and a point location, select both, click the toolbar format button, select green, verify both update and a single provenance entry references both.

### Implementation for User Story 3

- [x] T046 Add format button to LayersToolbar selection-scoped group, disabled when no features selected `shared/components/src/LayersToolbar/LayersToolbar.tsx`
- [x] T047 Implement batch buildMenuItems in formatService: compute union of properties across feature kinds, mark inapplicable properties as disabled with tooltip (FR-010, FR-011) `services/session-state/src/format/formatService.ts`
- [x] T048 Wire toolbar format button click to open FormatMenu with multiple featureIds and featureKinds `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [x] T049 Implement batch applyStyleChange: single activityId for all features, skip features where property doesn't apply (FR-013) `services/session-state/src/format/formatService.ts`
- [x] T050 [test] Unit test batch buildMenuItems produces union with correct disabled/enabled state `services/session-state/src/format/__tests__/formatService.test.ts`
- [x] T051 [P][test] Unit test batch applyStyleChange creates single provenance entry for all features `services/session-state/src/format/__tests__/formatService.test.ts`
- [ ] T052 Add FormatMenu Storybook story for batch mode: mixed-type selection with greyed-out properties `shared/components/src/FormatMenu/FormatMenu.stories.tsx`

**Checkpoint**: User Story 3 complete — batch formatting from toolbar works for mixed-type selections.

---

## Phase 6: User Story 4 — Format a Non-Track Feature (Priority: P3)

**Goal**: Analyst clicks format icon on a reference location or annotation, sees the correct set of properties for that feature kind, and applies a style change.

**Independent Test**: Load a plot with a reference location (point), click its format icon, verify properties shown are symbol shape, fill colour, stroke colour, size — not track-specific properties like line dash.

### Implementation for User Story 4

- [x] T053 Verify stylePropertyMap returns correct properties for POINT kind (symbol shape, fill colour, fill opacity, stroke colour, weight, radius) `services/session-state/src/format/stylePropertyMap.ts`
- [x] T054 [P] Verify stylePropertyMap returns correct properties for CIRCLE, RECTANGLE, POLY kinds (fill colour, fill opacity, stroke colour, stroke weight, dash pattern) `services/session-state/src/format/stylePropertyMap.ts`
- [x] T055 [P] Verify stylePropertyMap returns correct properties for LINE, MULTI_POINT kinds (stroke colour, weight, opacity, dash pattern) `services/session-state/src/format/stylePropertyMap.ts`
- [x] T056 Verify format icon hidden for NARRATIVE, TEXT, SYSTEM features (FR-015) — empty arrays in stylePropertyMap `shared/components/src/FormatMenu/stylePropertyMap.ts`
- [x] T057 [test] Unit test all feature kind to property mappings cover every FeatureKindEnum value `services/session-state/src/format/__tests__/stylePropertyMap.test.ts`
- [ ] T058 Add FormatMenu Storybook story for point location and polygon annotation `shared/components/src/FormatMenu/FormatMenu.stories.tsx`

**Checkpoint**: User Story 4 complete — all supported feature kinds show correct properties, unsupported kinds hide format icon.

---

## Phase 7: Edge Cases & Hardening

**Purpose**: Address all edge cases from the spec and ensure robustness.

- [x] T059 Verify cascading sub-menu repositions when near viewport edge (open left instead of right, above instead of below) — FR-016 `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [x] T060 [P] Verify menu closes on click-outside and Escape key (FR-017) `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [ ] T061 [P] Handle persistence failure: show warning notification if stacService.writeGeoJson fails, keep in-memory change applied `services/session-state/src/format/formatService.ts`
- [ ] T062 [P] Ensure all menu labels use I18N keys (FR-018) — audit all hard-coded strings in FormatMenu and CascadingMenu `shared/components/src/FormatMenu/FormatMenu.tsx`
- [x] T063 [P] Add aria-label, role="menu", role="menuitem", aria-haspopup, aria-expanded attributes to CascadingMenu for accessibility `shared/components/src/CascadingMenu/CascadingMenu.tsx`

**Checkpoint**: All edge cases handled, accessibility attributes in place.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation.

### Evidence Collection

- [x] T064 Capture test summary with pass/fail counts and coverage in `specs/097-feature-format-menu/evidence/test-summary.md`
- [x] T065 Record usage example: step-by-step single-feature format walkthrough in `specs/097-feature-format-menu/evidence/usage-example.md`
- [x] T066 [P] Capture Storybook screenshots (format menu open, colour submenu, after change) to `specs/097-feature-format-menu/evidence/screenshots/`

### E2E Evidence Collection

- [x] T067 Run full e2e suite: `pnpm --filter @debrief/components test:e2e`
- [x] T068 [P] Document e2e results in `specs/097-feature-format-menu/evidence/e2e-summary.md`

### Media Content

- [x] T069 Create shipped blog post in `specs/097-feature-format-menu/media/shipped-post.md`
- [x] T070 [P] Create LinkedIn shipped summary in `specs/097-feature-format-menu/media/linkedin-shipped.md`

### PR Creation

- [ ] T071 Create PR and publish blog: run /speckit.pr

**Task T071 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — COMPLETE
- **Foundational (Phase 2)**: Depends on Setup — COMPLETE (except T012 CascadingMenu stories)
- **User Story 1 (Phase 3)**: Depends on Foundational — COMPLETE (except T021 CascadingMenu e2e, T030 FormatMenu stories)
- **User Story 2 (Phase 4)**: Depends on Foundational + schema extension (T036-T038). Service-layer per-point logic is done; schema + rendering outstanding.
- **User Story 3 (Phase 5)**: Depends on Foundational + US1 FormatMenu — COMPLETE (except T052 batch story)
- **User Story 4 (Phase 6)**: Depends on Foundational + stylePropertyMap — COMPLETE (except T058 non-track story)
- **Edge Cases (Phase 7)**: Partially complete — persistence failure handling (T061) and I18N audit (T062) outstanding
- **Polish (Phase 8)**: Evidence captured; E2E run + screenshots + PR creation outstanding

### Remaining Work Summary

| Phase | Remaining Tasks | IDs |
|-------|----------------|-----|
| Phase 2 | CascadingMenu stories | T012 |
| Phase 3 | CascadingMenu e2e, FormatMenu stories | T021, T030 |
| Phase 4 | Schema extension, point row format icon, position rendering, tests | T036-T039, T041-T042, T044 |
| Phase 5 | Batch story | T052 |
| Phase 6 | Non-track feature story | T058 |
| Phase 7 | Persistence failure handling, I18N audit | T061, T062 |
| Phase 8 | Screenshots, E2E run, E2E summary, PR | T066-T068, T071 |

### Parallel Opportunities

- T012, T021, T030, T052, T058 are all independent Storybook story / E2E tasks — can run in parallel
- T036-T038 (schema) must be sequential
- T039, T041, T042, T044 depend on T036-T038 completion
- T061, T062 are independent of each other
- T066-T068 can run in parallel after all implementation is complete
- T071 must be final

---

## Parallel Example: Remaining Storybook Stories

```bash
# All stories are independent and can be created in parallel:
Task T012: "CascadingMenu Storybook stories"
Task T030: "FormatMenu standalone stories"
Task T052: "FormatMenu batch mode story"
Task T058: "FormatMenu point/polygon story"
```

---

## Implementation Strategy

### Current State: US1 MVP Complete

User Story 1 (single-feature formatting from row icon) is the core MVP and is functionally complete:
- CascadingMenu renders with keyboard navigation, viewport repositioning, and click-outside dismiss
- FormatMenu wraps CascadingMenu with property-to-menu mapping
- Format icon appears on FeatureRow, opens FormatMenu
- ActivityPanel wires format icon click to FormatMenu to `layer:format` message
- Web-shell and VS Code extension handle `layer:format` messages
- Diagnostic unit tests confirm data flow works (getFeatureColor reads updated styles)
- CascadingMenu click-outside bug fixed (submenu clicks no longer dismissed prematurely)

### Incremental Delivery (Remaining)

1. **Storybook Stories** (T012, T030, T052, T058) — visual demos for each feature kind
2. **User Story 2: Per-Point Formatting** (T036-T044) — schema extension + rendering updates
3. **Hardening** (T061, T062) — persistence failure handling, I18N audit
4. **E2E & Evidence** (T021, T066-T068) — Playwright E2E run + screenshot capture
5. **PR Creation** (T071) — final task

### Suggested Next Steps

1. Complete Storybook stories (parallel, no dependencies)
2. Schema extension for per-point formatting (sequential: T036 to T037 to T038)
3. Wire per-point format UI and rendering (T039, T041, T042)
4. Run E2E suite and capture evidence
5. Create PR via /speckit.pr

---

## Notes

- [P] tasks = different files, no dependencies
- [test] tasks = test files
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
