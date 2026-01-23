# Data Model: REP File Loading

**Feature**: 021-load-rep-files-stac
**Date**: 2026-01-23

## Message Types

### Webview ↔ Extension Host Messages

#### RepFileDrop (Webview → Host)

Sent when user drops a file onto the map panel.

```typescript
interface RepFileDropMessage {
  type: 'repFileDrop';
  uris: string[];  // file:// URIs from dataTransfer
}
```

#### ImportProgress (Host → Webview)

Updates webview with import progress.

```typescript
interface ImportProgressMessage {
  type: 'importProgress';
  stage: 'parsing' | 'storing' | 'complete' | 'error';
  message?: string;
}
```

#### ImportComplete (Host → Webview)

Notifies webview that import succeeded; includes bounds for auto-zoom.

```typescript
interface ImportCompleteMessage {
  type: 'importComplete';
  featureCount: number;
  bounds: [number, number, number, number];  // [minLon, minLat, maxLon, maxLat]
}
```

## Service Interfaces

### ImportService

Orchestrates the REP import workflow.

```typescript
interface ImportService {
  /**
   * Import REP file into target STAC item.
   * @param repFilePath Absolute path to .rep file
   * @param catalogPath Path to STAC catalog
   * @param plotId Target plot/item ID
   * @returns Import result with feature count
   * @throws DuplicateImportError if file already imported
   * @throws ParseError if REP file invalid
   * @throws StacError if storage fails
   */
  importRep(
    repFilePath: string,
    catalogPath: string,
    plotId: string
  ): Promise<ImportResult>;

  /**
   * Check if REP file was already imported to plot.
   * @returns true if duplicate detected
   */
  checkDuplicate(
    repFilePath: string,
    catalogPath: string,
    plotId: string
  ): Promise<boolean>;
}

interface ImportResult {
  featureCount: number;
  bounds: [number, number, number, number] | null;
  assetKey: string;
}
```

### IoService

Communicates with debrief-io for REP parsing.

```typescript
interface IoService {
  /**
   * Parse REP file and return GeoJSON features.
   * @param filePath Absolute path to .rep file
   * @returns Parsed features and metadata
   * @throws ParseError with line number and details
   */
  parseRep(filePath: string): Promise<ParseResult>;
}

interface ParseResult {
  features: GeoJSONFeature[];
  warnings: ParseWarning[];
  sourceFile: string;
  encoding: string;
  parseTimeMs: number;
}

interface ParseWarning {
  message: string;
  lineNumber?: number;
  field?: string;
  code: string;
}

interface ParseError extends Error {
  lineNumber?: number;
  field?: string;
  code: string;
}
```

### StacService Extensions

Additional methods for import workflow.

```typescript
interface StacServiceExtensions {
  /**
   * Add source file as asset on plot.
   * @returns Asset key used
   */
  addAsset(
    catalogPath: string,
    plotId: string,
    sourcePath: string,
    assetKey?: string
  ): Promise<string>;

  /**
   * Append features to plot's GeoJSON.
   * @returns Updated feature count
   */
  addFeatures(
    catalogPath: string,
    plotId: string,
    features: GeoJSONFeature[]
  ): Promise<number>;

  /**
   * Check if asset key exists on plot.
   */
  hasAsset(
    catalogPath: string,
    plotId: string,
    assetKey: string
  ): Promise<boolean>;
}
```

## Error Types

```typescript
class DuplicateImportError extends Error {
  constructor(
    public filename: string,
    public plotId: string,
    public existingAssetKey: string
  ) {
    super(`File "${filename}" already imported to plot "${plotId}"`);
  }
}

class RepParseError extends Error {
  constructor(
    public filePath: string,
    public lineNumber?: number,
    public field?: string,
    public code?: string
  ) {
    super(`Failed to parse REP file: ${filePath}`);
  }
}

class StacStorageError extends Error {
  constructor(
    public operation: 'addAsset' | 'addFeatures',
    public catalogPath: string,
    public plotId: string,
    public cause?: Error
  ) {
    super(`STAC ${operation} failed for plot "${plotId}"`);
  }
}
```

## State Transitions

### Import Flow State Machine

```
IDLE
  │
  ├─ [drop event / command] ──────────────────────────────────┐
  │                                                            │
  ▼                                                            │
CHECKING_DUPLICATE                                             │
  │                                                            │
  ├─ [duplicate found] ──► WARN_DUPLICATE ──► IDLE            │
  │                             │                              │
  │                             └─ [user confirms] ──┐         │
  │                                                  │         │
  ├─ [no duplicate] ─────────────────────────────────┤         │
  │                                                  │         │
  ▼                                                  ▼         │
PARSING                                                        │
  │                                                            │
  ├─ [parse error] ──► ERROR ──► IDLE                         │
  │                                                            │
  ▼                                                            │
STORING_ASSET                                                  │
  │                                                            │
  ├─ [storage error] ──► ERROR ──► IDLE                       │
  │                                                            │
  ▼                                                            │
STORING_FEATURES                                               │
  │                                                            │
  ├─ [storage error] ──► ERROR ──► IDLE                       │
  │                                                            │
  ▼                                                            │
REFRESHING_VIEW                                                │
  │                                                            │
  ▼                                                            │
COMPLETE ──► IDLE ◄────────────────────────────────────────────┘
```

## GeoJSON Feature Structure

Features returned from debrief-io parse_rep:

```typescript
interface TrackFeature {
  type: 'Feature';
  id: string;  // UUID
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];  // [lon, lat] pairs
  };
  properties: {
    kind: 'TRACK';
    platform_id: string;
    platform_name: string;
    track_type: string;
    start_time: string;  // ISO 8601
    end_time: string;    // ISO 8601
    positions: Position[];
    source_file: string;
  };
}

interface Position {
  time: string;     // ISO 8601
  lat: number;
  lon: number;
  course: number;
  speed: number;
  depth: number;
}
```

## Bounds Calculation

```typescript
function calculateBounds(features: GeoJSONFeature[]): [number, number, number, number] | null {
  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;

  for (const feature of features) {
    const coords = extractCoordinates(feature.geometry);
    for (const [lon, lat] of coords) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }
  }

  if (minLon === Infinity) return null;
  return [minLon, minLat, maxLon, maxLat];
}
```
