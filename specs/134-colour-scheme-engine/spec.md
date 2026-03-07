# Feature Specification: Colour Scheme Engine with Legend

**Feature Branch**: `134-colour-scheme-engine`
**Created**: 2026-03-07
**Status**: Draft
**Epic**: E08 — STAC Stack Browser Discovery UI
**Input**: User description: "[E08] Colour scheme engine with legend — configurable colour dimension (age/vessel class/tag), shared legend for map and timeline views (requires #130, #131)"
**Depends on**: #130 (Map View with Live Spatial Filtering), #131 (Timeline/Gantt View with Temporal Filtering)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Switch Colour Dimension (Priority: P1)

An analyst viewing exercises across the map and timeline wants to colour-code them by a meaningful property. They open a colour dimension selector and choose from available dimensions — Age, Vessel Class, or Tag. All exercise representations across the map and timeline immediately update to reflect the chosen colour dimension, allowing the analyst to spot patterns at a glance.

**Why this priority**: Without the ability to select and apply a colour dimension, the entire feature has no function. This is the foundational capability that all other stories depend on.

**Independent Test**: Can be fully tested by selecting each colour dimension in turn and verifying that exercise representations change colour across all views.

**Acceptance Scenarios**:

1. **Given** the Discovery UI is open with exercises loaded, **When** the analyst selects "Age" as the colour dimension, **Then** all exercise representations on the map and timeline are coloured using an age-based gradient (most recent = vivid, oldest = faded).
2. **Given** the colour dimension is currently "Age", **When** the analyst switches to "Vessel Class", **Then** all exercise representations update to show one distinct colour per vessel class.
3. **Given** the colour dimension is currently "Vessel Class", **When** the analyst switches to "Tag", **Then** all exercise representations update to show colours assigned per tag value.
4. **Given** exercises are visible in both the map and timeline views, **When** any colour dimension is selected, **Then** the same exercise uses the same colour in both views.

---

### User Story 2 — View Legend Explaining Colour Encoding (Priority: P1)

An analyst needs to understand what the colours mean. A legend is visible alongside both the map and timeline views, clearly explaining the current colour encoding. The legend updates automatically when the colour dimension changes.

**Why this priority**: Without a legend, colour coding is meaningless — analysts cannot interpret the visual encoding. Co-prioritised with P1 because the colour dimension selector and legend together form the minimum useful feature.

**Independent Test**: Can be tested by selecting each colour dimension and verifying the legend displays accurate labels and colour swatches matching the exercises.

**Acceptance Scenarios**:

1. **Given** the "Vessel Class" dimension is active with 5 vessel classes present, **When** the analyst views the legend, **Then** the legend shows 5 entries, each with a colour swatch and the vessel class name.
2. **Given** the "Age" dimension is active, **When** the analyst views the legend, **Then** the legend shows a gradient bar with labels for the oldest and most recent dates in the dataset.
3. **Given** the colour dimension changes from "Age" to "Tag", **When** the legend updates, **Then** the legend transitions from a gradient display to discrete colour entries with tag labels.
4. **Given** the legend is visible, **When** the analyst compares a colour swatch in the legend to an exercise on the map, **Then** the colours match exactly.

---

### User Story 3 — Default Behaviour with No Colour Scheme (Priority: P2)

When no colour dimension is explicitly selected, exercises display using a visually distinct default colour. This ensures the map and timeline remain usable before the analyst engages with colour configuration.

**Why this priority**: Provides a sensible fallback so that exercises are always visible and distinguishable, but is secondary to the active colour selection and legend functionality.

**Independent Test**: Can be tested by loading the Discovery UI without selecting any colour dimension and verifying all exercises render in a default colour.

**Acceptance Scenarios**:

1. **Given** the Discovery UI loads for the first time, **When** no colour dimension has been selected, **Then** all exercises display in a default colour that is visually distinct from the map/timeline background.
2. **Given** the analyst has previously selected "Vessel Class", **When** the analyst deselects or resets the colour dimension, **Then** all exercises revert to the default colour and the legend is hidden or shows "No colour scheme active".

---

### User Story 4 — Extensible Colour Dimensions (Priority: P3)

The colour scheme engine supports adding new colour dimensions beyond the initial three (Age, Vessel Class, Tag). A new dimension can be registered and immediately appears in the selector, without modifying existing dimensions or the legend component.

**Why this priority**: Extensibility is an architectural quality that enables future growth but is not required for immediate analyst workflows. The three initial dimensions cover the known use cases.

**Independent Test**: Can be tested by registering a new colour dimension (e.g., "Exercise Type") and verifying it appears in the selector and produces correct colours and legend entries.

**Acceptance Scenarios**:

1. **Given** a new colour dimension "Exercise Type" has been registered, **When** the analyst opens the colour dimension selector, **Then** "Exercise Type" appears alongside Age, Vessel Class, and Tag.
2. **Given** the analyst selects the new "Exercise Type" dimension, **When** exercises render, **Then** each exercise is coloured by its exercise type and the legend shows the type-to-colour mapping.

---

### Edge Cases

- What happens when an exercise lacks metadata for the selected dimension (e.g., no vessel class assigned)? Exercises without metadata for the active dimension display in a neutral "unclassified" colour, and the legend includes an "Unclassified" entry.
- What happens when there are more categories than distinguishable colours (e.g., 30+ tags)? The engine assigns colours from a palette that maximises perceptual distinctness, recycling colours with modified brightness/saturation when the palette is exhausted. The legend shows all categories regardless.
- What happens when the dataset has only one exercise? The colour scheme applies normally — a single exercise still receives its assigned colour and the legend displays one entry.
- What happens when the date range for the "Age" dimension is zero (all exercises on the same date)? All exercises receive the same "most recent" colour and the legend gradient collapses to a single label.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a colour dimension selector allowing the analyst to choose from available colour dimensions (initially: Age, Vessel Class, Tag).
- **FR-002**: System MUST apply the selected colour dimension consistently across map and timeline views — the same exercise MUST use the same colour in both views.
- **FR-003**: System MUST display a legend that explains the current colour encoding, visible alongside both map and timeline views.
- **FR-004**: The legend MUST update automatically when the colour dimension changes, reflecting the new encoding.
- **FR-005**: For the "Age" dimension, the system MUST assign colours using a gradient encoding where the most recent exercises are vivid and the oldest are faded, scaled to the date range of the current dataset.
- **FR-006**: For the "Vessel Class" dimension, the system MUST assign one distinct colour per vessel class present in the dataset.
- **FR-007**: For the "Tag" dimension, the system MUST assign one distinct colour per unique tag value.
- **FR-008**: When no colour dimension is selected, all exercises MUST display in a visually distinct default colour.
- **FR-009**: Exercises missing metadata for the active colour dimension MUST display in a neutral "unclassified" colour, and the legend MUST include an "Unclassified" entry.
- **FR-010**: The system MUST support registering new colour dimensions without modifying existing dimensions or the legend component.
- **FR-011**: The colour palette MUST provide perceptually distinguishable colours for up to at least 12 discrete categories. Beyond that limit, colours MAY be recycled with modified brightness or saturation.
- **FR-012**: The legend MUST differentiate between gradient dimensions (showing a gradient bar with range labels) and categorical dimensions (showing discrete colour swatches with category labels).

### Key Entities

- **Colour Dimension**: A named strategy for mapping exercise metadata to colours. Has a unique identifier, display label, and type (gradient or categorical). Examples: "Age", "Vessel Class", "Tag".
- **Colour Assignment**: The result of applying a colour dimension to an exercise — a mapping from exercise identifier to a specific colour value. Consumed by map and timeline views.
- **Legend Model**: A description of the current colour encoding suitable for rendering. For gradient dimensions: min/max labels and gradient stops. For categorical dimensions: a list of category label / colour pairs.
- **Colour Palette**: An ordered set of perceptually distinct colours used by categorical dimensions. Shared across all categorical dimensions to ensure consistency.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Choose a colour-coding strategy to visually distinguish exercises by a meaningful property.
- **Key Decision(s)**:
  1. Which colour dimension to apply (Age, Vessel Class, Tag, or none)
- **Decision Inputs**: The analyst sees exercises on the map and timeline; the colour dimension selector shows available options; the legend explains the current encoding to help the analyst assess whether the chosen dimension reveals useful patterns.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|-------------|-------------|--------|
| 1 | Discovery UI loaded, no colour scheme active | Analyst locates the colour dimension selector | Selector shows available dimensions (Age, Vessel Class, Tag) |
| 2 | Selector open | Analyst selects "Vessel Class" | Exercises on map and timeline update to show vessel class colours; legend appears with vessel class entries |
| 3 | Colour scheme active | Analyst switches to "Age" | Exercises transition to age gradient; legend changes to gradient bar with date range labels |
| 4 | Colour scheme active | Analyst resets/deselects colour dimension | Exercises revert to default colour; legend hides or shows "No colour scheme active" |

### UI States

- **Empty State**: No colour dimension selected — exercises display in default colour, legend is either hidden or shows "No colour scheme active".
- **Loading State**: When switching dimensions on a large dataset, a brief transition occurs as colours recalculate. No spinner needed for typical dataset sizes.
- **Error State**: If a colour dimension fails to resolve (e.g., metadata unavailable), the system falls back to the default colour and the legend shows a message indicating the dimension could not be applied.
- **Success State**: Exercises are colour-coded according to the selected dimension, the legend accurately describes the encoding, and colours are consistent across map and timeline views.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can switch between all available colour dimensions and see exercises update across both views within 500 milliseconds.
- **SC-002**: The legend accurately represents the current colour encoding — every colour visible on the map and timeline has a corresponding entry in the legend.
- **SC-003**: Colour consistency is maintained: given the same exercise and the same colour dimension, the exercise displays the same colour in the map view and the timeline view, verified by automated tests.
- **SC-004**: The system supports at least 12 distinct categories for categorical dimensions with perceptually distinguishable colours, verified by colour contrast checks.
- **SC-005**: A new colour dimension can be added and appears functional (selector, legend, colour assignment) without modifications to existing dimension code, verified by adding a test dimension.
- **SC-006**: Exercises without metadata for the active dimension are clearly identifiable as "unclassified" in both views and the legend.

## Assumptions

- The Discovery UI framework from #130 and #131 provides a mechanism for views (map, timeline) to subscribe to shared state changes (e.g., the active colour dimension).
- Exercise metadata (vessel class, tags, temporal extent) is available from the STAC item properties as defined by the STAC extension (#125).
- The initial three colour dimensions (Age, Vessel Class, Tag) cover the primary analyst needs; additional dimensions will be added via the extensibility mechanism in future features.
- Colour accessibility (e.g., colour-blind-friendly palettes) is desirable but will be addressed as a separate enhancement if needed.
