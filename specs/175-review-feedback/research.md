# Research: Review Feedback

**Feature**: 175-review-feedback
**Date**: 2026-03-30

## R1: User Identity — How to populate `author` and `resolved_by`

**Decision**: Environment-based user identity via `DEBRIEF_USER` environment variable, with fallback to OS username.

**Rationale**: The system currently has no centralised user context. The simplest approach is an environment variable set at MCP server startup, consistent with the offline-first architecture. VS Code can populate this from `os.userInfo().username` when spawning the MCP server process. The Python service reads `os.environ.get("DEBRIEF_USER", getpass.getuser())`.

**Alternatives considered**:
- Token-based authentication: Overkill for local-first desktop application; no multi-user server scenario in scope.
- VS Code settings: Would couple the service to VS Code; violates "services never touch UI".
- Interactive prompt: Not suitable for MCP tool invocation.

## R2: ULID Generation for Review Item IDs

**Decision**: Use the `ulid` Python package (already a lightweight dependency) for server-side ID generation.

**Rationale**: The input spec mandates ULIDs for review item IDs, generated server-side by `debrief-stac`. ULIDs are lexicographically sortable (useful for chronological ordering) and collision-resistant. The `ulid-py` package is minimal (~50KB) and has no transitive dependencies.

**Alternatives considered**:
- UUID v4: Not lexicographically sortable; loses natural ordering benefit.
- Timestamp + random suffix: Reinvents ULID poorly.
- Client-side generation: Rejected per spec — server assigns IDs.

## R3: Optimistic Locking Mechanism

**Decision**: Use the STAC item's `properties.updated` ISO 8601 timestamp as the version token. Clients must include `expected_updated` in PATCH requests. Server compares against current `updated` value; returns 409 Conflict on mismatch.

**Rationale**: The existing `_save_catalog()` uses file-level locking (fcntl/msvcrt) for catalog.json, but item-level writes have no concurrency control. The spec mandates optimistic locking via the `updated` timestamp. This avoids introducing a separate version counter while leveraging the existing timestamp field. File-level locking (atomic write via temp file + os.replace) remains for crash safety; optimistic locking adds logical conflict detection.

**Alternatives considered**:
- ETag headers: More standard for HTTP APIs, but MCP tools don't use HTTP semantics. Timestamps are more natural for file-based storage.
- Integer version counter: Adds a field to the item schema; timestamps already exist.
- File-level locking only: Insufficient — doesn't detect interleaved read-modify-write cycles.

## R4: Review Property Storage Location

**Decision**: Store review items under `properties["debrief:review"]` in `item.json`, as specified in the input document.

**Rationale**: Follows the STAC extension convention (`debrief:` prefix). The property is an array of review item objects. Empty array cleanup (remove property when last item deleted) keeps items clean. `features.geojson` is not touched — review is plot-level metadata, not feature-level.

**Alternatives considered**:
- Separate sidecar file (e.g., `review.json`): More complex file management; loses atomic item read.
- Feature-level provenance array: Review applies to the whole plot, not individual features.

## R5: Provenance Events for Review Actions

**Decision**: Record review edit and delete operations as entries in a new `debrief:review_log` property on the STAC item, using the existing provenance pattern (append-only array).

**Rationale**: The spec requires PROV events for edits and deletes in the "Analysis Log". The existing provenance system (`log-entry.yaml`, `provenance.py`) records per-feature transformations. Review provenance is per-item (plot-level), so it needs a separate log. Using a new property on the STAC item keeps all review data co-located and readable offline.

**Alternatives considered**:
- Reuse existing feature-level provenance: Review is plot-level, not feature-level; mismatches the model.
- External log file: Violates co-location; harder to read offline.
- In-memory only: Violates Constitution Article III (provenance always).

## R6: Filter Engine Integration

**Decision**: Add `review-status` as a new `FilterType` in the CQL2 filter engine. Extend `StacBrowserItem` and `CatalogOverviewItem` with an optional `reviewStatus` field derived from the `debrief:review` property.

**Rationale**: The existing filter engine supports predicate-based filtering with per-type matchers. Adding a new type follows the established pattern. The review status is derived (computed from the review array) and cached on the item for efficient filtering. Four filter values: `all` (default, no filter), `pending-review`, `all-reviewed`, `no-feedback`.

**Alternatives considered**:
- Separate filter mechanism: Duplicates infrastructure; inconsistent UX.
- CQL2 property filter: Too generic; review status is a domain-specific derived state.

## R7: Badge Visual Design

**Decision**: Add review state badges to `ExerciseListView` plot rows. Amber badge with flag icon for "pending review", muted/grey badge with checkmark for "all reviewed", no badge for "no feedback".

**Rationale**: Follows the spec's visual indicator requirements. The LogPanel already uses a badge pattern (`.log-panel__entry-badge--tuned/deleted/disabled`) that can be adapted. Badges are small inline elements next to the plot title.

**Alternatives considered**:
- Icon-only (no text): Less accessible; harder to understand at a glance.
- Full status bar: Takes too much space in a virtualised list.
- Colour-coding the row background: Too heavy-handed; interferes with selection state.

## R8: LinkML Schema Location

**Decision**: Create a new `review.yaml` LinkML module in `shared/schemas/src/linkml/`. Import into `stac-extension.yaml` to add `debrief:review` to STAC item properties. This generates Pydantic models and TypeScript types via existing codegen pipeline.

**Rationale**: Follows the schema-first principle (Constitution Article II). New entities (ReviewItem, ResolutionHistoryEntry) get their own module for clarity. The existing codegen pipeline (`gen-pydantic`, `gen-json-schema`, `gen-typescript`) produces typed models automatically.

**Alternatives considered**:
- Inline in stac-extension.yaml: Makes the file too large; review is a distinct domain concept.
- Hand-written Pydantic models only: Violates "single source of truth" principle.
