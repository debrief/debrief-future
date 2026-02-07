# Tasks: Layers Toolbar for FeatureList

**Input**: Design documents from `/specs/045-featurelist-layers-toolbar/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

---

## Evidence Requirements

**Evidence Directory**: `specs/045-featurelist-layers-toolbar/evidence/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types, directory structure, and shared assets

- [ ] T001 [P] Create `shared/components/src/LayersToolbar/types.ts` — define `FilterState`, `AssociatedFile`, `ToolbarLabels`, `LayersToolbarProps`, `FilterDropdownProps`, `RunDropdownProps`, `AssociatedFilesDropdownProps`
- [ ] T002 [P] Create `shared/components/src/LayersToolbar/YellowHalo.css` — `@keyframes debrief-yellow-halo` animation and `.debrief-toolbar-btn--halo` class
- [ ] T003 [P] Create `shared/components/src/LayersToolbar/fixtures/features.ts` — sample DebriefFeature collections (30+ features, mixed types, with temporal data)
- [ ] T004 [P] Create `shared/components/src/LayersToolbar/fixtures/tools.ts` — sample ToolMatch results (reuse/extend from ToolMatch/fixtures)
- [ ] T005 [P] Create `shared/components/src/LayersToolbar/fixtures/files.ts` — sample AssociatedFile data with multi-suffix types

**Checkpoint**: All shared types and fixtures ready. No components yet.

---

## Phase 2: User Story 1 — Filter and Search Features (Priority: P1) MVP

**Goal**: Standalone FilterDropdown component with all filter sections from the spec.

**Independent Test**: Storybook story with 20+ features. Verify text search narrows list, type checkboxes toggle, filter icon indicator changes.

### Implementation

- [ ] T006 [US1] Create `shared/components/src/LayersToolbar/FilterDropdown.tsx` — text search input with scope checkboxes (Name, Type, Platform, Attachments), feature type checkboxes (Tracks, Contacts, Zones, Annotations), visibility radio (all/hidden-only/visible-only), temporal before/after datetime inputs, apply-to-selection action buttons. Controlled component receiving `filterState` + `onFilterChange`.
- [ ] T007 [US1] Create `shared/components/src/LayersToolbar/FilterDropdown.css` — dropdown panel styles using `--debrief-*` CSS custom properties. Section dividers, checkbox/radio styling, search input, dark theme support via CSS variables.
- [ ] T008 [US1] Create `shared/components/src/LayersToolbar/FilterDropdown.stories.tsx` — stories: Default (empty state), WithActiveTextFilter, WithTypeFilters, WithTemporalFilters, WithAllFiltersActive, DarkTheme
- [ ] T009 [US1] Create `shared/components/src/LayersToolbar/FilterDropdown.test.tsx` — tests: text search fires onFilterChange with debounce, scope checkbox toggles update filterState, feature type checkboxes update filterState, apply-to-selection buttons fire onApplyToSelection, clear all resets to default state

**Checkpoint**: FilterDropdown renders in Storybook with all sections. All filter interactions work.

---

## Phase 3: User Story 2 — Selection-Scoped Actions (Priority: P2)

**Goal**: LayersToolbar shell with all 5 button slots. Delete and Visibility wired to callbacks. FilterDropdown integrated.

**Independent Test**: Storybook story with selectable features. Select features, click Delete — verify callback fires. Click Visibility — verify callback fires. No selection — buttons disabled.

### Implementation

- [ ] T010 [US2] Create `shared/components/src/LayersToolbar/LayersToolbar.tsx` — horizontal flexbox bar with two groups. Left: Delete (trash icon), Visibility (eye icon), Run (play icon + dropdown arrow). Right: Filter (search/filter icon + dropdown arrow), Associated Files (paperclip icon + dropdown arrow). Selection-scoped buttons disabled when `selectedFeatureIds` is empty. Only one dropdown open at a time. Click-outside and Escape close dropdowns. Filter icon toggles search↔filter based on FilterState.
- [ ] T011 [US2] Create `shared/components/src/LayersToolbar/LayersToolbar.css` — flexbox layout with `margin-left: auto` separator. Button base styles (icon + optional label). Disabled state (opacity 0.4, pointer-events none). Dropdown positioning (absolute below button). Active button indicator. Dark theme via CSS variables.
- [ ] T012 [US2] Create `shared/components/src/LayersToolbar/LayersToolbar.stories.tsx` — stories: NoSelection (all selection buttons disabled), WithSelection (buttons enabled), WithFilterOpen (FilterDropdown visible), WithActiveFilter (filter icon changed), DarkTheme
- [ ] T013 [US2] Create `shared/components/src/LayersToolbar/LayersToolbar.test.tsx` — tests: Delete button disabled when no selection, Delete fires onDelete with selectedFeatureIds, Visibility fires onToggleVisibility, only one dropdown open at a time, Escape closes dropdown, filter icon changes when filterState has active filters

**Checkpoint**: Toolbar renders 5 buttons. Selection buttons disable/enable correctly. Filter dropdown integrates. Delete/Visibility callbacks work.

---

## Phase 4: User Story 3 — Context-Sensitive Tools (Priority: P3)

**Goal**: RunDropdown with nested File/Edit/View/Analysis menu. Yellow halo animation on tool change.

**Independent Test**: Storybook story with mock ToolMatchService. Select features, open Run — verify nested menu. Change selection — verify yellow halo.

### Implementation

- [ ] T014 [US3] Create `shared/components/src/LayersToolbar/RunDropdown.tsx` — nested menu component. Static categories: File (Export Selection, Export to GeoJSON, Export to CSV), Edit (Duplicate, Rename, Lock/Unlock), View (Zoom to Selection, Pan to Feature, Center Map). Dynamic: Analysis submenu grouped by `tool.category` from `toolMatches` prop. Click fires `onRunTool(toolId, featureIds)`. Empty tools shows "No tools available" disabled item. All labels from `labels` prop.
- [ ] T015 [US3] Create `shared/components/src/LayersToolbar/RunDropdown.css` — nested menu positioning (submenu appears right of parent item). Hover highlight. Category headers. Disabled item styling. Separator lines between categories.
- [ ] T016 [US3] Update `shared/components/src/LayersToolbar/LayersToolbar.tsx` — integrate RunDropdown. Add `.debrief-toolbar-btn--halo` class to Run button when `toolsChanged` prop is true. Call `onDropdownOpened('run')` when dropdown opens (parent resets `toolsChanged`).
- [ ] T017 [US3] Create `shared/components/src/LayersToolbar/RunDropdown.test.tsx` — tests: menu renders all static categories, Analysis submenu populated from toolMatches, click on tool fires onRunTool with correct toolId and featureIds, empty toolMatches shows "No tools available"
- [ ] T018 [US3] Add stories to `LayersToolbar.stories.tsx` — WithRunDropdownOpen, WithToolsChanged (yellow halo visible), WithEmptyTools

**Checkpoint**: Run dropdown shows nested menu. Analysis submenu updates from tool data. Yellow halo animates and clears.

---

## Phase 5: User Story 4 — Associated Files Browser (Priority: P4)

**Goal**: AssociatedFilesDropdown with Sources/Results tree, context menu, and yellow halo.

**Independent Test**: Storybook story with mock file data. Verify tree renders, context menu appears, provenance warning on source delete.

### Implementation

- [ ] T019 [US4] Create `shared/components/src/LayersToolbar/AssociatedFilesDropdown.tsx` — two sections (Sources, Results) listing AssociatedFile arrays. Click file shows inline context menu: Open, Open With..., Reveal in Explorer, Delete. Delete on source file shows provenance warning text. Click action fires `onFileAction(file, action)`. Empty sections show "No files" placeholder. Multi-suffix badge display (e.g., `[2d]` prefix).
- [ ] T020 [US4] Create `shared/components/src/LayersToolbar/AssociatedFilesDropdown.css` — tree layout with section headers. File row styling. Inline context menu positioning. Provenance warning text (muted red). Multi-suffix badge styling. Dark theme.
- [ ] T021 [US4] Update `shared/components/src/LayersToolbar/LayersToolbar.tsx` — integrate AssociatedFilesDropdown. Add `.debrief-toolbar-btn--halo` class when `resultsChanged` is true. Call `onDropdownOpened('associated')` when dropdown opens.
- [ ] T022 [US4] Create `shared/components/src/LayersToolbar/AssociatedFilesDropdown.test.tsx` — tests: renders Sources and Results sections, click file shows context menu, Open fires onFileAction with 'open', Delete on source shows provenance warning, empty sections show placeholder
- [ ] T023 [US4] Add stories to `LayersToolbar.stories.tsx` — WithAssociatedFilesOpen, WithNewResults (yellow halo), WithEmptyFiles, WithMultiSuffixFiles

**Checkpoint**: Associated Files dropdown shows tree. Context menu works. Provenance warning on source delete. Yellow halo on new results.

---

## Phase 6: User Story 5 — Temporal Filtering (Priority: P5)

**Goal**: Temporal filter section works with datetime inputs and combines with other filters.

**Independent Test**: Storybook story with features having temporal metadata. Set before/after — verify filtering.

### Implementation

- [ ] T024 [US5] Update `shared/components/src/LayersToolbar/FilterDropdown.tsx` — ensure temporal section with `<input type="datetime-local">` for before/after correctly updates FilterState.temporal. Clear buttons for each field. Temporal filters combine additively with text and type filters.
- [ ] T025 [US5] Add story to `FilterDropdown.stories.tsx` — TemporalFilterActive showing features filtered by date range

**Checkpoint**: Temporal filters narrow feature list by time range. Combine with other filters.

---

## Phase 7: Integration & Polish

**Purpose**: Combined FeatureList+Toolbar, exports, dark theme, evidence

### Integration

- [ ] T026 [P] Create `shared/components/src/LayersToolbar/index.ts` — export LayersToolbar, FilterDropdown, all types (FilterState, AssociatedFile, ToolbarLabels, LayersToolbarProps)
- [ ] T027 Update `shared/components/src/index.ts` — add LayersToolbar exports: `LayersToolbar`, `FilterDropdown`, `FilterState`, `AssociatedFile`, `ToolbarLabels`
- [ ] T028 Add combined story to `shared/components/src/FeatureList/FeatureList.stories.tsx` — `WithToolbar` story composing LayersToolbar above FeatureList. Wire selection state via useState to drive both components. Include ToolMatchService with fixture tools for dynamic Analysis menu.
- [ ] T029 Add `FullIntegration` and `DarkTheme` stories to `LayersToolbar.stories.tsx` — full toolbar with all dropdowns wired, dark theme variant using ThemeProvider

### Evidence Collection

- [ ] T030 Create `specs/045-featurelist-layers-toolbar/evidence/` directory
- [ ] T031 Capture test summary in `specs/045-featurelist-layers-toolbar/evidence/test-summary.md`
- [ ] T032 Capture Storybook screenshots of key states (NoSelection, WithFilter, RunDropdown, AssociatedFiles, DarkTheme) in evidence directory

**Checkpoint**: Evidence collected — ready for PR creation via `/speckit.pr`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──► Phase 2 (US1: Filter) ──► Phase 3 (US2: Toolbar Shell)
                                                    │
                                          ┌─────────┼─────────┐
                                          ▼         ▼         ▼
                                    Phase 4     Phase 5    Phase 6
                                    (US3: Run)  (US4: Files) (US5: Temporal)
                                          │         │         │
                                          └─────────┼─────────┘
                                                    ▼
                                             Phase 7 (Polish)
```

- **Phase 1**: No dependencies — all tasks [P] parallel
- **Phase 2 (US1)**: Depends on Phase 1 (types.ts)
- **Phase 3 (US2)**: Depends on Phase 2 (FilterDropdown needed for integration)
- **Phases 4, 5, 6**: All depend on Phase 3 only — can run in parallel
- **Phase 7**: Depends on all prior phases

### Parallel Opportunities

- All Phase 1 tasks (T001-T005) can run in parallel
- Phases 4, 5, 6 can run in parallel after Phase 3
- Evidence tasks (T030-T032) can run in parallel

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story
- All components use `--debrief-*` CSS custom properties for theming
- No VS Code dependencies in any file
- All labels externalisable via `labels` prop
- Inline SVG icons (no external icon library)
- Native `<input type="datetime-local">` for temporal filters
