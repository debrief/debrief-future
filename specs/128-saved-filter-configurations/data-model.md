# Data Model: Saved Filter Configurations (#128)

**Date**: 2026-03-07

## Entities

### SavedFilterConfiguration

A named, persisted snapshot of filter bar state.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `name` | string | User-provided or auto-generated display name |
| `filterBarState` | FilterBarState | Full lozenge/container structure for UI restoration |
| `cql2Json` | object | CQL2 JSON representation for portability |
| `createdAt` | string (ISO 8601) | Timestamp of creation |
| `updatedAt` | string (ISO 8601) | Timestamp of last update (overwrites) |

**Constraints**:
- `name` must be non-empty (1-120 characters)
- `id` is immutable after creation
- `filterBarState.items` must have at least one item (empty filters cannot be saved)

### SavedFiltersCollection

The persisted collection of all saved filter configurations for a workspace.

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Schema version for migration (starts at 1) |
| `configurations` | SavedFilterConfiguration[] | Ordered list, newest first |

**Constraints**:
- Maximum 100 configurations per collection
- Ordered by `updatedAt` descending (most recently saved/updated first)

## Relationships

```
SavedFiltersCollection 1──* SavedFilterConfiguration
SavedFilterConfiguration 1──1 FilterBarState (from #127)
SavedFilterConfiguration 1──1 CQL2 JSON (from #126)
```

## State Transitions

```
[No saved filters] ──save──> [Has saved filters]
[Has saved filters] ──save──> [Has saved filters] (adds entry)
[Has saved filters] ──delete──> [Has saved filters | No saved filters]
[Has saved filters] ──restore──> [Filter bar updated] (no state change to collection)
[Save with duplicate name] ──overwrite──> [Existing entry updated]
[Save with duplicate name] ──rename──> [New entry added with different name]
```

## Serialisation Notes

### FilterBarState Persistence

The `FilterBarState` from #127 is persisted as-is. When restoring, new UUIDs are generated for lozenge `id` fields to avoid stale references, but `filterType`, `value`, `negated`, and container structure are preserved exactly.

### CQL2 JSON Persistence

The CQL2 JSON is generated at save time via `filterExpressionToCql2Json()` from #126. It is stored for display/export purposes but is **not** used for restoration (FilterBarState is authoritative).

### Storage Key

- VS Code: `debrief.savedFilters` key in `workspaceState`
- Web-shell: `debrief-saved-filters` key in `localStorage`
