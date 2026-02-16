# Research: Feature Format Menu

**Feature**: 097-feature-format-menu
**Date**: 2026-02-14

## R1: Cascading Menu Component Pattern

**Decision**: Build a new `CascadingMenu` component extending the existing `ContextMenu` pattern with hover-cascade sub-menus.

**Rationale**: The existing `ContextMenu` is flat (single-level). The format menu requires two levels: property list → value options. A dedicated cascading component provides cleaner separation than bolting nesting onto ContextMenu. The hover-cascade pattern (user chose option A) is the classic desktop approach and suits the VS Code webview environment where hover is reliable.

**Alternatives considered**:
- **Extend ContextMenu** with a `submenu` prop on `ContextMenuItem`: simpler integration, but ContextMenu has custom-input mode and validation logic that adds complexity. A clean cascading component can reuse ContextMenu's positioning logic without inheriting unnecessary features.
- **Click-drill navigation** (option B from Q3): replaces menu content on click with back button. Rejected by user in favour of hover-cascade.
- **Accordion/inline expand** (option C from Q3): all options visible in one panel. Rejected by user.

**Key design decisions**:
- Sub-menu appears to the right of the hovered parent item by default; flips left if insufficient viewport space (same viewport adjustment logic as ContextMenu).
- Small delay (150ms) on hover before opening sub-menu prevents accidental triggers when moving mouse across items.
- Keyboard navigation: Right arrow opens sub-menu, Left arrow closes sub-menu and returns to parent, Up/Down navigate within current level.
- Only one sub-menu open at a time per menu level.

## R2: Style Property Mapping per Feature Kind

**Decision**: Define a static mapping from `FeatureKindEnum` to the list of editable style properties and their value options.

**Rationale**: Each feature kind exposes a different set of style properties (tracks have line + point; points have fill + stroke; polygons have fill + stroke + border). A static map is simple, testable, and doesn't require runtime introspection.

**Property map**:

| Feature Kind | Style Properties |
|-------------|-----------------|
| TRACK | Line: colour, weight, opacity, dash pattern. Point: shape, fill colour, radius |
| POINT | Shape, fill colour, fill opacity, stroke colour, weight, radius |
| CIRCLE, RECTANGLE, POLY, MULTI_POLYGON | Fill colour, fill opacity, stroke colour, stroke weight, stroke opacity, dash pattern |
| LINE, MULTI_POINT | Stroke colour, weight, opacity, dash pattern |
| VECTOR | Stroke colour, weight |
| NARRATIVE, TEXT, SYSTEM | No editable style properties (format icon hidden) |

**Track positions** (when expanded): Same as POINT row — shape, fill colour, fill opacity, stroke colour, weight, radius. These modify `position_style_overrides[index]` rather than the track-level style.

## R3: Preset Colour Palette

**Decision**: Define a fixed palette of 16 standard colours used across all colour properties.

**Rationale**: User chose option A (preset palette only, no custom colour picker). A fixed palette ensures consistency, quick selection, and matches Debrief legacy behaviour. 16 colours provide adequate variety while fitting in a 4x4 grid layout.

**Palette** (aligned with naval/military conventions):
1. Red (#CC0000)
2. Dark Red (#800000)
3. Blue (#0000CC)
4. Dark Blue (#000080)
5. Green (#00CC00)
6. Dark Green (#006400)
7. Yellow (#FFD700)
8. Orange (#FF8C00)
9. Purple (#800080)
10. Cyan (#00BFFF)
11. Magenta (#FF00FF)
12. Brown (#8B4513)
13. White (#FFFFFF)
14. Light Grey (#C0C0C0)
15. Dark Grey (#404040)
16. Black (#000000)

**Alternatives considered**:
- **Preset + custom** (option B): adds full colour picker for arbitrary colours. Rejected by user. Can be added later without breaking changes.
- **Free-form only** (option C): full picker without presets. Rejected as too slow for common operations.

## R4: Numeric Value Presets

**Decision**: Define preset value sets for numeric style properties (line weight, opacity, radius).

**Rationale**: Consistent with the preset-only approach for colours. Named presets are easier to select than sliders or numeric inputs, especially in a cascading menu.

**Line weight presets**: 1, 2, 3, 4, 5, 8 (pixels)
**Opacity presets**: 25%, 50%, 75%, 100%
**Point radius presets**: 3, 5, 7, 10, 15 (pixels)
**Dash pattern presets**: Solid (none), Dashed ("10, 5"), Dotted ("2, 5"), Dash-Dot ("10, 5, 2, 5"), Long Dash ("20, 10")

## R5: Provenance Recording for Format Changes

**Decision**: Record format changes using the existing `LogService.recordToolResult()` pattern with a synthetic tool identity `format-feature-style`.

**Rationale**: The LogService and provenance schema already support arbitrary tool results with typed parameters. A format change fits naturally as a "tool result" — the tool is the formatting action, the parameters are the style property and new value, and the inputs are the affected feature IDs. This avoids creating a separate logging mechanism.

**Log entry structure**:
- `wasGeneratedBy.tool`: `"format-feature-style"`
- `wasGeneratedBy.toolVersion`: `"1.0.0"`
- `wasGeneratedBy.parameters`: `{ "property": { value: "line.color" }, "newValue": { value: "#CC0000" }, "previousValue": { value: "#0000CC" } }`
- `used`: array of affected feature IDs
- `generated`: empty (format is an in-place modification, not a new output)

**Batch operations**: Single `activityId` shared across all features in the batch. One `recordToolResult` call for the batch.

## R6: State Management for Style Updates

**Decision**: Add an `updateFeatureStyle` action to the `FeaturesSlice` in session-state that mutates the in-memory feature's `properties.style` and triggers a re-render.

**Rationale**: Currently there is no mutation API for feature styles in session-state. The existing pattern (`setTrackColor` in mapPanel) is ad-hoc and VS Code-specific. A store action provides a single source of truth that works across VS Code, web-shell, and future frontends.

**Flow**:
1. User selects a style value in the FormatMenu
2. FormatMenu calls `formatService.applyStyleChange(featureIds, property, value)`
3. `formatService` reads previous values, updates `properties.style` in the feature collection, records provenance via LogService
4. Store notifies subscribers → MapView re-renders with new styles
5. `stacService.writeGeoJson()` persists the updated feature collection to disk

**Alternatives considered**:
- **Direct Leaflet `setStyle()` calls**: avoids re-render but creates split between display state and data state. Rejected for consistency.
- **Message-passing to webview** (current pattern): works for VS Code but not web-shell. A store action is universal.

## R7: Batch Formatting with Mixed Types

**Decision**: Show the union of all style properties for mixed-type selections, with inapplicable properties greyed out and showing a tooltip.

**Rationale**: User chose option B. This is the most discoverable approach — analysts see all possible properties and understand which apply. Greyed-out items with tooltips educate users about the property model without blocking the workflow.

**Implementation**: When building the menu item list for batch formatting:
1. Collect the set of feature kinds in the selection
2. For each property in the union, determine which kinds support it
3. If all kinds support it → enabled
4. If some but not all → greyed out, tooltip shows "Not applicable to: [list of unsupported types]"
5. Applying a greyed-out property is a no-op (menu item is non-interactive)

## R8: Per-Point Style Override Persistence

**Decision**: Format changes to individual track points are stored in the track's `position_style_overrides` array at the corresponding index.

**Rationale**: The existing schema already defines `PositionStyleOverride` with `show_symbol`, `symbol`, `show_label`, and `label` fields. The rendering pipeline in `PositionSymbolsLayer` already reads these overrides via the `resolvePositionStyle` cascade. However, the current schema only supports symbol visibility and shape — not colour or size. For colour/size overrides on individual points, the `PositionStyleOverride` schema will need extension (tracked as a schema change).

**Schema extension needed**: Add optional `fill_color`, `stroke_color`, `radius`, `fill_opacity`, and `stroke_opacity` to `PositionStyleOverride` in `styling.yaml`. These fields follow the same nullable pattern — null means "use track default".
