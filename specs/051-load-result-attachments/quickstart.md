# Quickstart: Load Existing Result Files

**Feature**: 051-load-result-attachments
**Date**: 2026-02-05

## Overview

This feature enables the VS Code extension to load existing result files from a plot's STAC item assets when the plot is opened, ensuring analysis results persist across sessions.

## Prerequisites

- VS Code extension development environment set up
- Familiarity with STAC item structure
- Understanding of the activity panel and layers toolbar

## Key Changes

### 1. stacService Enhancement

Add method to extract result files from STAC item:

```typescript
// apps/vscode/src/services/stacService.ts

/**
 * Extract result files from a loaded STAC item's assets
 * @param item - The STAC item object
 * @param itemDir - Directory containing the item.json
 * @returns Array of AssociatedFile objects for result assets
 */
public getResultFilesFromItem(
  item: StacItem,
  itemDir: string
): AssociatedFile[] {
  const results: AssociatedFile[] = [];

  if (!item.assets) return results;

  for (const [key, asset] of Object.entries(item.assets)) {
    // Check for result role
    const isResult = asset.roles?.includes('result');

    // Fallback: check filename patterns
    const hasResultPattern = !isResult && (
      key.endsWith('-result') ||
      asset.href?.includes('range-bearing') ||
      asset['debrief:toolId']
    );

    if (isResult || hasResultPattern) {
      results.push(this.assetToAssociatedFile(asset, key));
    }
  }

  return results;
}
```

### 2. Activity Panel Integration

Call extraction when plot data is set:

```typescript
// apps/vscode/src/views/activityPanelView.ts

public setPlotData(
  store: StacStore,
  plot: StacItem,
  itemPath: string
): void {
  // ... existing code ...

  // Load existing result files from STAC item
  const existingResults = this._stacService.getResultFilesFromItem(
    plot,
    path.dirname(itemPath)
  );

  // Merge with any runtime-added results
  this._resultFiles = [
    ...existingResults,
    ...this._resultFiles.filter(rf =>
      !existingResults.some(er => er.path === rf.path)
    )
  ];

  this._sendLayersUpdate();
}
```

## Testing the Implementation

### Manual Testing

1. Open a plot that has existing result files in its `assets/` folder
2. Check the Attachments dropdown in the activity panel
3. Verify all result files appear with correct names
4. Verify tool identification (if metadata present)

### Unit Test Example

```typescript
describe('stacService.getResultFilesFromItem', () => {
  it('extracts result files by role', () => {
    const mockItem = {
      assets: {
        'range-bearing-result': {
          href: './assets/range-bearing.json',
          type: 'application/json',
          roles: ['result'],
          'debrief:toolId': 'range-bearing'
        }
      }
    };

    const results = stacService.getResultFilesFromItem(mockItem, '/path/to/item');

    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('result');
    expect(results[0].name).toContain('range-bearing');
  });
});
```

## Directory Structure

Files affected by this feature:

```
apps/vscode/src/
├── services/
│   └── stacService.ts         # Add getResultFilesFromItem()
├── views/
│   └── activityPanelView.ts   # Call extraction on plot load
└── test/
    └── stacService.test.ts    # Unit tests for extraction
```

## Common Issues

### Result files not appearing

1. Check that files are in the `assets/` subdirectory
2. Verify `item.json` has asset entries with `roles: ["result"]`
3. Check console for extraction warnings

### Duplicate files in list

1. Ensure deduplication logic in `setPlotData` is working
2. Check that runtime-added files have same path format as persisted

### Performance with many files

- Current implementation iterates all assets once (O(n))
- For 50+ files, consider async loading with progress indicator
