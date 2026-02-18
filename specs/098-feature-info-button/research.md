# Research: Feature Info Button

**Feature**: 098-feature-info-button
**Date**: 2026-02-17

## Research Questions

### RQ-1: How should the info button integrate with the existing FeatureRow layout?

**Decision**: Add the info button as a new `<span>` element immediately after the format icon in FeatureRow.tsx, using an identical pattern (same CSS class structure, same visibility behaviour, same event handling pattern).

**Rationale**: The format icon (Feature 097) established the pattern for action buttons in feature rows:
- Hidden by default, visible on hover/selection via CSS opacity transition
- 20x20px clickable area with 3px border-radius
- `role="button"` with `tabIndex={-1}` and `data-testid`
- `e.stopPropagation()` to prevent row selection on icon click
- Separate handlers for parent features (`onInfoClick`) and child rows (`onChildInfoClick`)

Cloning this pattern ensures visual consistency and reduces implementation risk.

**Alternatives considered**:
1. **Toolbar button** — Rejected: would require row selection first; the spec requires per-row button.
2. **Context menu item** — Rejected: would be hidden behind a right-click; the spec requires visible "i" button.
3. **Tooltip on hover** — Rejected: not accessible to Playwright without extra workarounds; a dialog is more robust.

### RQ-2: What dialog pattern should be used for the geometry display?

**Decision**: Create a new `GeometryDialog` component using `position: fixed` with viewport collision detection, following the CascadingMenu positioning pattern. The dialog uses `role="dialog"` with `aria-label` for accessibility.

**Rationale**: The existing CascadingMenu (used by FormatMenu) provides a proven pattern:
- State held in parent (ActivityPanel), nullable to represent open/closed
- `useLayoutEffect` for viewport collision detection
- Click-outside dismissal via `mousedown` listener on document
- Escape key dismissal via `keydown` handler
- `position: fixed; z-index: 1000` for consistent stacking

The key difference from CascadingMenu: this is a **read-only display dialog**, not a menu with selectable items. So it needs:
- `role="dialog"` instead of `role="menu"`
- No keyboard item navigation (just Escape to close)
- A close button ("x") in the header for explicit dismissal
- Structured geometry content instead of menu items

**Alternatives considered**:
1. **Reuse CascadingMenu** — Rejected: CascadingMenu is designed for selectable items with keyboard navigation. A read-only dialog is semantically different.
2. **VS Code-native dialog** — Rejected: would require postMessage to extension host; the component library must be framework-agnostic.
3. **Inline expansion** — Rejected: would disrupt the virtualised list layout and conflict with the existing expand/collapse mechanism.

### RQ-3: How should geometry coordinates be formatted for display?

**Decision**: Display geometry type as a heading, then render coordinates as a formatted list. For LineString/MultiPoint, show each coordinate pair on its own line. For Point, show the single coordinate. For MultiPolygon, show nested rings with clear visual hierarchy.

**Rationale**: The primary consumer is Playwright test scripts that need to:
1. Find the dialog by `role="dialog"` + `aria-label`
2. Read the geometry type from a labelled element (`data-testid="geometry-type"`)
3. Read individual coordinates from labelled elements (`data-testid="geometry-coordinates"`)

A structured layout with `data-testid` attributes enables reliable automated extraction while remaining human-readable.

**Format specification**:
- **Geometry type**: Displayed as text in a header element with `data-testid="geometry-type"`
- **Coordinates**: Displayed in a `<pre>` or structured list with `data-testid="geometry-coordinates"`, using JSON-like formatting (numbers with existing precision)
- **Empty state**: "No coordinates" text when coordinate array is empty

**Alternatives considered**:
1. **Raw JSON blob** — Rejected: harder to read for humans; harder to selectively query for tests.
2. **Table layout** — Rejected: doesn't handle nested arrays (MultiPolygon) well.
3. **Map preview** — Rejected: spec explicitly states "plain text / structured markup, not a map preview".

### RQ-4: How should child row geometry be accessed?

**Decision**: For child rows (positions, points, polygons), construct a synthetic geometry object from the DisplayItem's index and parent feature. Positions get `{ type: "Point", coordinates: [lon, lat] }`. Points and polygons extract their respective element from the parent's coordinate array.

**Rationale**: The `DisplayItem` type includes `parentId` and `index` fields, which together identify the specific child element within the parent feature's geometry. The parent feature is accessible via the features collection. This approach:
- Requires no changes to the DisplayItem type
- Works with the existing flattenFeatures pipeline
- Provides accurate per-element geometry

**Alternatives considered**:
1. **Add geometry to DisplayItem** — Rejected: would increase memory footprint of every flattened row; geometry is readily derivable.
2. **Only show parent geometry** — Rejected: spec FR-008 requires child-specific geometry.

### RQ-5: What icon should be used for the info button?

**Decision**: Use a circled "i" SVG icon, consistent with the existing 14x14 viewBox pattern used by the format (pencil) and hidden (eye-slash) icons.

**Rationale**: The spec (FR-009) requires "a recognisable information icon (e.g., circled 'i')". A circled "i" is universally understood as an information indicator. The SVG will match the existing icon style:
- 14x14 width/height, 0 0 16 16 viewBox
- `fill="none"` with `stroke="currentColor"`, `strokeWidth="1.5"`
- `strokeLinecap="round"`, `strokeLinejoin="round"`

**SVG path**: Circle (`cx="8" cy="8" r="6"`) + vertical line for the "i" dot (`M8 7v4`) + dot (`M8 5v0.5`)

**Alternatives considered**:
1. **vscrui icon** — Rejected: the project uses inline SVGs for feature row icons, not the vscrui icon library (which is used in the toolbar).
2. **Text "i"** — Rejected: wouldn't scale consistently across themes; SVG provides precise control.

## Dependencies

No new dependencies required. All implementation uses existing:
- React 18.x (component framework)
- CSS custom properties (theming)
- Vitest + @testing-library/react (unit testing)
- Storybook 8.x (visual development)
- Playwright (E2E testing)

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dialog interferes with virtualised list scrolling | Low | Medium | Use `position: fixed` (same as CascadingMenu), which is independent of scroll container |
| Large coordinate arrays make dialog unwieldy | Medium | Low | Limit display to first N coordinates with "and X more" indicator for very long tracks |
| Info button crowds the row on narrow panels | Low | Low | Same 20px width as format icon; both hide when not hovered |
