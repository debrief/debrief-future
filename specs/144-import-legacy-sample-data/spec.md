# Feature Specification: Import Legacy Sample Data

**Feature Branch**: `144-import-legacy-sample-data`
**Created**: 2026-03-20
**Status**: Draft
**Input**: User description: "Import legacy Debrief sample data into STAC catalog — build DPF parser, import all REP/DPF/DSF files (~148 files) from legacy repo, commit demo STAC catalog for stakeholder engagement"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import REP Files into STAC Catalog (Priority: P1)

A developer or demo operator runs the import pipeline against the ~75 REP files from the legacy Debrief repository. The pipeline uses the existing REP parser to convert each file into GeoJSON features, creates STAC Items (plots) for each file, preserves the original REP file as a STAC asset with provenance metadata, and writes everything to a local STAC catalog directory.

**Why this priority**: REP files are the largest subset (~75 of ~148 files), the parser already exists, and these files contain the core track data needed for stakeholder demos. This validates the import pipeline end-to-end with zero new parser work.

**Independent Test**: Can be fully tested by running the import pipeline on the REP files and verifying the resulting STAC catalog contains valid Items with correct GeoJSON features and asset provenance.

**Acceptance Scenarios**:

1. **Given** a directory containing legacy REP files, **When** the import pipeline runs, **Then** each REP file produces a STAC Item with GeoJSON features containing track data (LineString geometries with temporal properties).
2. **Given** a REP file with multiple tracks (e.g., NELSON and COLLINGWOOD), **When** it is imported, **Then** all tracks appear as separate GeoJSON features within the same plot.
3. **Given** a REP file with special comments (narratives, shapes), **When** it is imported, **Then** annotations are preserved as GeoJSON features alongside track data.
4. **Given** a REP file that triggers parse warnings (non-fatal issues), **When** it is imported, **Then** the warnings are logged but the import completes successfully with all valid data preserved.

---

### User Story 2 - Build DPF Parser and Import DPF Files (Priority: P2)

A developer builds a new DPF (Debrief Plot File) parser as a `debrief-io` handler. The DPF format is XML-based and contains tracks, sensor contacts, and plot metadata. The parser extracts spatial/temporal data as GeoJSON features, registers in the handler registry alongside the REP handler, and is used to import all ~46 DPF files from the legacy repository into the STAC catalog.

**Why this priority**: DPF files represent the second largest subset (~46 files, ~14.5 MB) and contain rich plot data including sensor contacts that REP files alone cannot provide. Building this parser is the primary new development work for this feature.

**Independent Test**: Can be tested by parsing individual DPF files and verifying the output GeoJSON features match expected track/sensor data, then running the import pipeline on all 46 DPF files.

**Acceptance Scenarios**:

1. **Given** a DPF file containing track data, **When** it is parsed, **Then** each track is output as a GeoJSON Feature with LineString geometry and temporal properties matching the existing output format.
2. **Given** a DPF file containing sensor contacts, **When** it is parsed, **Then** sensor contacts are output as GeoJSON Features with appropriate geometry and metadata.
3. **Given** a DPF file with metadata (title, description, classification), **When** it is parsed, **Then** the metadata is preserved in the STAC Item properties.
4. **Given** a malformed or partially valid DPF file, **When** it is parsed, **Then** valid data is extracted and warnings are logged for any unparseable elements (warn-and-continue approach).

---

### User Story 3 - Import DSF Files as Sensor Contacts (Priority: P3)

A developer extends the import pipeline to handle DSF (Debrief Sensor File) format. DSF files use the same record format as REP sensor lines but exist as standalone files. The ~27 DSF files from the legacy repository are parsed and imported into the STAC catalog as sensor contact data.

**Why this priority**: DSF files are the smallest subset (~27 files, ~300 KB) and share record format with existing REP parsing logic, making them the lowest-effort addition. They complete the full data inventory.

**Independent Test**: Can be tested by parsing individual DSF files and verifying sensor contacts are output as GeoJSON features, then running the import pipeline on all 27 DSF files.

**Acceptance Scenarios**:

1. **Given** a DSF file containing sensor contacts, **When** it is parsed, **Then** each sensor contact is output as a GeoJSON Feature with point or bearing-line geometry.
2. **Given** a DSF file, **When** it is imported, **Then** the STAC Item includes the original DSF file as a provenance-tracked asset.
3. **Given** all 27 DSF files, **When** the import pipeline completes, **Then** all files are represented in the STAC catalog.

---

### User Story 4 - Committed Demo STAC Catalog (Priority: P4)

After all files are imported, the resulting STAC catalog is committed to the repository so that stakeholders can browse it immediately using the STAC file tree component. The catalog is structured for easy navigation by scenario category (tutorial, multi-static, SATC test data, etc.).

**Why this priority**: The committed catalog is the deliverable artifact that enables stakeholder demos. Without it committed to the repo, the import work has no visible output.

**Independent Test**: Can be tested by cloning the repository and verifying the STAC catalog is present, valid, and browseable without running any import pipeline.

**Acceptance Scenarios**:

1. **Given** the repository is cloned, **When** a user navigates to the demo catalog directory, **Then** they find a valid STAC catalog with all imported plots.
2. **Given** the committed catalog, **When** it is opened in the STAC file tree component, **Then** plots are browseable and grouped by scenario category.
3. **Given** any STAC Item in the catalog, **When** it is inspected, **Then** it contains valid GeoJSON features, source file assets, and provenance metadata.

---

### Edge Cases

- What happens when a DPF file references external files that are not present? The parser extracts only inline data and logs a warning for unresolvable references.
- How does the system handle encoding issues in legacy files? The existing encoding detection strategy (UTF-8 first, Latin-1 fallback) is applied to all formats.
- What happens when two files produce tracks with the same name? Track names are preserved as-is; uniqueness is maintained at the STAC Item (plot) level, not globally across the catalog.
- What happens when a legacy file is completely unparseable? The file is skipped with an error logged, and the import pipeline continues processing remaining files.
- How are very large DPF files handled? The import is a one-time batch operation, so performance is acceptable as long as the full pipeline completes within a reasonable timeframe.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse DPF (Debrief Plot File) XML format, extracting tracks as GeoJSON LineString features with temporal properties (course, speed, depth, timestamps).
- **FR-002**: System MUST parse DPF sensor contacts as GeoJSON features with appropriate geometry (bearing lines or point contacts).
- **FR-003**: System MUST extract DPF plot metadata (title, description) and include it in STAC Item properties.
- **FR-004**: System MUST parse DSF (Debrief Sensor File) format as standalone sensor contacts, producing the same GeoJSON output as sensor data parsed from REP files.
- **FR-005**: System MUST register DPF and DSF handlers in the `debrief-io` handler registry alongside the existing REP handler.
- **FR-006**: System MUST provide a batch import pipeline that processes a directory of mixed REP/DPF/DSF files, creating a STAC catalog with one plot per source file.
- **FR-007**: System MUST preserve each original source file as a STAC asset with provenance metadata (source path, import timestamp, parser version).
- **FR-008**: System MUST apply the warn-and-continue philosophy — non-fatal parse issues are logged as warnings, and valid data is always preserved.
- **FR-009**: System MUST produce GeoJSON features that conform to the LinkML master schemas.
- **FR-010**: System MUST organize the STAC catalog by scenario category derived from the legacy directory structure (e.g., Demo, MultiPath, MultiStatic, SATC).
- **FR-011**: System MUST work entirely offline with no network dependencies.
- **FR-012**: System MUST generate a summary report after import showing: files processed, files succeeded, files failed, total tracks/sensors extracted, and any warnings.

### Key Entities

- **Source File**: A legacy REP, DPF, or DSF file from the legacy repository, identified by path and format.
- **Track**: A time-ordered sequence of positions for a platform (vessel, submarine, etc.), represented as a GeoJSON LineString feature with temporal properties.
- **Sensor Contact**: A detection or bearing measurement from a sensor system, represented as a GeoJSON feature with point or bearing-line geometry.
- **Plot**: A STAC Item containing one or more GeoJSON features (tracks, sensors, annotations) derived from a single source file, plus the source file as a provenance-tracked asset.
- **Demo Catalog**: A STAC Catalog committed to the repository, containing all imported plots organized by scenario category.
- **Import Report**: A summary of the batch import operation showing success/failure counts and warnings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All ~75 REP files from the legacy repository are successfully imported into the STAC catalog with zero data loss for valid records.
- **SC-002**: All ~46 DPF files are successfully parsed and imported, with tracks and sensor contacts extracted as GeoJSON features.
- **SC-003**: All ~27 DSF files are successfully parsed and imported as sensor contact data.
- **SC-004**: The committed STAC catalog contains at least 140 plots (allowing for a small number of completely unparseable files).
- **SC-005**: Every STAC Item in the catalog includes the original source file as a provenance-tracked asset.
- **SC-006**: The catalog is browseable in the STAC file tree component without errors.
- **SC-007**: The entire import pipeline completes in under 5 minutes for all ~148 files.
- **SC-008**: The committed catalog size is under 50 MB (reasonable for repository storage).

## Assumptions

- The legacy Debrief repository (`debrief/debrief`) sample data is accessible at import time (cloned or downloaded separately).
- DPF XML structure follows a consistent schema across all 46 files (standard Debrief serialization format).
- DSF files use the same line-based record format as REP sensor contact lines, making parser reuse straightforward.
- The existing STAC service operations (create catalog, create plot, add features, add asset) are sufficient for batch import without modification.
- Import is a one-time batch operation; incremental re-import is not required.
- Track/sensor GeoJSON output from DPF and DSF parsers follows the same schema as REP parser output.

## Out of Scope

- Formats beyond REP/DPF/DSF (GPX, NMEA, CS2, JPG, etc.) — deferred to F8 Multi-Source Data Import.
- DPF UI state reconstruction (projection settings, styling preferences, panel layout).
- Automated CI regeneration of the catalog — catalog is committed directly.
- SATC algorithm execution — data is imported as raw tracks and sensors only.
- Incremental or differential re-import of previously imported files.

## Dependencies

- Existing REP parser in `debrief-io` service.
- Existing STAC service for catalog, plot, and feature operations.
- LinkML master schemas for GeoJSON feature validation.
- Access to legacy Debrief repository sample data files.
