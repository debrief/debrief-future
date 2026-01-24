# Data Model: Load REP Files into STAC Catalog

**Feature**: 021-load-rep-files-stac
**Date**: 2026-01-24

## Overview

This document defines the data structures used in the REP file import workflow. The flow moves data from the webview (drop event) through the extension host to Python services, then back to update the UI.

## Entity Definitions

### 1. RepFileDropEvent

Represents a file drop event from the webview.

```typescript
interface RepFileDropEvent {
  /** Absolute path to the dropped file */
  filePath: string;

  /** Original filename (for duplicate detection) */
  fileName: string;

  /** File size in bytes (for progress estimation) */
  fileSize: number;

  /** Current STAC context from the map panel */
  stacContext: {
    /** Path to the STAC catalog */
    catalogPath: string;

    /** ID of the currently displayed plot/item */
    plotId: string;
  };
}
```

### 2. RepImportRequest

Request sent to Python services for REP import.

```typescript
interface RepImportRequest {
  /** Absolute path to the REP file */
  repFilePath: string;

  /** Path to the target STAC catalog */
  catalogPath: string;

  /** ID of the target plot/STAC item */
  plotId: string;

  /** Original filename for asset storage */
  originalFileName: string;
}
```

### 3. RepImportResult

Result returned from Python services after import.

```typescript
interface RepImportResult {
  /** Whether the import succeeded */
  success: boolean;

  /** Number of features added (tracks + shapes) */
  featureCount: number;

  /** Bounding box of imported data [minLon, minLat, maxLon, maxLat] */
  bounds: [number, number, number, number] | null;

  /** Asset key for the stored REP file */
  assetKey: string;

  /** Summary of imported content */
  summary: {
    tracks: number;
    shapes: number;
    annotations: number;
  };

  /** Any warnings from parsing (non-fatal) */
  warnings: ParseWarning[];

  /** Error details if success is false */
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

interface ParseWarning {
  message: string;
  lineNumber?: number;
  code: string;
}
```

### 4. ImportProgressState

State for tracking import progress in the UI.

```typescript
interface ImportProgressState {
  /** Current import phase */
  phase: 'validating' | 'parsing' | 'checking-duplicates' | 'storing-asset' | 'adding-features' | 'complete' | 'error';

  /** Filename being imported */
  fileName: string;

  /** Progress percentage (0-100) */
  progress: number;

  /** Human-readable status message */
  message: string;
}
```

### 5. CatalogPickerItem

Item displayed in the catalog/plot picker UI.

```typescript
interface CatalogPickerItem {
  /** Display label */
  label: string;

  /** Secondary description */
  description?: string;

  /** Unique identifier */
  id: string;

  /** Item type for hierarchical navigation */
  kind: 'catalog' | 'plot';

  /** For catalogs: absolute path; for plots: plot ID */
  value: string;

  /** Parent catalog path (for plots) */
  catalogPath?: string;
}
```

## State Transitions

### Import Workflow States

```
┌─────────────┐
│   IDLE      │ ← Initial state
└──────┬──────┘
       │ drop event
       ▼
┌─────────────┐
│ VALIDATING  │ Check: is .rep file, file exists, context valid
└──────┬──────┘
       │
       ├─ invalid ─────────────────────────────┐
       │                                        ▼
       │                               ┌─────────────┐
       ▼                               │   ERROR     │
┌─────────────┐                        └─────────────┘
│  PARSING    │ Call debrief-io parse_rep      ▲
└──────┬──────┘                                │
       │                                       │
       ├─ parse error ─────────────────────────┤
       │                                       │
       ▼                                       │
┌─────────────┐                                │
│ CHECK DUP   │ Query existing assets          │
└──────┬──────┘                                │
       │                                       │
       ├─ duplicate found ─────────────────────┤
       │                                       │
       ▼                                       │
┌─────────────┐                                │
│STORE ASSET  │ Call debrief-stac add_asset    │
└──────┬──────┘                                │
       │                                       │
       ├─ storage error ───────────────────────┤
       │                                       │
       ▼                                       │
┌─────────────┐                                │
│ADD FEATURES │ Call debrief-stac add_features │
└──────┬──────┘                                │
       │                                       │
       ├─ feature error ───────────────────────┘
       │
       ▼
┌─────────────┐
│  COMPLETE   │ Refresh map, zoom to bounds
└─────────────┘
```

## Validation Rules

### File Validation

| Rule | Condition | Error Code |
|------|-----------|------------|
| Extension check | File must end with `.rep` (case-insensitive) | `INVALID_EXTENSION` |
| File exists | File must exist at path | `FILE_NOT_FOUND` |
| File readable | Must have read permissions | `FILE_NOT_READABLE` |
| Max size | < 50MB (configurable) | `FILE_TOO_LARGE` |

### Context Validation

| Rule | Condition | Error Code |
|------|-----------|------------|
| Catalog exists | catalogPath must be valid STAC catalog | `CATALOG_NOT_FOUND` |
| Plot exists | plotId must exist in catalog | `PLOT_NOT_FOUND` |
| Write permissions | Catalog directory must be writable | `CATALOG_NOT_WRITABLE` |

### Duplicate Detection

| Rule | Condition | Error Code |
|------|-----------|------------|
| Unique filename | No existing asset with same title | `DUPLICATE_FILE` |

## STAC Asset Schema

When storing the REP file as a STAC asset:

```json
{
  "href": "./assets/{filename}",
  "type": "application/x-debrief-rep",
  "title": "{original_filename}",
  "roles": ["source"],
  "debrief:provenance": {
    "source_path": "{absolute_original_path}",
    "imported_at": "{ISO8601_timestamp}",
    "imported_by": "vscode-extension"
  }
}
```

## GeoJSON Feature Schema

Features parsed from REP files follow the Debrief GeoJSON schema:

### Track Feature

```json
{
  "type": "Feature",
  "id": "{uuid}",
  "geometry": {
    "type": "LineString",
    "coordinates": [[lon, lat], [lon, lat], ...]
  },
  "properties": {
    "kind": "TRACK",
    "platform_id": "{track_symbol}",
    "platform_name": "{track_name}",
    "track_type": "CONTACT",
    "start_time": "{ISO8601}",
    "end_time": "{ISO8601}",
    "source_file": "{filename}",
    "positions": [
      {"time": "{ISO8601}", "lat": 0.0, "lon": 0.0, "course": 0.0, "speed": 0.0, "depth": 0.0},
      ...
    ]
  }
}
```

### Shape Feature (Circle Example)

```json
{
  "type": "Feature",
  "id": "{uuid}",
  "geometry": {
    "type": "Point",
    "coordinates": [lon, lat]
  },
  "properties": {
    "kind": "CIRCLE",
    "radius_meters": 1000,
    "label": "Search Area",
    "time": "{ISO8601}",
    "source_file": "{filename}"
  }
}
```
