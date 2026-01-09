# Feature Specification: debrief-stac

**Feature Branch**: `001-debrief-stac`
**Created**: 2026-01-09
**Status**: Draft
**Input**: Tracer Bullet Delivery Plan - Stage 1
**Dependencies**: Stage 0 (Schemas) MUST be complete

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Local STAC Catalog (Priority: P1)

An analyst creates a new local STAC catalog to store analysis plots. The catalog is initialised
at a user-specified directory path with correct STAC structure.

**Why this priority**: Without a catalog, no plots can be stored. This is the foundation for all
data persistence in Debrief v4.

**Independent Test**: Call `create_catalog(path)`, verify directory contains valid `catalog.json`
with correct STAC structure.

**Acceptance Scenarios**:

1. **Given** a valid directory path, **When** `create_catalog()` is called, **Then** a STAC catalog
   is created with valid `catalog.json` at the root.
2. **Given** a path that already contains a catalog, **When** `create_catalog()` is called,
   **Then** operation fails with clear error (no overwrite).
3. **Given** a path without write permissions, **When** `create_catalog()` is called, **Then**
   operation fails with permission error.

---

### User Story 2 - Create Plot (STAC Item) (Priority: P1)

An analyst creates a new plot within an existing catalog. The plot is a STAC Item that will
contain GeoJSON features and source file assets.

**Why this priority**: Plots are the primary data container. Loader and all services depend on
creating and reading plots.

**Independent Test**: Call `create_plot(catalog, metadata)`, verify STAC Item JSON is valid and
linked from catalog.

**Acceptance Scenarios**:

1. **Given** an existing catalog and valid PlotMetadata, **When** `create_plot()` is called,
   **Then** a new STAC Item is created with correct properties and geometry.
2. **Given** PlotMetadata with title and description, **When** plot is created, **Then** STAC
   Item properties include title, description, and datetime.
3. **Given** a created plot, **When** catalog is read, **Then** plot appears in catalog links.

---

### User Story 3 - Read Plot (Priority: P1)

A service retrieves a plot by ID from a catalog, receiving the full STAC Item including properties,
geometry bounds, and asset references.

**Why this priority**: All display and analysis operations require reading plot data.

**Independent Test**: Create plot, then call `read_plot(catalog, plot_id)`, verify returned data
matches created data.

**Acceptance Scenarios**:

1. **Given** an existing plot ID, **When** `read_plot()` is called, **Then** complete STAC Item
   is returned with all properties and assets.
2. **Given** a non-existent plot ID, **When** `read_plot()` is called, **Then** raises NotFoundError
   with the requested ID.
3. **Given** a plot with GeoJSON features asset, **When** read, **Then** asset href points to
   valid GeoJSON file.

---

### User Story 4 - Add Features to Plot (Priority: P1)

The loader service adds parsed GeoJSON features to an existing plot. Features are appended to
the plot's FeatureCollection asset.

**Why this priority**: This is how data gets into plots. Without it, plots remain empty.

**Independent Test**: Create plot, add features via `add_features()`, read plot, verify features
present in GeoJSON asset.

**Acceptance Scenarios**:

1. **Given** an existing plot and valid GeoJSON features, **When** `add_features()` is called,
   **Then** features are appended to plot's FeatureCollection.
2. **Given** an empty plot, **When** first features are added, **Then** FeatureCollection asset
   is created with those features.
3. **Given** features with geometry, **When** added to plot, **Then** plot's bbox is updated to
   encompass new features.

---

### User Story 5 - Add Source Asset to Plot (Priority: P2)

The loader service copies the original source file into the plot's assets directory and records
it as a STAC asset with provenance metadata.

**Why this priority**: Constitution Article III requires source preservation. This is critical
but features can technically be added first.

**Independent Test**: Add asset via `add_asset()`, verify file copied to assets directory and
referenced in STAC Item.

**Acceptance Scenarios**:

1. **Given** a source file path and plot, **When** `add_asset()` is called, **Then** file is
   copied to plot's assets directory.
2. **Given** an added asset, **When** plot is read, **Then** asset appears in STAC Item assets
   with correct href and media type.
3. **Given** an asset with provenance metadata, **When** added, **Then** provenance is stored
   in asset's extra fields.

---

### User Story 6 - List Catalog Contents (Priority: P2)

A user browses the catalog to see available plots with summary information (title, date, feature
count).

**Why this priority**: Required for UI browsing but not for core data operations.

**Independent Test**: Create catalog with 3 plots, call `list_plots()`, verify all 3 returned
with summary info.

**Acceptance Scenarios**:

1. **Given** a catalog with multiple plots, **When** `list_plots()` is called, **Then** all plots
   are returned with ID, title, and datetime.
2. **Given** an empty catalog, **When** `list_plots()` is called, **Then** empty list is returned.
3. **Given** plots with varying dates, **When** listed, **Then** plots are sorted by datetime
   descending (newest first).

---

### User Story 7 - MCP Tool Exposure (Priority: P2)

Services access debrief-stac functionality via MCP tools. Each core operation (create catalog,
create plot, read plot, add features, add asset, list plots) is exposed as an MCP tool.

**Why this priority**: MCP integration enables VS Code extension and future AI orchestration,
but Python library works standalone.

**Independent Test**: Start MCP server, call tools via MCP client, verify same results as direct
Python calls.

**Acceptance Scenarios**:

1. **Given** MCP server running, **When** `create_catalog` tool is called, **Then** catalog is
   created and success response returned.
2. **Given** MCP server, **When** tool is called with invalid parameters, **Then** error response
   includes validation details.
3. **Given** all core operations, **When** exposed via MCP, **Then** each has documented input/output
   schemas matching Pydantic models.

---

### Edge Cases

- What happens when disk is full during asset copy?
- How does system handle concurrent writes to the same plot?
- What happens when GeoJSON feature has invalid geometry?
- How are large FeatureCollections (>10000 features) handled?
- What happens when catalog.json becomes corrupted?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create local STAC catalogs at user-specified paths.
- **FR-002**: System MUST create STAC Items (plots) within catalogs with PlotMetadata properties.
- **FR-003**: System MUST read STAC Items by ID, returning full item with assets.
- **FR-004**: System MUST append GeoJSON features to plot FeatureCollection assets.
- **FR-005**: System MUST copy source files to assets directory and record as STAC assets.
- **FR-006**: System MUST update plot bbox when features are added.
- **FR-007**: System MUST list all plots in a catalog with summary information.
- **FR-008**: System MUST expose all operations via MCP tools using mcp-common infrastructure.
- **FR-009**: System MUST use generated Pydantic models from Stage 0 for all data validation.
- **FR-010**: System MUST store provenance metadata with assets (source file, load timestamp,
  tool version).

### Key Entities

- **Catalog**: STAC Catalog containing links to plots. Stored as `catalog.json` at root of
  catalog directory.
- **Plot**: STAC Item representing an analysis session. Contains properties (title, description,
  datetime), bbox, and assets (features GeoJSON, source files).
- **FeatureCollection Asset**: GeoJSON file containing all features in a plot. Referenced from
  plot as asset with role "data".
- **Source Asset**: Original file (e.g., REP file) copied into plot. Referenced with role "source"
  and provenance metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Can create a local STAC catalog and verify it passes STAC validation.
- **SC-002**: Can create, read, and list plots within a catalog.
- **SC-003**: Can add GeoJSON features to a plot and read them back unchanged.
- **SC-004**: Can add source file assets with provenance metadata.
- **SC-005**: All operations available via MCP tools with documented schemas.
- **SC-006**: Unit tests cover all acceptance scenarios with >90% code coverage.
- **SC-007**: Integration test: create catalog → create plot → add features → add asset → read
   plot → verify all data present.
