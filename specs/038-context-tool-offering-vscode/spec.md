# Feature Specification: Context-Sensitive Tool Offering in VS Code

**Feature Branch**: `038-context-tool-offering-vscode`
**Created**: 2026-01-27
**Status**: Draft
**Input**: Integrate context-sensitive tool offering into VS Code extension (absorbs #035, requires #029)

## Overview

This feature integrates the context-sensitive tool offering system (#027) into the VS Code extension, enabling analysts to discover and execute analysis tools based on their current feature selection. It builds on the session-state integration (#029) for selection tracking and connects to debrief-calc via MCP for tool discovery and execution.

This specification represents **Phase 3** of the context-tool-offering architecture defined in #027, which established the schemas (Phase 0), headless unit tests (Phase 1), and Storybook verification harness (Phase 2).

## Dependencies

| Dependency | Status | Description |
|------------|--------|-------------|
| #027 context-tool-offering | In Progress | Provides ToolMatchService, schemas, and matching logic |
| #029 session-state-vscode | Tasked | Provides session-state integration with selection tracking |
| debrief-calc | Available | Python analysis service with MCP tool exposure |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Tools via Context Menu (Priority: P1)

An analyst selects features on the map and right-clicks to see a context menu showing only the analysis tools applicable to their selection.

**Why this priority**: Context menus are the most intuitive discovery path for tool access - users naturally right-click to see available actions.

**Independent Test**: Can be fully tested by selecting features, right-clicking, and verifying correct tools appear.

**Acceptance Scenarios**:

1. **Given** an analyst has selected two tracks, **When** they right-click on the map, **Then** the context menu shows tools requiring exactly two tracks (e.g., "Calculate Range/Bearing")
2. **Given** an analyst has selected one track and one reference point, **When** they right-click, **Then** only tools compatible with that combination appear
3. **Given** an analyst has no features selected, **When** they right-click, **Then** no analysis tools appear in the context menu (or tools with no requirements)

---

### User Story 2 - Discover Tools via Sidebar Panel (Priority: P1)

An analyst views a dedicated "Analysis Tools" sidebar panel that shows available tools, updating dynamically as selection changes. They can toggle "Show unavailable tools" to understand what other analyses are possible.

**Why this priority**: The sidebar provides persistent visibility of tool availability, supporting exploration and learning.

**Independent Test**: Can be fully tested by selecting features and verifying the sidebar updates, then toggling "Show unavailable" and verifying inactive tools appear with explanations.

**Acceptance Scenarios**:

1. **Given** an analyst has selected two tracks, **When** they view the Analysis Tools panel, **Then** tools requiring two tracks appear as enabled
2. **Given** "Show unavailable tools" is enabled, **When** viewing the panel with one track selected, **Then** two-track tools appear disabled with explanation "Requires 2 tracks (1 selected)"
3. **Given** selection changes, **When** the analyst selects different features, **Then** the panel updates within 200ms to show newly applicable tools

---

### User Story 3 - Execute Tool from Any Surface (Priority: P2)

An analyst selects features, chooses a tool from context menu/sidebar/command palette, executes it, and sees computed results appear on the map with provenance.

**Why this priority**: Execution is the core value delivery - discovering tools is only useful if analysts can run them.

**Independent Test**: Can be fully tested by selecting features, executing a tool, and verifying results appear with correct provenance metadata.

**Acceptance Scenarios**:

1. **Given** two tracks are selected and "Calculate Range/Bearing" is available, **When** the analyst clicks the tool in the sidebar, **Then** the computed result appears as a new feature on the map
2. **Given** a tool is executed, **When** the result appears, **Then** provenance metadata includes tool name, version, timestamp, and source feature IDs
3. **Given** execution fails, **When** an error occurs, **Then** the analyst sees an error notification with actionable details

---

### User Story 4 - Access Tools via Command Palette (Priority: P3)

An analyst uses Cmd+Shift+P to access tools via the command palette, which shows only active tools for the current selection.

**Why this priority**: Power users prefer keyboard-driven workflows; command palette integration supports this.

**Independent Test**: Can be fully tested by selecting features, opening command palette, filtering by "Debrief: ", and verifying only applicable tools appear.

**Acceptance Scenarios**:

1. **Given** two tracks are selected, **When** the analyst opens the command palette and types "Debrief:", **Then** applicable analysis tools appear
2. **Given** no features are selected, **When** the analyst searches for analysis tools, **Then** no analysis tool commands appear (VS Code excludes commands that return false from when clause)
3. **Given** a tool is selected from the palette, **When** the analyst presses Enter, **Then** the tool executes with the current selection

---

### User Story 5 - Understand Tool Unavailability (Priority: P3)

An analyst wonders why a specific tool isn't available and can view inactive tools with explanations of what selection would make them applicable.

**Why this priority**: Helps analysts learn the system and understand tool requirements without trial-and-error.

**Independent Test**: Can be fully tested by enabling "Show unavailable tools" and verifying explanations appear.

**Acceptance Scenarios**:

1. **Given** one track is selected, **When** hovering over an inactive tool requiring two tracks, **Then** tooltip shows "Requires 2 tracks (1 selected)"
2. **Given** features of unsupported kinds are selected, **When** viewing inactive tools, **Then** explanations indicate which kinds are not accepted
3. **Given** a tool requires a minimum feature count, **When** fewer are selected, **Then** the explanation states the minimum required

---

### Edge Cases

- When debrief-calc MCP connection fails, the system MUST show an error state and retry on next user action
- When no tools are registered in debrief-calc, the sidebar MUST show "No analysis tools available"
- When tool metadata fails schema validation, the invalid tool MUST be excluded with a warning logged
- When tool execution returns an empty result, the system MUST show "No results" without modifying the plot
- When selection changes during tool execution, the execution MUST complete with the original selection
- When multiple tools are executed concurrently, each MUST complete independently without interference

## Requirements *(mandatory)*

### Functional Requirements

**Tool Discovery**

- **FR-001**: Extension MUST discover available tools from debrief-calc at startup via MCP `list_tools` call
- **FR-002**: Extension MUST cache tool metadata for the session lifetime (until VS Code window closes)
- **FR-003**: Extension MUST validate tool metadata against the Tool schema, excluding invalid entries
- **FR-004**: Extension MUST re-fetch tools when debrief-calc reconnects after a connection failure

**Selection Integration**

- **FR-005**: Extension MUST read current selection from session-state service (#029)
- **FR-006**: Extension MUST subscribe to selection changes and re-match tools on each change
- **FR-007**: Selection MUST be grouped by feature kind (e.g., "track", "reference_location") for matching

**Tool Matching**

- **FR-008**: Extension MUST use ToolMatchService from #027 for client-side matching
- **FR-009**: Matching MUST complete within 50ms for up to 50 registered tools
- **FR-010**: Match results MUST include explanations for inactive tools

**Context Menu Integration**

- **FR-011**: Extension MUST contribute "Analysis Tools" submenu to map panel context menu
- **FR-012**: Submenu MUST show only active (matching) tools
- **FR-013**: Menu items MUST be sorted alphabetically by tool name
- **FR-014**: When no tools match, submenu MUST show "No applicable tools" (disabled item)

**Sidebar Panel Integration**

- **FR-015**: Extension MUST provide "Analysis Tools" view in the Debrief activity bar
- **FR-016**: Panel MUST show active tools at top, inactive tools below (when toggled visible)
- **FR-017**: Panel MUST provide "Show unavailable tools" toggle (default: off)
- **FR-018**: Inactive tools MUST show explanatory tooltip on hover
- **FR-019**: Panel MUST show "No tools available" when debrief-calc returns empty tool list
- **FR-020**: Panel MUST show connection error state when MCP is unavailable

**Command Palette Integration**

- **FR-021**: Extension MUST register commands for each discovered tool with pattern `debrief.tool.{toolId}`
- **FR-022**: Commands MUST use `when` clause to hide when selection doesn't match
- **FR-023**: Commands MUST be registered dynamically after tool discovery completes
- **FR-024**: Command palette MUST show only active tools (VS Code limitation - no explanatory text)

**Tool Execution**

- **FR-025**: Extension MUST execute tools via MCP `execute_tool` call with selected feature IDs
- **FR-026**: Extension MUST show progress indicator during execution
- **FR-027**: Extension MUST handle execution errors gracefully with user notification
- **FR-028**: Extension MUST apply result envelope operations (add/update/remove) to the plot
- **FR-029**: Extension MUST persist modified plot via debrief-stac with provenance

**Provenance**

- **FR-030**: All computed results MUST include provenance: tool name, version, timestamp, source feature IDs
- **FR-031**: Provenance MUST be stored in feature properties as `debrief:provenance` object

### Non-Functional Requirements

- **NFR-001**: Tool matching MUST complete within 50ms for responsive UI updates
- **NFR-002**: Context menu MUST render within 100ms of right-click
- **NFR-003**: Sidebar MUST update within 200ms of selection change
- **NFR-004**: Tool execution MUST provide feedback within 500ms (progress indicator)

### Key Entities

- **ToolInventory**: Cached collection of Tool metadata from debrief-calc
- **ToolMatchService**: Service that matches tools to current selection (from #027)
- **MatchResult**: Result of matching, containing active tools and inactive tools with explanations
- **ResultEnvelope**: Output of tool execution with add/update/remove operations
- **Provenance**: Lineage metadata recording how a feature was computed

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Execute the appropriate analysis tool for the current selection
- **Key Decision(s)**:
  1. Which tool to run from available options
  2. Whether to view inactive tools to understand other possibilities
- **Decision Inputs**: List of applicable tools; for inactive tools, explanations of requirements

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map with features | Select one or more features | Selection highlighted, tool matching triggered |
| 2 | Selection active | Right-click OR view sidebar OR open palette | UI surface shows applicable tools |
| 3 | Tools displayed | Click tool name | Tool execution begins, progress shown |
| 4 | Execution complete | View map | Result features appear with provenance |

### UI States

- **Empty State** (sidebar): "Select features on the map to see applicable analysis tools"
- **Loading State**: "Loading analysis tools..." during startup discovery
- **Error State**: "Unable to connect to analysis service. Retrying..." with retry button
- **No Match State** (context menu): "No applicable tools" (disabled item)
- **Success State**: List of tool names with descriptions

### Sidebar Panel Layout

```
Analysis Tools
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AVAILABLE (2)
  ├─ Calculate Range/Bearing
  │    Distance and bearing between features
  └─ Generate Track Statistics
       Statistical analysis of track data

[ ] Show unavailable tools

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(when toggle enabled)

UNAVAILABLE (3)
  ├─ Calculate Intercept Point
  │    ⚠ Requires 2 tracks (1 selected)
  ├─ Zone Entry Detection
  │    ⚠ Requires 1 zone (0 selected)
  └─ Multi-Track Correlation
       ⚠ Requires 3+ tracks (1 selected)
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can identify applicable tools within 200ms of selection change
- **SC-002**: Tool execution completes and results appear within 5 seconds for typical operations
- **SC-003**: All computed results include complete provenance metadata
- **SC-004**: Tools are accessible from all three surfaces with consistent behavior
- **SC-005**: Inactive tool explanations enable analysts to understand requirements
- **SC-006**: System handles 50+ registered tools without performance degradation

## Implementation Phases

### Phase 1: Core Wiring (P1 User Stories)

1. Create ToolService to handle MCP communication with debrief-calc
2. Integrate ToolMatchService from #027 package
3. Subscribe to session-state selection changes
4. Wire tool matching to selection updates

### Phase 2: Context Menu Integration

1. Register context menu contribution in package.json
2. Create dynamic menu provider that queries ToolMatchService
3. Implement tool execution command handler
4. Add progress indicator during execution

### Phase 3: Sidebar Panel

1. Create AnalysisToolsViewProvider extending TreeDataProvider
2. Implement tree items for active/inactive tools with icons
3. Add "Show unavailable tools" toggle via context value
4. Wire selection subscription to refresh panel

### Phase 4: Command Palette

1. Implement dynamic command registration on tool discovery
2. Create when clause context for each tool based on match result
3. Register activation event for tool commands
4. Wire commands to shared execution handler

### Phase 5: Execution & Provenance

1. Implement MCP `execute_tool` call wrapper
2. Apply result envelope to FeatureCollection
3. Attach provenance metadata to computed features
4. Persist changes via debrief-stac

## Assumptions

- debrief-calc exposes tools via MCP with `list_tools` and `execute_tool` operations
- Tool metadata follows the SelectionRequirement schema from #027
- Session-state service (#029) is integrated and provides selection via subscription
- ToolMatchService from #027 is importable as a TypeScript library
- debrief-stac write operations support provenance metadata

## Out of Scope

- Tool parameters with schema-driven UI (future work)
- Tool categorization or grouping beyond alphabetical sort
- Execution progress indication for long-running tools beyond spinner
- Undo/redo integration for tool results (handled by session-state)
- Custom keybindings for individual tools

## Related Specifications

- [#027 Context-Sensitive Tool Offering](../027-context-tool-offering/spec.md) - Schemas, matching logic, Storybook harness
- [#029 Session State VS Code Integration](../029-session-state-vscode/spec.md) - Selection state management
- [#035 Distance Tool](absorbed) - Specific tool invocation (absorbed into this general solution)
