# Usage Example: Testing stacService with Mocks

This example demonstrates the mocking pattern used to test `stacService.ts` without accessing the real filesystem.

## Setup: Mock the fs Module

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { StacService } from '../../src/services/stacService';

// Mock the entire fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
}));
```

## Helper: Create Mock Data

```typescript
function createMockItem(overrides = {}) {
  return {
    type: 'Feature',
    stac_version: '1.0.0',
    id: 'test-item',
    geometry: null,
    bbox: [-180, -90, 180, 90],
    properties: {
      datetime: '2024-01-01T00:00:00Z',
      title: 'Test Item',
    },
    links: [],
    assets: {},
    ...overrides,
  };
}
```

## Example Test: Verify Bug Fix

This test verifies that `loadPlotData` returns an empty structure (not undefined) when no GeoJSON asset exists:

```typescript
it('should return empty arrays when no GeoJSON asset (BUG FIX)', async () => {
  const store = { id: 'store-1', path: '/mock/store', status: 'available' };
  const item = createMockItem({ assets: {} }); // No GeoJSON asset

  // Mock: item file exists and contains our mock item
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

  const service = new StacService();
  const result = await service.loadPlotData(store, 'items/test.json');

  // Before the bug fix, this would have been undefined
  expect(result).not.toBeNull();
  expect(result!.tracks).toEqual([]);
  expect(result!.locations).toEqual([]);
  expect(result!.otherFeatures).toEqual([]);
});
```

## Example Test: Verify Cache Behavior

```typescript
it('should use cached items on repeated calls', async () => {
  const store = { id: 'store-1', path: '/store', status: 'available' };
  const item = createMockItem();

  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

  const service = new StacService();

  // First call reads from disk
  await service.loadPlot(store, 'items/test.json');
  const readCount1 = vi.mocked(fs.readFileSync).mock.calls.length;

  // Second call should use cache (no additional reads)
  await service.loadPlot(store, 'items/test.json');
  const readCount2 = vi.mocked(fs.readFileSync).mock.calls.length;

  expect(readCount2).toBe(readCount1); // Same count = cache hit
});
```

## Running the Tests

```bash
cd apps/vscode
pnpm test:unit tests/unit/stacService.test.ts

# With coverage
pnpm test:coverage
```

## Key Patterns

1. **Mock at module level**: Use `vi.mock('fs')` to replace all fs operations
2. **Fresh service per test**: Create new `StacService()` in each test for isolation
3. **Clear mocks**: Use `vi.clearAllMocks()` in `beforeEach` to reset state
4. **Implementation-based mocking**: Use `mockImplementation()` for path-specific behavior
5. **Verify cache behavior**: Compare call counts to detect cache hits
