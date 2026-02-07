# Research: Load Existing Result Files into Attachments Dropdown

**Feature**: 051-load-result-attachments
**Date**: 2026-02-05
**Status**: Complete

## Decisions Made

### 1. Result File Identification Strategy

**Decision**: Use STAC asset metadata as primary identification, with filename pattern fallback.

**Rationale**:
- STAC assets already contain `roles: ["result"]` and `debrief:toolId` metadata when saved by tools
- This is the most reliable identification method as it's set by the tool at save time
- Filename patterns (e.g., `*-result.json`, tool-specific prefixes) provide fallback for manually-placed files or older formats

**Alternatives Considered**:
- File content inspection: Rejected - requires reading every file, performance overhead
- Filename-only approach: Rejected - less reliable, doesn't capture tool provenance

### 2. Loading Trigger Point

**Decision**: Load result files when plot data is sent to the activity panel.

**Rationale**:
- The `_sendLayersUpdate()` method already sends layer data to the webview
- Adding result file extraction here ensures consistency between layers and attachments
- Single point of truth for what data the activity panel displays

**Alternatives Considered**:
- Load in `onDidChangeViewState`: Rejected - creates race condition with layer updates
- Load separately on plot open: Rejected - complicates coordination with layer data

### 3. Data Flow Architecture

**Decision**: Add extraction method to `stacService`, call from `activityPanelView`.

**Rationale**:
- `stacService` already manages STAC item loading and asset operations
- Keeps STAC-specific logic contained in the appropriate service
- `activityPanelView` orchestrates UI updates and is the right place to call extraction

**Alternatives Considered**:
- Add logic directly to activityPanelView: Rejected - mixes concerns, harder to test
- Create new ResultFileService: Rejected - over-engineering for small feature

### 4. AssociatedFile Transformation

**Decision**: Transform STAC assets to existing `AssociatedFile` interface.

**Rationale**:
- Interface already exists and is used by `AssociatedFilesDropdown` component
- Maintains backward compatibility with current result file display
- Consistent data structure whether files are newly generated or loaded

**Alternatives Considered**:
- Create new ResultFile type: Rejected - duplicates existing type, breaks component compatibility

### 5. Multi-Suffix Convention Parsing

**Decision**: Parse viewer type from filename suffixes (e.g., `.2d.json`, `.table.json`).

**Rationale**:
- Convention already established in layers toolbar spec
- Enables automatic viewer selection based on file naming
- No change to existing file storage patterns required

**Alternatives Considered**:
- Store viewerType in asset metadata: Future enhancement, not needed for initial implementation
- Ignore viewer types: Rejected - loses useful functionality

### 6. Error Handling Strategy

**Decision**: Skip unreadable files, log warning, continue displaying valid results.

**Rationale**:
- Users should see all available results even if some files are corrupted
- Silent failures violate constitution, so warnings are logged
- Aligns with spec requirement FR-007

**Alternatives Considered**:
- Fail entire load if any file problematic: Rejected - too restrictive
- Show error in UI for each bad file: Rejected - clutters interface

## Technical Context Resolved

| Item | Resolution |
|------|------------|
| Language/Version | TypeScript 5.x (VS Code extension) |
| Primary Dependencies | VS Code extension API, existing stacService |
| Storage | Local filesystem STAC catalogs (read-only for this feature) |
| Testing | Jest (existing test setup) |
| Target Platform | VS Code extension |
| Performance Goals | < 500ms added load time for 50 files per spec |
| Constraints | Must work offline (file-based, no network) |

## Integration Points Identified

1. **stacService.ts** - Add `getResultAssetsFromItem()` method
2. **activityPanelView.ts** - Call extraction on `setPlotData()` or equivalent
3. **AssociatedFilesDropdown.tsx** - No changes needed, already handles result files
4. **executeTool.ts** - No changes needed, already saves with correct metadata

## Test Strategy

1. **Unit tests**: Mock STAC item with various asset configurations
2. **Integration tests**: Load plot with result files, verify they appear in UI
3. **Edge cases**: Empty assets, missing metadata, corrupted files, 100+ files
