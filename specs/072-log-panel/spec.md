# Feature Specification: Log Panel

**Feature Branch**: `072-log-panel`
**Created**: 2026-02-09
**Status**: Draft
**Input**: User description: "Implement Log Panel [E02] — VS Code activity panel, timeline view, entry display, filter/search (requires #071, optionally #044)"
**Epic**: E02 — PROV Logging Implementation (Phase 2)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Analytical History Timeline (Priority: P1)

An analyst opens the Log Panel from the activity bar to review the history of operations performed on the current plot. The panel displays a chronological timeline of all tool executions, imports, and property edits — most recent first. The analyst can scroll through entries to understand what changes were made, when, and by which tool. Each entry shows the tool name, affected features, and timestamp.

**Why this priority**: The timeline is the fundamental capability of the Log Panel. Without a visible, chronological list of operations, the analyst has no way to review analytical history. This is the SRD P2 requirement and the entire reason the panel exists.

**Independent Test**: Can be fully tested by executing several tools on a plot, opening the Log Panel, and verifying all operations appear in reverse chronological order with correct tool names, timestamps, and affected feature references.

**Acceptance Scenarios**:

1. **Given** a plot with 5 recorded tool executions, **When** the analyst opens the Log Panel, **Then** all 5 entries appear in the timeline with the most recent at the top.
2. **Given** a tool execution that affected 3 features, **When** the analyst views the entry in the timeline, **Then** the entry appears once (not three times), with references to all 3 affected features.
3. **Given** a plot with no recorded operations, **When** the analyst opens the Log Panel, **Then** a clear empty state message is shown explaining that no operations have been recorded yet.
4. **Given** the Log Panel is open and the analyst runs a new tool, **When** the tool execution completes, **Then** the new entry appears at the top of the timeline without requiring a manual refresh.

---

### User Story 2 - Highlight Affected Features on Selection (Priority: P2)

An analyst selects a Log entry in the timeline to understand which features were involved in that operation. The system highlights the affected features on the map, making it easy to see the spatial context of the operation. Selecting a different entry updates the highlights. Deselecting clears the highlights.

**Why this priority**: Feature highlighting is the key interaction that connects the Log Panel to the map. Without it, the analyst cannot correlate operations with their spatial context. This transforms the panel from a static list into an interactive analysis tool.

**Independent Test**: Can be fully tested by selecting a Log entry and verifying the correct features are highlighted on the map, then selecting a different entry and verifying the highlights update, then deselecting and verifying highlights clear.

**Acceptance Scenarios**:

1. **Given** a Log entry that affected features "Track A" and "Track B", **When** the analyst selects that entry, **Then** "Track A" and "Track B" are highlighted on the map.
2. **Given** a highlighted entry, **When** the analyst selects a different entry, **Then** the previous highlights clear and the new entry's features are highlighted.
3. **Given** a highlighted entry, **When** the analyst deselects the entry (clicks it again or clicks elsewhere), **Then** all Log-related highlights clear from the map.
4. **Given** an entry referencing a feature that is currently hidden in the layers panel, **When** the analyst selects that entry, **Then** the visible features are highlighted and the hidden feature is not shown (no forced visibility change).

---

### User Story 3 - Switch Presentation Modes (Priority: P3)

An analyst adjusts the level of detail shown for each Log entry by switching between Compact, Normal, and Detailed presentation modes. Compact mode shows minimal information (tool name, feature name) for rapid scanning. Normal mode adds parameter summaries and before/after changes. Detailed mode adds timestamp, duration, attachment count, and file size. The chosen mode persists across sessions so the analyst does not need to re-select it each time.

**Why this priority**: Different tasks require different levels of detail. During a quick review, the analyst wants to scan rapidly (Compact). During investigation, they want full context (Detailed). Persistence avoids repeated configuration effort.

**Independent Test**: Can be fully tested by toggling between presentation modes and verifying each shows the expected level of detail, then closing and reopening the panel to verify the mode persists.

**Acceptance Scenarios**:

1. **Given** the Log Panel is showing entries, **When** the analyst switches to Compact mode, **Then** each entry displays only the tool name and primary affected feature name.
2. **Given** Compact mode is active, **When** the analyst switches to Normal mode, **Then** entries additionally show parameter values and a summary of before/after changes.
3. **Given** Normal mode is active, **When** the analyst switches to Detailed mode, **Then** entries additionally show timestamp, execution duration, attachment count, and file size.
4. **Given** the analyst sets Detailed mode, **When** they close and reopen the panel (or restart the application), **Then** Detailed mode is still selected.
5. **Given** any presentation mode, **When** the analyst hovers over a Log entry, **Then** the tool version is shown as a tooltip.

---

### User Story 4 - Filter and Search Log Entries (Priority: P4)

An analyst has a long history of operations and wants to find specific entries. They use the filter row to narrow the timeline by text search (matching tool name, feature name, or parameter values), by tool type, or by operation category. Filters combine (AND logic) to progressively narrow the results. The filter row can be collapsed when not needed.

**Why this priority**: Large plots accumulate many operations over time. Without filtering, the analyst must scroll through potentially hundreds of entries to find what they need. Filtering makes the panel usable at scale.

**Independent Test**: Can be fully tested by populating a plot with diverse operations, applying various filter combinations, and verifying only matching entries remain visible.

**Acceptance Scenarios**:

1. **Given** 20 Log entries from 4 different tools, **When** the analyst types "range" in the search field, **Then** only entries whose tool name, feature name, or parameter values contain "range" are shown.
2. **Given** the search field is active, **When** the analyst selects a specific tool from the tool type dropdown, **Then** results narrow to entries matching both the text and the tool type.
3. **Given** active filters are hiding some entries, **When** the analyst clears all filters, **Then** all entries reappear.
4. **Given** the filter row is visible, **When** the analyst collapses it, **Then** the filter row hides and more timeline entries are visible. Active filters remain applied even when collapsed.

---

### User Story 5 - View by Feature Grouping (Priority: P5)

An analyst wants to see operations organized by which feature they affected, rather than purely chronologically. They switch to the By-Feature view, which groups Log entries under feature headings. Within each group, entries are still sorted chronologically (most recent first). This helps the analyst understand the history of a specific feature.

**Why this priority**: The By-Feature view provides an alternative perspective that is particularly useful when investigating what happened to a specific track or annotation. It complements the Timeline view but is lower priority because the Timeline view covers the primary use case.

**Independent Test**: Can be fully tested by switching to By-Feature view and verifying entries are grouped under the correct feature headings, with correct chronological order within each group.

**Acceptance Scenarios**:

1. **Given** the Timeline view is active, **When** the analyst switches to By-Feature view, **Then** entries are grouped under feature name headings.
2. **Given** a feature has 3 operations recorded, **When** the analyst views that feature's group, **Then** all 3 operations appear in reverse chronological order within the group.
3. **Given** an operation affected multiple features, **When** the analyst views By-Feature mode, **Then** the operation appears under each affected feature's group.
4. **Given** the analyst switches from By-Feature view back to Timeline view, **Then** the flat chronological list is restored.

---

### User Story 6 - Action Button Placeholders (Priority: P6)

The Log Panel displays an action bar with buttons for future capabilities: Tune, Revert to Here, Revert This, Snapshot, and Rationale. In this phase, clicking any action button shows a message indicating the feature is not yet available. The buttons are present to establish the panel layout and prepare for Phases 4-6.

**Why this priority**: The action buttons define the panel's complete layout. Including them as placeholders ensures the visual design is complete even though the underlying functionality (tuning, reverting, snapshots) depends on later phases. This avoids layout changes in future phases.

**Independent Test**: Can be fully tested by clicking each action button and verifying a "not yet available" message appears.

**Acceptance Scenarios**:

1. **Given** a Log entry is selected, **When** the analyst clicks the "Tune" action button, **Then** a message indicates that parameter tuning is not yet available (planned for Phase 6).
2. **Given** a Log entry is selected, **When** the analyst clicks any other action button (Revert to Here, Revert This, Snapshot, Rationale), **Then** a similar "not yet available" message appears.
3. **Given** no Log entry is selected, **When** the analyst views the action bar, **Then** the action buttons are visibly disabled.

---

### Edge Cases

- What happens when the analyst opens the Log Panel before any plot is loaded? The panel shows an empty state explaining that no plot is open.
- What happens when a Log entry references a feature that has been deleted since the operation was recorded? The entry still appears in the timeline but the feature name shows as "(deleted)" and map highlighting skips it.
- What happens when the plot contains hundreds of Log entries? The panel loads entries efficiently, rendering only visible entries. Performance remains responsive with up to 500 entries.
- What happens when two operations have identical timestamps? They appear in a stable, deterministic order (by activityId as a tiebreaker).
- What happens when the analyst resizes the Log Panel to a very narrow width? The layout adapts gracefully — long text truncates with ellipsis and mode/filter controls remain usable.
- What happens when a snapshot boundary exists in the timeline? The boundary appears as a visual separator with a "Show earlier history" link to load entries before the snapshot.
- What happens when the analyst switches between two open plots? The Log Panel updates to show the timeline for the active plot.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Log Panel accessible from a dedicated icon in the application's activity bar, separate from the existing Debrief Activity Panel.
- **FR-002**: System MUST display a chronological timeline of all Log entries from the current plot, with the most recent entry at the top.
- **FR-003**: System MUST deduplicate multi-feature operations in the timeline — a single tool execution affecting N features appears as one timeline entry, not N.
- **FR-004**: System MUST update the timeline automatically when a new tool execution is recorded, without requiring the analyst to manually refresh.
- **FR-005**: System MUST select the affected features on the map when the analyst selects a Log entry, replacing any existing feature selection with the entry's `used` and `generated` feature references.
- **FR-006**: System MUST clear the feature selection when the analyst deselects a Log entry.
- **FR-007**: System MUST provide three presentation modes — Compact, Normal, and Detailed — that control the level of information shown per entry.
- **FR-008**: Compact mode MUST display the tool name and primary affected feature name only.
- **FR-009**: Normal mode MUST additionally display parameter values and a summary of before/after changes.
- **FR-010**: Detailed mode MUST additionally display timestamp, execution duration, attachment count, and file size.
- **FR-011**: System MUST show tool version as a tooltip on hover in all presentation modes.
- **FR-012**: System MUST persist the selected presentation mode across sessions so the analyst's preference survives panel close/reopen and application restart.
- **FR-013**: System MUST provide a filter row with text search (matching tool name, feature name, and parameter values), tool type dropdown, and operation category filter.
- **FR-014**: Filters MUST combine with AND logic to progressively narrow results.
- **FR-015**: The filter row MUST be collapsible. Active filters remain applied when the filter row is collapsed.
- **FR-016**: System MUST provide a By-Feature view that groups entries under feature name headings, with chronological order (most recent first) within each group.
- **FR-017**: System MUST allow switching between Timeline view and By-Feature view.
- **FR-018**: System MUST display an action bar with placeholder buttons for Tune, Revert to Here, Revert This, Snapshot, and Rationale. Each button shows a "not yet available" message when clicked.
- **FR-019**: Action buttons MUST be visually disabled when no Log entry is selected.
- **FR-020**: System MUST show an appropriate empty state when no plot is open, or when the open plot has no Log entries.
- **FR-021**: System MUST show snapshot boundaries as visual separators in the timeline, with a "Show earlier history" control for entries before the boundary.
- **FR-022**: System MUST update the displayed timeline when the analyst switches between open plots.
- **FR-023**: System MUST render efficiently with up to 500 Log entries without noticeable lag or scroll stutter.

### Key Entities

- **Log Panel**: A dedicated activity panel in the application sidebar for viewing and interacting with the analytical history of a plot. Has its own activity bar icon, separate from the Debrief Activity Panel.
- **Timeline Entry**: A single row in the Log Panel representing one operation (one `activityId`). Displays tool name, affected features, parameters, timestamps, and changes depending on the presentation mode. Assembled from the underlying Log Entry data.
- **Presentation Mode**: One of three display density levels (Compact, Normal, Detailed) controlling how much information each timeline entry shows. Persisted as a user preference.
- **Filter Row**: A collapsible row of controls for narrowing the displayed timeline entries by text search, tool type, and operation category.
- **Action Bar**: A row of buttons for future Log operations (Tune, Revert to Here, Revert This, Snapshot, Rationale). All buttons are placeholder-only in Phase 2.
- **Snapshot Boundary**: A visual separator in the timeline marking where a snapshot was taken. Entries before the boundary can be loaded on demand.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Review, search, and understand the history of operations performed on the current plot.
- **Key Decision(s)**:
  1. Which view to use (Timeline chronological vs. By-Feature grouping) depending on whether the analyst wants a global overview or feature-specific history.
  2. What level of detail to display (Compact for scanning, Normal for working, Detailed for investigating).
  3. Which filters to apply to narrow down the history to entries of interest.
- **Decision Inputs**: The timeline entries themselves provide the context — tool names, feature names, timestamps, and parameter summaries. The presentation mode and filter controls let the analyst adjust what they see to match their current task.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|-------------|-------------|--------|
| 1 | Activity bar visible | Click Log Panel icon | Log Panel opens in sidebar, Timeline view loads |
| 2 | Timeline view with entries | Scroll through entries | View operational history, most recent first |
| 3 | Timeline view | Click a Log entry | Entry is selected, affected features highlight on map |
| 4 | Entry selected | Click mode toggle (Compact/Normal/Detailed) | Entry detail level changes across all entries |
| 5 | Timeline view | Expand filter row, type search text | Timeline narrows to matching entries |
| 6 | Timeline view | Click "By-Feature" toggle | Entries regroup under feature headings |
| 7 | Entry selected | Click an action button (e.g., Tune) | "Not yet available" message appears |
| 8 | Log Panel open | Switch to different open plot | Timeline updates to show new plot's history |

### UI States

- **Empty State (no plot)**: Message: "No plot is open. Open a plot to view its analytical history."
- **Empty State (no entries)**: Message: "No operations recorded yet. Tool executions will appear here as you work."
- **Loading State**: Brief loading indicator while the timeline is assembled from feature data. For most plots this is near-instant.
- **Error State**: If timeline assembly fails, a message describing the issue with a "Retry" option.
- **Active State**: Timeline entries displayed with action bar, view toggle, and filter row. Selected entry is visually distinct.
- **Filtered State**: Active filters shown as chips/badges. Entry count indicator shows "N of M entries" to communicate how many are hidden by filters.

### Panel Layout

```
┌─────────────────────────────────────┐
│  Action Bar                         │
│  [Revert to] [Revert this]         │
│  [Tune] [Snapshot] [Rationale]     │
│  [Timeline | By-Feature]           │
│  [Compact | Normal | Detailed]     │
├─────────────────────────────────────┤
│  Filter Row (collapsible)           │
│  [Search text] [Tool ▼] [Category] │
├─────────────────────────────────────┤
│  Entry list (most recent at top)    │
│                                     │
│  ── Snapshot boundary ──            │
│  [Show earlier history]             │
└─────────────────────────────────────┘
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analyst can open the Log Panel from the activity bar and see a chronological list of all recorded operations for the current plot within 2 seconds of opening.
- **SC-002**: Selecting a Log entry highlights the correct affected features on the map within 1 second, and deselecting clears highlights completely.
- **SC-003**: All three presentation modes (Compact, Normal, Detailed) display the specified information for each mode, and the selected mode persists across panel close/reopen cycles.
- **SC-004**: Text search narrows displayed entries to only those matching the search term within 0.5 seconds of typing, with results updating live.
- **SC-005**: The By-Feature view correctly groups all entries under their respective feature headings, with each group maintaining reverse chronological order.
- **SC-006**: The panel remains responsive (scroll without stutter, filters apply without visible delay) with 500 Log entries in the timeline.
- **SC-007**: New tool executions appear at the top of the timeline automatically without manual refresh, confirmed by executing a tool while the panel is open.
- **SC-008**: The Log Panel correctly switches context when the analyst switches between open plots, showing the correct timeline for each.

## Clarifications

### Session 2026-02-09

- Q: Should selecting a Log entry replace the map's feature selection or use a separate visual highlight? → A: Replace selection. When the analyst opens the Log Panel they have switched from analysis mode to log retrospection, so replacing the feature selection is the expected behaviour.

## Assumptions

- **A-001**: Phase 1 (#071 — Log Recording Service) is complete before this feature begins implementation, providing the `getTimeline()` function that returns deduplicated, sorted Log entries.
- **A-002**: The Log Panel has its own activity bar icon, separate from the Debrief Activity Panel (#044). Clicking the Log icon shows the Log Panel in the sidebar; clicking the Debrief icon shows the Activity Panel. They occupy the same sidebar space and swap when toggled.
- **A-003**: Presentation mode preference is stored using the application's standard user settings/state persistence mechanism.
- **A-004**: The Log Panel is read-only in Phase 2. All action buttons (Tune, Revert to Here, Revert This, Snapshot, Rationale) are placeholders that display "not yet available" messages. They become functional in Phases 4-6.
- **A-005**: Selecting a Log entry replaces the map's current feature selection (not a separate highlight layer). When the analyst opens the Log Panel they have switched to retrospection mode, so taking over the selection is expected. This reuses the existing selection mechanism — no new highlighting system is introduced.
- **A-006**: The "Show earlier history" control at snapshot boundaries loads entries lazily. In Phase 2, if no snapshot mechanism exists yet, the full timeline is shown without pagination.
- **A-007**: Shared components for the Log Panel are framework-agnostic (no direct VS Code dependencies) and include visual showcase stories for each component.
- **A-008**: The filter row's tool type dropdown is populated dynamically from the set of tool names appearing in the current timeline.
- **A-009**: Adaptive recency styling (bolder text for recent entries, progressively fading for older ones) is a desirable enhancement but not required for Phase 2 delivery.

## Dependencies

- **#071** (Log Recording Service — specified): Provides the Log Service with `getTimeline()`, `recordToolResult()`, and the Log Entry data model. This feature cannot begin implementation until #071 is complete.
- **#070** (PROV Schema Foundation — implementing): Provides the LinkML Log Entry schema that defines the structure of entries displayed in the panel.
- **#044** (Unified Activity Panel — complete, optional): If the unified activity panel architecture is in place, the Log Panel follows the same webview and component patterns. If not, the Log Panel establishes its own panel infrastructure.
- **SRD** (`docs/srd-prov-undo.md`): Defines the Log Panel requirements (Section 3.3), entry display fields, and action button specifications.
- **UX Spec** (`docker/code-server/ux-log-panel.md`): Provides the detailed panel layout, entry display modes, and interaction design.
- **Transition Plan** (`docs/architecture/prov-transition-plan.md`): Provides the Phase 2 scope, interfaces, and test requirements.

## Out of Scope

- **Parameter tuning** (Phase 6, #076): The Tune button is a placeholder. Inline parameter editing and live map updates are not implemented in this phase.
- **Revert operations** (Phase 4, #074): The Revert to Here and Revert This buttons are placeholders. Actual data reversion is not implemented.
- **Snapshot creation** (Phase 4, #074): The Snapshot button is a placeholder. Creating snapshot checkpoints is not implemented.
- **Rationale annotations** (Phase 6, #076): The Rationale button is a placeholder. Adding free-text annotations to Log entries is not implemented.
- **Branching** (Phase 5, #075): Branching from a historical point is not part of the Log Panel scope.
- **Web-shell Log Panel**: This phase targets the VS Code extension only. A web-shell version of the Log Panel is a future consideration.
- **Log entry editing or deletion**: The Log is append-only. The panel provides no mechanism to modify or remove entries.
