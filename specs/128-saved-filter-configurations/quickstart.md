# Quickstart: Saved Filter Configurations (#128)

## What This Feature Does

Adds the ability to save, restore, and delete named filter configurations in the STAC Browser filter bar. Analysts can preserve frequently used filter combinations and quickly reapply them in future sessions.

## Key Components

1. **SaveFilterButton** — A button in the filter bar that opens a name prompt popover and saves the current filter state
2. **HistoricFiltersDropdown** — A dropdown listing saved configurations with restore and delete actions
3. **useSavedFilters** — A React hook managing the saved configurations collection with persistence
4. **savedFiltersStorage** — Platform-agnostic storage abstraction (VS Code workspaceState / browser localStorage)

## File Locations

```
shared/components/src/FilterBar/
├── SaveFilterButton.tsx          # Save button + name prompt popover
├── HistoricFiltersDropdown.tsx   # Dropdown list with restore/delete
├── useSavedFilters.ts            # Hook for CRUD operations + persistence
├── savedFiltersStorage.ts        # Storage abstraction interface + implementations
├── __tests__/
│   ├── useSavedFilters.test.ts   # Hook unit tests
│   ├── SaveFilterButton.test.tsx # Component unit tests
│   └── HistoricFiltersDropdown.test.tsx  # Component unit tests
└── SavedFilters.stories.tsx      # Storybook stories
```

## Integration Point

The FilterBar component from #127 gains two new controls:
- Save button at the right end of the filter bar
- Historic Filters dropdown adjacent to the save button

```tsx
// In FilterBar.tsx — existing component gains new props:
<FilterBar
  items={stacItems}
  taxonomy={taxonomy}
  onFilteredItems={handleFiltered}
  onExpressionChange={handleExpression}
  // New: storage instance for saved filters persistence
  savedFiltersStorage={storage}
/>
```

## Development Steps

1. Define `savedFiltersStorage.ts` with the storage interface and implementations
2. Implement `useSavedFilters.ts` hook with save/load/delete/overwrite
3. Build `SaveFilterButton.tsx` with name prompt popover
4. Build `HistoricFiltersDropdown.tsx` with restore and delete
5. Integrate both into `FilterBar.tsx`
6. Add Storybook stories
7. Add unit tests
8. Add Playwright E2E tests against Storybook stories
