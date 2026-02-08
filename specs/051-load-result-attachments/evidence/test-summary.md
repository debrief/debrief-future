# Test Summary: Load Existing Result Files

**Feature**: 051-load-result-attachments
**Date**: 2026-02-05
**Test Framework**: Vitest

## Test Coverage

### New Tests Added

| Test Suite | Tests | Description |
|------------|-------|-------------|
| parseViewerType | 4 | Multi-suffix filename parsing |
| parseFileFormat | 2 | File extension extraction |
| isResultAsset | 5 | Result asset identification |
| assetToAssociatedFile | 4 | STAC asset transformation |
| getResultFilesFromItem | 6 | Result extraction from item |
| loadResultFiles | 5 | Async loading with store, mtime sorting |
| getResultFilesFromItem (perf) | 1 | Performance with 50+ assets |

**Total New Tests**: 28

### Test Categories

#### Unit Tests (stacService.test.ts)

1. **parseViewerType**
   - Parses known viewer types (2d, table, chart)
   - Returns undefined for single-suffix
   - Returns undefined for unknown types
   - Case-insensitive matching

2. **parseFileFormat**
   - Returns lowercase extension
   - Handles files without extension

3. **isResultAsset**
   - Detects `roles: ["result"]`
   - Detects `debrief:toolId` metadata
   - Detects filename patterns (range-bearing, -result)
   - Returns false for source files
   - Returns false for data files

4. **assetToAssociatedFile**
   - Transforms asset to AssociatedFile
   - Uses filename when title missing
   - Parses viewer type from filename
   - Strips leading ./ from path

5. **getResultFilesFromItem**
   - Extracts result files from assets
   - Handles multiple results
   - Returns empty for no assets
   - Returns empty for undefined assets
   - Filters non-result assets
   - Skips invalid assets gracefully

6. **loadResultFiles**
   - Loads from store and item path
   - Returns empty when item not found
   - Returns empty on load error
   - Populates mtime from filesystem and sorts by mtime descending
   - Handles missing files gracefully when populating mtime

7. **getResultFilesFromItem - performance**
   - Handles 50+ assets (80 total) in under 500ms

## Acceptance Criteria Coverage

| Criteria | Test(s) | Status |
|----------|---------|--------|
| FR-001: Scan assets | getResultFilesFromItem suite | PASS |
| FR-002: Identify by metadata | isResultAsset with roles | PASS |
| FR-003: Fallback patterns | isResultAsset patterns | PASS |
| FR-004: Populate dropdown | Integration in openPlot | PASS |
| FR-005: Consistent format | assetToAssociatedFile | PASS |
| FR-006: Handle missing | getResultFilesFromItem empty | PASS |
| FR-007: Skip corrupted | getResultFilesFromItem graceful | PASS |
| FR-008: Chronological order | loadResultFiles mtime sort | PASS |
| SC-004: < 500ms for 50 files | Performance test (80 assets) | PASS |

## Edge Cases Tested

- Empty assets object
- Undefined assets property
- Missing href on asset
- Assets without result role
- Mixed result and non-result assets
- Load errors (file not found, permission denied)
- Chronological ordering by modification time
- Files with missing mtime sorted to end
- Performance with 80 assets (60 results + 20 sources)

## Run Instructions

```bash
# Run all stacService tests
pnpm --filter debrief-vscode test:unit -- stacService.test.ts

# Run specific test suite
pnpm --filter debrief-vscode test:unit -- -t "parseViewerType"
```
