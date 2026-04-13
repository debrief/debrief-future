# Feature Specification: Nuke and Regenerate Sample Catalog

**Feature Branch**: `184-regenerate-sample-catalog`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "[E10] Nuke + regenerate sample catalog — delete preview/workspace/samples/local-store/, re-import 72 legacy files through enriched pipeline; populate registry; all schema tests pass"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Regeneration of Sample Catalog (Priority: P1)

As a developer working on the E10 epic (NL-Assisted Catalog Discovery), I need the sample catalog to be regenerated from scratch using the enriched import pipeline so that all items carry the `debrief:platforms` structured array instead of the deprecated flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`). This ensures downstream features (#185 CQL2 array filter, #186 filter bar chips, #187 enum extraction, #188 NL queries) have correctly structured data to work against.

**Why this priority**: Without a regenerated catalog, every downstream E10 feature will work against stale data that uses the wrong metadata format. This is the critical data foundation for the entire epic.

**Independent Test**: Can be fully tested by deleting the existing catalog, running the regeneration process, and verifying that the resulting catalog contains the expected number of items, each with a `debrief:platforms` array and no flat aggregate fields.

**Acceptance Scenarios**:

1. **Given** the existing sample catalog at `preview/workspace/samples/local-store/`, **When** the regeneration process runs, **Then** a new catalog is created with the same number of items (71 items from approximately 72 source files), each item containing a `debrief:platforms` array in its `item.json`.
2. **Given** a regenerated catalog, **When** any `item.json` is inspected, **Then** it does not contain `debrief:vessel_classes`, `debrief:nationalities`, or `debrief:track_names` properties.
3. **Given** the regenerated catalog, **When** the full test suite (`task verify`) is run, **Then** all lint, typecheck, and test steps pass.

---

### User Story 2 - Platform Registry Population (Priority: P1)

As a developer, I need the regeneration process to populate the platform registry with all platforms encountered during import, so that the registry serves as the canonical source of vessel metadata for save-time resolution and downstream features.

**Why this priority**: The platform registry is the backbone of the enrichment pipeline. If platforms are missing from the registry, items will have sparse `debrief:platforms` records (only `id` populated), making NL queries and CQL2 filters less effective.

**Independent Test**: Can be tested by checking the platform registry after regeneration and verifying that all platform IDs appearing in the regenerated catalog have corresponding entries in the registry with nationality, vessel class, and other metadata populated.

**Acceptance Scenarios**:

1. **Given** the regeneration process completes, **When** the platform registry is inspected, **Then** it contains entries for all known platform IDs from the legacy data (at minimum the 10 platforms already in the existing `PLATFORM_VESSEL_MAP`).
2. **Given** a platform ID that appears in the regenerated catalog's track features, **When** that ID is looked up in the registry, **Then** it resolves to a full metadata record including name, nationality, and vessel class path.

---

### User Story 3 - Source File Preservation (Priority: P1)

As a developer, I need the original legacy source files (.rep, .dpf, .dsf) to survive the regeneration process, so that the import pipeline has source data to work with and the source files remain available as STAC assets in the regenerated catalog.

**Why this priority**: The source files are currently stored inside the catalog being deleted (as assets in each item directory). If they are lost during deletion, regeneration becomes impossible. This must be handled correctly as a prerequisite to deletion.

**Independent Test**: Can be tested by counting the source files before deletion, running the regeneration, and verifying that each regenerated item has its original source file as an asset.

**Acceptance Scenarios**:

1. **Given** the existing catalog contains source files in `local-store/*/assets/`, **When** the regeneration process runs, **Then** all source files are preserved and available as assets in the regenerated catalog items.
2. **Given** source files are extracted before deletion, **When** the catalog is deleted, **Then** no source files are permanently lost.

---

### User Story 4 - Enrichment with Exercise Metadata (Priority: P2)

As a developer, I need the regenerated catalog to carry the same richness of metadata as the current catalog (exercise names, tags, feature tags, descriptions), so that the STAC catalog browser and future NL search remain functional and demonstrable.

**Why this priority**: Without exercise metadata, the catalog becomes a bare collection of tracks with no searchable context. The enrichment restores the analyst-friendly metadata that makes the demo compelling.

**Independent Test**: Can be tested by inspecting regenerated items and verifying they contain exercise-related properties (title, description, `debrief:tags`, `debrief:feature_tags`) alongside the new `debrief:platforms` array.

**Acceptance Scenarios**:

1. **Given** a regenerated catalog item, **When** its `item.json` is inspected, **Then** it contains `debrief:tags`, `debrief:feature_tags`, a descriptive title, and a description.
2. **Given** the regenerated catalog, **When** collection summaries are computed, **Then** they aggregate tags, nationalities (from `debrief:platforms`), and other metadata correctly.

---

### User Story 5 - Idempotent and Scriptable Process (Priority: P2)

As a developer or CI pipeline, I need the regeneration to be a repeatable, scriptable process that can be run end-to-end without manual intervention, so that the catalog can be regenerated whenever the schema or enrichment logic changes.

**Why this priority**: As the schema evolves across the E10 epic, the catalog may need regeneration multiple times. A manual process would be error-prone and time-consuming.

**Independent Test**: Can be tested by running the regeneration process twice in sequence and verifying the output is consistent (same number of items, same structure).

**Acceptance Scenarios**:

1. **Given** a clean state (no `local-store/` directory), **When** the regeneration script is run, **Then** a complete catalog is produced without manual intervention.
2. **Given** the regeneration script has already run, **When** it is run again (after deleting `local-store/`), **Then** the resulting catalog has the same structure and item count.

---

### Edge Cases

- What happens when a source file produces no parseable features (e.g. a shapes-only REP file)? The import pipeline should handle this gracefully — the item is created with features but may have no tracks, resulting in an empty `debrief:platforms` array.
- What happens when a platform ID is not in the registry? The import emits a warning (per #182) and the enrichment script assigns metadata using its vocabulary pools. The resulting `debrief:platforms` entry should still be populated (not left sparse).
- What happens if the same platform ID appears in multiple items? Each item independently resolves its platforms. The registry entry is shared but each item's `debrief:platforms` array reflects only the platforms present in that item's tracks.
- What happens with DSF (sensor-only) files that have no standalone tracks? They are merged into companion track items during import, not creating separate items.
- What happens if the standalone REP files at `preview/workspace/samples/` top level (boat1.rep, boat2.rep, etc.) are also imported? They should be included in the regeneration — they are valid source data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The regeneration process MUST delete the existing `preview/workspace/samples/local-store/` directory and all its contents before creating the new catalog.
- **FR-002**: The regeneration process MUST extract and stage all original source files (.rep, .dpf, .dsf) from the existing catalog's asset directories before deletion, ensuring no source data is lost.
- **FR-003**: The regeneration process MUST re-import all legacy source files through the current import pipeline (`import_legacy_data`), producing a fresh STAC catalog at `preview/workspace/samples/local-store/`.
- **FR-004**: Every `item.json` in the regenerated catalog MUST contain a `debrief:platforms` array with at least an `id` field per platform record.
- **FR-005**: No `item.json` in the regenerated catalog MUST contain the deprecated flat aggregate fields `debrief:vessel_classes`, `debrief:nationalities`, or `debrief:track_names`.
- **FR-006**: The enrichment process MUST populate `debrief:platforms` records with `name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, and `domain` fields for all known platforms.
- **FR-007**: The platform registry MUST contain entries for all platforms that are assigned during enrichment.
- **FR-008**: The regenerated catalog MUST include exercise metadata (`debrief:tags`, `debrief:feature_tags`, exercise-themed titles and descriptions) consistent with the enrichment vocabulary.
- **FR-009**: The regeneration process MUST produce a valid STAC catalog structure with a `catalog.json` containing correct item links to all regenerated items.
- **FR-010**: The regeneration process MUST be scriptable — executable end-to-end without manual intervention.
- **FR-011**: All existing schema tests, lint checks, and type checks (`task verify`) MUST pass after regeneration.
- **FR-012**: The regenerated catalog item count MUST match the count produced by the import pipeline from the available source files (approximately 71 items).
- **FR-013**: Import warnings for unregistered platform IDs MUST be emitted during the regeneration (per #182), giving developers visibility into any registry gaps.

### Key Entities

- **Sample Catalog**: The STAC catalog at `preview/workspace/samples/local-store/` containing imported maritime exercise data. Each item is a directory with `item.json`, `features.geojson`, and `assets/` containing the original source file.
- **Platform Registry**: The static data file at `shared/data/platform-registry.json` defining known platforms in a vessel-class hierarchy. Maps platform IDs to nationality, vessel class, name, and other metadata.
- **Legacy Source Files**: REP, DPF, and DSF format files containing raw maritime track, sensor, and narrative data from the legacy Debrief application. These are the inputs to the import pipeline.
- **Enrichment Script**: The post-import processor (`scripts/enrich-legacy-catalog.py`) that adds exercise metadata, assigns platform details, and populates `debrief:platforms` on each `item.json`.

## Assumptions

- The import pipeline (#182) is implemented and correctly validates platform IDs against the registry, emitting warnings for unregistered platforms.
- The enrichment script already generates `debrief:platforms` arrays (as observed in the current codebase) and does not emit the deprecated flat aggregate fields.
- The platform registry at `shared/data/platform-registry.json` is seeded with at least the 10 known platforms from the existing `PLATFORM_VESSEL_MAP` in the enrichment script.
- The enrichment script's random seed produces deterministic output, so repeated runs yield consistent (if not identical) results.
- The 5 standalone REP files at `preview/workspace/samples/` top level are also valid import sources and should be included in the regeneration input.
- DSF sensor files are merged into companion track items during import (existing behaviour) and do not produce standalone items.
- Collection summaries are recomputed during or after import to reflect the new `debrief:platforms` structure.

## Dependencies

- **#182 (Import Platform Warnings)**: Required — the import pipeline must validate platform IDs and emit warnings. Already implemented.
- **#183 (Save-time Registry Resolution)**: Required — documented decisions about schema structure (flat fields removed, `debrief:platforms` canonical). ADRs must be recorded. Already completed.
- **#181 (LinkML Platform Overrides)**: Required — the schema must define `debrief:platforms` and the `PlatformRecord` type. Already completed.
- **#180 (Platform Registry)**: Required — the registry data file and loaders must be available. Already completed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The regenerated catalog contains the expected number of items (approximately 71), matching what the import pipeline produces from the available source files.
- **SC-002**: 100% of regenerated items use the `debrief:platforms` array — zero items contain deprecated flat aggregate fields.
- **SC-003**: The full verification suite (`task verify`) passes after regeneration with no failures in lint, typecheck, or test steps.
- **SC-004**: All known platform IDs (at minimum the 10 in the existing platform vessel map) are present in the platform registry with complete metadata.
- **SC-005**: Each regenerated item's `debrief:platforms` array contains populated records (not just bare `id` fields) for all known platforms.
- **SC-006**: The regeneration process completes end-to-end without manual intervention when run as a script.
- **SC-007**: No source data files are lost during the regeneration process — every source file that existed as an asset in the old catalog is present as an asset in the regenerated catalog.
