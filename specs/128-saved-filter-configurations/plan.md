# Implementation Plan: Saved Filter Configurations

**Branch**: `128-saved-filter-configurations` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/128-saved-filter-configurations/spec.md`

## Summary

Add save/load/delete of named filter configurations to the STAC Browser filter bar (#127). Saved configurations persist FilterBarState as CQL2 JSON using platform-native storage (VS Code workspaceState / browser localStorage). Two new shared components — SaveFilterButton and HistoricFiltersDropdown — integrate into the existing FilterBar.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18.x, existing FilterBar (#127), filter-engine (#126), `@debrief/components`
**Storage**: VS Code `workspaceState` (extension), browser `localStorage` (web-shell)
**Testing**: vitest (unit), Playwright (Storybook E2E)
**Target Platform**: VS Code extension webview, browser (web-shell)
**Project Type**: Shared component library (existing `shared/components/`)
**Performance Goals**: Save < 100ms, restore < 100ms, dropdown render < 50ms for 50 entries
**Constraints**: Offline-capable (Constitution Art. I.1), no network calls, max 100 saved configurations
**Scale/Scope**: Single workspace; up to 100 saved configurations per workspace

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | PASS | All persistence is local (workspaceState / localStorage) |
| I.3 | No silent failures | PASS | Storage errors surfaced to user via error state |
| II.1 | Schema single source of truth | N/A | No new schema entities (pure UI state) |
| III.4 | Data stays local | PASS | No network calls; saved filters stored locally |
| IV.1 | Services never touch UI | PASS | No service changes; this is a pure frontend feature |
| IV.2 | Frontends never persist | JUSTIFIED | Saved filters are UI preferences, not domain data. VS Code workspaceState and localStorage are standard frontend persistence for user preferences. No service-layer persistence needed. |
| VI.2 | Services require unit tests | PASS | Hook and components fully tested with vitest |
| VIII.1 | Specs before code | PASS | This plan + spec.md |
| XI.1 | I18N from the start | PASS | All user-facing strings in constants.ts (existing pattern) |
| XIII.1 | Atomic commits | PASS | One logical change per commit |
| XV.1 | Explicit types everywhere | PASS | All types defined in contracts |
| XV.2 | No Any/any | PASS | CQL2 JSON typed as `Record<string, unknown>` (matches existing #126 pattern) |

**Post-design re-check**: All gates pass. Art. IV.2 deviation justified — saved filters are UI preferences, analogous to existing `recentPlotsService` and `layoutPersistence` patterns.

## Project Structure

### Documentation (this feature)

```text
specs/128-saved-filter-configurations/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── saved-filters.ts
├── checklists/
│   └── requirements.md
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (repository root)

```text
shared/components/src/FilterBar/
├── SaveFilterButton.tsx          # Save button + name prompt popover
├── HistoricFiltersDropdown.tsx   # Dropdown list with restore/delete
├── useSavedFilters.ts            # Hook: CRUD operations + persistence
├── savedFiltersStorage.ts        # Platform-agnostic storage interface
├── constants.ts                  # (existing) Add new user-facing strings
├── types.ts                      # (existing) Add SavedFilterConfiguration type
├── FilterBar.tsx                 # (existing) Integrate save/restore controls
├── __tests__/
│   ├── useSavedFilters.test.ts
│   ├── SaveFilterButton.test.tsx
│   └── HistoricFiltersDropdown.test.tsx
└── SavedFilters.stories.tsx      # Storybook stories

shared/components/e2e/
└── SavedFilters.spec.ts          # Playwright E2E tests
```

**Structure Decision**: All new code lives within the existing `shared/components/src/FilterBar/` directory, following the established pattern of co-locating related components. No new packages or directories at the repository root level.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|-------------|-------------|---------|
| SaveFilterButton | `shared/components/src/FilterBar/SavedFilters.stories.tsx` | `saved-filters.js` | Demonstrates save flow with name prompt |
| HistoricFiltersDropdown | `shared/components/src/FilterBar/SavedFilters.stories.tsx` | `saved-filters.js` | Demonstrates restore/delete from saved list |

**Inclusion Criteria Applied**:
- [x] New visual component
- [ ] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created)
- [x] Components render standalone (no app context required — uses storage interface injection)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar-saved-filters`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|-------------|----------------|--------------|
| `SavedFilters.stories.tsx` — Empty | Rendering, empty state message | light, dark, vscode | Open dropdown, verify "No saved filters" |
| `SavedFilters.stories.tsx` — WithSaved | List rendering, restore, delete | light, dark, vscode | Click entry to restore, click delete icon |
| `SavedFilters.stories.tsx` — SaveFlow | Save button, name prompt | light, dark, vscode | Click save, type name, confirm |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/SavedFilters.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=filterbar-saved-filters--empty&globals=theme:light
/iframe.html?id=filterbar-saved-filters--with-saved&globals=theme:dark
/iframe.html?id=filterbar-saved-filters--save-flow&globals=theme:vscode
```

## VS Code Webview E2E Testing

None - no extension workflow changes. The saved filters feature uses shared components that are tested via Storybook E2E. VS Code integration is limited to passing a storage instance to FilterBar props.
