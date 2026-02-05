# Feature Specification: Load Existing Result Files into Attachments Dropdown

**Feature Branch**: `001-load-result-attachments`
**Created**: 2026-02-05
**Status**: Draft
**Input**: GitHub Issue #172 - Load existing result files into Attachments dropdown on plot open

## Problem Statement

When users execute analysis tools (such as range-bearing), result files are saved to the plot's assets folder and appear in the Attachments dropdown with visual highlighting during the active session. However, after closing and reopening the plot, these result files disappear from the Attachments dropdown, leaving users unable to access their previous analysis results without manually navigating to the files.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Existing Results on Plot Open (Priority: P1)

An analyst opens a plot they worked on yesterday. They need to continue reviewing the range-bearing analysis they ran previously. When the plot opens, they expect to see their previous analysis results in the Attachments dropdown without having to re-run the tool.

**Why this priority**: This is the core problem reported - users lose access to their work between sessions. Without this, the Attachments feature provides no persistence value.

**Independent Test**: Can be fully tested by creating a result file in a plot's assets folder, closing and reopening the plot, and verifying the file appears in Attachments.

**Acceptance Scenarios**:

1. **Given** a plot with result files in its assets folder, **When** the user opens the plot, **Then** all result files appear in the Attachments dropdown
2. **Given** a plot with multiple result files from different tools, **When** the user opens the plot, **Then** all result files are listed with their appropriate tool identification

---

### User Story 2 - Persistent Results Across Sessions (Priority: P2)

An analyst runs a new analysis tool, closes the application, and returns later to continue work. The newly generated results should persist alongside any previous results.

**Why this priority**: Builds on P1 by ensuring newly-generated results also persist, completing the persistence story.

**Independent Test**: Can be tested by generating a new result, closing the plot, reopening it, and confirming the new result appears alongside any existing ones.

**Acceptance Scenarios**:

1. **Given** a plot with existing result files, **When** the user runs a new tool and then closes and reopens the plot, **Then** both old and new result files appear in Attachments
2. **Given** a user has generated results in multiple sessions, **When** they open the plot, **Then** all results from all sessions are visible

---

### User Story 3 - Clear Indication of Empty State (Priority: P3)

An analyst opens a plot that has no analysis results yet. The Attachments section should clearly indicate that no results exist, distinguishing this from a loading or error state.

**Why this priority**: Provides clarity to users about plot state, preventing confusion about whether results are missing or simply haven't been generated.

**Independent Test**: Can be tested by opening a plot with no result files and verifying the empty state message appears.

**Acceptance Scenarios**:

1. **Given** a plot with an empty assets folder, **When** the user opens the plot, **Then** the Attachments section shows an appropriate empty state message
2. **Given** a plot with non-result files in assets (e.g., images), **When** the user opens the plot, **Then** only result files are shown (non-result files are excluded)

---

### Edge Cases

- What happens when the assets folder contains corrupted or unreadable files?
  - System should skip unreadable files and log a warning, displaying only valid result files
- What happens when result files exist but lack expected metadata?
  - System should use filename patterns as fallback identification
- What happens when a very large number of result files exist (100+)?
  - System should load all files but may show a summary count or scrollable list
- What happens when the assets folder does not exist?
  - System should treat this as an empty state (no results to display)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST scan the plot's assets folder when a plot is loaded
- **FR-002**: System MUST identify result files by recognizing the tool-generated metadata marker in file contents
- **FR-003**: System MUST fall back to filename pattern matching (e.g., `*-result.json`, tool-specific prefixes) when metadata is absent
- **FR-004**: System MUST populate the Attachments dropdown with all discovered result files
- **FR-005**: System MUST display loaded result files with the same visual presentation as newly-generated results (including tool identification and highlighting capability)
- **FR-006**: System MUST handle missing or inaccessible assets folders gracefully by showing an empty state
- **FR-007**: System MUST skip corrupted or unreadable files without blocking the display of valid results
- **FR-008**: System MUST preserve the chronological ordering of result files (most recent first or by creation date)

### Key Entities

- **Result File**: A file generated by an analysis tool, stored in the plot's assets folder. Contains analysis output data and metadata identifying the generating tool. Identified by metadata marker or naming pattern.
- **Plot**: A STAC item representing a collection of track data and associated analysis assets. Contains an assets folder where result files are stored.
- **Attachments Dropdown**: A UI component in the activity panel that displays files associated with the current plot. Shows result files with tool identification and allows user interaction.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Access previously-generated analysis results without re-running tools
- **Key Decision(s)**:
  1. Which result file to view or interact with
  2. Whether to re-run an analysis with different parameters
- **Decision Inputs**: The Attachments dropdown shows result file names, the tool that generated them, and creation timestamps to help users identify the specific result they need

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Plot closed | User opens a plot | Plot loads and assets folder is scanned |
| 2 | Plot loading | System discovers result files | Attachments dropdown is populated |
| 3 | Plot loaded | User clicks Attachments dropdown | List of result files displayed |
| 4 | Viewing attachments | User selects a result file | Result details shown or file opened |

### UI States

- **Empty State**: "No analysis results. Run a tool to generate results." appears in the Attachments dropdown when no result files exist
- **Loading State**: Brief loading indicator while assets folder is scanned (typically sub-second)
- **Error State**: "Some results could not be loaded" with count of skipped files, if any files were unreadable
- **Success State**: List of result files with tool icons, names, and timestamps displayed in the dropdown

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid result files in a plot's assets folder appear in the Attachments dropdown when the plot is opened
- **SC-002**: Result files persist across application close/reopen cycles with no data loss
- **SC-003**: Users can access previous analysis results within 2 interactions (open plot, click dropdown)
- **SC-004**: Plot opening time increases by no more than 500ms even with 50 result files in the assets folder

## Assumptions

- Result files use a consistent metadata marker (`debrief:toolId` or similar) that can be detected during file scanning
- The assets folder location within a plot follows the existing STAC item structure
- Filename patterns for result files follow conventions established by existing tools (e.g., `range-bearing-*.json`)
- The Attachments dropdown already exists and accepts a list of files to display; this feature adds the loading mechanism

## Dependencies

- Existing STAC catalog structure for plots and assets
- Current Attachments dropdown implementation (activity panel)
- Tool result file format conventions established in previous features
