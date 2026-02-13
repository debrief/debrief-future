# Feature Specification: Logical Result ID Registry

**Feature Branch**: `087-logical-result-id-registry`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Logical result ID registry -- maps stable logical IDs to current result files, emits change events (requires #071)"
**Epic**: E04 -- Results Visualization

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Resolve Result IDs (Priority: P1)

An analyst runs an analysis tool (e.g., bearing-time plot for Track A). The tool produces a result artifact with a stable logical result ID (e.g., `bt_plot_001`). The system registers this result ID in a central registry, mapping it to the current file path of the result (e.g., `./results/bt_plot_001_v1.png`). Any part of the system that needs the current file for a given result ID can query the registry to resolve it instantly, without scanning STAC assets or the filesystem.

**Why this priority**: Without a central registry that maps logical IDs to their current files, no downstream feature (auto-refresh, result panels, editor providers) can efficiently locate the latest version of a result. This is the foundational capability.

**Independent Test**: Can be fully tested by recording a tool execution that produces a result artifact, then querying the registry with the result ID and verifying it returns the correct versioned file path.

**Acceptance Scenarios**:

1. **Given** a tool execution that produces an artifact with result ID `bt_plot_001` and path `./results/bt_plot_001_v1.png`, **When** the Log entry is recorded, **Then** the registry maps `bt_plot_001` to `./results/bt_plot_001_v1.png`.
2. **Given** an existing registry mapping for `bt_plot_001`, **When** a consumer queries the registry with `bt_plot_001`, **Then** the registry returns the current file path.
3. **Given** a result ID that has never been registered, **When** a consumer queries the registry, **Then** the registry indicates the result ID is unknown (no error thrown).

---

### User Story 2 - Track Result Updates on Re-Run (Priority: P1)

An analyst re-runs a tool after tuning a parameter. The tool produces a new version of the same result (e.g., `bt_plot_001_v2.png`). The registry updates the mapping for that result ID to point to the new version and emits a change event. Any component that subscribed to changes for that result ID is notified that the result has been updated, without polling or scanning.

**Why this priority**: Auto-refresh (#089) depends entirely on change events from the registry. Without reliable update tracking and notification, views cannot refresh when results change. This is equally critical to P1 registration.

**Independent Test**: Can be fully tested by registering a result, then recording a second tool execution for the same result ID with a new version, and verifying the registry mapping updated and a change event was emitted with the old and new paths.

**Acceptance Scenarios**:

1. **Given** result ID `bt_plot_001` is registered pointing to `./results/bt_plot_001_v1.png`, **When** a new tool execution produces `./results/bt_plot_001_v2.png` for the same result ID, **Then** the registry updates the mapping to the new path.
2. **Given** a subscriber is listening for changes on result ID `bt_plot_001`, **When** the registry mapping updates from v1 to v2, **Then** the subscriber receives a change notification containing the result ID, the previous path, and the new path.
3. **Given** the registry updates a mapping, **When** a consumer queries the registry immediately after, **Then** the registry returns the new path (not the old one).

---

### User Story 3 - Populate Registry from Existing Plot (Priority: P2)

An analyst opens a plot that already contains STAC assets with `debrief:resultId` metadata from previous sessions. The registry scans the STAC Item's assets and populates itself with mappings for all existing result IDs, selecting the highest-versioned file for each logical result ID. This ensures that result views and auto-refresh work correctly even for plots that were created before the registry existed, or after reopening a saved plot.

**Why this priority**: Without hydration from existing STAC data, the registry would start empty every session, breaking result resolution for previously-saved plots. This is essential for continuity across sessions but secondary to the core register/notify mechanism.

**Independent Test**: Can be fully tested by constructing a STAC Item with multiple versioned assets sharing the same `debrief:resultId`, opening/loading the plot, and verifying the registry contains the correct latest-version mapping for each result ID.

**Acceptance Scenarios**:

1. **Given** a STAC Item has assets `bt_plot_001_v1` (version 1) and `bt_plot_001_v2` (version 2) both with `debrief:resultId: bt_plot_001`, **When** the plot is loaded, **Then** the registry maps `bt_plot_001` to the v2 asset path.
2. **Given** a STAC Item has assets for 3 different result IDs, **When** the plot is loaded, **Then** the registry contains one mapping per unique result ID, each pointing to the highest-version asset.
3. **Given** a STAC Item has no assets with `debrief:resultId` metadata, **When** the plot is loaded, **Then** the registry is empty (no error).

---

### User Story 4 - Subscribe to Specific Result IDs (Priority: P2)

A result view (e.g., chart panel, editor tab) opens for a specific result ID. The view subscribes to the registry for change notifications on that result ID. When the result updates (due to re-run or tuning), the view receives a targeted notification and can refresh its content. When the view closes, it unsubscribes, and the registry cleans up the subscription.

**Why this priority**: Targeted subscriptions enable efficient auto-refresh -- views only receive notifications for results they care about, rather than all registry changes. This is the consumer API that downstream features (#089) will use.

**Independent Test**: Can be fully tested by subscribing to a specific result ID, triggering an update to that result ID, and verifying only the subscribed callback fires. Then unsubscribing and verifying no further notifications arrive.

**Acceptance Scenarios**:

1. **Given** a view subscribes to changes on result ID `range_plot_001`, **When** a different result ID (`bt_plot_001`) updates, **Then** the subscribed callback is NOT invoked.
2. **Given** a view subscribes to changes on result ID `range_plot_001`, **When** that result ID updates, **Then** the subscribed callback IS invoked with the change details.
3. **Given** a view unsubscribes from result ID `range_plot_001`, **When** that result ID subsequently updates, **Then** no callback is invoked for the unsubscribed view.
4. **Given** multiple views subscribe to the same result ID, **When** the result updates, **Then** all subscribed views receive the notification independently.

---

### Edge Cases

- What happens when a tool execution produces a result but no `generatedResultId` is present in the Log entry? The registry does not create a mapping -- only Log entries with a `generatedResultId` trigger registration.
- What happens when two different tool executions produce artifacts with the same result ID in rapid succession? The registry processes updates sequentially; the second update overwrites the first, and subscribers receive two change notifications in order.
- What happens when a plot has legacy assets without `debrief:resultId` metadata? Those assets are ignored during hydration -- only assets with explicit result ID metadata are registered.
- What happens when the registry is queried before the plot has finished loading? The registry returns unknown for any result ID not yet hydrated, allowing consumers to handle the not-yet-available case gracefully.
- What happens when a result ID mapping is registered but the underlying file has been deleted? The registry stores only the mapping -- file existence validation is the consumer's responsibility.
- What happens when the plot is closed or replaced? The registry is cleared and all subscriptions are removed, preventing stale references.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Result ID Registry that maintains a mapping from logical result IDs to their current file paths within the active plot.
- **FR-002**: System MUST automatically register or update a result ID mapping whenever a Log entry with a `generatedResultId` field is recorded by the Log Service (#071).
- **FR-003**: System MUST extract the result ID and versioned file path from the Log entry's `generatedResultId` and `generated` fields respectively.
- **FR-004**: System MUST provide a lookup operation that accepts a result ID and returns the current file path, or indicates the result ID is unknown.
- **FR-005**: System MUST provide a list operation that returns all currently registered result ID mappings.
- **FR-006**: System MUST emit a change event whenever a result ID mapping is created or updated, containing the result ID, the previous file path (if any), and the new file path.
- **FR-007**: System MUST support per-result-ID subscriptions, allowing consumers to receive change notifications only for specific result IDs they care about.
- **FR-008**: System MUST support a global subscription mode, allowing consumers to receive change notifications for any result ID update.
- **FR-009**: System MUST support unsubscription, stopping notifications for a specific subscription and cleaning up resources.
- **FR-010**: System MUST hydrate the registry on plot load by scanning the STAC Item's assets for entries with `debrief:resultId` metadata, selecting the highest `debrief:version` for each unique result ID.
- **FR-011**: System MUST clear all mappings and subscriptions when the active plot is closed or replaced.
- **FR-012**: System MUST scope all result ID mappings to the currently active plot -- result IDs from different plots MUST NOT collide.
- **FR-013**: System MUST handle the case where a Log entry lacks a `generatedResultId` by skipping registration (no error, no mapping created).
- **FR-014**: System MUST NOT validate file existence when registering or resolving mappings -- the registry is a lookup service, not a file system monitor.
- **FR-015**: System MUST process updates sequentially so that rapid successive updates for the same result ID produce correctly ordered change events.

### Key Entities

- **Result ID Registry**: A session-scoped service that maintains a live map of logical result IDs to their current versioned file paths. Populated from STAC asset metadata on plot load and updated whenever tools produce new result artifacts. Emits change events that downstream features (auto-refresh, result panels) subscribe to.
- **Result ID Mapping**: A single entry in the registry, linking a stable logical result ID (e.g., `bt_plot_001`) to the current versioned file path (e.g., `./results/bt_plot_001_v2.png`). Updated in-place when a new version is produced.
- **Change Event**: A notification emitted by the registry when a mapping changes. Contains the result ID, the previous file path (or null for first registration), and the new file path. Delivered to both per-ID subscribers and global subscribers.
- **Subscription**: A registration by a consumer (e.g., a result view) to receive change events for a specific result ID or for all result IDs. Includes an unsubscribe mechanism to prevent memory leaks when views close.
- **Logical Result ID**: A stable, tool-determined identifier for a conceptual analysis output (e.g., "the bearing-time plot for Track A"). Remains constant across all versions of that output. Defined by the tool and its inputs, not by the system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tool executions that produce artifacts with a result ID are reflected in the registry within one event cycle, verified by running 3 different artifact-producing tools and querying the registry after each.
- **SC-002**: Change events are delivered to all active subscribers within one event cycle of the mapping update, verified by subscribing to a result ID and measuring notification timing after a tool re-run.
- **SC-003**: The registry correctly resolves the latest version for each result ID after plot load, verified by loading a plot with 3 result IDs having 2+ versions each and confirming the registry returns the highest-versioned path for each.
- **SC-004**: Per-ID subscribers receive notifications only for their subscribed result IDs, verified by subscribing to one result ID, updating a different result ID, and confirming no notification is delivered.
- **SC-005**: Unsubscribing prevents further notifications, verified by unsubscribing and then updating the result ID -- zero callbacks should fire for the unsubscribed consumer.
- **SC-006**: The registry is empty after the plot is closed, verified by closing the plot and confirming all mappings and subscriptions are cleared.
- **SC-007**: All existing tool execution and Log Service tests pass without modification, confirming no regression.

## Assumptions

- **A-001**: Feature #071 (Log Recording Service) is complete before this feature begins, providing the `generatedResultId` and `generated` fields on Log entries that the registry consumes.
- **A-002**: The registry is a session-scoped in-memory structure -- it is not persisted to disk. It is reconstructed from STAC asset metadata on plot load and from Log entries during the session.
- **A-003**: Result IDs are scoped per-plot, consistent with the STAC Item structure. There is no cross-plot result ID resolution.
- **A-004**: The registry integrates with the Log Service by observing new Log entries, not by hooking into tool execution directly. This preserves the separation of concerns established by #071.
- **A-005**: STAC assets use `debrief:resultId` (string) and `debrief:version` (integer) metadata fields, as defined in the SRD (section 4.7).
- **A-006**: The auto-refresh behaviour (#089) is out of scope for this feature. This feature provides the registry and change events; #089 provides the view-level refresh logic.

## Dependencies

- **#071** (Log Recording Service): Provides the Log entries with `generatedResultId` and `generated` fields that the registry consumes. The registry observes Log Service output to detect new or updated result artifacts.
- **E04 Epic** (`docs/ideas/E04-results-visualization.md`): Defines the overall results visualization architecture, of which this registry is the stable-identity layer.
- **SRD** (`docs/srd-prov-undo.md`, section 4.7): Defines the artifact versioning scheme, result ID semantics, STAC asset representation, and editor auto-refresh behaviour that the registry supports.

## Out of Scope

- **Auto-refresh of result views** (#089): The registry emits change events, but the logic for refreshing open views (preserving viewport state, handling the `debrief.autoRefreshArtifacts` setting) belongs to #089.
- **Result rendering** (#085, #086, #088): The chart renderer, results panel, and custom editor provider consume the registry but are separate features.
- **Artifact file creation and versioning**: The registry does not create, version, or manage files. It maps IDs to paths based on information from Log entries and STAC metadata.
- **Cross-plot result resolution**: Result IDs are scoped to a single plot. Resolving result IDs across multiple plots is not addressed.
- **File existence validation**: The registry does not verify that mapped files exist on disk. Consumers are responsible for handling missing files.
