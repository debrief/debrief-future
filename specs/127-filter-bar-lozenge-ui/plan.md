# Implementation Plan: Filter Bar with Lozenge UI and AND/OR Logic

**Branch**: `127-filter-bar-lozenge-ui` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/127-filter-bar-lozenge-ui/spec.md`

## Summary

Build a persistent filter bar component with pill-shaped lozenges for metadata filtering. Supports all 10 SRD filter types with type-specific input methods (hierarchical dropdown, flat dropdown, free-text, bucket selector). Lozenges combine with AND logic by default; OR container groups enable OR conjunction with drag-to-group. Filter state serialises to CQL2 JSON via the #126 filter engine. All development is Storybook-first against the 100-item mock data set from #125.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `@dnd-kit/core` + `@dnd-kit/sortable` (drag-to-group), `@debrief/components` filter-engine (#126), `vscrui` (VS Code icons), `nanoid` (unique IDs)
**Storage**: N/A (in-memory UI state; CQL2 JSON serialisation for future persistence via #128)
**Testing**: vitest (unit/integration), Storybook (visual), Playwright (E2E)
**Target Platform**: Browser (Storybook, VS Code webview, web-shell)
**Project Type**: Component module within existing `@debrief/components` pnpm workspace package
**Performance Goals**: Filter evaluation <10ms for 100 items (delegated to #126 engine). UI interactions <500ms including re-render (SC-001).
**Constraints**: Offline-capable, no network calls, all dropdown values computed from in-memory data
**Scale/Scope**: 100 mock STAC items, 10 filter types, 1 level of OR nesting, ~12 component/hook files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | No network calls | PASS | All filtering client-side against in-memory data |
| I.3 No silent failures | Errors reported to user | PASS | Error state shows warning banner, reverts to last valid state |
| I.4 Reproducibility | Same inputs → same results | PASS | Deterministic filter evaluation via #126 engine |
| II.1 Single source of truth | Types from schema | PARTIAL | Uses #126 `FilterType`, `FilterExpression`, `StacBrowserItem` types. Full LinkML derivation deferred to #125 |
| IV.1 Services never touch UI | Returns data only | PASS | Filter engine returns data; filter bar is UI-only |
| VI.2 Services require unit tests | Tests for all components | PASS | vitest unit tests for state management, integration tests for full flow |
| VII.1 Tests before implementation | Test-first | PASS | Test files created before component implementation |
| VIII.1 Specs before code | Spec exists | PASS | This spec + plan |
| IX.1 Minimal dependencies | Justified deps only | PASS | `@dnd-kit` justified by drag-to-group requirement (R1). No simpler alternative for accessible cross-container DnD. |
| XI.1 I18N from the start | Externalisable strings | PASS | All user-facing labels in `constants.ts`, no hardcoded strings in JSX |
| XV.1 Explicit types | No `any` | PASS | Strict TypeScript, discriminated unions for FilterBarItem |

**Post-Phase-1 Re-check**: All gates pass. The II.1 partial status is inherited from #126 and will resolve when #125 generates TypeScript types from LinkML.

## Project Structure

### Documentation (this feature)

```text
specs/127-filter-bar-lozenge-ui/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── filter-bar.ts    # TypeScript contract types
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   └── FilterBar/
│       ├── index.ts                  # Public exports
│       ├── FilterBar.tsx             # Main container: filter bar + add button + DnD context
│       ├── FilterBar.stories.tsx     # Storybook stories (SC-008)
│       ├── FilterBar.css             # Styles (CSS tokens from ThemeProvider)
│       ├── Lozenge.tsx               # Pill component: type label, value, remove, draggable
│       ├── Lozenge.css               # Lozenge styles
│       ├── OrContainer.tsx           # OR group wrapper with mini (+) and droppable
│       ├── OrContainer.css           # OR container styles
│       ├── FilterTypeMenu.tsx        # Dropdown for selecting filter type
│       ├── ValueEditor.tsx           # Polymorphic popover dispatching to input controls
│       ├── HierarchicalDropdown.tsx  # Tree selector for vessel class
│       ├── useFilterBar.ts           # useReducer hook for FilterBarState
│       ├── useDistinctValues.ts      # useMemo hook computing dropdown values from items
│       ├── types.ts                  # FilterBarState, FilterBarItem, FilterTypeOption
│       ├── constants.ts              # FILTER_TYPE_OPTIONS, labels, input method mapping
│       └── __tests__/
│           ├── FilterBar.test.tsx    # Integration: add/edit/remove/drag workflows
│           ├── useFilterBar.test.ts  # Reducer: state transitions, toFilterExpression
│           ├── Lozenge.test.tsx      # Click-to-edit, remove, drag initiation
│           ├── OrContainer.test.tsx  # Drop target, child management
│           └── ValueEditor.test.tsx  # Input method selection, value submission
├── e2e/
│   └── FilterBar.spec.ts            # Playwright E2E against Storybook
└── package.json                      # Add @dnd-kit dependencies
```

**Structure Decision**: Module within existing `@debrief/components` package, following the same pattern as `CatalogOverview/`, `FeatureList/`, etc. Exported via `@debrief/components/FilterBar` subpath export. No new workspace package needed.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| FilterBar | `shared/components/src/FilterBar/FilterBar.stories.tsx` | `filter-bar.js` | Interactive filter creation, AND/OR grouping, drag-to-group |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created during implementation)
- [x] Components render standalone (no app context required — uses ThemeProvider decorator only)
- [x] Reasonable bundle size expected (< 500KB — filter bar + @dnd-kit + value editors)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar--interactive`

## Storybook E2E Testing

> **Playwright works in cloud sessions** — uses `@sparticuz/chromium` (bundled Linux Chromium via npm).

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `FilterBar--empty` | Renders empty state with hint text | light, dark, vscode | Verify add button present |
| `FilterBar--single-filter` | Lozenge renders with correct label | light, dark, vscode | Click add, select type, select value |
| `FilterBar--multiple-and` | Multiple lozenges with AND semantics | light | Add two filters, verify both render |
| `FilterBar--or-group` | OR container with child lozenges | light | Create OR group, add children |
| `FilterBar--interactive` | Full workflow | light, dark | Add, edit, remove, drag to OR, verify results |
| `FilterBar--all-filter-types` | All 10 filter types render | light | Add each type, verify input method |
| `FilterBar--zero-results` | "No matches" state | light | Add incompatible filters |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/FilterBar.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=filterbar--empty&globals=theme:light
/iframe.html?id=filterbar--empty&globals=theme:dark
/iframe.html?id=filterbar--empty&globals=theme:vscode
/iframe.html?id=filterbar--interactive&globals=theme:light
```

## VS Code Webview E2E Testing

None — no extension workflow changes. The filter bar is developed and tested in Storybook. VS Code webview integration will come when the discovery panel is assembled (future feature).

## Complexity Tracking

No constitutional violations to justify.
