# Research: Filter Bar with Lozenge UI and AND/OR Logic

**Feature**: 127-filter-bar-lozenge-ui
**Date**: 2026-03-06

## R1: Drag-and-Drop Library Selection

### Decision: Use `@dnd-kit/core` + `@dnd-kit/sortable`

### Rationale
The filter bar requires drag-to-group: analysts drag lozenges into/out of OR containers. This needs accessible, keyboard-friendly DnD with container drop targets. `@dnd-kit` is the established React DnD library — modular, zero-dependency on deprecated HTML5 DnD API, built for React 18, supports accessibility (keyboard/screen reader) out of the box.

No existing DnD library is used in the codebase (only VS Code native drop APIs in `apps/vscode/`), so this is a new dependency.

### Key API Surface

- `DndContext` — wraps the draggable area, provides sensor configuration
- `useDraggable(id)` — makes a lozenge draggable
- `useDroppable(id)` — makes OR container a drop target
- `DragOverlay` — renders a floating preview during drag
- Sensors: `PointerSensor` (mouse/touch), `KeyboardSensor` (a11y)
- Collision detection: `closestCenter` for container drop targeting

### Alternatives Considered
- **react-beautiful-dnd**: Deprecated, no React 18 support in strict mode.
- **Native HTML5 DnD**: Poor accessibility, no touch support, complex container targeting.
- **CSS-only reorder**: Cannot handle cross-container movement (top-level ↔ OR group).

## R2: Filter Bar State Architecture

### Decision: Component-local state with Zustand slice for persistence hook

### Rationale
The filter bar state is UI-local: which lozenges exist, their values, and their grouping (AND/OR). This maps directly to the `FilterExpression` type from #126. The filter bar owns this state and passes it to the CQL2 filter engine for evaluation.

The existing session store (`services/session-state`) manages document state (temporal, spatial, features, results). Filter state is a new concern — it affects which items are shown in results but is not part of the document state itself (filters are transient discovery UI state, not saved with the plot).

Architecture:
1. **Filter bar component** owns `FilterExpression` state via `useState`/`useReducer`
2. On every filter change, the component calls `filterEngine.filter(allItems, expression)` to get filtered items
3. Filtered items are passed to results views (FeatureList, MapView, Timeline) via props or a lightweight context
4. CQL2 serialisation is available on demand via `filterEngine.toCql2Json(expression)`

This keeps the filter bar self-contained. When #128 (saved filters) is implemented, it can persist `FilterExpression` objects to/from storage.

### Alternatives Considered
- **Add filter slice to session store**: Over-engineering — filter state is transient UI state, not document state. Would add coupling between the discovery UI and the session store.
- **URL-based state**: Premature — no URL routing exists in Storybook or VS Code webview.

## R3: Lozenge Component Design

### Decision: Single `Lozenge` component with type-specific value editors

### Rationale
All 10 filter types share the same lozenge shell (pill shape, type label, value label, remove button, click-to-edit). They differ only in their value editor (hierarchical dropdown, flat dropdown, free-text input, bucket selector).

Component hierarchy:
- `FilterBar` — top-level container with add (+) button
- `Lozenge` — pill-shaped element, renders type label + value + remove button
- `OrContainer` — grouped lozenge wrapper with OR semantics and mini (+) button
- `FilterTypeMenu` — dropdown for selecting filter type when adding
- `ValueEditor` — polymorphic popover: hierarchical dropdown, flat dropdown, text input, or bucket selector based on filter type

### Alternatives Considered
- **Separate component per filter type**: 10 near-identical components with copy-paste lozenge rendering. Violates DRY.
- **Generic dropdown-only**: Cannot support hierarchical vessel class dropdown or free-text title search.

## R4: Value Editor Input Methods

### Decision: Four distinct input controls, selected by filter type

### Rationale
The SRD specifies different input methods per filter type:

| Input Method | Filter Types | Implementation |
|---|---|---|
| Hierarchical dropdown | Vessel Class | Tree selector with expandable parent nodes. Selecting a parent filters for all descendants. Uses the `VesselTaxonomyNode` tree from #126. |
| Flat dropdown | Plot Tag, Feature Tag, Author, Track Name, Nationality, Folder/Collection | Simple dropdown populated from distinct values in the data set. |
| Free-text input | Title, Plot Contents | Text field with debounced input. Case-insensitive substring match. |
| Bucket selector | Duration | Dropdown with 5 fixed options: `<6H`, `<24H`, `<72H`, `<10D`, `>10D`. |

The bucket selector is technically a flat dropdown with fixed options, but is distinct because its values are predefined (not data-driven). Can be implemented as a flat dropdown with hardcoded options.

## R5: Debounce Strategy

### Decision: 200ms debounce on filter changes, immediate on remove

### Rationale
FR-020 requires debouncing rapid filter changes. The performance goal (SC-001) requires results updating within 500ms. A 200ms debounce on value edits (typing in text fields, selecting from dropdowns) provides a good balance — fast enough to feel responsive, slow enough to avoid flicker.

Remove actions should be immediate (no debounce) since they are discrete user intentions, not intermediate states.

### Alternatives Considered
- **No debounce**: Free-text typing would trigger filter evaluation on every keystroke. With 100 items this is fast enough, but creates unnecessary re-renders.
- **500ms debounce**: Too sluggish for dropdown selections.

## R6: Integration with Existing Components

### Decision: FilterBar is a standalone component in `@debrief/components`, integrated via composition

### Rationale
The filter bar sits "above the results views" (FR-001). It does not modify existing components — it produces a filtered item list that replaces the unfiltered list passed to FeatureList, MapView, and Timeline.

Integration point: the parent page/panel that renders the discovery UI composes:
```
<FilterBar items={allItems} onFilteredItems={setFilteredItems} />
<FeatureList items={filteredItems} />
<MapView features={filteredItems} />
<Timeline items={filteredItems} />
```

This means no changes to existing components. The filter bar is additive.

### Alternatives Considered
- **HOC wrapping existing views**: Adds complexity, modifies existing component APIs.
- **Global filter context**: Would require all views to import and subscribe to a filter context. Over-engineering for the current scope.

## R7: Accessibility Considerations

### Decision: Full keyboard navigation, ARIA roles for filter bar

### Rationale
Constitution doesn't have an explicit accessibility article, but defence users may use keyboard-only navigation. The filter bar should support:

- Tab navigation between lozenges and the add button
- Enter/Space to open edit popover or activate remove
- Escape to close popovers
- Arrow keys within dropdown menus
- `@dnd-kit` provides keyboard DnD via KeyboardSensor

ARIA roles:
- Filter bar: `role="toolbar"` with `aria-label="Metadata filters"`
- Lozenge: `role="group"` with `aria-label="[Type]: [Value]"`
- Remove button: `aria-label="Remove [Type] filter"`
- OR container: `role="group"` with `aria-label="OR group"`
