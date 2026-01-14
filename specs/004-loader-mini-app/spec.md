# Feature Specification: Loader Mini-App

**Feature Branch**: `004-loader-mini-app`
**Created**: 2026-01-11
**Status**: Draft
**Input**: Stage 4 of tracer delivery plan - Electron application for file loading workflow orchestration

## Overview

The Loader Mini-App is a lightweight desktop application that orchestrates the file loading workflow for Debrief. It serves as the bridge between user file selection and STAC catalog storage, enabling users to load maritime data files into organized plots with full provenance tracking.

This application integrates three foundational services (debrief-config, debrief-io, debrief-stac) into a cohesive user experience for data ingestion.

## Clarifications

### Session 2026-01-11

- Q: What is the dialog workflow structure? → A: Two-step wizard with store-first approach. Step 1 selects STAC store, Step 2 has tabbed interface ("Add to Existing" / "Create New") with custom UI per tab.
- Q: What information helps users choose the right destination? → A: Standard info display - Store name + path + plot count (Step 1), Plot name + created date + feature count (Step 2).

## User Scenarios & Testing

### User Story 1 - Load File into New Plot (Priority: P1)

An analyst receives a new REP data file and wants to create a fresh plot to analyze the contained track data. They right-click the file in their operating system, select "Open with Debrief Loader", choose to create a new plot in their preferred STAC store, and the file is processed and stored with full provenance.

**Why this priority**: This is the primary use case - getting data into Debrief for the first time. Without this capability, no analysis can occur.

**Independent Test**: Can be fully tested by loading a single REP file into a new plot and verifying the data appears correctly in the STAC catalog with provenance metadata.

**Acceptance Scenarios**:

1. **Given** user has a REP file and at least one STAC store configured, **When** user opens file with Loader and selects "Create new plot", **Then** a new plot is created in the selected store containing the parsed track features.

2. **Given** user has selected "Create new plot", **When** the file is successfully processed, **Then** the original source file is copied to the plot's assets folder and provenance metadata records the file origin, processing timestamp, and parser version.

3. **Given** user opens a REP file with Loader, **When** the application launches, **Then** all configured STAC stores from debrief-config are displayed as destination options.

---

### User Story 2 - Add Data to Existing Plot (Priority: P2)

An analyst wants to add supplementary track data to an existing plot they are working on. They load a new file and select an existing plot as the destination, appending the new features to the existing data.

**Why this priority**: Combining multiple data sources into a single plot is essential for comprehensive analysis, but requires the basic load capability (P1) first.

**Independent Test**: Can be tested by creating a plot with one file, then loading a second file into the same plot and verifying both datasets are present.

**Acceptance Scenarios**:

1. **Given** user has a STAC store with existing plots, **When** user chooses "Add to existing plot" and selects a plot, **Then** the parsed features are appended to that plot's feature collection.

2. **Given** user is adding data to an existing plot, **When** processing completes, **Then** provenance records show the addition as a separate ingestion event linked to the original plot.

---

### User Story 3 - Beta Preview UI Components (Priority: P3)

Stakeholders and community members can preview and provide feedback on the Loader UI components via a deployed Storybook instance before the full application is released.

**Why this priority**: Early community feedback on UX improves the final product, but the core functionality must be designed first.

**Independent Test**: Can be tested by navigating to the Storybook deployment and interacting with file picker and store selector components.

**Acceptance Scenarios**:

1. **Given** Storybook is deployed, **When** stakeholder accesses the URL, **Then** they can interact with file picker and store selector components in isolation.

2. **Given** stakeholder has feedback on UI components, **When** they visit the feedback Discussion, **Then** they can submit structured feedback on the load workflow UX.

---

### Edge Cases

- What happens when user has no STAC stores configured?
  - Application displays a helpful message explaining how to configure a store and provides a link to documentation.

- How does system handle a corrupted or invalid REP file?
  - Parser returns validation errors with line numbers and specific issues; user sees a clear error message with actionable guidance.

- What happens when the destination STAC store is not accessible (permissions, disk full)?
  - System reports the specific storage error and suggests alternatives (different store, free up space).

- How does system handle duplicate file loads?
  - System allows the load but records provenance showing it's a re-import of the same source file, letting users decide if this was intentional.

- What happens during processing if the application is closed unexpectedly?
  - Partial writes are cleaned up on next launch; no corrupted plots are left in the catalog.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Load a maritime data file into a STAC catalog plot for analysis
- **Key Decision(s)**:
  1. Where to store the data (which STAC store)
  2. Whether to create a new plot or add to an existing one
  3. (If existing) Which plot to add data to
- **Decision Inputs**:
  - **Step 1 (Store Selection)**: Store name, file path, number of existing plots
  - **Step 2 (Plot Selection)**: Plot name, created date, feature count

### Dialog Structure

Two-step wizard with store-first approach:

1. **Step 1 - Select Store**: User chooses which STAC store to use as the destination
2. **Step 2 - Configure Plot**: Tabbed interface with two options:
   - **"Add to Existing" tab**: Shows list of existing plots in selected store for selection
   - **"Create New" tab**: Shows form for new plot creation (name, description, etc.)

This structure prioritizes the destination decision first, then reveals context-appropriate options based on the selected store.

### Screen Progression

| Step | Screen/State | User Action | System Response |
|------|--------------|-------------|-----------------|
| 1    | Store Selection | Opens file with Loader | Display list of configured STAC stores |
| 2    | Store Selection | Selects a store | Enable "Next" button, show store details |
| 3    | Plot Configuration | Clicks "Next" | Show tabbed interface (Add to Existing / Create New) |
| 4    | Plot Configuration | Selects tab and configures | Show relevant options for selected tab |
| 5    | Plot Configuration | Clicks "Load" | Validate selection, begin processing |
| 6    | Processing | Views progress | Show progress indicator with status messages |
| 7    | Complete | Views result | Show success confirmation with plot location |

### UI States

- **Empty**: No STAC stores configured - show setup guidance with documentation link
- **Loading**: Progress indicator during file parsing and catalog write operations
- **Error**: Red notification with specific error message and actionable resolution steps
- **Success**: Confirmation message with link/path to the newly populated plot

### Wireframe Sketch

**Step 1 - Store Selection:**
```
┌─────────────────────────────────────────────┐
│  Debrief Loader                        [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Loading: sample-track.rep                  │
│  ─────────────────────────────              │
│                                             │
│  Select destination store:                  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ ○ Local Analysis Store              │    │
│  │   /home/user/debrief/local-catalog  │    │
│  │   3 plots                           │    │
│  ├─────────────────────────────────────┤    │
│  │ ● Project Alpha Store               │    │
│  │   /shared/projects/alpha/catalog    │    │
│  │   12 plots                          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│                     [ Cancel ]  [ Next > ]  │
└─────────────────────────────────────────────┘
```

**Step 2 - Plot Configuration (tabbed):**
```
┌─────────────────────────────────────────────┐
│  Debrief Loader                        [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Loading: sample-track.rep                  │
│  Store: Project Alpha Store                 │
│  ─────────────────────────────              │
│                                             │
│  ┌──────────────────┬─────────────┐         │
│  │ Add to Existing  │ Create New  │         │
│  ├──────────────────┴─────────────┴────┐    │
│  │                                     │    │
│  │  ○ Exercise Bravo                   │    │
│  │    Created: 2026-01-10 · 45 features│    │
│  │  ● Operation Neptune                │    │
│  │    Created: 2026-01-08 · 128 features   │
│  │  ○ Training Run 3                   │    │
│  │    Created: 2026-01-05 · 23 features│    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│              [ < Back ]  [ Cancel ] [ Load ]│
└─────────────────────────────────────────────┘
```

**Step 2 - Create New tab:**
```
┌─────────────────────────────────────────────┐
│  Debrief Loader                        [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Loading: sample-track.rep                  │
│  Store: Project Alpha Store                 │
│  ─────────────────────────────              │
│                                             │
│  ┌──────────────────┬─────────────┐         │
│  │ Add to Existing  │ Create New  │         │
│  ├──────────────────┴─────────────┴────┐    │
│  │                                     │    │
│  │  Plot name:                         │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │ New Analysis Plot           │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  │  Description (optional):            │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │                             │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│              [ < Back ]  [ Cancel ] [ Load ]│
└─────────────────────────────────────────────┘
```

## Requirements

### Functional Requirements

- **FR-001**: System MUST read configured STAC stores from the debrief-config service on startup.

- **FR-002**: System MUST display all available STAC stores as destination options to the user.

- **FR-003**: System MUST allow users to select between "Create new plot" or "Add to existing plot" workflows.

- **FR-004**: When "Create new plot" is selected, system MUST create a new STAC Item in the chosen catalog.

- **FR-005**: When "Add to existing plot" is selected, system MUST list all existing plots in the selected store for user selection.

- **FR-006**: System MUST invoke debrief-io to parse the selected file and receive validated GeoJSON features.

- **FR-007**: System MUST invoke debrief-stac to write the parsed features to the target plot.

- **FR-008**: System MUST copy the original source file to the plot's assets storage location.

- **FR-009**: System MUST record provenance metadata including: source file path, processing timestamp, parser identifier, and parser version.

- **FR-010**: System MUST display clear progress feedback during file processing (parsing, writing, copying).

- **FR-011**: System MUST display actionable error messages when processing fails, including specific guidance for resolution.

- **FR-012**: System MUST gracefully handle the case when no STAC stores are configured.

- **FR-013**: System MUST support opening files via OS file association (right-click "Open with").

- **FR-014**: System MUST clean up partial writes if processing is interrupted.

### Key Entities

- **Source File**: The original data file (REP format) being loaded; key attributes include file path, format type, and file hash for deduplication detection.

- **Plot**: A STAC Item representing a collection of track features; serves as the destination for loaded data.

- **STAC Store**: A configured catalog location where plots are stored; users select from their configured stores.

- **Provenance Record**: Metadata tracking the lineage of loaded data; links source file to plot with processing details.

- **Feature**: A GeoJSON geometry representing parsed track data; output from debrief-io that gets stored in plots.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete the full load workflow (file selection to stored plot) in under 30 seconds for a typical REP file.

- **SC-002**: 95% of users successfully load their first file without requiring documentation or support.

- **SC-003**: Every loaded file has complete provenance metadata that can be traced back to the original source.

- **SC-004**: Users can locate and select their target STAC store within 3 clicks of launching the application.

- **SC-005**: Error messages provide sufficient information for users to resolve issues without external support in 80% of cases.

- **SC-006**: Beta preview feedback achieves at least 10 stakeholder responses within the 1-week feedback pause period.

## Assumptions

- REP file format support is implemented in debrief-io (Stage 2 prerequisite).
- STAC catalog operations are available via debrief-stac (Stage 1 prerequisite).
- User configuration reading is available via debrief-config (Stage 3 prerequisite).
- Users have at least one STAC store configured before first use (or will be guided to configure one).
- The application will be distributed for Linux, macOS, and Windows platforms.
- File size limits follow industry-standard desktop application expectations (files up to several hundred MB).

## Dependencies

- **debrief-stac** (Stage 1): STAC catalog operations for reading/writing plots
- **debrief-io** (Stage 2): REP file parsing to GeoJSON features
- **debrief-config** (Stage 3): User configuration for available STAC stores

## Out of Scope

- Support for file formats other than REP (extensibility will be added later)
- Batch processing of multiple files simultaneously
- Direct editing or modification of existing plot data
- Map visualization of loaded data (handled by VS Code extension in Stage 6)
- Real-time synchronization with remote STAC catalogs
