# Research: Saved Filter Configurations (#128)

**Date**: 2026-03-07
**Feature**: 128-saved-filter-configurations

## R1: What to Persist — FilterBarState vs CQL2 JSON

**Decision**: Persist **FilterBarState** (the UI-level lozenge/container structure) alongside a CQL2 JSON representation.

**Rationale**: CQL2 JSON alone is lossy — it cannot reconstruct the exact lozenge arrangement (item order, OR container grouping, lozenge IDs). FilterBarState preserves the exact UI state for faithful restoration. CQL2 JSON is stored alongside for portability and display purposes.

**Alternatives considered**:
- CQL2 JSON only: Cannot reconstruct OR container groupings or lozenge order. Rejected.
- FilterExpression (engine-level): Missing UI metadata (lozenge IDs). Rejected.
- FilterBarState only: Sufficient but adding CQL2 for portability is low cost. Hybrid chosen.

## R2: Persistence Mechanism

**Decision**: Use a **platform-agnostic persistence interface** with two implementations:
1. **VS Code**: `context.workspaceState.get/update` (existing pattern from openPlotsService, recentPlotsService)
2. **Web-shell**: `localStorage` (existing pattern from layoutPersistence.ts)

**Rationale**: Both platforms already use these mechanisms for workspace-scoped persistence. Following established patterns minimises risk and keeps the feature offline-capable (Constitution Art. I.1).

**Alternatives considered**:
- Zustand session-state store: Session store is for ephemeral UI state (temporal, spatial, selection), not user preferences. Saved filters are a configuration concern. Rejected.
- File-based (XDG config): Would require file system access from the webview; overly complex for this scope. Rejected.
- debrief-config service: Service exists but is for Python-side configuration; adding TypeScript persistence there adds unnecessary coupling. Rejected.

## R3: Naming Auto-Generation

**Decision**: Auto-generate names by joining filter type labels and values with " + ", truncated at 60 characters with "..." suffix.

**Rationale**: Provides meaningful default names without requiring user input. Mirrors the visible lozenge labels so the name is immediately recognisable.

**Alternatives considered**:
- Timestamp-based names ("Filter 2026-03-07 14:30"): Not descriptive. Rejected.
- Sequential numbering ("Filter 1", "Filter 2"): Not descriptive. Rejected.

## R4: Duplicate Name Handling

**Decision**: Show a confirmation prompt when saving with a name that already exists, offering "Overwrite" or "Rename" options.

**Rationale**: Prevents accidental data loss while keeping the save flow quick. Standard UX pattern.

## R5: Save Location in Filter Bar

**Decision**: Add a Save button (disk icon) at the right end of the filter bar, and a Historic Filters dropdown (clock/history icon) adjacent to it.

**Rationale**: Co-locating save/restore controls with the filter bar creates a natural workflow. The icons are standard and self-documenting.

## R6: Component Architecture

**Decision**: Implement as two new components in `shared/components/src/FilterBar/`:
1. `SaveFilterButton` — handles save action, name prompt popover
2. `HistoricFiltersDropdown` — handles list display, restore, delete

Plus a `useSavedFilters` hook for persistence logic and a `savedFiltersStorage` module for the platform-agnostic storage interface.

**Rationale**: Follows the existing FilterBar component decomposition pattern. The hook separates persistence concerns from rendering. The storage abstraction enables both VS Code and web-shell to use the same components.

**Alternatives considered**:
- Single monolithic component: Violates existing decomposition patterns. Rejected.
- Separate panel/view: Over-engineered for a dropdown. Rejected.
