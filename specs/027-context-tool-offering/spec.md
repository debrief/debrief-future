# Feature Specification: Context-Sensitive Tool Offering

**Feature Branch**: `027-context-tool-offering`
**Created**: 2026-01-23
**Status**: Draft
**Input**: User description: "Context-Sensitive Tool Offering in VS Code - dynamically offer analysis tools based on analyst selections"

## Clarifications

### Session 2026-01-24

- Q: What is the verification strategy? → A: Phased approach - Phase 1: headless unit tests, Phase 2: HTML harness with Playwright, Phase 3: VS Code integration (deferred)
- Q: What does the HTML harness show? → A: Features list (left), tools list (right), "show inactive tools" toggle
- Q: Does Phase 2 include tool execution testing? → A: No, selection matching only; execution deferred to Phase 3
- Q: HTML harness technology? → A: Storybook (since using fixture data); standalone HTML only if connecting to live service

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Applicable Tools (Priority: P1)

An analyst working with maritime tactical data selects one or more features on the map (tracks, reference locations, etc.) and immediately sees which analysis tools are available for that selection. The system presents only tools whose requirements match the current selection.

**Why this priority**: Tool discovery is the core value proposition - analysts need to know what operations are possible with their current selection. Without this, no analysis can occur.

**Independent Test**: Can be fully tested by selecting features and verifying the correct tools appear. Delivers value by showing analysts what's possible with their data.

**Acceptance Scenarios**:

1. **Given** an analyst has a plot open with track data, **When** they select two tracks, **Then** tools requiring exactly two tracks (e.g., range/bearing calculations) appear in the available tools list
2. **Given** an analyst has selected one track and one reference location, **When** they view available tools, **Then** only tools compatible with that exact combination appear
3. **Given** an analyst has no features selected, **When** they view the tools panel, **Then** no tools appear as available (or tools with no requirements appear)

---

### User Story 2 - Execute Tool and View Results (Priority: P2)

An analyst selects applicable features, chooses an available tool, executes it, and sees the computed results appear on the plot with proper attribution showing where the data came from.

**Why this priority**: Execution is the natural next step after discovery. Without being able to run tools, discovery alone provides no analytical value.

**Independent Test**: Can be tested by selecting features, executing a tool, and verifying results appear on the plot with provenance information.

**Acceptance Scenarios**:

1. **Given** an analyst has selected two tracks and a compatible range calculation tool is available, **When** they execute the tool, **Then** the computed result appears as a new feature on the plot
2. **Given** an analyst executes a tool, **When** the result appears, **Then** the result includes provenance metadata showing tool name, version, timestamp, and source features
3. **Given** an analyst executes a tool that modifies existing features, **When** the operation completes, **Then** the modified features reflect the changes and provenance is updated

---

### User Story 3 - Understand Tool Unavailability (Priority: P3)

An analyst wonders why a specific tool isn't available and can view inactive tools with explanations of what selection would make them applicable.

**Why this priority**: Helps analysts learn the system and understand tool requirements without trial-and-error. Reduces frustration and support requests.

**Independent Test**: Can be tested by toggling "show inactive tools" and verifying explanations appear for unavailable tools.

**Acceptance Scenarios**:

1. **Given** an analyst has one track selected, **When** they hover over an inactive tool that requires two tracks, **Then** they see an explanation like "Requires 2 tracks (1 selected)"
2. **Given** an analyst enables "Show inactive tools" in the sidebar, **When** they view the tools panel, **Then** inactive tools appear with explanations alongside active ones
3. **Given** an analyst has selected features that include an unsupported kind, **When** they view inactive tool explanations, **Then** tools indicate which feature kinds are not accepted

---

### Edge Cases

- What happens when no tools are registered in the system? The tools panel shows an appropriate empty state message
- What happens when tool metadata fails validation? The invalid tool is excluded from the inventory with a warning logged
- What happens when tool execution fails? An error message appears with details about the failure
- What happens when the MCP connection is unavailable? The system shows a connection error state and retries on next action
- What happens when a tool returns an empty result? The system indicates "no results" without modifying the plot

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST discover available analysis tools from debrief-calc at startup via MCP `list_tools` call
- **FR-002**: System MUST cache tool metadata for the session lifetime without re-fetching
- **FR-003**: System MUST validate tool metadata against the expected schema on receipt, excluding invalid tools
- **FR-004**: System MUST match tools to the current selection using client-side logic
- **FR-005**: System MUST display applicable tools in all three UI surfaces: context menu, sidebar panel, and command palette
- **FR-006**: System MUST sort tools alphabetically by name in all UI surfaces
- **FR-007**: System MUST provide a "Hide inactive tools" toggle (default: hidden) in the sidebar panel
- **FR-008**: System MUST display explanatory tooltips for inactive tools showing why they don't match the selection
- **FR-009**: System MUST execute selected tools via MCP `execute_tool` call, passing the selected features
- **FR-010**: System MUST apply result envelopes (add/update/remove operations) to the local FeatureCollection
- **FR-011**: System MUST persist changes to the plot via debrief-stac with full provenance lineage
- **FR-012**: System MUST record provenance including tool name, version, timestamp, and source feature references
- **FR-013**: Command palette MUST show only active tools (VS Code API constraint - no explanatory text for inactive items)

### Key Entities

- **Tool**: An analysis operation with a name, description, version, and selection requirements
- **SelectionRequirement**: A constraint specifying which feature kinds a tool accepts, with minimum and maximum counts
- **Selection**: The current set of selected features, grouped by their kind (e.g., "track", "reference_location")
- **ResultEnvelope**: The output of tool execution, containing add/update/remove operations to apply to the plot

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Execute the appropriate analysis tool for the current selection
- **Key Decision(s)**:
  1. Which tool to run from the available options
  2. Whether to view inactive tools to understand what other analyses are possible
- **Decision Inputs**: List of applicable tools with names and descriptions; for inactive tools, explanations of what selection would enable them

### Screen Progression

| Step | Screen/State       | User Action              | Result                                          |
|------|--------------------|--------------------------|-------------------------------------------------|
| 1    | Map with features  | Select one or more features | Selection highlighted, tool matching triggered |
| 2    | Tools populated    | Right-click or view sidebar | Context menu/sidebar shows applicable tools    |
| 3    | Tool selected      | Click tool name          | Tool execution begins                           |
| 4    | Execution complete | View map                 | Result features appear with provenance          |

### UI States

- **Empty State**: "No tools available. Select features on the map to see applicable analysis tools."
- **Loading State**: During startup tool discovery, show "Loading tools..." indicator
- **Error State**: "Unable to connect to analysis service. Check that debrief-calc is running."
- **Success State**: List of applicable tools with names and descriptions; inactive tools shown with explanations when toggle enabled

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can identify applicable tools within 1 second of changing their selection
- **SC-002**: Tool explanations help analysts understand requirements - 90% of users can predict what selection enables a specific tool after reading its inactive explanation
- **SC-003**: Tool execution completes and results appear on the plot within 5 seconds for typical operations
- **SC-004**: All computed results include complete provenance that traces back to source features
- **SC-005**: System handles 50+ registered tools without degradation in matching or display performance
- **SC-006**: Analysts can access tools from any of the three surfaces (context menu, sidebar, command palette) with consistent results

## Verification Strategy

### Phased Approach

Implementation and verification proceeds in three phases to minimize VS Code integration overhead:

**Phase 1 - Unit Tests (Headless)**
- Verify ToolMatchService matching logic with fixture data
- Test all selection requirement combinations
- No UI or browser dependencies
- Exit criteria: All matching algorithm edge cases pass

**Phase 2 - HTML Verification Harness (Storybook)**
- Storybook story with fixture data (no live service dependency)
- Layout: Feature list (left) | Tool list (right)
- Includes "Show inactive tools" toggle
- Scope: Selection matching only (no tool execution)
- Automated testing via Playwright (no human required)
- Manual verification also available
- Exit criteria: Playwright tests pass, manual smoke test successful

**Phase 3 - VS Code Integration**
- Wire ToolMatchService into VS Code extension
- Connect to real MCP for tool discovery and execution
- Deferred until Phases 1-2 verified
- Exit criteria: All acceptance scenarios pass in VS Code

### HTML Harness Requirements (Storybook)

- **HH-001**: Harness MUST display a list of selectable GeoJSON features grouped by kind (tracks, points, etc.)
- **HH-002**: Harness MUST allow multi-selection of features via checkboxes or click
- **HH-003**: Harness MUST display matching tools list that updates on selection change
- **HH-004**: Harness MUST provide "Show inactive tools" toggle (default: hidden)
- **HH-005**: Harness MUST show explanatory text for inactive tools when toggle enabled
- **HH-006**: Harness MUST work with JSON fixture data (no MCP/live service dependency)
- **HH-007**: Harness MUST be implemented as a Storybook story for fixture-driven testing
- **HH-008**: Harness MUST support Playwright automation for CI testing

## Assumptions

- debrief-calc service exposes tools via MCP with the expected `list_tools` and `execute_tool` operations
- Tool metadata follows the SelectionRequirement schema with feature kind, min, and max count fields
- The VS Code extension already has a selection model that tracks which features are selected
- debrief-stac write_plot operation supports provenance metadata attachment
- Tools in this iteration are parameterless (no user-provided inputs beyond selection)
- ToolMatchService is implemented as a standalone TypeScript library usable in both HTML harness and VS Code extension

## Out of Scope

- Tool parameters with schema-driven UI (future work)
- Tool categorization or grouping
- Execution progress indication for long-running tools
- Undo/redo capabilities for tool results
- Tool search or filtering beyond alphabetical sorting
