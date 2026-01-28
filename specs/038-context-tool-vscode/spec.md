# Feature Specification: Context-Sensitive Tool Offering VS Code Integration

**Feature Branch**: `038-context-tool-vscode`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Integrate context-sensitive tool offering into VS Code extension (absorbs #035, requires #029)

## Clarifications

### Session 2026-01-27

- Q: Which feature kinds must tool matching support? → A: Core shapes: TRACK, CIRCLE, RECTANGLE, LINE, VECTOR, plus point types (Waypoint, etc.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Available Tools from Selection (Priority: P1)

An analyst opens a plot containing tracks and reference locations in VS Code. They select two tracks on the map. The Tools panel in the sidebar immediately updates to show analysis tools that work with two tracks (e.g., range/bearing calculation). Tools that require different inputs are hidden by default.

**Why this priority**: Tool discovery is the core value proposition. Without seeing what tools are available for a selection, analysts cannot proceed with any analysis. This delivers immediate value by making the system's capabilities visible.

**Independent Test**: Can be fully tested by selecting features of various kinds and verifying the correct tools appear in the Tools panel.

**Acceptance Scenarios**:

1. **Given** a plot with tracks is open, **When** the analyst selects two tracks on the map, **Then** the Tools panel shows tools that accept exactly two tracks (e.g., "Range & Bearing").
2. **Given** a plot is open with no selection, **When** the analyst views the Tools panel, **Then** the panel shows an empty state message indicating features must be selected.
3. **Given** the analyst selects one track and one reference location, **When** they view the Tools panel, **Then** only tools compatible with that specific combination appear.

---

### User Story 2 - Execute Tool and View Results (Priority: P2)

An analyst has selected two tracks and sees the "Range & Bearing" tool is available. They click the tool to execute it. The calculation runs via the analysis service, and a new feature representing the computed range/bearing appears on the plot with provenance metadata showing the source tracks and computation details.

**Why this priority**: Execution is the payoff for tool discovery. Once analysts know what's available, they need to actually run the tools to derive analytical value.

**Independent Test**: Can be tested by selecting applicable features, executing a tool, and verifying results appear on the plot with correct provenance.

**Acceptance Scenarios**:

1. **Given** the analyst has selected two tracks and Range & Bearing tool is available, **When** they click the tool in the sidebar, **Then** a result feature appears on the plot.
2. **Given** a tool has executed successfully, **When** the result appears, **Then** it includes provenance metadata: tool name, version, timestamp, and source feature references.
3. **Given** a tool execution fails, **When** the error occurs, **Then** an error notification appears describing what went wrong without crashing the extension.

---

### User Story 3 - Access Tools via Context Menu (Priority: P3)

An analyst prefers to work with right-click context menus. They select features on the map, right-click, and see a "Tools" submenu containing the applicable tools. Clicking a tool executes it immediately.

**Why this priority**: Context menus provide faster access than navigating to the sidebar. This is an efficiency improvement for users who prefer contextual actions.

**Independent Test**: Can be tested by selecting features, right-clicking, and verifying applicable tools appear in the context menu.

**Acceptance Scenarios**:

1. **Given** the analyst has selected two tracks, **When** they right-click on the map, **Then** a "Tools" submenu appears with applicable tools (e.g., Range & Bearing).
2. **Given** the analyst clicks a tool in the context menu, **When** the tool executes, **Then** results appear on the plot (same as sidebar execution).
3. **Given** the analyst has no selection, **When** they right-click on the map, **Then** the Tools submenu is either hidden or shows a disabled "Select features first" item.

---

### User Story 4 - Access Tools via Command Palette (Priority: P4)

An analyst prefers keyboard-driven workflows. They open the VS Code Command Palette, type "debrief tools", and see commands for currently applicable tools. Running a command executes the tool.

**Why this priority**: Command Palette integration supports power users and accessibility needs. VS Code users expect commands to be accessible this way.

**Independent Test**: Can be tested by selecting features, opening Command Palette, and verifying applicable tool commands appear and execute.

**Acceptance Scenarios**:

1. **Given** the analyst has selected two tracks, **When** they open Command Palette and type "debrief", **Then** they see commands like "Debrief: Range & Bearing".
2. **Given** a tool command is visible, **When** the analyst executes it, **Then** the tool runs and results appear on the plot.
3. **Given** no features are selected, **When** the analyst types "debrief tools", **Then** no tool commands appear (VS Code API constraint - cannot show disabled items with explanations).

---

### User Story 5 - Understand Why Tools Are Unavailable (Priority: P5)

An analyst has selected a single track and wonders why the Range & Bearing tool isn't available. They enable "Show inactive tools" in the Tools panel. Now they see Range & Bearing with an explanation: "Requires 2 tracks (1 selected)".

**Why this priority**: Understanding tool requirements reduces confusion and helps analysts learn the system. This is a usability enhancement.

**Independent Test**: Can be tested by selecting insufficient features, enabling the toggle, and verifying explanatory text appears.

**Acceptance Scenarios**:

1. **Given** the analyst has one track selected, **When** they enable "Show inactive tools", **Then** Range & Bearing appears with explanation "Requires 2 tracks (1 selected)".
2. **Given** the analyst has selected incompatible feature kinds, **When** they view inactive tools, **Then** explanations indicate which kinds are required.
3. **Given** "Show inactive tools" is disabled (default), **When** the analyst views the Tools panel, **Then** only applicable tools appear (no explanations for missing tools).

---

### Edge Cases

- **No tools registered**: When debrief-calc has no tools, the Tools panel shows "No analysis tools available. Check that debrief-calc service is configured."
- **Analysis service connection failure**: When the connection to the analysis service fails, the Tools panel shows "Unable to connect to analysis service. Retrying..." with automatic retry.
- **Tool metadata invalid**: When a tool's metadata fails schema validation, that tool is excluded from the inventory and a warning is logged.
- **Tool returns empty result**: When a tool executes successfully but produces no output features, the system shows "Tool completed with no results" without modifying the plot.
- **Session state unavailable**: When session-state service (029) is not available, selection tracking falls back to component-local state.

## Requirements *(mandatory)*

### Functional Requirements

**Tool Discovery**

- **FR-001**: Extension MUST discover available tools from the analysis service at startup.
- **FR-002**: Extension MUST cache tool metadata for the session lifetime without re-fetching on each operation.
- **FR-003**: Extension MUST validate tool metadata against the expected schema on receipt, excluding invalid tools with a warning log.
- **FR-004**: Extension MUST use the existing tool matching logic to evaluate tools against selections.

**Selection Integration**

- **FR-005**: Extension MUST read selection state from the session-state service (029).
- **FR-006**: Extension MUST re-evaluate tool matching whenever selection changes.
- **FR-007**: Extension MUST group selected features by kind for matching. Supported kinds: TRACK, CIRCLE, RECTANGLE, LINE, VECTOR, and point types (Waypoint, reference locations).

**Sidebar Tools Panel**

- **FR-008**: Extension MUST display a "Tools" panel in the Debrief Activity Bar.
- **FR-009**: Tools panel MUST show applicable tools sorted alphabetically by name.
- **FR-010**: Tools panel MUST provide a "Show inactive tools" toggle (default: off).
- **FR-011**: Inactive tools MUST display explanatory text showing why they don't match the selection.
- **FR-012**: Tools panel MUST show empty state when no features are selected.
- **FR-013**: Clicking a tool in the panel MUST trigger tool execution.

**Context Menu**

- **FR-014**: Extension MUST add a "Tools" submenu to the map context menu.
- **FR-015**: Context menu MUST show only active tools (matching current selection).
- **FR-016**: Context menu MUST update when selection changes.
- **FR-017**: Clicking a tool in context menu MUST trigger tool execution.

**Command Palette**

- **FR-018**: Extension MUST register commands for each discovered tool with prefix "Debrief: ".
- **FR-019**: Commands MUST only be visible when the tool is applicable to current selection.
- **FR-020**: Commands MUST show inactive state (not visible) when tool doesn't match selection.

**Tool Execution**

- **FR-021**: Extension MUST execute tools by calling the analysis service with selected feature IDs as arguments.
- **FR-022**: Extension MUST apply result operations (add/update/remove features) to the plot.
- **FR-023**: Extension MUST persist modified plot via debrief-stac with provenance metadata.
- **FR-024**: Provenance MUST include: tool name, tool version, execution timestamp, source feature IDs.
- **FR-025**: Extension MUST display error notification on tool execution failure.

**Performance**

- **FR-026**: Tool matching MUST complete within 100ms of selection change.
- **FR-027**: UI updates MUST be debounced to avoid flicker during rapid selection changes.

### Key Entities

- **Tool**: Analysis operation with name, description, version, and selection requirements.
- **SelectionRequirement**: Constraint specifying feature kinds, minimum count, and maximum count.
- **ToolMatchResult**: The outcome of evaluating a tool against the current selection (active or inactive with explanation).

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Execute an appropriate analysis tool for the current selection.
- **Key Decision(s)**:
  1. Which tool to run from available options
  2. Whether to explore inactive tools to understand other possibilities
- **Decision Inputs**: List of applicable tools with names and descriptions; for inactive tools (when toggle enabled), explanations of missing requirements.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map with features | Select features on map | Selection highlighted, tools panel updates |
| 2 | Tools panel shows matches | View sidebar Tools panel | Available tools listed with descriptions |
| 3 | Tool selected | Click tool name | Tool execution begins |
| 4 | Execution complete | View map | Result features appear with provenance |

### UI States

- **Empty State**: "Select features on the map to see available analysis tools."
- **Loading State**: During startup tool discovery: "Loading analysis tools..."
- **Error State**: "Unable to connect to analysis service. Check that debrief-calc is running."
- **Success State**: List of applicable tools with names and descriptions; inactive tools shown with explanations when toggle enabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Applicable tools appear in the Tools panel within 1 second of selection change.
- **SC-002**: Tool execution completes and results appear on the plot within 5 seconds for typical operations.
- **SC-003**: All computed results include provenance metadata tracing back to source features.
- **SC-004**: Tools are accessible from all three surfaces: sidebar panel, context menu, command palette.
- **SC-005**: 90% of users can correctly predict what selection enables a specific tool after reading its inactive explanation.
- **SC-006**: System handles 50+ registered tools without degradation in matching or display performance.

## Dependencies

- **027-context-tool-offering**: Provides tool matching service, Tool schemas, and matching logic (Phases 0-2).
- **029-session-state-vscode**: Provides selection state via session-state service for reading current selection.
- **debrief-calc**: Provides analysis tools (tool listing and execution operations).
- **debrief-stac**: Provides plot persistence with provenance support.

## Assumptions

- Tool matching service from 027-context-tool-offering is fully tested and ready for integration.
- Session-state service (029) provides reactive selection state updates.
- Analysis service exposes tool listing and execution operations.
- Tools in this iteration are parameterless (no user-provided inputs beyond selection).
- Test data in `apps/vscode/test-data/local-store/` will be enriched to include all supported feature kinds (TRACK, CIRCLE, RECTANGLE, LINE, VECTOR, point types) for verification.

## Out of Scope

- Tool parameters with schema-driven UI (captured in feature description, deferred to future work).
- Tool categorization or grouping beyond alphabetical sort.
- Execution progress indication for long-running tools.
- Undo/redo capabilities for tool results (use session-state undo if available).
- Tool search or filtering beyond alphabetical sorting.
- Cross-document tool execution (tools operate on active document only).
