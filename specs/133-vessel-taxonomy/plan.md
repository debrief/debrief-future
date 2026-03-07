# Implementation Plan: Vessel Taxonomy and Hierarchical Filtering

**Branch**: `133-vessel-taxonomy` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/133-vessel-taxonomy/spec.md`

## Summary

Enhance the vessel class filter in the FilterBar with human-readable labels, in-menu search, per-node match counts, and current-selection marking. This builds on existing infrastructure from #125 (taxonomy data, STAC extension) and #127 (CascadingMenu, FilterBar, taxonomyAdapter). The approach adds `buildTaxonomyLabelMap()` to the existing taxonomy module, creates a match count hook and tree filter utility, and wraps CascadingMenu with a searchable variant. Changes to core CascadingMenu are limited to an additive `badge` prop on the shared `CascadingMenuItem` interface.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x shared components)
**Primary Dependencies**: React 18.x, @dnd-kit/core (existing from #127), vitest (testing), Storybook (visual dev)
**Storage**: N/A — reads existing vessel-taxonomy.json fixture; no persistence
**Testing**: vitest (unit), Playwright via @sparticuz/chromium (Storybook E2E)
**Target Platform**: VS Code webview + browser (Storybook)
**Project Type**: Shared component library (`shared/components/`)
**Performance Goals**: Search filtering < 100ms for full taxonomy; count computation < 50ms for 100 items
**Constraints**: Offline-capable (all client-side); no new external dependencies
**Scale/Scope**: ~20 leaf taxonomy nodes, ~100 mock STAC items, 3 new + 10 modified source files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All functionality works without network | PASS | Pure client-side tree operations on bundled JSON |
| II.1 Single source of truth | Schema-first data structures | PASS | Taxonomy defined in vessel-taxonomy.json; VesselTaxonomyNode type derived from #125 |
| IV.1 Services never touch UI | Python services return data only | PASS | No Python services — this is purely frontend |
| V.3 No vendor lock-in | No proprietary dependencies | PASS | No new dependencies added |
| VI.2 Services require unit tests | Tests for all new code | PASS | Unit tests for each new module (taxonomy label map, useTaxonomyMatchCounts, filterCascadingItems, SearchableCascadingMenu) + DragOverlay and OrContainer label tests |
| VII.1 Tests before implementation | Test-first approach | PASS | Tests written before implementation per TDD |
| VIII.1 Specs before code | Written specification exists | PASS | spec.md created |
| IX.1 Minimal dependencies | No unnecessary dependencies | PASS | Zero new npm packages |
| XI.1 I18N from the start | User-facing strings externalisable | PASS | Labels come from taxonomy JSON (data-driven); "Search vessel types..." placeholder is the only hardcoded string — can be extracted to i18n later |
| XV.1 Explicit types | No any/Any in production code | PASS | All new code fully typed with readonly interfaces |

**Post-design re-check**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/133-vessel-taxonomy/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity definitions and data flow
├── quickstart.md        # Developer quickstart guide
├── contracts/
│   └── component-api.md # Component interface contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
shared/components/src/
├── CascadingMenu/
│   ├── CascadingMenu.tsx              # MODIFY: add badge prop to CascadingMenuItem (shared interface)
│   ├── CascadingMenu.css              # MODIFY: add badge + search input styling
│   ├── SearchableCascadingMenu.tsx     # NEW: search wrapper (owns container layout)
│   ├── filterCascadingItems.ts         # NEW: recursive tree filtering (String.includes, not regex)
│   └── index.ts                        # MODIFY: re-export new components
├── FilterBar/
│   ├── useTaxonomyMatchCounts.ts       # NEW: per-node count hook (memoizes descendantMap)
│   ├── taxonomyAdapter.ts              # MODIFY: accept counts + currentValue options
│   ├── ValueEditor.tsx                 # MODIFY: use SearchableCascadingMenu, pass counts
│   ├── Lozenge.tsx                     # MODIFY: resolve vessel-class labels via labelMap prop
│   ├── OrContainer.tsx                 # MODIFY: forward labelMap + counts to child Lozenges
│   ├── FilterBar.tsx                   # MODIFY: compute counts, build label map, resolve DragOverlay labels
│   └── FilterBar.stories.tsx           # MODIFY: add taxonomy-specific stories
└── filter-engine/
    ├── taxonomy.ts                     # MODIFY: add buildTaxonomyLabelMap() (full-path keys)
    └── (existing buildDescendantMap() reused)

shared/components/src/FilterBar/__tests__/
├── useTaxonomyMatchCounts.test.ts     # NEW
├── taxonomyAdapter.test.ts            # MODIFY: add tests for counts/current
├── Lozenge.test.tsx                   # MODIFY: add vessel-class label resolution test
└── OrContainer.test.tsx               # MODIFY: add child label forwarding test

shared/components/src/CascadingMenu/__tests__/  # NEW directory
├── filterCascadingItems.test.ts       # NEW
└── SearchableCascadingMenu.test.tsx   # NEW

shared/components/e2e/
└── FilterBar.spec.ts                  # MODIFY: add taxonomy interaction tests
```

**Structure Decision**: All changes are within the existing `shared/components` package. No new packages or projects needed. This is a frontend-only enhancement to existing components.

**Review amendments applied** (from `/speckit.review`):
1. `labelResolver.ts` eliminated — `buildTaxonomyLabelMap()` merged into existing `taxonomy.ts` (DRY)
2. Label map uses **full taxonomy paths** as keys (not node IDs) to avoid ambiguity (e.g., `tanker` exists under both `auxiliary` and `merchant`)
3. `OrContainer.tsx` added to modify list — must forward `labelMap` and `counts` props to child Lozenges
4. `FilterBar.tsx` DragOverlay (line ~265) must call `resolveTaxonomyLabel()` for vessel-class drag ghosts
5. `SearchableCascadingMenu` owns its container layout; inner CascadingMenu positioned relatively within it
6. `filterCascadingItems` uses `String.includes()` (not regex) to avoid special-character exceptions
7. `useTaxonomyMatchCounts` memoizes `buildDescendantMap()` on taxonomy reference
8. `CascadingMenu/__tests__/` directory created for new component tests
9. `badge` prop on `CascadingMenuItem` is a shared interface addition — CSS in shared CascadingMenu.css
10. Match counts computed against already-filtered items (1A decision) — no shadow expression needed

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| SearchableCascadingMenu | `shared/components/src/FilterBar/FilterBar.stories.tsx` | `vessel-taxonomy-search.js` | Demonstrates type-ahead search in hierarchical vessel class dropdown |
| FilterBar (taxonomy variant) | `shared/components/src/FilterBar/FilterBar.stories.tsx` | `filter-bar-taxonomy.js` | Shows vessel class lozenges with human-readable labels and count badges |

**Inclusion Criteria Applied**:
- [x] New visual component (SearchableCascadingMenu)
- [x] Significant visual change (labels, counts, search in existing dropdown)
- [x] Interactive demo adds narrative value (tree navigation + search is compelling)

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be added as part of implementation)
- [x] Components render standalone (CascadingMenu/FilterBar are self-contained)
- [x] Reasonable bundle size expected (< 500KB — no new dependencies)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar--vessel-taxonomy-navigation`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `FilterBar.stories.tsx` (Vessel Taxonomy Navigation) | Rendering, label display, search | light, dark, vscode | open dropdown, navigate tree, select leaf, select branch |
| `FilterBar.stories.tsx` (Vessel Taxonomy Search) | Search input, filter results | light, dark, vscode | type search text, verify filtered tree, clear search |
| `FilterBar.stories.tsx` (Vessel Taxonomy Counts) | Count badges, disabled nodes | light, dark, vscode | open dropdown, verify counts, verify disabled zero-count nodes |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/FilterBar.spec.ts` (extend existing)

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=filterbar--vessel-taxonomy-navigation&globals=theme:light
/iframe.html?id=filterbar--vessel-taxonomy-navigation&globals=theme:dark
/iframe.html?id=filterbar--vessel-taxonomy-navigation&globals=theme:vscode
```

## VS Code Webview E2E Testing

None — no extension workflow changes. The FilterBar runs in the webview but is tested via Storybook E2E. VS Code integration testing for the filter bar is covered by the existing #127 E2E suite.

## Complexity Tracking

No constitution violations — this section is intentionally empty.
