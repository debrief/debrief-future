# Feature Specification: Shared React Component Library

**Feature Branch**: `001-shared-react-components`
**Created**: 2026-01-16
**Status**: Draft
**Input**: User description: "Create shared React component library (shared/components)" (BACKLOG.md item 003)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Display Map with Features (Priority: P1)

A developer building the VS Code extension webview needs to display a map showing track features from a plot. They import the map component from the shared library and pass GeoJSON features. The map renders with proper styling, zoom controls, and feature visibility.

**Why this priority**: The map is the core visualization for Debrief - displaying tracks spatially is the primary value proposition. Without this, the platform cannot visualize maritime data.

**Independent Test**: Import the MapView component in a test harness, pass valid GeoJSON track data, verify the map renders and features are visible on the map canvas.

**Acceptance Scenarios**:

1. **Given** a React application with the shared library installed, **When** the developer renders a MapView with a GeoJSON FeatureCollection, **Then** the map displays with all features visible at an appropriate zoom level
2. **Given** a MapView displaying features, **When** the user interacts with zoom controls, **Then** the map zooms in/out while maintaining feature visibility
3. **Given** a MapView with track features, **When** features are updated (new FeatureCollection passed), **Then** the map updates to show the new features without requiring full remount

---

### User Story 2 - Display Timeline with Temporal Features (Priority: P1)

A developer needs to display a timeline showing when tracks and events occurred. They import the timeline component, pass features with temporal properties, and the timeline renders showing the time span of each feature.

**Why this priority**: Temporal analysis is fundamental to maritime tactical analysis. Users need to understand when events occurred and how tracks progress over time.

**Independent Test**: Import the Timeline component in a test harness, pass features with temporal data, verify the timeline renders with correct time spans.

**Acceptance Scenarios**:

1. **Given** a Timeline component with features containing start/end times, **When** rendered, **Then** each feature displays as a bar spanning its time range
2. **Given** a Timeline with overlapping features, **When** rendered, **Then** features are visually distinguishable (different rows or colors)
3. **Given** a Timeline, **When** the user adjusts the visible time range, **Then** the timeline scrolls/zooms to show the selected period

---

### User Story 3 - Display Feature List (Priority: P2)

A developer needs to show a list of all features in a plot (tracks, reference locations, analysis results). They import the feature list component and pass the FeatureCollection. The list renders with feature names, types, and key attributes.

**Why this priority**: Users need a way to see and navigate to specific features beyond the map view. This enables feature selection and detailed inspection.

**Independent Test**: Import the FeatureList component in a test harness, pass a FeatureCollection with various feature types, verify the list renders with correct labels.

**Acceptance Scenarios**:

1. **Given** a FeatureList with multiple features, **When** rendered, **Then** each feature shows its display name and type icon
2. **Given** a FeatureList, **When** the user clicks a feature row, **Then** a selection callback fires with the selected feature ID
3. **Given** a FeatureList with many features, **When** rendered, **Then** the list is scrollable and maintains performance

---

### User Story 4 - Consistent Styling Across Apps (Priority: P2)

A developer building both the Electron loader app and VS Code extension webview needs consistent visual styling. They import components that automatically apply the Debrief design system (colors, typography, spacing).

**Why this priority**: Professional appearance and brand consistency across deployment contexts builds user trust and reduces cognitive load when switching between apps.

**Independent Test**: Render the same component in both Electron and VS Code webview contexts, verify visual appearance matches.

**Acceptance Scenarios**:

1. **Given** a MapView rendered in the Electron loader, **When** the same MapView is rendered in VS Code webview, **Then** the visual styling (colors, controls) matches
2. **Given** components using the design system, **When** a theme token changes (e.g., primary color), **Then** all components reflect the updated styling

---

### User Story 5 - Select Features on Map (Priority: P2)

A developer needs users to be able to select features by clicking on them in the map. They configure the MapView with selection enabled and receive callbacks when features are selected.

**Why this priority**: Selection is the foundation for all context-sensitive operations - users must select features before analyzing them.

**Independent Test**: Render MapView with selection enabled, simulate click on a feature, verify selection callback fires with correct feature ID.

**Acceptance Scenarios**:

1. **Given** a MapView with selection enabled, **When** the user clicks a feature, **Then** the feature visually highlights and the onSelect callback fires
2. **Given** a MapView with a selected feature, **When** the user clicks a different feature, **Then** the previous selection clears and the new feature is selected
3. **Given** a MapView with selection enabled, **When** the user clicks empty space, **Then** any existing selection clears

---

### User Story 6 - Synchronize Selection Across Components (Priority: P3)

A developer wants map selection to highlight the corresponding row in the feature list, and vice versa. They connect components through a shared selection state.

**Why this priority**: Coordinated selection across views improves user workflow but requires core components to work first.

**Independent Test**: Render MapView and FeatureList with shared selection state, select a feature in one, verify the other highlights it.

**Acceptance Scenarios**:

1. **Given** MapView and FeatureList sharing selection state, **When** a feature is selected on the map, **Then** the corresponding list row highlights
2. **Given** MapView and FeatureList sharing selection state, **When** a list row is clicked, **Then** the map highlights and centers on that feature

---

### Edge Cases

- What happens when features have no temporal data? (Timeline should handle gracefully, showing features without time bars or in a separate "no time" section)
- How does the map handle an empty FeatureCollection? (Should display empty map with appropriate zoom level, no error)
- What happens when feature properties are missing expected fields? (Components should degrade gracefully, showing "Unknown" for missing labels)
- How do components handle very large feature collections (1000+ features)? (Should remain responsive, potentially with virtualization for lists)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Library MUST provide a MapView component that renders GeoJSON features on an interactive map
- **FR-002**: Library MUST provide a Timeline component that renders features with temporal data on a time axis
- **FR-003**: Library MUST provide a FeatureList component that renders features in a scrollable list with type and name
- **FR-004**: All components MUST accept GeoJSON FeatureCollection as their primary data input
- **FR-005**: MapView MUST support feature selection via click interaction
- **FR-006**: All components MUST support controlled selection state (selected feature IDs passed as props)
- **FR-007**: All components MUST call provided callbacks when user interactions occur (onSelect, onZoom, etc.)
- **FR-008**: Library MUST work in both Electron renderer and VS Code webview contexts
- **FR-009**: Components MUST be individually importable (tree-shakeable) to minimize bundle size
- **FR-010**: Library MUST provide TypeScript type definitions for all public APIs
- **FR-011**: Components MUST handle missing or malformed feature properties gracefully without crashing
- **FR-012**: MapView MUST provide zoom and pan controls
- **FR-013**: Timeline MUST allow time range selection/adjustment

### Key Entities

- **FeatureCollection**: Standard GeoJSON structure containing an array of Features; the universal data format passed to all components
- **Feature**: GeoJSON Feature with geometry and properties; may represent tracks, reference locations, or analysis results
- **Selection State**: Set of feature IDs currently selected; shared across components for synchronization
- **Theme Configuration**: Design tokens (colors, spacing, typography) that ensure consistent styling

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can display a map with track features using 5 or fewer lines of code (import + render)
- **SC-002**: Components render initial display within 500ms for collections of up to 500 features
- **SC-003**: Library bundle adds less than 200KB gzipped to consuming applications
- **SC-004**: All three core components (MapView, Timeline, FeatureList) pass visual regression tests across Electron and VS Code webview contexts
- **SC-005**: 100% of public component APIs have TypeScript type definitions
- **SC-006**: Components maintain 60fps interaction smoothness during pan/zoom operations with up to 500 features

## Assumptions

- Components will use Leaflet for map rendering (consistent with VS Code extension spec)
- GeoJSON features follow the Debrief schema conventions defined in `/shared/schemas/`
- VS Code webview and Electron both support modern ES modules and React 18+
- Initial implementation focuses on display; editing/creation capabilities are out of scope
- Theme configuration will use CSS custom properties for runtime theming support
