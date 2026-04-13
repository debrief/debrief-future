# Feature Specification: Import Handler Warnings for Unregistered Platforms

**Feature Branch**: `182-import-platform-warnings`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "[E10] Import handler warnings for unregistered platforms — check extracted platform_id values against registry after import; log warnings listing unregistered IDs (import still succeeds)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unregistered Platform Warnings on Import (Priority: P1)

As an analyst importing legacy data files (REP or DPF format), I want the system to check each extracted platform identifier against the platform registry and warn me about any unregistered platforms, so that I have a clear to-do list of platforms that need to be added to the registry for full metadata enrichment.

**Why this priority**: This is the core purpose of the feature. Without this validation, unregistered platforms silently enter the catalog with no metadata, and the analyst has no way to know which platforms are missing from the registry until they encounter gaps downstream (e.g. missing nationality or vessel class in search results).

**Independent Test**: Can be fully tested by importing a file containing a mix of registered and unregistered platform IDs and verifying that warnings are emitted only for the unregistered ones.

**Acceptance Scenarios**:

1. **Given** a REP file containing tracks for platforms "NELSON" (registered) and "UNKNOWN_VESSEL" (not in registry), **When** the file is imported, **Then** the import succeeds and the result includes a warning identifying "UNKNOWN_VESSEL" as an unregistered platform.
2. **Given** a DPF file containing tracks for platforms "DEFENDER" (registered) and "PHANTOM" (not in registry), **When** the file is imported, **Then** the import succeeds and the result includes a warning identifying "PHANTOM" as an unregistered platform.
3. **Given** a file where all platform IDs are present in the registry, **When** the file is imported, **Then** the import succeeds with no unregistered-platform warnings.

---

### User Story 2 - Import Never Blocked by Registry Gaps (Priority: P1)

As an analyst, I need the import to always succeed regardless of whether platforms are registered, so that I can work with the data immediately and address registry gaps later at my convenience.

**Why this priority**: Equally critical to the warning behaviour — if the registry check blocked imports, analysts would be unable to load new data until every platform was catalogued, which defeats the purpose of the advisory-only design.

**Independent Test**: Can be fully tested by importing a file containing only unregistered platform IDs and verifying that all tracks are present in the resulting catalog, with warnings emitted but no errors.

**Acceptance Scenarios**:

1. **Given** a REP file where every platform ID is unregistered, **When** the file is imported, **Then** the import completes successfully with all tracks present in the output.
2. **Given** a DPF file where every platform ID is unregistered, **When** the file is imported, **Then** the import completes successfully and warnings are emitted for each unregistered platform.

---

### User Story 3 - Consolidated Warning Summary (Priority: P2)

As an analyst importing a file with multiple tracks, I want the warnings to be consolidated so that each unregistered platform is reported once per import (not once per track position), giving me a concise summary rather than a flood of duplicate messages.

**Why this priority**: Usability refinement. A file with hundreds of position records for one unregistered platform should produce a single warning for that platform, not hundreds. This keeps the warning output actionable.

**Independent Test**: Can be tested by importing a file with many position records for a single unregistered platform and verifying only one warning is produced for that platform ID.

**Acceptance Scenarios**:

1. **Given** a REP file with 500 position records for unregistered platform "CONTACT_ALPHA", **When** the file is imported, **Then** exactly one warning is emitted for "CONTACT_ALPHA" (not one per position record).
2. **Given** a DPF file with three unregistered platforms each appearing in multiple tracks, **When** the file is imported, **Then** exactly three warnings are emitted (one per unique unregistered platform ID).

---

### User Story 4 - Warning Includes Source File Context (Priority: P3)

As an analyst importing multiple files in a batch, I want each unregistered-platform warning to identify the source file, so I can trace which files introduced which unknown platforms.

**Why this priority**: Useful for batch imports where many files are processed together. Knowing which source file produced the warning helps the analyst triage and prioritise registry additions.

**Independent Test**: Can be tested by importing multiple files in a single batch where different files contain different unregistered platforms, and verifying each warning references the correct source file.

**Acceptance Scenarios**:

1. **Given** two files imported in the same batch — file A containing unregistered "VESSEL_X" and file B containing unregistered "VESSEL_Y", **When** both files are imported, **Then** the warning for "VESSEL_X" references file A and the warning for "VESSEL_Y" references file B.

---

### Edge Cases

- What happens when a platform ID is an empty string or whitespace? The system should skip validation for empty/whitespace platform IDs (no warning emitted, as these are not meaningful identifiers).
- What happens when the platform registry file cannot be loaded (missing or corrupt)? The import should still succeed — registry validation is a best-effort check. A single warning should indicate that registry validation was skipped due to a load failure.
- What happens when the same unregistered platform appears across multiple files in a batch import? One warning per unique platform ID per source file is emitted (a platform unregistered in file A and file B produces two warnings, one referencing each file).
- What happens when a platform is registered but under a different case (e.g., "nelson" vs "NELSON")? Platform ID lookup is case-sensitive, matching the existing registry behaviour. A case mismatch produces an unregistered-platform warning.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST check all extracted `platform_id` values against the platform registry after each file import completes.
- **FR-002**: System MUST emit a warning for each unique `platform_id` that is not found in the registry, identifying the unregistered platform and the source file.
- **FR-003**: System MUST NOT block or fail the import due to unregistered platforms — import always succeeds regardless of registry coverage.
- **FR-004**: System MUST deduplicate warnings so that each unregistered platform ID produces at most one warning per source file, regardless of how many track positions reference that platform.
- **FR-005**: System MUST skip registry validation for empty or whitespace-only platform IDs without emitting a warning.
- **FR-006**: System MUST use a distinct warning code (e.g., `UNREGISTERED_PLATFORM`) to allow programmatic filtering of these warnings from other import warnings.
- **FR-007**: System MUST gracefully handle registry load failures by skipping the validation step and emitting a single warning indicating that registry validation was unavailable.
- **FR-008**: System MUST apply to all supported import formats (REP and DPF files).
- **FR-009**: Platform ID lookup MUST be case-sensitive, consistent with the existing registry behaviour.

### Key Entities

- **Platform ID**: A string identifier extracted from imported data files that names a track (e.g., "NELSON", "DEFENDER"). Used as the lookup key against the platform registry.
- **Platform Registry**: A static data file containing known platforms organised in a vessel-class hierarchy. Each platform entry includes name, nationality, and positional metadata (vessel class, type, role, domain). Used as the reference for validating platform IDs.
- **Import Warning**: A structured record produced during import containing a warning code, human-readable message, and source file reference. Accumulated into the import result for the caller to inspect.

## Assumptions

- The platform registry (#180) is already implemented and available as a loadable data file with a resolve-by-ID capability.
- The existing import pipeline already accumulates warnings in a structured list on the import result, with a defined warning model containing file, code, and message fields.
- Import handlers already extract `platform_id` from track data in both REP and DPF formats.
- This feature does not modify how `platform_id` values are extracted — it only validates them post-extraction.
- This feature does not enrich track features with registry metadata (that is the responsibility of save-time resolution in #183).

## Dependencies

- **#180 (Platform Registry)**: Required — provides the registry data file and loader/resolver used for validation. Already complete.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of unregistered platform IDs produce a warning after import — no silent gaps in registry coverage go unreported.
- **SC-002**: 0% of imports are blocked or fail due to unregistered platforms — the import success rate is unchanged by this feature.
- **SC-003**: Warning output is concise — each unregistered platform ID appears at most once per source file, regardless of the number of track positions.
- **SC-004**: Warning messages are actionable — each warning identifies the unregistered platform ID and the source file, giving the analyst enough context to act.
- **SC-005**: Registry load failures do not degrade import functionality — imports complete successfully with a single advisory warning when the registry is unavailable.
- **SC-006**: All existing import tests continue to pass — no regressions in import behaviour for files with fully registered platforms.
