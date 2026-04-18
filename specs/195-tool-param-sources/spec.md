# Feature Specification: Parameter Sources for Tool Invocation

**Feature Branch**: `195-tool-param-sources`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "Strategy for provision of parameters to tools. Our main route to triggering tools is through right-clicking on the feature, or on the `Run` context menu. This route provides the feature(s) for the tool, but many tools have additional parameter requirements. Let's consider how we do this. Some parameters have parameters that may be enumerated. So, for a frequency parameter, we could provide a further level of menu, where the analyst chooses from, e.g. 1 sec, 5 secs, 10 secs, 30 secs, 1 minute, 5 minutes,.... and so on up to 1 day, and then a `Custom` option that reverts to showing a dynamically collated dialog that allows provision of the missing parameters. Where a tool requires start and stop time, this could be taken from the Time Controller's current filter period (which is actually stored in session state). So, for commands that require this time period, offer a submenu of `From Time Controller` or `Custom...`." (Issue #195)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Launch a Tool with a Preset via a Nested Submenu (Priority: P1)

An analyst right-clicks a track and picks a tool that requires a frequency parameter (e.g., "Resample at frequency..."). Instead of a dialog, a nested submenu opens showing a curated ladder of common frequencies — 1 sec, 5 secs, 10 secs, 30 secs, 1 min, 5 mins, 15 mins, 1 hour, 1 day — plus a "Custom..." escape hatch. The analyst picks "10 secs" and the tool executes immediately with that value.

**Why this priority**: The everyday case for parameterised tools is a common, well-known value. Replacing a dialog with a two-click preset pick is the single biggest reduction in friction and is what makes the context-menu workflow feel fluent rather than fiddly.

**Independent Test**: Right-click a feature, pick a tool with an enumerated preset parameter, verify the nested submenu lists the curated values and the "Custom..." escape, and verify that selecting a preset launches the tool with that value without any further dialog appearing.

**Acceptance Scenarios**:

1. **Given** a tool whose parameter definition declares a curated preset list, **When** the analyst hovers/clicks that tool in the context menu, **Then** a nested submenu of preset labels is shown (with a trailing "Custom..." item).
2. **Given** the nested preset submenu is open, **When** the analyst picks a preset, **Then** the tool executes with that value and no dialog is shown.
3. **Given** the nested preset submenu is open, **When** the analyst picks "Custom...", **Then** the standard parameter dialog opens with that parameter highlighted and accepting free-form input.

---

### User Story 2 - Launch a Time-Range Tool Using the Time Controller as the Source (Priority: P1)

An analyst right-clicks and picks a tool that requires start and stop times (e.g., "Export features in range..."). The nested submenu offers "From Time Controller" (prefilled from the analyst's current time-filter period) and "Custom...". Picking "From Time Controller" runs the tool with the current filter's start/stop without any dialog. The analyst does not have to re-type times they already established when scrubbing the time slider.

**Why this priority**: Time-range tools are pervasive and the Time Controller already represents the analyst's current temporal focus. Offering that focus as a one-click source is as important as the preset ladder, because dialog re-entry of times is error-prone and slow.

**Independent Test**: Set a time-filter period on the Time Controller, right-click, pick a time-range tool, and verify that the "From Time Controller" submenu item displays the current start/stop in its label and that selecting it runs the tool with exactly that range — with no dialog shown.

**Acceptance Scenarios**:

1. **Given** the Time Controller has an active filter period, **When** the analyst opens a tool whose parameters can be sourced from session state, **Then** a "From Time Controller — {start} → {stop}" item appears in the nested submenu alongside "Custom...".
2. **Given** the Time Controller's filter covers 2024-05-01 12:00 to 18:00, **When** the analyst picks "From Time Controller", **Then** the tool executes with start=12:00 and stop=18:00 and no dialog appears.
3. **Given** no time filter is active on the Time Controller, **When** the analyst opens the tool, **Then** the "From Time Controller" item is shown in a disabled state with a short explanation (e.g., "no active time filter") and only "Custom..." is selectable.

---

### User Story 3 - Fall Back to a Dynamic Dialog Only for the Missing Pieces (Priority: P2)

An analyst picks a tool that needs both a frequency (preset ladder) and a label (free-form text). They pick "30 secs" from the frequency submenu, then "Custom..." from the label submenu. A dialog opens containing only the label field; the already-chosen frequency is pre-filled and read-only. The dialog is no longer a "collect everything" form — it only asks for what the submenus could not supply.

**Why this priority**: The submenu strategy only pays off if the Custom dialog shrinks accordingly. Otherwise the analyst re-enters values they already picked, or feels they are answering the same question twice. This requirement is what binds the two sources into a single coherent flow.

**Independent Test**: Open a multi-parameter tool, supply some parameters from preset/session submenus and pick Custom for the rest, and verify the dialog contains only the unsupplied fields with the supplied fields shown as read-only context.

**Acceptance Scenarios**:

1. **Given** a tool with two parameters where one has been picked from a preset submenu, **When** the analyst picks "Custom..." for the second, **Then** the dialog shows only the second parameter's input and displays the first as a read-only summary.
2. **Given** a tool with parameters all supplied via submenus, **When** the last submenu selection is made, **Then** the tool executes immediately with no dialog at all.
3. **Given** a Custom dialog is open with partial context, **When** the analyst cancels the dialog, **Then** the whole tool invocation is cancelled and no state changes occur.

---

### User Story 4 - Declare Parameter Sources Alongside the Tool's Parameter Schema (Priority: P2)

A developer adding a new tool declares each of its parameters with its source metadata — a curated preset list, a named session-state shortcut (e.g., `time_controller_filter`), or both — in the same schema that defines the parameter's type. When the tool appears in the context menu, the nested submenu is generated automatically from that metadata. The developer never writes bespoke menu-building code and never duplicates preset values across tools.

**Why this priority**: Without a single declarative source, preset lists drift between tools and the submenu UX fragments. This is the maintainability requirement that keeps Stories 1 and 2 durable as the tool library grows. It is P2 because the UX can initially work with a small set of tools before the schema is fully generalised.

**Independent Test**: Add a new tool that declares a preset list and a session-state shortcut in its parameter schema, and verify that the nested submenu is rendered without any additional UI code.

**Acceptance Scenarios**:

1. **Given** a tool's parameter schema declares a preset list and a session-state source, **When** the tool is registered, **Then** the submenu is generated from that declaration with no tool-specific UI code.
2. **Given** a preset list is updated in the schema, **When** the schema is regenerated, **Then** every tool referencing that preset list shows the new values without code changes.
3. **Given** two tools declare the same session-state source (e.g., `time_controller_filter`), **When** they are invoked, **Then** they read the same session value via the same shared mechanism.

---

### User Story 5 - Record Which Source Supplied Each Parameter (Priority: P3)

When a tool runs, its recorded provenance includes — for each parameter — whether the value came from a preset, a session-state shortcut, or a Custom dialog entry. An analyst reviewing a run later can see, for instance, that the 10-second resample was a preset choice and the time window was drawn from the Time Controller at run time.

**Why this priority**: Provenance is a Debrief constitutional principle (all transformations record lineage). Without recording the source, two runs with identical values are indistinguishable in review, and we cannot answer questions like "which tools did the analyst tune vs. accept defaults for?". It is P3 because it is diagnostically important but does not block the primary user experience.

**Independent Test**: Invoke a tool using a mix of preset, session, and Custom sources; inspect the tool-run provenance record and verify each parameter's source label is recorded alongside its value.

**Acceptance Scenarios**:

1. **Given** a tool executed with a preset-picked parameter, **When** the run's provenance is retrieved, **Then** the parameter is labelled as sourced from a preset with the preset's identifier.
2. **Given** a tool executed with a session-state shortcut, **When** the run's provenance is retrieved, **Then** the parameter is labelled as sourced from that session-state source (e.g., `time_controller_filter`).
3. **Given** a parameter value was captured in the Custom dialog, **When** the run's provenance is retrieved, **Then** the parameter is labelled as a Custom entry.

---

### Edge Cases

- **Session source empty**: Time Controller has no active filter → shortcut item is disabled with an explanatory sub-label; analyst can still pick "Custom...".
- **Session source changes mid-flow**: Analyst opens the submenu, the Time Controller's filter changes before they pick → the label value at the moment of *selection* wins; stale label values must not be dispatched.
- **Preset submenu is long**: Curated list has 15+ entries (e.g., full frequency ladder) → submenu must still be scannable; grouping or a scrollable submenu is acceptable but no preset list may exceed what the analyst can reasonably skim.
- **Custom value fails validation**: Analyst types an invalid Custom value (e.g., `"37 stardates"` for a duration) → dialog blocks submission with an inline validation message; no tool invocation occurs.
- **Tool has no declared sources**: Parameter has neither preset list nor session source → only "Custom..." is shown in its submenu (no empty parent menu).
- **Multiple features selected at trigger time**: Right-click operates on multiple selected features → submenu behaves identically; the feature set is passed through unchanged alongside the parameter values.
- **Custom dialog cancelled partway**: Analyst has picked some submenus and cancels the final Custom dialog → the entire invocation cancels and no previously-picked values are retained for a subsequent invocation.
- **Same session source referenced by two parameters**: E.g., start and stop both sourced from `time_controller_filter` → one submenu item populates both.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For every tool parameter whose schema declares a curated preset list, the context menu MUST render a nested submenu of those presets with a trailing "Custom..." item.
- **FR-002**: For every tool parameter whose schema declares a session-state source, the nested submenu MUST include an item labelled with the source's display name and its current value (e.g., "From Time Controller — 12:00 → 18:00"), alongside "Custom...".
- **FR-003**: A parameter schema MAY declare both a preset list and session-state sources; the nested submenu MUST list session-state sources first, then presets, then "Custom..." as the terminal item.
- **FR-004**: Selecting a preset or a session-state source MUST dispatch the tool using that value WITHOUT opening any dialog.
- **FR-005**: Selecting "Custom..." MUST open a dynamically generated dialog that contains input fields ONLY for parameters not yet supplied via earlier submenu selections.
- **FR-006**: When a Custom dialog is open with partial context, any parameters supplied via submenus MUST be displayed as read-only context (not editable inputs) so the analyst can see the full call before submitting.
- **FR-007**: A session-state source whose current value is unavailable MUST appear in the submenu in a disabled state with an explanatory sub-label; it MUST NOT be selectable.
- **FR-008**: The value sent to the tool for a session-state source MUST be captured at the moment of submenu selection, not at the moment the submenu was opened.
- **FR-009**: A tool with multiple parameters MUST resolve each parameter via its own nested submenu (or a single combined Custom dialog if "Custom..." is picked at any stage).
- **FR-010**: Cancelling the flow at any stage (Escape, clicking outside, cancelling the Custom dialog) MUST cancel the entire invocation; no partial state MUST be retained.
- **FR-011**: Preset lists and session-state source identifiers MUST be declared in the tool's parameter schema, not hard-coded in per-tool UI code; the submenu rendering MUST be generated from that schema.
- **FR-012**: When the same session-state source identifier (e.g., `time_controller_filter`) is used by multiple tools, all tools MUST read it through the same shared mechanism (single source of truth).
- **FR-013**: The tool-run provenance record MUST include, for each parameter, an indication of which source supplied the value (preset identifier, session-state source identifier, or "custom").
- **FR-014**: Custom values entered in the dialog MUST be validated against the parameter's type/constraints before the tool is dispatched; invalid values MUST show an inline error and block submission.
- **FR-015**: If a parameter has neither a preset list nor a session-state source declared, the flow MUST proceed directly to the Custom dialog for that parameter (no empty nested submenu).

### Key Entities

- **Parameter Source**: A named way of supplying a value to a tool parameter without analyst free-form entry. Three kinds: (a) *Preset* — a curated named value drawn from the parameter's preset list; (b) *Session-state source* — a named reference (e.g., `time_controller_filter`) that resolves to a current session value at selection time; (c) *Custom* — a value typed by the analyst in a dialog. Each parameter can advertise zero or more Preset and Session-state sources.
- **Preset Ladder**: A curated, ordered list of named values attached to a parameter definition (e.g., the frequency ladder: 1s, 5s, 10s, 30s, 1m, 5m, 15m, 1h, 1d). Finite and hand-picked, not auto-generated from a range.
- **Session-State Source**: A named handle (e.g., `time_controller_filter`) with a display name, a type, and a resolver that reads the current session state to produce a parameter value. The resolver may report "unavailable" (e.g., no active time filter) which causes the submenu item to appear disabled.
- **Parameter Source Record**: Provenance entry recorded per parameter on a tool run, capturing the source kind (preset / session / custom), the source identifier (if any), and the value that was dispatched.

## User Interface Flow *(optional - include for UI features)*

### Decision Analysis

- **Primary Goal**: Launch a parameterised tool with as few clicks and as little typing as possible, using the analyst's existing context (time filter, recent presets) wherever it already answers the question.
- **Key Decisions**:
  1. For each parameter: accept a preset, accept a session-state source, or enter Custom?
  2. If Custom: what value(s) to type for the remaining, un-prefilled parameters?
- **Decision Inputs**: The nested submenu shows (per parameter) the list of preset labels, the display name of each session-state source with its current value shown inline (or a disabled sub-label when unavailable), and "Custom...". The Custom dialog shows read-only context for already-supplied parameters so the analyst sees the full call before submitting.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Right-click context menu on feature(s), "Run" submenu listing applicable tools | Hover/click a tool name | Tool item expands into a nested submenu (one item per parameter source for the tool's next unresolved parameter) |
| 2 | Nested submenu for parameter 1: session source(s) at top, presets in the middle, "Custom..." at the bottom | Click a session source or a preset | Value captured; if more parameters remain, next nested submenu opens; if none, tool executes |
| 3 | (Optional) Nested submenu for parameter 2 | Click a source | As above |
| 4 | (Optional) Custom dialog | Fill unsupplied fields and submit | Values validated; tool executes with all captured values |
| 5 | Tool completes | — | Results appear in the usual panel; provenance includes per-parameter source labels |

### UI States

- **Empty State**: Tool has no declared preset/session sources for its parameters → the flow proceeds directly to a full Custom dialog (same as today's behaviour for unconfigured tools).
- **Loading State**: Not applicable to the selection flow itself (menus are populated from schema and session state synchronously). The tool's own execution shows the usual busy indicator after dispatch.
- **Error State**: (a) Session source unavailable → submenu item appears disabled with an explanatory sub-label (e.g., "no active time filter"). (b) Custom value fails validation → dialog shows an inline error beside the offending field and blocks submission. (c) Tool dispatch fails → standard tool-failure indicator (not in scope of this feature).
- **Success State**: Tool executes and results appear in the standard results surface; the provenance record visibly includes the source label for each parameter (e.g., "frequency: preset 10s", "time range: session time_controller_filter").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For parameterised tools whose parameters are all declared with a preset or session source, the analyst can launch the tool in no more than two clicks after opening the Run context menu (one click per parameter's submenu).
- **SC-002**: For time-range tools, when the Time Controller has an active filter, the analyst can launch the tool with the current range without typing or selecting any time value — purely through "From Time Controller".
- **SC-003**: At least 80% of real invocations of parameterised tools (measured over a representative analysis session) use a preset or session source rather than Custom entry.
- **SC-004**: Median time from opening the Run context menu to tool dispatch is under 5 seconds for tools whose parameters are all covered by declared sources.
- **SC-005**: Zero tools in the shipped catalogue contain hard-coded preset value lists in their UI code; every preset list is declared in the tool's parameter schema.
- **SC-006**: 100% of completed tool runs include, in their provenance record, an explicit source label for every parameter (preset / session / custom).
- **SC-007**: When a session-state source is unavailable, 100% of observed attempts to use it result in a disabled submenu item with an explanatory sub-label, with no broken invocations or silent fallbacks.

## Dependencies and Assumptions

- **Builds on #091 (Tool Parameter Context Menus)**: This feature refines and extends the pre-execution parameter-collection pattern established in spec 091. Where 091 defined the context-menu mechanism and Custom-dialog fallback generally, this feature specifies the *sources* a parameter may advertise (presets, session-state) and the rules for combining them. The Custom-dialog surface referenced here is the one defined by 091.
- **Tool parameter schema is extensible**: The existing tool-parameter schema can be extended to declare preset ladders and named session-state sources per parameter. No new schema language is required; the additions are descriptive metadata attached to existing parameter definitions.
- **Time Controller publishes its filter period as session state**: User state lives in a shared session-state service; the Time Controller's current filter period is readable from that service. This feature assumes that session state is available synchronously at menu-render and selection time.
- **Session-state sources are finite and named**: The first shipped source is `time_controller_filter`. Others (e.g., `selected_platform`, `current_chart_extent`) can be added later using the same declaration pattern; the design does not restrict the set to one.
- **Preset lists are curated, not generated**: Consistent with 091's assumption, preset ladders are finite hand-picked lists rather than auto-generated ranges. "Custom..." remains the escape hatch for values outside the ladder.
- **Right-click entry point is already in place**: The right-click-on-feature and Run-context-menu entry points that surface applicable tools are established features; this spec extends their submenu contents but does not change how tools are listed or filtered.
- **Provenance recording is already part of tool runs**: Every tool run already records transformation lineage (constitutional principle). This feature adds a per-parameter source label to that existing record rather than introducing a new provenance surface.
