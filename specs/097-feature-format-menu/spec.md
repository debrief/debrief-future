# Feature Specification: Feature Format Menu

**Feature Branch**: `097-feature-format-menu`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "Add the ability for analysts to format plot features via a format icon button on each feature in the Layers component, opening a cascading popup context menu with editable properties. Tracks can be expanded to format individual track points. Changes are recorded to the PROV log."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Format a Single Feature via Row Icon (Priority: P1)

An analyst is reviewing a plot and wants to change the colour of a specific track to distinguish it from others. They click the format icon on that track's row in the Layers panel. A cascading popup menu appears showing the editable style properties for that track (line colour, line weight, line dash, point shape, point colour, etc.). They hover over "Line Colour" and a sub-menu appears with a palette of preset colours. They select blue. The track immediately updates on the map, and the change is recorded in the provenance log.

**Why this priority**: Single-feature formatting from the row icon is the most common use case and the core of the feature. Without this, no formatting is possible.

**Independent Test**: Can be fully tested by loading a plot with at least one track, clicking the format icon, selecting a colour, and verifying the map updates and a provenance entry is created.

**Acceptance Scenarios**:

1. **Given** a plot with a track feature displayed in the Layers panel, **When** the analyst clicks the format icon on that track's row, **Then** a cascading popup menu appears showing the editable style properties for tracks.
2. **Given** the format popup is open for a track, **When** the analyst hovers over "Line Colour", **Then** a sub-menu appears showing the preset colour palette.
3. **Given** the colour sub-menu is visible, **When** the analyst clicks a colour, **Then** the track's line colour updates immediately on the map, the menu closes, and a provenance log entry is recorded.

---

### User Story 2 - Format Individual Track Points (Priority: P2)

An analyst has a track expanded in the Layers panel, showing individual position rows. They want to highlight a specific waypoint (e.g., a contact detection point) by changing its symbol and colour. They click the format icon on that point's row. The cascading menu shows point-specific properties (symbol shape, fill colour, stroke colour, size). They change the symbol to a diamond and the fill colour to red. The point updates on the map and the change is logged.

**Why this priority**: Per-point formatting is a key differentiator from bulk track styling and enables analysts to highlight significant positions within a track. Since each point already has its own row when a track is expanded, the UI pattern is consistent with Story 1.

**Independent Test**: Can be fully tested by loading a plot with a track, expanding it in Layers to show individual points, clicking the format icon on one point, changing its symbol, and verifying only that point updates on the map.

**Acceptance Scenarios**:

1. **Given** a track is expanded in the Layers panel showing individual position rows, **When** the analyst clicks the format icon on a specific point row, **Then** a cascading popup menu appears showing point-specific style properties (symbol shape, fill colour, stroke colour, size).
2. **Given** the point format popup is open, **When** the analyst selects a new symbol shape (e.g., diamond), **Then** only that specific point's symbol changes on the map while other points on the same track remain unchanged.
3. **Given** a point's style has been individually overridden, **When** the analyst views the track in the Layers panel, **Then** the point row's colour indicator reflects the overridden style rather than the track's default.

---

### User Story 3 - Batch Format via Toolbar Button (Priority: P3)

An analyst has selected three features (two tracks and a point location) and wants to change all their colours to green for a briefing. They click the format button in the toolbar. The cascading menu appears showing the union of all editable properties — properties that don't apply to some features in the selection are greyed out (e.g., "Line Dash" is greyed out because point locations don't have line properties). They hover over "Colour" and select green. All three features update on the map. A single provenance log entry records the batch operation.

**Why this priority**: Batch formatting builds on the per-row formatting (P1) and is a productivity accelerator. It requires the union-with-greyed-out-inapplicable approach to handle mixed feature types.

**Independent Test**: Can be fully tested by loading a plot with multiple feature types, selecting several, clicking the toolbar format button, applying a colour change, and verifying all selected features update.

**Acceptance Scenarios**:

1. **Given** multiple features of different types are selected, **When** the analyst clicks the format toolbar button, **Then** the popup shows the union of all style properties, with inapplicable properties visually greyed out.
2. **Given** the batch format popup is open for a mixed selection, **When** the analyst hovers over a greyed-out property, **Then** a tooltip explains which feature types in the selection don't support that property.
3. **Given** the analyst selects a colour from the batch format popup, **When** the change is applied, **Then** all selected features update to the new colour, a single provenance log entry is created referencing all affected features, and the selection state is preserved.

---

### User Story 4 - Format a Non-Track Feature (Priority: P3)

An analyst wants to change the fill colour and border of a reference location (point marker) or an annotation (circle, rectangle, polygon). They click the format icon on that feature's row. The menu shows the appropriate properties for that feature kind — e.g., fill colour, fill opacity, stroke colour, and stroke weight for a polygon; symbol shape, colour, and size for a point location.

**Why this priority**: Ensures the format menu is not track-specific and works across all feature kinds. Shares priority with batch formatting as both extend the core single-feature flow.

**Independent Test**: Can be fully tested by loading a plot with a reference location or annotation, clicking the format icon, and verifying the correct set of style properties is shown for that feature kind.

**Acceptance Scenarios**:

1. **Given** a reference location (point) is displayed in the Layers panel, **When** the analyst clicks its format icon, **Then** the menu shows point-specific properties: symbol shape, fill colour, stroke colour, and size.
2. **Given** a polygon annotation is displayed in the Layers panel, **When** the analyst clicks its format icon, **Then** the menu shows polygon properties: fill colour, fill opacity, stroke colour, stroke weight.
3. **Given** the analyst changes a polygon's fill opacity, **When** the change is applied, **Then** the polygon renders with the new opacity on the map and a provenance entry is recorded.

---

### Edge Cases

- What happens when the analyst clicks the format icon on a feature that has no editable style properties (e.g., a system-generated feature)? The format icon should be hidden or disabled for such features.
- What happens when a cascading sub-menu would extend beyond the viewport? The sub-menu should reposition to stay within visible bounds (open to the left instead of right, or above instead of below).
- What happens when the analyst opens a format menu, then clicks elsewhere on the page? The menu should close without applying any changes.
- What happens when the analyst formats a track point individually and then applies a bulk track format? The individual point override should be preserved — bulk track formatting only changes the track's default style, not per-point overrides.
- What happens when the analyst undoes a format change? The provenance log entry supports undo, reverting the style to its previous value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each feature row in the Layers panel MUST display a format icon button that opens a cascading popup menu when clicked.
- **FR-002**: The format toolbar button in the selection-scoped toolbar group MUST operate on all currently selected features and be disabled when no features are selected.
- **FR-003**: The cascading popup menu MUST display only the editable style properties relevant to the feature's kind (track, point, polygon, line, etc.).
- **FR-004**: Each style property in the menu MUST open a hover-cascade sub-menu showing the available values for that property.
- **FR-005**: Colour properties MUST present a preset palette of standard colours (approximately 16-20 colours).
- **FR-006**: Numeric properties (e.g., line weight, opacity) MUST present a set of predefined common values (e.g., line weights: 1, 2, 3, 5, 8 pixels; opacity: 25%, 50%, 75%, 100%).
- **FR-007**: Shape/symbol properties MUST present the available shapes as labelled options (circle, square, triangle, diamond, cross).
- **FR-008**: When a track is expanded in the Layers panel, each individual track point row MUST have its own format icon that allows per-point style overrides.
- **FR-009**: Per-point style overrides MUST be independent of the parent track's default style — changing the track's style MUST NOT overwrite existing per-point overrides.
- **FR-010**: When multiple features of mixed types are selected, the toolbar format menu MUST show the union of all style properties, with properties inapplicable to some selected features greyed out and non-interactive.
- **FR-011**: Greyed-out properties in a mixed-type batch format MUST show a tooltip explaining which feature types don't support that property.
- **FR-012**: Every format change (single feature, per-point, or batch) MUST create a provenance log entry recording the operation, including the previous and new values.
- **FR-013**: Batch format operations MUST create a single provenance log entry referencing all affected features.
- **FR-014**: Style changes MUST be reflected immediately on the map without requiring a manual refresh.
- **FR-015**: The format icon MUST be hidden or disabled for feature kinds that have no editable style properties.
- **FR-016**: Cascading sub-menus MUST reposition to remain within the visible viewport.
- **FR-017**: The format menu MUST close when the analyst clicks outside it or presses Escape.
- **FR-018**: All menu labels MUST be externalisable for internationalisation.

### Key Entities

- **Style Properties**: The set of visual attributes that can be modified per feature kind — includes colour, opacity, weight/thickness, dash pattern, and symbol shape. Different feature kinds expose different subsets of these properties.
- **Preset Colour Palette**: A fixed set of approximately 16-20 standard colours used across all colour properties. Provides consistency and quick selection without a custom colour picker.
- **Per-Point Style Override**: An individual position within a track that has style properties different from the track's default. Stored as indexed style properties on the position.
- **Format Provenance Entry**: A provenance log record capturing a format change — includes the feature(s) affected, the property changed, previous value, new value, and timestamp.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Change the visual appearance of one or more plot features to improve readability, distinguish features, or prepare the plot for a briefing.
- **Key Decision(s)**:
  1. Which feature(s) to format (single via row icon, or batch via toolbar with selection)
  2. Which visual property to change (colour, line weight, symbol shape, opacity, etc.)
  3. What value to set the property to (from preset options)
- **Decision Inputs**: The current visual appearance of the feature on the map and its current style properties displayed in the menu. The analyst can see the feature's existing colour indicator on the row and the current values highlighted or marked in the sub-menus.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Layers panel showing feature rows, each with a format icon | Analyst clicks format icon on a feature row (or selects features and clicks toolbar format button) | Cascading popup menu appears anchored to the icon, showing style properties for that feature kind |
| 2 | Format popup open, listing properties (e.g., Line Colour, Line Weight, Point Shape) | Analyst hovers over a property (e.g., "Line Colour") | Sub-menu cascades out showing preset colour palette |
| 3 | Sub-menu open showing value options | Analyst clicks a value (e.g., a blue colour swatch) | Feature updates immediately on the map, menu closes, provenance entry is recorded |
| 4 | (Track formatting variant) Track expanded showing point rows | Analyst clicks format icon on an individual point row | Point-specific format popup appears with point style properties |
| 5 | (Batch variant) Multiple features selected, toolbar format button active | Analyst clicks toolbar format button | Union popup appears with inapplicable properties greyed out |

### UI States

- **Empty State**: Format icon is hidden or disabled on features that have no editable style properties (e.g., system features).
- **Loading State**: Not applicable — style changes are instantaneous in-memory operations with no asynchronous loading.
- **Error State**: If a style change cannot be persisted to the STAC store (e.g., file write failure), a brief warning notification appears. The in-memory change is still applied so the analyst can continue working.
- **Success State**: The feature's appearance updates immediately on the map. The feature row's colour indicator updates to reflect the new style. No explicit success message — the visual change is the confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can change any single feature's colour in 3 clicks or fewer (click format icon, hover property, click colour).
- **SC-002**: Analysts can format an individual track point without affecting other points on the same track.
- **SC-003**: Batch formatting of up to 20 selected features completes and updates the map within 1 second.
- **SC-004**: Every format change produces a provenance log entry that captures the previous and new values, enabling full undo.
- **SC-005**: 100% of format changes are immediately visible on the map without manual refresh.
- **SC-006**: The format menu correctly adapts its property list for all supported feature kinds (tracks, points, polygons, lines, circles, rectangles).

## Assumptions

- The existing preset colour palette (~16-20 colours) will be defined once and shared across all colour properties. The specific colours will be determined during implementation, drawing from standard naval/military conventions.
- Line dash patterns will be presented as named presets (e.g., "Solid", "Dashed", "Dotted", "Dash-Dot") rather than as raw numeric arrays.
- The format icon will use a paintbrush or palette icon consistent with the existing VS Code icon language.
- Per-point style overrides are stored as indexed position style properties on the track feature, not as separate entities.
- The format menu does not include text formatting (font, size) — only geometric style properties.
