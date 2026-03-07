---
feature: "128-saved-filter-configurations"
captured_at: "2026-03-07T17:15:00Z"
git_sha: "9101d29"
tests_passed: 120
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Saved Filter Configurations

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 120 |
| Passed | 120 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### useSavedFilters Hook (16 tests)

| Test | Status |
|------|--------|
| starts with empty configurations | Pass |
| loads existing configurations from storage | Pass |
| saves with a provided name | Pass |
| generates a default name when none provided | Pass |
| generates a default name when empty string provided | Pass |
| places newest configuration first | Pass |
| enforces maximum 100 configurations | Pass |
| persists to storage | Pass |
| removes a configuration by id | Pass |
| does not affect other configurations | Pass |
| returns true for existing name (case-insensitive) | Pass |
| returns false for non-existing name | Pass |
| updates the filter state and moves to front | Pass |
| generateDefaultName — generates name from lozenge values | Pass |
| generateDefaultName — includes OR container children | Pass |
| generateDefaultName — returns "Untitled Filter" for empty | Pass |

### SaveFilterButton Component (10 tests)

| Test | Status |
|------|--------|
| renders the save button | Pass |
| is disabled when no active filters | Pass |
| opens popover on click | Pass |
| calls onSave with name when confirmed | Pass |
| calls onSave without name when left blank | Pass |
| closes popover on cancel | Pass |
| shows overwrite prompt for duplicate name | Pass |
| saves on overwrite confirmation | Pass |
| saves on Enter key | Pass |
| closes on Escape key | Pass |

### HistoricFiltersDropdown Component (12 tests)

| Test | Status |
|------|--------|
| renders the trigger button | Pass |
| shows dropdown on click | Pass |
| closes dropdown on second click | Pass |
| shows empty message when no configurations | Pass |
| displays saved configurations | Pass |
| calls onRestore when clicking a configuration | Pass |
| closes dropdown after restoring | Pass |
| calls onDelete when clicking delete button | Pass |
| does not trigger restore when clicking delete | Pass |
| re-renders correctly after deletion | Pass |
| shows empty message after deleting last config | Pass |
| dropdown stays open after deleting an entry | Pass |

### savedFiltersStorage (9 tests)

| Test | Status |
|------|--------|
| InMemoryStorage — loads empty by default | Pass |
| InMemoryStorage — loads initial collection | Pass |
| InMemoryStorage — round-trips save and load | Pass |
| LocalStorage — loads empty when empty | Pass |
| LocalStorage — round-trips save/load | Pass |
| LocalStorage — preserves all fields | Pass |
| LocalStorage — handles corrupted JSON | Pass |
| LocalStorage — handles invalid structure | Pass |
| LocalStorage — preserves OR containers | Pass |

### Existing FilterBar Tests (73 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| useFilterBar | 21 | All Pass |
| FilterBar component | 12 | All Pass |
| ValueEditor | 13 | All Pass |
| useDistinctValues | 10 | All Pass |
| Lozenge | 7 | All Pass |
| OrContainer | 6 | All Pass |
| taxonomyAdapter | 4 | All Pass |

## Key Scenarios Verified

- Save flow: save with custom name, auto-generated name, blank name, duplicate name with overwrite
- Restore flow: selecting saved config replaces filter bar state
- Delete flow: remove config, re-render, empty state after last deletion
- Persistence: round-trip through JSON serialisation preserves all fields including OR containers
- Maximum configurations enforced at 100
- Case-insensitive duplicate name detection
- Save button disabled when filter bar is empty

## Known Issues

- None

## Environment

- Runner: vitest 1.6.1
- Branch: claude/implement-speckit-128-y8FRe
- Date: 2026-03-07
