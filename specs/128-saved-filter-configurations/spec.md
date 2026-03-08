# Feature Specification: Saved Filter Configurations

**Feature Branch**: `128-saved-filter-configurations`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "[E08] Saved filter configurations — save/load/delete named filter sets as CQL2 JSON; historic filters dropdown (requires #127)"

## User Scenarios & Testing

### User Story 1 - Save Current Filters (Priority: P1)

An analyst has built a filter combination (e.g., vessel class "Submarine" AND nationality "UK" AND duration "<24H") that they use frequently. They click a Save button in the filter bar area, optionally give it a name, and the current filter state is saved for later reuse.

**Why this priority**: Saving is the foundational action — without it, no other saved-filter functionality is possible.

**Independent Test**: Can be fully tested by adding lozenges to the filter bar, clicking Save, entering a name, and confirming the configuration appears in the saved list.

**Acceptance Scenarios**:

1. **Given** the filter bar has one or more active lozenges, **When** the analyst clicks the Save button and enters a name "UK Submarines", **Then** a named configuration is persisted and available from the Historic Filters dropdown.
2. **Given** the filter bar has active lozenges, **When** the analyst clicks Save but leaves the name blank, **Then** the system generates a default name from the active filter values (e.g., "Submarine + UK + <24H").
3. **Given** the filter bar is empty (no active lozenges), **When** the analyst looks at the Save button, **Then** the Save button is disabled, preventing saving of an empty filter set.

---

### User Story 2 - Restore Saved Filters (Priority: P1)

An analyst returning to work wants to quickly apply a previously saved filter set. They open the Historic Filters dropdown, see their saved configurations listed by name, and select one to replace the current filter bar state.

**Why this priority**: Restoration is the primary value of saving — analysts save filters so they can restore them later.

**Independent Test**: Can be fully tested by selecting a saved configuration from the dropdown and verifying the filter bar displays the correct lozenges.

**Acceptance Scenarios**:

1. **Given** the Historic Filters dropdown contains saved configurations, **When** the analyst selects "UK Submarines", **Then** the filter bar replaces all current lozenges with the saved set (Submarine + UK + <24H) and results update accordingly.
2. **Given** the filter bar has active lozenges, **When** the analyst selects a saved configuration, **Then** the current lozenges are replaced entirely (not merged) with the saved set.
3. **Given** a saved configuration references filter values that no longer exist in the current dataset (e.g., a deleted tag), **When** the analyst restores it, **Then** valid filters are applied and any unresolvable filters are shown as lozenges with a warning indicator.

---

### User Story 3 - Delete Saved Filters (Priority: P2)

An analyst wants to tidy up their saved configurations by removing ones they no longer need.

**Why this priority**: Housekeeping prevents list clutter; lower priority than create/restore since analysts can work around excess entries.

**Independent Test**: Can be fully tested by opening the Historic Filters dropdown, triggering a delete action on a saved entry, and verifying it no longer appears.

**Acceptance Scenarios**:

1. **Given** the Historic Filters dropdown shows saved configurations, **When** the analyst clicks the delete control on "Old Filter Set", **Then** the configuration is permanently removed from the list.
2. **Given** the analyst deletes a saved configuration, **When** they reopen the Historic Filters dropdown, **Then** the deleted entry no longer appears.

---

### User Story 4 - Persistence Across Sessions (Priority: P2)

An analyst closes and reopens the application (VS Code or web-shell). Their saved filter configurations survive the session boundary and are available when they return.

**Why this priority**: Without persistence, saved filters are only useful within a single session, greatly reducing their value.

**Independent Test**: Can be tested by saving a configuration, closing and reopening the application, and verifying the saved configuration is still available in the Historic Filters dropdown.

**Acceptance Scenarios**:

1. **Given** the analyst has saved filter configurations, **When** the application is closed and reopened, **Then** all saved configurations are available in the Historic Filters dropdown.
2. **Given** multiple workspaces or STAC catalogs are open, **When** the analyst saves a configuration, **Then** saved filters are scoped to the workspace (not shared across unrelated catalogs).

---

### Edge Cases

- What happens when the analyst saves a configuration with a name that already exists? The system prompts to overwrite or rename.
- What happens when the saved filters list becomes very long? The dropdown remains scrollable and usable with up to 50 saved entries.
- What happens when the CQL2 JSON of a saved configuration is corrupted? The entry is shown with a warning icon and cannot be restored; it can still be deleted.
- What happens when filter types evolve (e.g., a new filter type is added in a future release)? Saved configurations only contain the filters that were active at save time; new filter types are unaffected.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a Save control in the filter bar area that captures the current filter state as a named configuration.
- **FR-002**: System MUST prompt the analyst for an optional name when saving; if no name is provided, the system MUST generate a descriptive default from active filter values.
- **FR-003**: System MUST provide a Historic Filters dropdown (visually separate from the filter bar lozenges) that lists all saved configurations by name.
- **FR-004**: System MUST restore the full filter bar state (replacing all current lozenges) when the analyst selects a saved configuration from the dropdown.
- **FR-005**: System MUST provide a delete control for each entry in the Historic Filters dropdown.
- **FR-006**: System MUST persist saved configurations across application sessions (survive close/reopen).
- **FR-007**: System MUST serialise saved filter configurations as CQL2 JSON, consistent with the filter bar's CQL2 output from #127.
- **FR-008**: System MUST scope saved configurations to the current workspace or STAC catalog.
- **FR-009**: System MUST handle duplicate names by prompting the analyst to overwrite the existing entry or choose a different name.
- **FR-010**: System MUST display saved configurations in most-recently-saved order (newest first) in the Historic Filters dropdown.
- **FR-011**: System MUST disable the Save control when the filter bar has no active lozenges.

### Key Entities

- **Saved Filter Configuration**: A named, persisted filter state consisting of a user-provided name (or auto-generated default), CQL2 JSON representing the full filter bar state, a timestamp of when it was saved, and the workspace/catalog scope.
- **Historic Filters Dropdown**: A UI control separate from the filter bar that lists all saved configurations and provides restore and delete actions.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Quickly reapply a previously configured set of filters to narrow STAC browser results.
- **Key Decision(s)**:
  1. Which name to give the saved configuration (or accept the auto-generated default).
  2. Which saved configuration to restore from the list.
  3. Whether to overwrite when saving with a duplicate name.
- **Decision Inputs**: The analyst sees the current filter bar lozenges (showing what will be saved), the list of existing saved names (to avoid duplicates), and each saved entry's name and save date.

### Screen Progression

| Step | Screen/State              | User Action                                    | Result                                                          |
|------|---------------------------|------------------------------------------------|-----------------------------------------------------------------|
| 1    | Filter bar with lozenges  | Clicks Save button                             | Name prompt appears (inline popover near Save button)           |
| 2    | Name prompt open          | Types custom name or accepts default, confirms  | Configuration saved; brief success indication shown             |
| 3    | Filter bar (later session)| Clicks Historic Filters dropdown               | Dropdown opens showing saved configurations list (newest first) |
| 4    | Dropdown open             | Clicks a saved configuration name              | Filter bar lozenges replaced with saved set; results update     |
| 5    | Dropdown open             | Clicks delete control on an entry              | Entry removed from list; dropdown remains open                  |

### UI States

- **Empty State**: Historic Filters dropdown shows "No saved filters" message. Save button is available whenever lozenges are present.
- **Loading State**: Brief spinner when restoring a saved configuration that triggers a results refresh.
- **Error State**: If a saved configuration contains invalid or unresolvable filters, the entry is shown with a warning icon and a tooltip explaining the issue.
- **Success State**: After saving, a brief confirmation message or visual pulse on the Save button. After restoring, the filter bar reflects the saved lozenges and results update.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Analysts can save a named filter configuration in under 5 seconds (two clicks + optional typing).
- **SC-002**: Analysts can restore a saved filter set in under 3 seconds (two clicks: open dropdown, select entry).
- **SC-003**: Saved configurations persist across application restarts with 100% fidelity (all filter types, values, and AND/OR grouping preserved).
- **SC-004**: The Historic Filters dropdown supports at least 50 saved entries without usability degradation.
- **SC-005**: Saved configurations use CQL2 JSON format, enabling future portability across frontends.

## Assumptions

- The filter bar from #127 exposes its current state as serialisable CQL2 JSON, which this feature captures verbatim.
- Persistence uses the existing workspace/session state mechanism; no new storage backend is required.
- Saved configurations are per-user, per-workspace; multi-user sharing is not in scope.
- The Historic Filters dropdown is rendered as a standard dropdown control adjacent to (but visually distinct from) the filter bar.
- Auto-generated names are derived by concatenating active filter type/value pairs with " + " separators, truncated if exceeding a reasonable display length.

## Dependencies

- **#127** — Filter bar with lozenge UI and AND/OR logic (provides the filter bar, lozenge model, and CQL2 serialisation that this feature saves/restores).
