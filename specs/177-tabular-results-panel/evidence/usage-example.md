# Usage Example: Tabular Results Panel

## Displaying Table Results

When a tool returns flat statistics (e.g., `track-stats`), the results panel renders
an HTML table. The `displayHint` on the `DatasetEnvelope` controls the rendering mode:

```typescript
// Tool result tab with table display
const tab: ChartTabData = {
  id: 'result-1',
  title: 'Track Stats — NELSON',
  displayHint: 'table',
  tableData: [
    { metric: 'Total Distance', value: 142.3 },
    { metric: 'Average Speed', value: 12.45 },
    { metric: 'Max Speed', value: 18.92 },
    { metric: 'Duration', value: '04:32:15' },
  ],
  isSaved: false,
};
```

## Displaying Chart Results

When a tool returns time-series data (e.g., `range-bearing`), the existing
Vega-Lite `ChartRenderer` is used. No `displayHint` needed (defaults to `'chart'`):

```typescript
const tab: ChartTabData = {
  id: 'result-2',
  title: 'Range-Bearing — NELSON vs COLLINGWOOD',
  // displayHint defaults to 'chart'
  isSaved: false,
};
```

## CSV Generation

```typescript
import { buildCsvContent, generateCsvFilename, sanitizeFilename } from '@debrief/utils';

// Quick save with date-stamped filename
const filename = generateCsvFilename('track-stats');
// → "track-stats--2026-04-03T13-52-00.csv"

// Save As with custom name and tag
const customFilename = generateCsvFilename('track-stats', 'NELSON analysis', 'final');
// → "NELSON-analysis--final.csv"

// Build CSV content from data
const csv = buildCsvContent([
  { metric: 'Total Distance', value: 142.3 },
  { metric: 'Average Speed', value: 12.45 },
]);
// → "metric,value\nTotal Distance,142.3\nAverage Speed,12.45\n"
```

## Save/Retry Workflow

The panel title bar shows:
- **Unsaved indicator** (amber dot) when a result hasn't been saved
- **Save** button — writes CSV with auto-generated date-stamped filename
- **Save As...** button — opens inline form for custom name + optional tag
- **Retry** button — appears only on error state, re-invokes the tool

## Message Protocol (VS Code Extension)

```typescript
// Webview → Extension: Save result
{ type: 'saveResult', tabId: 'result-1', toolName: 'track-stats' }

// Webview → Extension: Save As
{ type: 'saveResultAs', tabId: 'result-1', toolName: 'track-stats',
  baseName: 'my-report', tag: 'v2' }

// Extension → Webview: Save confirmation
{ type: 'resultSaved', tabId: 'result-1', filename: 'my-report--v2.csv', success: true }
```
