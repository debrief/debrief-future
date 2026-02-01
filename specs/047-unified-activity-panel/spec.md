# Feature Specification: Unified Debrief Activity Panel

**Feature Branch**: `047-unified-activity-panel`
**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "Build unified Debrief activity panel as single webview component"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View all activity controls in one panel (Priority: P1)

An analyst opens the Debrief activity sidebar and sees all three sections — time controller, tools, and layers — in a single unified panel instead of separate collapsible panels. The unified view provides a cohesive experience with less wasted vertical space.

**Why this priority**: This is the core value proposition — consolidating three separate panels into one unified view. Without this, the feature has no purpose.

**Independent Test**: Can be fully tested by opening the activity sidebar and verifying all three sections (time controller, tools, layers) appear within a single panel with proper layout.

**Acceptance Scenarios**:

1. **Given** the Debrief extension is installed and a plot is loaded, **When** the user opens the activity sidebar, **Then** a single unified panel displays time controller, tools, and layers sections vertically stacked.
2. **Given** the unified panel is visible, **When** the user resizes the sidebar, **Then** all three sections reflow appropriately within the available space.

---

### User Story 2 - Collapse and expand individual sections (Priority: P2)

An analyst working in the unified panel can collapse sections they don't currently need, giving more vertical space to the sections they're actively using.

**Why this priority**: Vertical space optimization is a key goal. Collapsible sections let users focus on what matters while keeping everything accessible.

**Independent Test**: Can be tested by clicking section headers to collapse/expand each section and verifying the remaining sections use the freed space.

**Acceptance Scenarios**:

1. **Given** all three sections are expanded in the unified panel, **When** the user collapses the Tools section, **Then** the Tools section shrinks to its header and the remaining sections use the available space.
2. **Given** a section is collapsed, **When** the user clicks its header, **Then** the section expands to show its full content.

---

### User Story 3 - Use each sub-component independently (Priority: P3)

A developer building an alternative frontend (e.g., Electron or Jupyter) can import and render any individual sub-component (time controller, tools, or layers) without requiring the full unified panel or VS Code APIs.

**Why this priority**: Reusability across frontends is a strategic goal but not immediately user-facing. It ensures long-term architectural value.

**Independent Test**: Can be tested by importing a single sub-component (e.g., Time Controller) into a standalone test harness and verifying it renders and functions correctly without VS Code dependencies.

**Acceptance Scenarios**:

1. **Given** a standalone test environment without VS Code, **When** a developer imports the Time Controller component, **Then** it renders correctly and responds to interactions.
2. **Given** a standalone test environment, **When** a developer imports the Layers component, **Then** it renders and allows toggling layer visibility without errors.

---

### Edge Cases

- What happens when no plot is loaded? Each section shows a contextual placeholder message rather than blank space.
- What happens when all three sections are collapsed simultaneously? The panel shows only the three section headers, each clickable to expand.
- How does the panel behave when the sidebar is at its minimum width? Sections truncate labels gracefully and remain usable.
- What happens if a sub-component encounters an error? The affected section shows an inline error message while the other sections continue to function normally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display time controller, tools, and layers sections within a single unified panel.
- **FR-002**: Each section MUST be independently collapsible and expandable via its section header.
- **FR-003**: Each sub-component (time controller, tools, layers) MUST function as a standalone shared component that does not depend on VS Code APIs directly. All sub-components MUST use vscrui primitives and `--debrief-*` design tokens for visual consistency.
- **FR-004**: The unified panel MUST render correctly in all three project theme variants (light, dark, VS Code) using the project's `--debrief-*` design token system. No hardcoded colors are permitted.
- **FR-005**: The panel MUST work entirely offline without requiring network access.
- **FR-006**: An error in one sub-component MUST NOT prevent the other sub-components from rendering and functioning.
- **FR-007**: The panel MUST preserve each section's collapse/expand state across panel reopenings within the same session.
- **FR-008**: The unified panel MUST use less vertical space than the equivalent separate panels for the same content.
- **FR-009**: Each sub-component and the composed panel MUST have Storybook stories that can be verified in all three theme variants (light, dark, VS Code).
- **FR-010**: Section headers MUST use Codicon icons for collapse/expand chevrons and section identification, consistent with the project's icon standards.
- **FR-011**: The Time Controller MUST be converted to use vscrui components (Button, Icon, Dropdown) for all controls where vscrui equivalents exist. Custom implementations are permitted only for controls without vscrui equivalents (e.g., the time scrubber slider).

### Key Entities

- **Activity Panel**: The single unified container that hosts all three sub-components. Attributes: collapse states, active section.
- **Sub-Component**: An independently developed and testable UI section (Time Controller, Tools, or Layers). Each has its own data inputs, interaction model, and rendering logic.
- **Section Header**: A clickable header for each sub-component that controls collapse/expand behavior, displays the section title, and includes a Codicon identity icon and a Codicon collapse/expand chevron.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Access and interact with all Debrief activity controls (time, tools, layers) from a single consolidated panel.
- **Key Decision(s)**:
  1. Which section to focus on (expand) based on current task
  2. Which layers to show/hide for the current analysis
- **Decision Inputs**: Section headers indicate content type; collapse state lets the user allocate vertical space to the most relevant section for their current task.

### Screen Progression

| Step | Screen/State       | User Action                  | Result                                               |
|------|--------------------|------------------------------|------------------------------------------------------|
| 1    | Sidebar closed     | Click Debrief activity icon  | Unified panel opens with all sections expanded        |
| 2    | All sections open  | Click Tools section header   | Tools section collapses; other sections gain space    |
| 3    | Tools collapsed    | Adjust time controller       | Time controller responds; other sections unaffected   |
| 4    | Using layers       | Toggle layer visibility      | Map updates to reflect layer changes                  |
| 5    | Done with panel    | Click activity icon or close | Panel closes; collapse states preserved for next open |

### UI States

- **Empty State**: When no plot is loaded, each section shows a placeholder message (e.g., "Load a plot to see time controls") rather than blank space.
- **Loading State**: While sub-component data is initializing, a subtle loading indicator appears within the individual section.
- **Error State**: If a sub-component fails, that section shows an inline error message while the other sections continue to function normally.
- **Success State**: All three sections display their content and respond to user interaction. Sections reflect current plot data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three activity controls (time controller, tools, layers) are accessible from a single panel without switching between separate views.
- **SC-002**: The unified panel uses at least 20% less vertical space than the equivalent three separate panels displaying the same content.
- **SC-003**: Each sub-component can be rendered and tested independently outside of the host editor within a standalone test harness.
- **SC-004**: An error in any one sub-component does not prevent the remaining sub-components from functioning — verified by simulating a failure in each section.
- **SC-005**: The panel operates fully offline with no network requests required for any core functionality.
- **SC-006**: Each sub-component and the composed panel render correctly in Storybook across all three theme variants with no visual regressions.

## Clarifications

### Session 2026-02-01

- Q: Which theme variants must the panel support? → A: All three (light, dark, VS Code) via the project's `--debrief-*` token system.
- Q: Must sub-components and the composed panel have Storybook stories? → A: Yes, Storybook stories required for each sub-component and the composed panel.
- Q: Should section headers use Codicon icons? → A: Yes, Codicon icons for collapse chevrons and section identity icons.
- Q: What components should the Layers section use? → A: The existing LayersToolbar and FeatureList components composed together (from #045), not a new component built from scratch.
- Q: Should the Time Controller be converted to use vscrui components? → A: Yes, convert all Time Controller controls to vscrui equivalents where available (Button, Icon, Dropdown); keep custom implementation only for controls with no vscrui equivalent (e.g., time scrubber slider).
- Q: Should the SpeedSelector use vscrui Dropdown? → A: Yes, convert SpeedSelector to vscrui Dropdown. Previous z-index issues in VS Code panels are resolved by the new webview context.

## Assumptions

- The existing Time Controller is converted to use vscrui components (Button, Icon, Dropdown) where equivalents exist; custom implementations are retained only for controls without vscrui equivalents (e.g., the time scrubber slider). The layers section composes the existing `LayersToolbar` and `FeatureList` components (from #045) rather than building a new component from scratch.
- The vscrui component library (documented in prerequisite #031) provides sufficient primitives for building all three sub-components with native styling.
- Section collapse/expand state persistence is session-scoped only (not persisted across editor restarts). Cross-restart persistence is a future enhancement.
- The ordering of sections (time controller, tools, layers top-to-bottom) follows the current sidebar ordering and is fixed for this iteration.

## Dependencies

- **#031**: Document vscrui as standard component library (prerequisite — defines the component library used).
- **#045**: Add layers toolbar to FeatureList (prerequisite — provides the layers sub-component).

## Out of Scope

- Adding new functionality to any sub-component beyond the vscrui conversion (this is a layout/architecture consolidation).
- Non-VS Code frontend integration (Electron, Jupyter) — components will be reusable, but integration is future work.
- Drag-to-reorder sections within the panel.
- Persisting collapse state across editor restarts.
