# Spec: Add Comprehensive Unit Tests for stacService

**ID**: 028
**Category**: Tech Debt
**Status**: specified
**Complexity**: Low
**GitHub Issue**: [#98](https://github.com/debrief/debrief-future/issues/98)

## Problem Statement

The `stacService.ts` file lacks sufficient test coverage. A bug surfaced where `loadPlotData()` returned an incomplete object structure when no GeoJSON asset existed, remaining undetected due to missing unit tests and inadequate edge case validation.

The existing test file (`stacService.shapes.test.ts`) tests feature categorization logic in isolation by duplicating the service's logic rather than invoking actual service methods. This approach:

1. Doesn't catch bugs in the actual service implementation
2. Can diverge from the real code over time
3. Misses edge cases in file I/O and caching behavior

## Solution Overview

Create comprehensive unit tests that invoke actual `StacService` methods with properly mocked file system operations. Tests will cover all public methods, edge cases, and achieve >80% code coverage.

## Target File

`apps/vscode/src/services/stacService.ts`

## Test File Structure

Create new test file: `apps/vscode/tests/unit/stacService.test.ts`

The existing `stacService.shapes.test.ts` will remain as-is (tests feature categorization logic).

## Public Methods Requiring Tests

### Core Read Methods

| Method | Description | Priority |
|--------|-------------|----------|
| `validateStorePath()` | Validates STAC catalog path | High |
| `listCatalogs()` | Lists catalogs in a store | High |
| `listItems()` | Lists items in a catalog | High |
| `loadPlot()` | Loads plot metadata from STAC item | High |
| `loadPlotData()` | Loads tracks, locations, and features | Critical |

### Write Methods

| Method | Description | Priority |
|--------|-------------|----------|
| `addAsset()` | Adds source file as asset | Medium |
| `addFeatures()` | Appends features to GeoJSON | Medium |
| `hasAsset()` | Checks if asset exists | Medium |
| `saveTrackColors()` | Saves track colors to item | Medium |

### Utility Methods

| Method | Description | Priority |
|--------|-------------|----------|
| `clearCache()` | Clears catalog and item caches | Low |

## Test Scenarios

### 1. validateStorePath()

```typescript
describe('validateStorePath', () => {
  it('should return valid: true for valid STAC catalog');
  it('should return valid: false when catalog.json missing');
  it('should return valid: false for invalid STAC format (wrong type)');
  it('should return valid: false for malformed JSON');
  it('should return valid: false for null catalog');
  it('should handle read errors gracefully');
});
```

### 2. listCatalogs()

```typescript
describe('listCatalogs', () => {
  it('should return root catalog');
  it('should return child catalogs from links');
  it('should count items in each catalog');
  it('should return empty array when root catalog missing');
  it('should handle child catalog load failures gracefully');
  it('should use cached catalogs on repeated calls');
  it('should use title from catalog, falling back to id');
});
```

### 3. listItems()

```typescript
describe('listItems', () => {
  it('should return items from catalog links');
  it('should sort items by datetime descending');
  it('should return empty array for catalog with no items');
  it('should handle item load failures gracefully');
  it('should use cached items on repeated calls');
  it('should use title from properties, falling back to id');
});
```

### 4. loadPlot()

```typescript
describe('loadPlot', () => {
  it('should return plot with correct metadata');
  it('should count tracks (LineString features)');
  it('should count locations (Point features)');
  it('should calculate time extent from track times');
  it('should return null when item not found');
  it('should handle missing GeoJSON asset');
  it('should handle empty feature collection');
  it('should skip features with null geometry');
  it('should handle features without times array');
});
```

### 5. loadPlotData() - CRITICAL

```typescript
describe('loadPlotData', () => {
  // Happy path
  it('should return tracks, locations, and otherFeatures');
  it('should categorize LineString with times as Track');
  it('should categorize Point with kind=LOCATION as Location');
  it('should categorize other geometries as otherFeatures');

  // Edge cases (bug prevention)
  it('should return { tracks: [], locations: [], otherFeatures: [] } when no GeoJSON asset');
  it('should return { tracks: [], locations: [], otherFeatures: [] } when GeoJSON file missing');
  it('should return null when item not found');
  it('should skip features with null geometry');
  it('should handle Polygon features correctly');
  it('should handle LineString without times as otherFeature');
  it('should handle Point without kind=LOCATION as otherFeature');

  // Return type consistency
  it('should always return consistent object structure or null');
});
```

### 6. addAsset()

```typescript
describe('addAsset', () => {
  it('should copy source file to assets directory');
  it('should create assets directory if needed');
  it('should add asset reference to item JSON');
  it('should use filename stem as default asset key');
  it('should use provided asset key when specified');
  it('should throw when item not found');
  it('should clear item cache after update');
});
```

### 7. addFeatures()

```typescript
describe('addFeatures', () => {
  it('should append features to existing GeoJSON');
  it('should create new GeoJSON file when none exists');
  it('should update item bbox from features');
  it('should throw when item not found');
  it('should clear item cache after update');
  it('should return updated feature count');
  it('should handle features with Point geometry');
  it('should handle features with LineString geometry');
  it('should handle features with Polygon geometry');
  it('should skip features with null geometry in bbox calculation');
});
```

### 8. hasAsset()

```typescript
describe('hasAsset', () => {
  it('should return true when asset exists');
  it('should return false when asset does not exist');
  it('should return false when item not found');
});
```

### 9. saveTrackColors()

```typescript
describe('saveTrackColors', () => {
  it('should update item properties with track colors');
  it('should write updated item to disk');
  it('should clear item cache after update');
  it('should return true on success');
  it('should return false when item not found');
  it('should return false on write error');
});
```

### 10. clearCache()

```typescript
describe('clearCache', () => {
  it('should clear catalog cache');
  it('should clear item cache');
});
```

## Test Fixtures

Create fixture data in `apps/vscode/tests/fixtures/stac/`:

```
fixtures/stac/
├── valid-store/
│   ├── catalog.json           # Valid root catalog
│   ├── child/
│   │   └── catalog.json       # Child catalog
│   └── items/
│       ├── plot-001.json      # STAC item with GeoJSON
│       └── plot-001.geojson   # Feature collection
├── invalid-store/
│   ├── catalog.json           # Invalid format
│   └── malformed.json         # Malformed JSON
└── empty-store/
    └── catalog.json           # Valid but empty catalog
```

## Mocking Strategy

Use Vitest's mocking capabilities:

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
}));
```

### Mock Helpers

Create helper functions for common mock setups:

```typescript
function mockValidCatalog(catalogData: object) {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalogData));
}

function mockMissingFile() {
  vi.mocked(fs.existsSync).mockReturnValue(false);
}

function mockReadError(error: Error) {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockImplementation(() => { throw error; });
}
```

## Acceptance Criteria

1. **Coverage threshold**: >80% line coverage for `stacService.ts`
2. **All public methods tested**: Every public method has at least one test
3. **Edge cases exercised**: All identified edge cases have dedicated tests
4. **Actual method invocation**: Tests call real service methods (not duplicated logic)
5. **Isolation**: Tests use mocked fs operations, no real file system access
6. **Deterministic**: Tests produce consistent results across runs

## Implementation Notes

### Caching Behavior

The service caches catalogs and items. Tests should verify:
- Cached values are returned on repeat calls
- Cache is cleared after write operations
- `clearCache()` empties both caches

### Error Handling Consistency

The service has inconsistent error handling patterns:
- Some methods return `null` on error
- Some methods throw exceptions
- Some methods return empty arrays/objects

Tests should document current behavior; fixing inconsistencies is out of scope.

### Private Methods

Private methods (`loadCatalog`, `loadCatalogFromPath`, `loadItem`, `loadGeoJson`, `countItems`, `calculateBboxFromFeatures`, `extractCoordinates`) are tested indirectly through public method tests.

## Out of Scope

- Integration tests (real file system)
- Refactoring stacService.ts
- Changing error handling patterns
- Performance testing
- The existing `stacService.shapes.test.ts` file

## Dependencies

- Vitest (already configured)
- @vitest/coverage-v8 (for coverage reporting)

## Estimated Effort

- Test file creation: ~200 lines
- Fixture creation: ~50 lines JSON
- Total: Low complexity, well-defined scope

## References

- Target file: `apps/vscode/src/services/stacService.ts` (720 lines)
- Existing tests: `apps/vscode/tests/unit/stacService.shapes.test.ts` (255 lines)
- GitHub Issue: [#98](https://github.com/debrief/debrief-future/issues/98)
