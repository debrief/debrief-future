# Feature Specification: Tool Parameter Context Menus

**Feature Branch**: `091-tool-parameter-context-menus`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Add tool parameter context menus for pre-execution configuration — successive inline context menus in webview to collect parameter values before tool execution; presets defined in LinkML"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Enum Parameter Before Tool Execution (Priority: P1)

An analyst clicks a tool button (e.g., "Set Track Color") in the tools panel. Before the tool executes, an inline context menu appears near the button showing available color choices. The analyst selects "Red" from the menu, and the tool executes with that color parameter. The analyst no longer needs to run the tool with a default and then re-tune the parameter afterward.

**Why this priority**: This is the core value proposition — enabling parameter selection before execution for the most common parameter type (enumerated choices). Without this, all other parameter collection UI is pointless.

**Independent Test**: Can be fully tested by clicking any tool with an enum parameter and verifying the context menu appears with the correct choices from the schema, then confirming the selected value is passed through to tool execution.

**Acceptance Scenarios**:

1. **Given** a tool with one enum parameter is available in the tools panel, **When** the analyst clicks the tool button, **Then** an inline context menu appears near the button displaying all valid choices for that parameter.
2. **Given** an inline context menu is showing enum choices, **When** the analyst selects a choice, **Then** the tool executes with the selected parameter value.
3. **Given** a tool with no parameters is available in the tools panel, **When** the analyst clicks the tool button, **Then** the tool executes immediately with no menu shown (backward compatible).

---

### User Story 2 - Collect Multiple Parameters Sequentially (Priority: P2)

An analyst clicks a tool that requires two parameters (e.g., marker symbol and color). After clicking the tool button, a context menu appears for the first parameter (marker symbol). After selecting "Triangle", a second context menu appears for the next parameter (color). After selecting "Blue", the tool executes with both values. Parameters are collected one at a time in a defined sequence.

**Why this priority**: Many tools have more than one configurable parameter. Sequential collection is essential for the feature to be useful across the full tool library.

**Independent Test**: Can be tested by clicking any tool with two or more parameters and verifying each parameter menu appears in sequence, collecting values before execution.

**Acceptance Scenarios**:

1. **Given** a tool with multiple parameters, **When** the analyst clicks the tool button, **Then** context menus appear one at a time for each parameter in defined order.
2. **Given** the analyst is on the second parameter menu, **When** the analyst presses Escape or clicks outside, **Then** the menu dismisses and the tool does not execute (cancellation at any stage cancels the entire flow).
3. **Given** a tool with three parameters, **When** the analyst completes all three selections, **Then** the tool executes with all three collected values.

---

### User Story 3 - Schema-Defined Parameter Types Eliminate Duplication (Priority: P3)

A developer defining a new tool declares a parameter type (e.g., "NamedColor") rather than hardcoding a list of color values. The schema pipeline provides the actual enum values from a single source of truth. When a new color is added to the schema, all tools referencing that parameter type automatically gain the new choice — in both the server-side validation and the client-side menu.

**Why this priority**: Eliminates value duplication and drift between tools and schemas. This is the architectural foundation that makes parameter menus correct and maintainable. However, it is lower priority than the UI because the UI can initially work with existing hardcoded choices while schema integration is completed.

**Independent Test**: Can be tested by adding a new value to a parameter-type enum in the schema, regenerating derived types, and verifying the new value appears in both server-side validation and client-side menus without modifying any tool source files.

**Acceptance Scenarios**:

1. **Given** a parameter-type enum is defined in the schema with specific values, **When** a tool declares its parameter using that type name, **Then** the tool's available choices are derived from the schema — not hardcoded in the tool definition.
2. **Given** the schema enum "NamedColor" contains ["red", "green", "blue"], **When** a tool declares `param_type="NamedColor"`, **Then** the MCP definition advertises the type name rather than flattening values into a plain enum array.
3. **Given** a schema enum has been updated with a new value, **When** derived types are regenerated, **Then** both server-side validation and client-side type definitions reflect the new value.

---

### User Story 4 - Custom Value Entry for Numeric and Duration Parameters (Priority: P4)

An analyst clicks a tool with a duration parameter (e.g., time window). A context menu appears showing preset durations (e.g., "5 minutes", "15 minutes", "1 hour") plus a "Custom..." option. The analyst selects "Custom...", a text input appears, and they type "37 minutes". The tool executes with the custom value.

**Why this priority**: Numeric and duration parameters need both quick presets and flexible custom input. This builds on the enum menu foundation and handles a distinct parameter category.

**Independent Test**: Can be tested by clicking a tool with a numeric or duration parameter and verifying preset choices appear plus a "Custom..." option that opens text input for arbitrary values.

**Acceptance Scenarios**:

1. **Given** a tool with a duration parameter, **When** the analyst clicks the tool button, **Then** a context menu shows preset duration choices plus a "Custom..." option.
2. **Given** the context menu is showing presets, **When** the analyst selects "Custom...", **Then** a text input appears allowing free-form value entry.
3. **Given** the analyst enters a custom value, **When** the analyst confirms the input, **Then** the tool executes with the custom value.

---

### User Story 5 - Boolean Parameter Toggle (Priority: P5)

An analyst clicks a tool with a boolean parameter (e.g., "Include header"). The context menu shows two choices representing the true/false states with descriptive labels (e.g., "Include header" / "Exclude header"). The analyst selects one and the tool executes.

**Why this priority**: Boolean parameters are simpler than enums but still need an explicit choice UI rather than defaulting silently.

**Independent Test**: Can be tested by clicking any tool with a boolean parameter and verifying two labeled choices appear.

**Acceptance Scenarios**:

1. **Given** a tool with a boolean parameter, **When** the analyst clicks the tool button, **Then** a context menu shows two descriptive options for the true and false states.
2. **Given** a boolean context menu is displayed, **When** the analyst selects an option, **Then** the tool executes with the corresponding boolean value.

---

### Edge Cases

- What happens when the analyst clicks another tool button while a parameter context menu is open? The current menu dismisses without executing, and the new tool's parameter flow begins.
- What happens when a tool's parameter type references a schema enum that has zero values? The parameter is skipped (treated as having no choices) and the tool proceeds to the next parameter or executes.
- What happens when the analyst resizes the window while a context menu is open? The menu repositions to remain visible within the viewport.
- What happens when keyboard navigation is used? Arrow keys move through menu items, Enter selects, Escape cancels.
- What happens if the MCP definition does not include the parameter type annotation? The system falls back to any inline choices provided, or skips the parameter (uses default).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an inline context menu near the tool button when the analyst clicks a tool that has one or more configurable parameters.
- **FR-002**: System MUST collect parameters one at a time via successive context menus, in a defined order matching the tool's parameter declaration sequence.
- **FR-003**: System MUST execute tools with no parameters immediately on click, with no change to existing behavior.
- **FR-004**: For enum-type parameters, the context menu MUST display all valid choices derived from the schema-defined parameter type.
- **FR-005**: For boolean-type parameters, the context menu MUST display two descriptive options representing the true and false states.
- **FR-006**: For numeric and duration parameters, the context menu MUST display schema-defined preset choices plus a "Custom..." option that reveals a text input for free-form entry.
- **FR-007**: The analyst MUST be able to cancel the parameter collection flow at any stage by pressing Escape or clicking outside the menu, which prevents tool execution entirely.
- **FR-008**: Collected parameter values MUST be forwarded through the tool execution message to the tool execution handler.
- **FR-009**: The schema MUST define parameter-value enums as a single source of truth for enumerable parameter types.
- **FR-010**: Tool definitions MUST reference parameter types by name rather than embedding duplicate choice lists.
- **FR-011**: The MCP tool definition output MUST carry the parameter type name as a custom annotation, rather than flattening values into a plain enum array.
- **FR-012**: Both server-side and client-side MUST validate parameter values against the schema-derived types.
- **FR-013**: Context menus MUST support keyboard navigation (arrow keys to move, Enter to select, Escape to cancel).
- **FR-014**: When a context menu would render partially off-screen, the system MUST reposition the menu to remain fully visible within the viewport.

### Key Entities

- **Parameter Type**: A named reference to a schema-defined set of valid values for a tool parameter. Has a name (e.g., "NamedColor"), a value kind (enum, boolean, numeric, duration), and a set of permitted values derived from the schema.
- **Tool Parameter**: A configurable input for a tool. Has a name, a display label, a parameter type reference, an optional default value, and an ordering position for sequential collection.
- **Preset**: A schema-defined commonly-used value for numeric or duration parameters. Has a display label and a value. Grouped under a parameter type alongside the "Custom..." escape hatch.
- **Context Menu**: A transient inline UI element anchored near a trigger element. Contains a list of selectable items, supports keyboard navigation, and auto-positions to stay within viewport bounds.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Configure tool parameters before execution so the tool runs with the analyst's intended values on the first attempt.
- **Key Decision(s)**:
  1. For each parameter: which value to use (from the presented choices or a custom entry).
  2. Whether to proceed or cancel the tool execution entirely.
- **Decision Inputs**: The context menu shows the parameter name, all valid choices with descriptive labels, and (for numeric/duration parameters) a set of common presets plus a custom entry option.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Tools panel with tool buttons visible | Analyst clicks a tool button that has parameters | First parameter's context menu appears anchored near the button |
| 2 | Context menu showing choices for parameter 1 | Analyst selects a choice (or types a custom value) | Selection is recorded; if more parameters remain, next parameter's menu appears |
| 3 | Context menu showing choices for parameter 2 | Analyst selects a choice | Selection is recorded; if more parameters remain, next menu appears |
| 4 | Final parameter selected | Analyst selects last choice | All collected values are forwarded to tool execution; tool runs |
| 5 | Tool executing | Tool completes | Result appears in log panel (existing behavior) |

### UI States

- **No Parameters State**: Tool button click executes immediately — no menu shown.
- **Menu Active State**: Context menu is visible, anchored to the tool button area. Keyboard focus is within the menu. The triggering button appears visually selected/highlighted.
- **Custom Input State**: For numeric/duration parameters after selecting "Custom...", a text input replaces the menu choices. The analyst can type a value and confirm or cancel.
- **Cancelled State**: Analyst pressed Escape or clicked outside — menu dismisses, no tool execution occurs, no visual residue remains.
- **Error State**: If a custom value fails validation (e.g., non-numeric input for a number parameter), an inline validation message appears within the input area prompting correction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can configure and execute a parameterized tool in three or fewer interactions (click tool, select value(s), tool runs) — no post-execution re-tuning needed for known parameter values.
- **SC-002**: 100% of tools with parameters present a context menu before execution; 100% of tools without parameters execute immediately on click.
- **SC-003**: Adding a new value to a schema-defined parameter-type enum makes that value available in both server-side validation and client-side menus after regeneration, with zero tool source file changes required.
- **SC-004**: No tool source file contains a hardcoded list of parameter values for any schema-backed parameter type.
- **SC-005**: Keyboard-only users can complete the full parameter selection flow (navigate choices, select, confirm, or cancel) without using a mouse.
- **SC-006**: Context menus render fully within the visible viewport regardless of trigger button position.

## Assumptions

- The existing ParameterEditor in the LogPanel (post-execution tuning) is not modified by this feature. The pre-execution menus and post-execution editor coexist independently.
- The sequential parameter collection order matches the order parameters are declared in the tool definition.
- The existing tool execution pipeline can accept parameter values as additional arguments without structural changes to the execution flow — only the message format is extended to include parameter values.
- Schema-defined presets for numeric/duration parameters are finite, curated lists (not auto-generated ranges).
- The "Custom..." option for numeric/duration parameters accepts free-form text validated against the parameter's value constraints (e.g., positive number, valid duration format).
