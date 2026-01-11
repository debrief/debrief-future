# Data Model: Loader Mini-App

**Feature**: 004-loader-mini-app
**Date**: 2026-01-11
**Source**: Extracted from spec.md Key Entities

## Overview

The Loader Mini-App is primarily an orchestration layer that coordinates existing services. It does not introduce new persistent data models but defines TypeScript interfaces for UI state and IPC communication.

## UI State Entities

### LoaderState

Root state for the wizard workflow.

```typescript
interface LoaderState {
  /** Current step in the wizard */
  step: 'store-selection' | 'plot-configuration' | 'processing' | 'complete' | 'error';

  /** File being loaded */
  sourceFile: SourceFile;

  /** Available STAC stores from debrief-config */
  availableStores: StacStoreInfo[];

  /** User's selected store (null until selected) */
  selectedStore: StacStoreInfo | null;

  /** Active tab on plot configuration step */
  plotTab: 'add-existing' | 'create-new';

  /** Selected existing plot (if plotTab = 'add-existing') */
  selectedPlot: PlotInfo | null;

  /** New plot form data (if plotTab = 'create-new') */
  newPlotForm: NewPlotForm;

  /** Processing progress (0-100) */
  progress: number;

  /** Processing status message */
  statusMessage: string;

  /** Error details (if step = 'error') */
  error: LoaderError | null;

  /** Result details (if step = 'complete') */
  result: LoadResult | null;
}
```

### SourceFile

Represents the file being loaded.

```typescript
interface SourceFile {
  /** Absolute path to the file */
  path: string;

  /** File name (basename) */
  name: string;

  /** File size in bytes */
  size: number;

  /** Detected format type */
  format: 'rep' | 'unknown';

  /** SHA-256 hash for deduplication detection */
  hash?: string;
}
```

### StacStoreInfo

Information about a configured STAC store (from debrief-config).

```typescript
interface StacStoreInfo {
  /** Unique identifier for the store */
  id: string;

  /** Human-readable name */
  name: string;

  /** Absolute path to the catalog */
  path: string;

  /** Number of existing plots in the store */
  plotCount: number;

  /** Whether the store is accessible */
  accessible: boolean;

  /** Error message if not accessible */
  accessError?: string;
}
```

### PlotInfo

Information about an existing plot (from debrief-stac).

```typescript
interface PlotInfo {
  /** STAC Item ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Plot description */
  description?: string;

  /** Creation timestamp (ISO 8601) */
  created: string;

  /** Last modified timestamp (ISO 8601) */
  modified: string;

  /** Number of features in the plot */
  featureCount: number;
}
```

### NewPlotForm

Form state for creating a new plot.

```typescript
interface NewPlotForm {
  /** Plot name (required) */
  name: string;

  /** Plot description (optional) */
  description: string;

  /** Validation errors */
  errors: {
    name?: string;
  };
}
```

### LoadResult

Result of a successful load operation.

```typescript
interface LoadResult {
  /** Target plot ID */
  plotId: string;

  /** Target plot name */
  plotName: string;

  /** Target store name */
  storeName: string;

  /** Number of features loaded */
  featuresLoaded: number;

  /** Path to the copied source file in assets */
  assetPath: string;

  /** Provenance record ID */
  provenanceId: string;
}
```

### LoaderError

Error information for display.

```typescript
interface LoaderError {
  /** Error code for categorization */
  code: 'PARSE_ERROR' | 'STORE_ERROR' | 'WRITE_ERROR' | 'SERVICE_ERROR' | 'UNKNOWN';

  /** User-friendly error message */
  message: string;

  /** Detailed technical message (for debugging) */
  details?: string;

  /** Suggested resolution steps */
  resolution?: string;

  /** Whether the operation can be retried */
  retryable: boolean;
}
```

## Service Response Types

These types represent responses from Python services via IPC.

### ParseResult (from debrief-io)

```typescript
interface ParseResult {
  success: boolean;
  features?: GeoJSONFeature[];
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
  metadata: {
    parser: string;
    version: string;
    timestamp: string;
  };
}
```

### WriteResult (from debrief-stac)

```typescript
interface WriteResult {
  success: boolean;
  plotId?: string;
  assetPath?: string;
  provenanceId?: string;
  error?: {
    message: string;
    code: string;
  };
}
```

## State Transitions

```
┌─────────────────┐
│ store-selection │ ← Initial state (stores loaded from config)
└────────┬────────┘
         │ User selects store, clicks "Next"
         ▼
┌─────────────────────┐
│ plot-configuration  │ ← Plots loaded from selected store
└────────┬────────────┘
         │ User configures plot, clicks "Load"
         ▼
┌─────────────────┐
│   processing    │ ← Parse → Write → Copy sequence
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌───────┐
│complete│ │ error │
└────────┘ └───────┘
```

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| NewPlotForm | name | Required, 1-100 characters, unique within store |
| SourceFile | format | Must be 'rep' for processing |
| StacStoreInfo | accessible | Must be true to proceed |

## Notes

- All timestamps use ISO 8601 format
- All paths are absolute filesystem paths
- GeoJSONFeature type comes from debrief-schemas package
- Service types align with debrief-io and debrief-stac contracts
