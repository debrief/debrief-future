# Research: stacService Unit Tests

**Feature**: 028-stacservice-unit-tests
**Date**: 2026-01-26

## Research Questions

### 1. How should we mock fs operations in Vitest?

**Decision**: Use `vi.mock('fs')` with factory function

**Rationale**:
- Vitest's built-in mocking is consistent with existing test patterns in the codebase
- Factory function approach allows fine-grained control over each test
- Already demonstrated in `stacService.shapes.test.ts`

**Alternatives Considered**:
- `memfs` (in-memory filesystem): Rejected - adds dependency, overkill for unit tests
- Manual stub objects: Rejected - harder to maintain, less type-safe
- Real filesystem with temp directories: Rejected - violates isolation principle

**Implementation Pattern**:
```typescript
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
}));
```

### 2. How should we structure tests for a class with caching?

**Decision**: Clear cache in `beforeEach`, test cache behavior explicitly

**Rationale**:
- Ensures test isolation (no state leakage between tests)
- Cache behavior is a feature worth testing explicitly
- Matches patterns in similar service tests

**Implementation Pattern**:
```typescript
describe('StacService', () => {
  let service: StacService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StacService(); // Fresh instance with empty caches
  });

  describe('caching behavior', () => {
    it('should return cached catalog on second call', () => {
      // First call reads from disk
      // Second call returns cached value without fs.readFileSync call
    });
  });
});
```

### 3. How should we handle the async/sync method mix?

**Decision**: Use async test functions uniformly with `await` where needed

**Rationale**:
- `stacService.ts` has a mix of sync methods (`validateStorePath` returns Promise but is sync internally) and async methods (`listCatalogs`, `listItems`)
- Vitest handles async tests natively
- Consistent pattern is easier to maintain

**Implementation Pattern**:
```typescript
it('should validate store path', async () => {
  const result = await service.validateStorePath('/mock/path');
  expect(result.valid).toBe(true);
});
```

### 4. What coverage tool configuration is needed?

**Decision**: Use `@vitest/coverage-v8` with explicit file include

**Rationale**:
- Already configured in the project (from package.json)
- v8 provider is faster than istanbul for Node.js
- Can target specific file for coverage threshold

**Configuration Check**:
```json
// vitest.config.ts (existing)
{
  "coverage": {
    "provider": "v8",
    "reporter": ["text", "json", "html"]
  }
}
```

**Verification Command**:
```bash
pnpm test --coverage --coverage.include=src/services/stacService.ts
```

### 5. Should we create fixture files or inline mock data?

**Decision**: Inline mock data with helper functions

**Rationale**:
- Spec suggests fixtures, but inline is more maintainable for unit tests
- Helper functions make mock data creation readable and reusable
- Fixtures add file I/O which complicates CI and adds maintenance burden
- Inline data is co-located with tests, easier to understand intent

**Alternatives Considered**:
- JSON fixture files: Rejected - harder to modify, separate from test context
- Snapshot testing: Rejected - not appropriate for mock input data

**Implementation Pattern**:
```typescript
function createMockCatalog(overrides: Partial<StacCatalog> = {}): StacCatalog {
  return {
    type: 'Catalog',
    stac_version: '1.0.0',
    id: 'test-catalog',
    description: 'Test catalog',
    links: [],
    ...overrides,
  };
}

function createMockItem(overrides: Partial<StacItem> = {}): StacItem {
  return {
    type: 'Feature',
    stac_version: '1.0.0',
    id: 'test-item',
    geometry: null,
    bbox: [-180, -90, 180, 90],
    properties: { datetime: '2024-01-01T00:00:00Z' },
    links: [],
    assets: {},
    ...overrides,
  };
}
```

### 6. How should we test error paths?

**Decision**: Mock errors explicitly, verify error messages

**Rationale**:
- Error handling varies across methods (null, throw, empty array)
- Tests should document current behavior, not fix inconsistencies
- Explicit error mocking makes test intent clear

**Implementation Pattern**:
```typescript
it('should return null when item file is missing', () => {
  vi.mocked(fs.existsSync).mockReturnValue(false);

  const result = service.loadPlot(store, 'missing-item');

  expect(result).toBeNull();
});

it('should handle JSON parse errors gracefully', () => {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue('invalid json{');

  const result = await service.validateStorePath('/path');

  expect(result.valid).toBe(false);
  expect(result.error).toContain('Failed to read catalog');
});
```

## Dependencies Verified

| Dependency | Status | Version |
|------------|--------|---------|
| vitest | Installed | ^1.0.0 |
| @vitest/coverage-v8 | Installed | ^1.0.0 |

## References

- Existing test: `apps/vscode/tests/unit/stacService.shapes.test.ts`
- Vitest mocking docs: https://vitest.dev/guide/mocking.html
- GitHub Issue: #98
