# Feature Specification: Save Analysis Results to STAC

**Feature Branch**: `001-save-calc-results-stac`
**Created**: 2026-01-29
**Status**: Draft
**Input**: User description: "Save analysis results to STAC"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save a Calc Tool Result (Priority: P1)

An analyst runs a range/bearing calculation between two tracks. The result appears on the map as a transient layer. The analyst wants to preserve this result so they can return to it later or share it with colleagues. They right-click the result layer in the Layers panel and select "Save Result." The system persists the result as a new item in the STAC catalog, recording which source items produced it.

**Why this priority**: This is the core capability. Without it, all analysis work is lost on session end, violating the Constitution's provenance requirement (Article III). This single story delivers the full value of the feature.

**Independent Test**: Can be fully tested by running a calc tool, saving the result, closing the plot, and verifying the result item exists in the catalog with correct provenance links.

**Acceptance Scenarios**:

1. **Given** a result layer from a calc tool execution is displayed on the map, **When** the user triggers "Save Result" on that layer, **Then** a new STAC Item is created in the catalog with `debrief:kind` = `"calc-result"`.
2. **Given** a result has been saved, **When** the user inspects the saved STAC Item, **Then** it contains `derived_from` links pointing to all source STAC Items that contributed input features.
3. **Given** a result has been saved, **When** the user inspects the saved item's asset, **Then** the result GeoJSON FeatureCollection is stored with all feature-level provenance metadata intact.
4. **Given** a result has been saved, **When** the user inspects the saved item's properties, **Then** they include the tool ID, tool version, execution timestamp, and parameters used.

---

### User Story 2 - Reopen a Saved Result (Priority: P2)

An analyst returns to the STAC catalog and sees previously saved results alongside loaded plots. They open a saved result and see it displayed on the map, just as it appeared when originally computed.

**Why this priority**: Saving without reopening has limited value. Being able to return to past results completes the persistence story and enables collaborative workflows.

**Independent Test**: Can be tested by saving a result, closing the session, reopening the catalog, and loading the saved result item to verify it renders correctly.

**Acceptance Scenarios**:

1. **Given** a saved result exists in the catalog, **When** the user lists items in the catalog, **Then** the saved result appears alongside regular plots.
2. **Given** a saved result is listed, **When** the user opens it, **Then** the result features are rendered on the map with the same styling as when originally computed.

---

### User Story 3 - Idempotent Save (Priority: P3)

An analyst accidentally triggers "Save Result" on a result that has already been saved. The system recognises the duplicate and does not create a second copy.

**Why this priority**: Prevents catalog clutter from accidental double-saves. Lower priority because it is a guard rail, not a primary workflow.

**Independent Test**: Can be tested by saving the same result twice and verifying only one STAC Item exists for that result.

**Acceptance Scenarios**:

1. **Given** a result layer that has already been saved, **When** the user triggers "Save Result" again, **Then** the system does not create a duplicate item and informs the user it is already saved.

---

### Edge Cases

- What happens when the source STAC Items have been deleted since the result was computed? The save should still succeed, recording the source item IDs in `derived_from` links even if those items no longer exist. The links become dangling but the provenance record is preserved.
- What happens when the catalog directory is read-only or disk is full? The system should display a clear error message and leave the catalog unchanged.
- What happens when a result contains no features (empty result from a calc tool)? The system should still allow saving — an empty result is a valid analysis outcome.
- What happens when the user closes VS Code before saving? The result is lost (consistent with current behaviour). Automatic saving is out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist a calc tool result as a new STAC Item in the local catalog when the user explicitly requests it.
- **FR-002**: The saved STAC Item MUST include `debrief:kind` = `"calc-result"` in its properties to distinguish results from loaded plots.
- **FR-003**: The saved STAC Item MUST include `derived_from` link(s) referencing each source STAC Item that contained input features.
- **FR-004**: The saved STAC Item MUST record the tool ID, tool version, execution timestamp, and tool parameters in its properties.
- **FR-005**: The result GeoJSON FeatureCollection MUST be stored as an asset of the STAC Item, preserving all feature-level provenance metadata.
- **FR-006**: The saved STAC Item MUST validate against the STAC 1.0.0 specification.
- **FR-007**: Saving the same result multiple times MUST NOT create duplicate items in the catalog.
- **FR-008**: Saved results MUST appear when listing catalog items (alongside regular plots).
- **FR-009**: Saved results MUST be openable and renderable on the map.
- **FR-010**: The system MUST map result feature IDs back to their parent STAC Item IDs to construct `derived_from` links.
- **FR-011**: The system MUST display clear error messages if the save operation fails (e.g., disk full, permissions error).

### Key Entities

- **Result Item**: A STAC Item representing the output of a calc tool execution. Distinguished by `debrief:kind` = `"calc-result"`. Contains metadata about the tool, parameters, and timing. Links to source items via `derived_from` relationships.
- **Result Asset**: A GeoJSON FeatureCollection stored as the `features` asset of a Result Item. Contains the computed output features with their feature-level provenance.
- **Provenance Link**: A STAC Link with `rel: "derived_from"` connecting a Result Item to the source STAC Items whose features were used as inputs.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Persist a transient analysis result for future reference.
- **Key Decision(s)**:
  1. Whether to save a result (the only user decision — the rest is automatic)
- **Decision Inputs**: The user sees the result layer on the map and in the Layers panel. The layer name indicates which tool produced it and which features were inputs.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Result layer visible in Layers panel after tool execution | Right-click result layer | Context menu appears with "Save Result" option |
| 2 | Context menu shown | Click "Save Result" | Save operation begins |
| 3 | Save complete | None (automatic) | Notification confirms save; layer visual indicator updates to show "saved" state |

### UI States

- **Empty State**: Not applicable — the save action is only available when a result layer exists.
- **Loading State**: Brief progress indication during save (notification or status bar message).
- **Error State**: Notification with error description (e.g., "Failed to save result: disk full") and option to retry.
- **Success State**: Notification confirming "Result saved to catalog" with the item name. The result layer in the Layers panel gains a visual indicator (e.g., icon change) showing it has been persisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save a calc tool result to the STAC catalog in under 2 seconds (for typical result sizes).
- **SC-002**: 100% of saved result items pass STAC 1.0.0 specification validation.
- **SC-003**: Saved results can be reopened and display identically to the original transient result.
- **SC-004**: Every saved result contains complete provenance (tool, version, parameters, source items), enabling full traceability from result back to inputs.
- **SC-005**: Duplicate save attempts produce no additional catalog items.

## Assumptions

- The existing `ToolProvenance` metadata attached to result layers (from #038) provides sufficient information to construct STAC Item properties and `derived_from` links.
- The existing `StacService` in the VS Code extension can resolve feature IDs to their parent STAC Item IDs.
- Result items use the same catalog structure as loaded plots (stored as siblings in the STAC catalog root).
- The STAC catalog is writable by the VS Code extension (same assumption as loading/saving plots).

## Out of Scope

- Deleting or updating saved results
- Chaining results (using a saved result as input to another tool)
- Syncing results across catalogs
- Automatic saving (always requires explicit user action)
- Custom naming or annotation of saved results (system generates names from tool + inputs)
