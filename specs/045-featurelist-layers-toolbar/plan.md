# Implementation Plan: Layers Toolbar for FeatureList

**Branch**: `045-featurelist-layers-toolbar` | **Date**: 2026-01-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/045-featurelist-layers-toolbar/spec.md`

## Summary

Add a 5-button toolbar component to `shared/components/` that sits above the FeatureList. The toolbar provides selection-scoped actions (Delete, Visibility, Run) and plot-scoped utilities (Filter, Associated Files). Built as pure React with no VS Code dependencies, using existing ToolMatchService for context-sensitive tool matching. Delivered in 5 phases with Storybook stories at each stage.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18+)
**Primary Dependencies**: React, existing @debrief/components infrastructure, @debrief/schemas (Tool type), CSS custom properties for theming
**Storage**: N/A (stateless UI component — all state via props/callbacks)
**Testing**: Vitest + @testing-library/react for unit tests, Storybook for visual/interactive testing
**Target Platform**: Browser (Storybook), VS Code webview (via #044), Electron
**Project Type**: Component library addition (shared/components)
**Performance Goals**: Instant filter response (<16ms for 1000 features), smooth animations (60fps yellow halo)
**Constraints**: No VS Code dependencies, all strings externalisable, offline-capable
**Scale/Scope**: 5 toolbar buttons, 3 dropdown panels, ~13 new files

## Constitution Check

| Article | Gate | Status |
|---------|------|--------|
| I.1 | Offline by default | PASS — pure UI component, no network calls |
| I.3 | No silent failures | PASS — disabled states prevent empty actions; callbacks include affected IDs |
| IV.1 | Services never touch UI | PASS — ToolMatchService returns data only; toolbar renders it |
| IV.2 | Frontends never persist | PASS — all mutations via callbacks to parent |
| V.1 | Fail-safe loading | PASS — missing tool/file data renders empty states, not errors |
| X/XI | I18N from start | PASS — all labels via externalisable `labels` prop |

## Project Structure

### Documentation (this feature)

```text
specs/045-featurelist-layers-toolbar/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
shared/components/src/
├── LayersToolbar/
│   ├── LayersToolbar.tsx              # Main toolbar: 5 buttons, layout
│   ├── LayersToolbar.css              # Toolbar styles, button groups
│   ├── LayersToolbar.test.tsx         # Unit tests
│   ├── LayersToolbar.stories.tsx      # Stories for phases 2-5
│   ├── FilterDropdown.tsx             # Search/filter dropdown panel
│   ├── FilterDropdown.css             # Filter dropdown styles
│   ├── FilterDropdown.test.tsx        # Filter unit tests
│   ├── FilterDropdown.stories.tsx     # Standalone filter stories (phase 1)
│   ├── RunDropdown.tsx                # Nested context menu (File/Edit/View/Analysis)
│   ├── RunDropdown.css                # Run dropdown styles
│   ├── RunDropdown.test.tsx           # Run dropdown tests
│   ├── AssociatedFilesDropdown.tsx    # Sources/Results tree + context menu
│   ├── AssociatedFilesDropdown.css    # Associated files styles
│   ├── AssociatedFilesDropdown.test.tsx # Associated files tests
│   ├── YellowHalo.css                # Shared @keyframes for halo animation
│   ├── types.ts                      # FilterState, AssociatedFile, ToolbarLabels, props
│   ├── fixtures/                     # Mock data for stories and tests
│   │   ├── features.ts               # Sample DebriefFeature collections
│   │   ├── tools.ts                  # Sample ToolMatch results (reuse from ToolMatch/fixtures)
│   │   └── files.ts                  # Sample AssociatedFile data
│   └── index.ts                      # Public exports
├── FeatureList/
│   └── FeatureList.stories.tsx        # Add combined FeatureList+Toolbar story (phase 5)
└── index.ts                           # Add LayersToolbar exports
```

**Structure Decision**: Follow established component pattern (ComponentName directory with tsx/css/stories/test/types/index). All files in `shared/components/src/LayersToolbar/` — no new packages or workspace changes needed.

## Implementation Phases

### Phase 1: Types + FilterDropdown (Foundation)

**Goal**: Standalone filter dropdown component with all sections from the spec.

**Files**:
1. `types.ts` — Define all interfaces: `FilterState`, `AssociatedFile`, `ToolbarLabels`, `LayersToolbarProps`, `FilterDropdownProps`, `RunDropdownProps`, `AssociatedFilesDropdownProps`
2. `FilterDropdown.tsx` — Render all filter sections: text search with scope checkboxes, feature type checkboxes, visibility radio, temporal before/after, apply-to-selection actions
3. `FilterDropdown.css` — Styles using `--debrief-*` CSS custom properties. Sections separated by dividers. Checkbox/radio styling consistent with existing components
4. `FilterDropdown.test.tsx` — Test filter state changes, scope toggling, apply-to-selection callbacks
5. `FilterDropdown.stories.tsx` — Stories: Default, WithActiveFilters, TemporalFilters, DarkTheme

**Key decisions**:
- FilterDropdown is a controlled component: parent passes `filterState` and receives `onFilterChange`
- Text search debounced at component level (~150ms) before calling `onFilterChange`
- Temporal inputs use native `<input type="datetime-local">` — no external datetime picker dependency
- "Apply to Selection" buttons receive matched feature IDs from parent (parent does the filtering)

**Testing checkpoint**: FilterDropdown renders in Storybook with all sections. Toggling checkboxes and typing in search fires callbacks with correct FilterState.

### Phase 2: Toolbar Shell + Selection Buttons

**Goal**: LayersToolbar component with all 5 button slots. Delete and Visibility wired. FilterDropdown integrated.

**Files**:
1. `LayersToolbar.tsx` — Horizontal bar with two groups (selection-scoped left, plot-scoped right). Buttons render icons + tooltips. Delete/Visibility call `onDelete`/`onToggleVisibility` with `selectedFeatureIds`. Disabled when `selectedFeatureIds` is empty.
2. `LayersToolbar.css` — Flexbox layout. Button base styles. Disabled state (opacity + pointer-events). Group separator via `margin-left: auto` on plot-scoped group.
3. `LayersToolbar.test.tsx` — Test disabled states, callback invocation with correct IDs
4. `LayersToolbar.stories.tsx` — Stories: NoSelection (buttons disabled), WithSelection, WithFilter (integrated FilterDropdown)

**Key decisions**:
- Icons: Use inline SVG or CSS-based icons (no icon library dependency). Follow pattern from TimeController which uses Unicode/CSS
- Dropdown open/close managed via local state in LayersToolbar. Only one dropdown open at a time (opening one closes others)
- Click outside or Escape closes any open dropdown
- Filter button toggles between search icon (no filters) and filter icon (active filters) based on FilterState

**Testing checkpoint**: Toolbar renders 5 buttons. Selection buttons disable correctly. Filter dropdown opens/closes. Delete/Visibility fire callbacks.

### Phase 3: RunDropdown

**Goal**: Nested context menu for the Run button with ToolMatchService integration.

**Files**:
1. `RunDropdown.tsx` — Nested menu rendering File/Edit/View as static categories + Analysis submenu from `toolMatches` prop. Hover on category expands submenu. Click on tool fires `onRunTool(toolId, selectedFeatureIds)`.
2. `RunDropdown.css` — Nested menu positioning. Hover states. Submenu offset. "No tools available" disabled item styling.
3. `RunDropdown.test.tsx` — Test menu structure, tool click callback, empty tools state
4. `YellowHalo.css` — `@keyframes debrief-yellow-halo` animation. Applied via `.debrief-toolbar-btn--halo` class. Fades yellow border-glow over 3 seconds.
5. Update `LayersToolbar.tsx` — Integrate RunDropdown. Add yellow halo class when `toolsChanged` prop is true. Clear halo on dropdown open (call `onDropdownOpened('run')`).

**Key decisions**:
- Static menu items (File/Edit/View) are defined in component, not from ToolMatchService. Only Analysis submenu is dynamic.
- Analysis submenu grouped by `tool.category` (TMA, Track Processing, Statistics). Tools within each group sorted by name.
- If `toolMatches` is empty, Analysis shows single disabled item "No tools available"
- Yellow halo: CSS-only animation. `toolsChanged` prop controlled by parent. Parent sets it true on selection change that changes tool availability, toolbar calls `onDropdownOpened` to signal parent to reset it.

**Testing checkpoint**: Run dropdown shows nested menu. Analysis submenu populated from fixture tools. Yellow halo animates and clears.

### Phase 4: AssociatedFilesDropdown

**Goal**: Sources/Results tree with context menu and yellow halo.

**Files**:
1. `AssociatedFilesDropdown.tsx` — Two sections (Sources, Results) each listing `AssociatedFile[]`. Click on file shows inline context menu (Open, Open With..., Reveal in Explorer, Delete). Delete on source shows provenance warning text before invoking callback.
2. `AssociatedFilesDropdown.css` — Tree indentation. Section headers. Context menu styling. Warning text styling.
3. `AssociatedFilesDropdown.test.tsx` — Test file listing, context menu actions, provenance warning on source delete
4. `fixtures/files.ts` — Sample AssociatedFile data with various multi-suffix types
5. Update `LayersToolbar.tsx` — Integrate AssociatedFilesDropdown. Add yellow halo when `resultsChanged` is true.

**Key decisions**:
- Context menu appears inline below the clicked file (not a browser context menu)
- Multi-suffix parsing: split filename on dots, extract viewer-type and format from last two segments if they match known types
- Provenance warning is a text line within the context menu: "Warning: Removing source data breaks provenance chain"
- File display shows name with viewer-type badge if present (e.g., `[2d]` `range-analysis.json`)

**Testing checkpoint**: Associated Files shows Sources/Results. Context menu works. Provenance warning shows on source delete. Yellow halo on new results.

### Phase 5: FeatureList Integration + Polish

**Goal**: Combined FeatureList + LayersToolbar story. Dark theme. Final exports.

**Files**:
1. Update `FeatureList.stories.tsx` — Add `WithToolbar` story composing `<LayersToolbar>` above `<FeatureList>`. Wire selection state to drive both components. Include ToolMatchService with fixture tools to demonstrate dynamic Analysis menu.
2. Update `index.ts` (LayersToolbar) — Export all public types and components
3. Update `index.ts` (shared/components root) — Add LayersToolbar exports: `LayersToolbar`, `FilterDropdown`, `FilterState`, `AssociatedFile`, `ToolbarLabels`
4. `LayersToolbar.stories.tsx` — Add `FullIntegration` and `DarkTheme` stories

**Key decisions**:
- FeatureList and LayersToolbar remain separate components composed by parent — no tight coupling
- The combined story manages selection state via `useState` and bridges it between both components
- Dark theme story uses ThemeProvider with `variant: 'dark'`
- No changes to FeatureList component source — composition only

**Testing checkpoint**: Combined story renders toolbar + feature list. Selection in list enables toolbar buttons. Filter narrows list. Run dropdown shows context-sensitive tools. Dark theme renders correctly.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| FilterDropdown | `LayersToolbar/FilterDropdown.stories.tsx` | `filter-dropdown.js` | Demonstrates filter/search UI |
| LayersToolbar | `LayersToolbar/LayersToolbar.stories.tsx` | `layers-toolbar.js` | Shows full toolbar with all buttons |
| FeatureList+Toolbar | `FeatureList/FeatureList.stories.tsx` (WithToolbar) | `feature-list-toolbar.js` | Combined integration demo |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

## Dependency Graph

```
Phase 1: types.ts ──► FilterDropdown
                          │
Phase 2: LayersToolbar ◄──┘
              │
Phase 3: RunDropdown + YellowHalo ──► LayersToolbar (update)
              │
Phase 4: AssociatedFilesDropdown ──► LayersToolbar (update)
              │
Phase 5: FeatureList stories + exports (integration)
```

Phases 3 and 4 are independent of each other (both depend on Phase 2 only). They could be parallelized.

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Nested dropdown menus complex to position | Use absolute positioning relative to toolbar. Keep submenus to one level of nesting. |
| Click-outside handling conflicts between dropdowns | Single `isOpenDropdown` state in toolbar ensures mutual exclusivity |
| Filter performance with 1000+ features | Filtering done by parent, not inside dropdown. Debounce text input. |
| Yellow halo timing edge cases | CSS animation-only approach — no JavaScript timers. Parent controls `toolsChanged`/`resultsChanged` props. |

## Complexity Tracking

No constitution violations. All work is within a single existing package (`shared/components`), uses established patterns, and requires no new dependencies.
