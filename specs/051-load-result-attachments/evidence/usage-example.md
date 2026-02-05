# Usage Example: Load Existing Result Files

**Feature**: 051-load-result-attachments
**Date**: 2026-02-05

## Overview

This feature enables the VS Code extension to automatically load existing result files from a plot's STAC item assets when the plot is opened.

## API Usage

### 1. Extract Result Files from STAC Item

```typescript
import { StacService } from '../services/stacService';

const stacService = new StacService();

// Given a loaded STAC item
const item = await stacService.loadItem('/path/to/item.json');

// Extract result files
const resultFiles = stacService.getResultFilesFromItem(item);

// Result:
// [
//   {
//     name: 'Range Bearing Analysis',
//     path: 'assets/range-bearing-t1-t2.json',
//     category: 'result',
//     viewerType: undefined,
//     format: 'json'
//   },
//   {
//     name: 'Results Table',
//     path: 'assets/analysis.table.json',
//     category: 'result',
//     viewerType: 'table',
//     format: 'json'
//   }
// ]
```

### 2. Load Result Files with Store Context

```typescript
// More convenient method that handles item loading
const resultFiles = await stacService.loadResultFiles(store, itemPath);

// Returns AssociatedFile[] ready for the UI
```

### 3. Integration in openPlot Command

```typescript
// In commands/openPlot.ts

// Update activity panel webview with features
activityPanelProvider.setFeatures(plotData.tracks, plotData.locations);

// Load existing result files from STAC item (Feature: 051)
const resultFiles = await stacService.loadResultFiles(store, itemPath);
activityPanelProvider.setResultFiles(resultFiles);
```

### 4. Activity Panel Integration

```typescript
// In views/activityPanelView.ts

// Set result files loaded from a STAC item
public setResultFiles(resultFiles: AssociatedFile[]): void {
  // Merge with any existing runtime-added results (deduplication)
  const existingPaths = new Set(resultFiles.map((rf) => rf.path));
  const runtimeResults = this._resultFiles.filter(
    (rf) => !existingPaths.has(rf.path)
  );

  // Loaded files first, then any runtime-added results
  this._resultFiles = [...resultFiles, ...runtimeResults];
  this._resultsChanged = resultFiles.length > 0;
  this._sendLayersUpdate();
}
```

## STAC Item Example

```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "id": "exercise-alpha",
  "properties": {
    "datetime": "2024-01-15T09:00:00Z",
    "title": "Exercise Alpha"
  },
  "assets": {
    "data": {
      "href": "./data.geojson",
      "type": "application/geo+json",
      "roles": ["data"]
    },
    "range-bearing-t1-t2": {
      "href": "./assets/range-bearing-t1-t2.json",
      "type": "application/json",
      "title": "Range Bearing: HMS Defender to USS Freedom",
      "roles": ["result"],
      "debrief:toolId": "range-bearing",
      "debrief:sourceFeatures": ["track-hms-defender", "track-uss-freedom"]
    },
    "analysis-summary": {
      "href": "./assets/analysis.table.json",
      "type": "application/json",
      "title": "Analysis Summary Table",
      "roles": ["result"],
      "debrief:toolId": "summary"
    }
  }
}
```

## Result File Identification

Files are identified as results through:

1. **Primary**: `roles: ["result"]` in asset metadata
2. **Fallback**: `debrief:toolId` property present
3. **Fallback**: Filename patterns (`range-bearing`, `-result.`, `-analysis.`)

## Multi-Suffix Viewer Type

Files can specify a viewer type through naming convention:

| Filename | Viewer Type | Format |
|----------|-------------|--------|
| `data.json` | undefined | json |
| `results.2d.json` | 2d | json |
| `analysis.table.csv` | table | csv |
| `chart.chart.json` | chart | json |

Supported viewer types: `2d`, `3d`, `table`, `chart`, `map`, `text`
