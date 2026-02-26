# Feature Specification: Unify Feature Pipeline

**Feature Branch**: `100-unify-feature-pipeline`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "Unify feature pipeline: single FeatureCollection from stacService — stacService.loadPlotData() should return one FeatureCollection instead of splitting into tracks/locations/otherFeatures; let React components classify by feature properties."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single FeatureCollection from Data Loading (Priority: P1)

As a developer maintaining the data loading pipeline, the plot data loading function returns a single collection of features rather than pre-classified arrays so that consumers receive one uniform data structure and classification logic lives closer to where it is needed — in the rendering layer.

**Why this priority**: This is the core change. Every downstream consumer depends on the data loading function's return shape. Changing it to a single collection is the foundation that all other stories build upon.

**Independent Test**: Can be fully tested by loading a plot file containing tracks, reference locations, and annotation shapes, and verifying the result is a single collection where each feature retains its original properties (`kind`, `geometry.type`, `times`, styling attributes).

**Acceptance Scenarios**:

1. **Given** a plot file with LineString features (tracks), Point features (reference locations), and Polygon features (annotations), **When** the plot data is loaded, **Then** the result is a single collection containing all features with their original properties preserved.
2. **Given** a plot file with only track features, **When** the plot data is loaded, **Then** the result is a single collection containing only those track features (no empty sub-arrays to handle).
3. **Given** a plot file with features that have styling properties (color, symbol interval, label interval, position style overrides), **When** the plot data is loaded, **Then** each feature in the collection retains all styling properties in a uniform way.
4. **Given** a plot file with features that have temporal data (times arrays), **When** the plot data is loaded, **Then** those features retain their times data as a property, accessible to any consumer that needs temporal filtering.

---

### User Story 2 - View Providers Pass Unified Collection (Priority: P2)

As a developer working on view providers (map panel, activity panel, layers tree), each view provider receives and forwards the single feature collection rather than managing separate arrays for tracks, locations, and other features.

**Why this priority**: View providers are the intermediary layer. Once the data loading returns a single collection (P1), the providers must be updated to pass it through. This removes the three-way split at the provider level.

**Independent Test**: Can be fully tested by verifying that each view provider accepts a single collection, stores it as one piece of state, and forwards it to webviews via a single message payload.

**Acceptance Scenarios**:

1. **Given** the data loading function returns a single feature collection, **When** a plot is opened, **Then** the map panel, activity panel, and layers tree provider each receive one collection instead of three separate arrays.
2. **Given** a view provider receives a single collection, **When** it forwards data to its webview, **Then** the message payload contains one collection (not three separate arrays).
3. **Given** new features are added to a plot (e.g., after importing a REP file), **When** the data is reloaded, **Then** the updated single collection is forwarded to all consumers without requiring separate update methods per feature type.

---

### User Story 3 - React Components Classify by Feature Properties (Priority: P3)

As a developer building rendering components, each React component classifies features by their properties (kind, geometry type, temporal data presence) rather than receiving pre-classified arrays, so that adding a new feature kind requires changes only in the rendering layer.

**Why this priority**: This completes the refactoring by moving classification responsibility to where it naturally belongs — the components that render specific feature types. It delivers the primary architectural benefit of the change.

**Independent Test**: Can be fully tested by passing a mixed feature collection to the map view component and verifying that tracks are rendered as lines with temporal playback, reference locations are rendered as markers, and annotations are rendered as shapes — all without pre-classification.

**Acceptance Scenarios**:

1. **Given** a single feature collection containing LineString features with temporal data, **When** the map view component receives it, **Then** it identifies and renders those features as tracks with temporal playback support.
2. **Given** a single feature collection containing Point features with location-type kind values, **When** the map view component receives it, **Then** it identifies and renders those features as reference location markers.
3. **Given** a single feature collection containing Polygon, Circle, or other annotation features, **When** the map view component receives it, **Then** it identifies and renders those features using the appropriate shape renderer.
4. **Given** a single feature collection, **When** the layers panel component receives it, **Then** it groups features by kind/type for display in the layer tree, preserving visibility and selection controls.

---

### User Story 4 - Backward-Compatible Behavior (Priority: P4)

As an end user of the application, all existing functionality (map display, temporal playback, layer visibility, selection, tool execution, result rendering) continues to work identically after the refactoring.

**Why this priority**: This is a refactoring — the user-visible behavior must not change. This story ensures no regressions.

**Independent Test**: Can be fully tested by running the full existing test suite and end-to-end workflow tests, confirming that plots load, tracks display with temporal playback, layers are listed with correct visibility controls, selections propagate, and tools execute against selected features.

**Acceptance Scenarios**:

1. **Given** a REP file with multiple tracks and annotations, **When** the user loads it into a plot, **Then** the map displays all tracks, locations, and shapes identically to the current behavior.
2. **Given** a loaded plot with temporal data, **When** the user adjusts the time slider, **Then** track display updates to show only the visible portion (snail trail mode or full mode).
3. **Given** multiple features in the layers panel, **When** the user toggles visibility or selects features, **Then** the map and all panels update consistently.
4. **Given** selected features that match a tool's input requirements, **When** the user executes a tool, **Then** the tool receives the correct features and produces results that display correctly.

---

### Edge Cases

- What happens when a feature has an unrecognized `kind` value? The system should render it using a generic fallback renderer (current "otherFeatures" behavior), not discard it.
- What happens when a feature has a LineString geometry but no `times` array? It should be treated as a non-temporal shape (e.g., a polyline annotation), not as a track.
- What happens when a feature has a null or empty geometry? It should be excluded from the collection (preserving current skip behavior).
- What happens when a plot has zero features after loading? The system should handle an empty collection gracefully (empty map, empty layers panel).
- What happens when result features are added after initial load? Result features from tool execution must integrate into the same unified collection model without requiring special handling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The data loading function MUST return a single flat collection of features instead of separate classified arrays.
- **FR-002**: Each feature in the collection MUST carry all properties needed for classification — including kind, geometry type, temporal data, and styling attributes — so that consumers can classify independently.
- **FR-003**: View providers MUST accept and forward a single feature collection rather than separate arrays for tracks, locations, and other features.
- **FR-004**: The message protocol between the extension host and webviews MUST carry a single feature collection instead of three separate arrays.
- **FR-005**: Rendering components MUST classify features by examining their properties (kind, geometry type, presence of temporal data) rather than relying on pre-classified input arrays.
- **FR-006**: The layers panel MUST group and display features by their kind/type, deriving the grouping from feature properties within the single collection.
- **FR-007**: Temporal filtering (time slider, display mode) MUST continue to work by identifying temporal features from their properties within the unified collection.
- **FR-008**: Selection and visibility state MUST continue to work across all features in the unified collection, propagating consistently between map, layers panel, and activity panel.
- **FR-009**: Tool execution MUST continue to receive correctly typed features by classifying from the unified collection at the point of use.
- **FR-010**: Features with unrecognized kind values MUST be rendered using a generic fallback, not discarded.
- **FR-011**: Session state initialization MUST work with the unified collection, deriving track and location metadata as needed.
- **FR-012**: The REP file import flow MUST reload and forward the unified collection to all consumers after adding new features to a plot.

### Key Entities

- **FeatureCollection**: A single flat collection of GeoJSON features returned by the data loading function. Contains all plot features regardless of type — tracks, reference locations, annotations, and tool results.
- **Feature Properties**: The discriminating attributes on each feature that consumers use for classification — `kind` (feature type identifier), `geometry.type` (spatial type), `times` (temporal data array), and styling properties (color, symbol interval, position style overrides).
- **View Provider**: An intermediary that receives the feature collection from the data loading layer and forwards it to its webview. Becomes a thin pass-through for the collection.
- **Rendering Component**: A React component that receives the full collection and is responsible for filtering/classifying features relevant to its rendering purpose.

## Assumptions

- The existing feature properties (`kind`, `geometry.type`, `times`, styling attributes) carry sufficient information for classification. No new properties need to be invented.
- The `DebriefFeature` type (used after transformation in the webview) already represents a unified feature model. The refactoring aligns the upstream pipeline with this existing downstream pattern.
- Tool result features already integrate as `DebriefFeature` items. This refactoring does not change how results are produced, only how initial plot features are transported.
- The layers tree provider can derive its tree structure (track group, location group, shape group) from feature properties rather than requiring separate input arrays.

## Dependencies

- No external dependencies. This is a self-contained internal refactoring.
- Consuming features (temporal playback, tool execution, layer visibility) are already implemented and must continue working.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The data loading function returns a single collection type — consumers receive one data structure instead of three separate arrays.
- **SC-002**: Adding a new feature kind to the system requires zero changes to the data loading function or view providers — only the rendering layer needs updating.
- **SC-003**: All existing tests (unit, integration, and end-to-end) pass without modification to test assertions, confirming behavioral equivalence.
- **SC-004**: The number of separate "set features" methods on view providers is reduced from three (setTracks, setLocations, setShapes) to one.
- **SC-005**: Plot loading, temporal playback, layer visibility, feature selection, and tool execution all function identically to pre-refactoring behavior as verified by end-to-end tests.
- **SC-006**: The message protocol between extension host and webview uses one collection field instead of three separate array fields for feature data.
