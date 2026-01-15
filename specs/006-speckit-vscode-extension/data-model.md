# Data Model: Debrief VS Code Extension

**Feature**: 006-speckit-vscode-extension
**Date**: 2026-01-15
**Source**: [spec.md](./spec.md) Key Entities section

---

## Entity Definitions

### 1. StacStore

A registered local directory containing a STAC catalog.

```typescript
interface StacStore {
  /** Unique identifier (generated UUID) */
  id: string;

  /** Local filesystem path to the STAC catalog root */
  path: string;

  /** User-friendly display name (optional, defaults to directory name) */
  displayName?: string;

  /** Whether this store is currently accessible */
  status: 'available' | 'unavailable' | 'checking';

  /** Error message if status is 'unavailable' */
  errorMessage?: string;
}
```

**Relationships**:
- Contains multiple `Catalog` entries

**Validation Rules**:
- `path` must be an absolute path
- `path` must exist and be a directory
- `path` must contain a valid STAC catalog.json

---

### 2. Catalog

A STAC Catalog containing plot items.

```typescript
interface Catalog {
  /** STAC catalog ID */
  id: string;

  /** Catalog title from STAC metadata */
  title: string;

  /** Catalog description from STAC metadata */
  description?: string;

  /** Path to catalog.json relative to store root */
  catalogPath: string;

  /** Parent store ID */
  storeId: string;

  /** Number of items (plots) in this catalog */
  itemCount: number;
}
```

**Relationships**:
- Belongs to one `StacStore`
- Contains multiple `Plot` items

---

### 3. Plot

A STAC Item containing GeoJSON features representing vessel tracks and reference locations.

```typescript
interface Plot {
  /** STAC Item ID */
  id: string;

  /** Plot title from STAC metadata */
  title: string;

  /** Creation/capture timestamp */
  datetime: string; // ISO 8601

  /** Path to item.json relative to store root */
  itemPath: string;

  /** Parent catalog ID */
  catalogId: string;

  /** Source file path (for provenance) */
  sourcePath?: string;

  /** Geographic bounding box [west, south, east, north] */
  bbox: [number, number, number, number];

  /** Time extent [start, end] in ISO 8601 */
  timeExtent: [string, string];

  /** Number of tracks in this plot */
  trackCount: number;

  /** Number of reference locations in this plot */
  locationCount: number;
}
```

**Relationships**:
- Belongs to one `Catalog`
- Contains multiple `Track` and `ReferenceLocation` features

**Validation Rules**:
- `datetime` must be valid ISO 8601
- `bbox` must have west < east and south < north
- `timeExtent[0]` must be before `timeExtent[1]`

---

### 4. Track

A GeoJSON LineString feature representing a vessel's movement over time.

```typescript
interface Track {
  /** Unique track ID within the plot */
  id: string;

  /** Track name/identifier */
  name: string;

  /** Platform type (e.g., 'Destroyer', 'Submarine', 'Helicopter') */
  platformType?: string;

  /** GeoJSON LineString geometry */
  geometry: GeoJSON.LineString;

  /** Time values for each coordinate (ISO 8601) */
  times: string[];

  /** Start time of track */
  startTime: string;

  /** End time of track */
  endTime: string;

  /** User-customized display color (hex) */
  color?: string;

  /** Whether this track is currently visible */
  visible: boolean;

  /** Whether this track is currently selected */
  selected: boolean;
}
```

**Relationships**:
- Belongs to one `Plot`

**Validation Rules**:
- `geometry.coordinates.length === times.length`
- All `times` values must be valid ISO 8601
- `startTime` must be before `endTime`
- `color` must be valid hex color (#RRGGBB)

---

### 5. ReferenceLocation

A GeoJSON Point feature marking a significant location.

```typescript
interface ReferenceLocation {
  /** Unique location ID within the plot */
  id: string;

  /** Location name */
  name: string;

  /** Location type (e.g., 'Waypoint', 'Datum', 'Port') */
  locationType?: string;

  /** GeoJSON Point geometry */
  geometry: GeoJSON.Point;

  /** Whether this location is currently visible */
  visible: boolean;

  /** Whether this location is currently selected */
  selected: boolean;
}
```

**Relationships**:
- Belongs to one `Plot`

**Validation Rules**:
- `geometry.type === 'Point'`
- Coordinates within valid WGS84 range

---

### 6. Selection

The set of currently selected map elements.

```typescript
interface Selection {
  /** Selected track IDs */
  trackIds: string[];

  /** Selected location IDs */
  locationIds: string[];

  /** Selection context type for tool matching */
  contextType: 'none' | 'single-track' | 'multi-track' | 'location' | 'mixed';

  /** Feature kinds in selection (for tool filtering) */
  featureKinds: ('track' | 'location')[];
}
```

**State Transitions**:
- `none` → `single-track`: Click on track
- `single-track` → `multi-track`: Shift+click another track
- `multi-track` → `none`: Click empty space
- Any → `none`: Clear selection command

---

### 7. AnalysisTool

A callable operation that takes a selection context and produces results.

```typescript
interface AnalysisTool {
  /** Tool identifier (from debrief-calc) */
  name: string;

  /** Human-readable display name */
  displayName: string;

  /** Tool description */
  description: string;

  /** Required selection context type */
  contextType: 'single-track' | 'multi-track' | 'location' | 'any';

  /** Accepted input feature kinds */
  inputKinds: ('track' | 'location')[];

  /** JSON Schema for tool parameters */
  inputSchema: object;
}
```

**Relationships**:
- Discovered from `debrief-calc` via MCP

---

### 8. ToolExecution

State of a tool execution in progress or completed.

```typescript
interface ToolExecution {
  /** Unique execution ID */
  id: string;

  /** Tool being executed */
  toolName: string;

  /** Execution state */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** Progress (0-100) if available */
  progress?: number;

  /** Progress message from tool */
  progressMessage?: string;

  /** Start timestamp */
  startedAt: string;

  /** Completion timestamp */
  completedAt?: string;

  /** Error message if failed */
  error?: string;

  /** Result layer ID if completed */
  resultLayerId?: string;
}
```

---

### 9. ResultLayer

A computed layer from tool execution.

```typescript
interface ResultLayer {
  /** Unique layer ID */
  id: string;

  /** Display name */
  name: string;

  /** Source tool name */
  toolName: string;

  /** Execution ID that produced this layer */
  executionId: string;

  /** GeoJSON FeatureCollection of results */
  features: GeoJSON.FeatureCollection;

  /** Layer styling configuration */
  style: LayerStyle;

  /** Whether layer is visible */
  visible: boolean;

  /** Creation timestamp */
  createdAt: string;

  /** Z-order (higher = on top) */
  zIndex: number;
}

interface LayerStyle {
  /** Line color (hex) */
  strokeColor: string;

  /** Line width */
  strokeWidth: number;

  /** Line dash pattern (for result differentiation) */
  dashArray?: number[];

  /** Fill color for polygons/markers */
  fillColor?: string;

  /** Fill opacity */
  fillOpacity?: number;
}
```

**Relationships**:
- Created by `ToolExecution`
- Belongs to active plot view

---

### 10. TimeRange

The current time filter applied to the view.

```typescript
interface TimeRange {
  /** Filter start time (ISO 8601) */
  start: string;

  /** Filter end time (ISO 8601) */
  end: string;

  /** Full data extent start */
  dataStart: string;

  /** Full data extent end */
  dataEnd: string;
}
```

---

### 11. MapViewState

Persisted map view state.

```typescript
interface MapViewState {
  /** Map center [lat, lng] */
  center: [number, number];

  /** Zoom level */
  zoom: number;

  /** Current time range filter */
  timeRange: TimeRange;

  /** Active selection */
  selection: Selection;

  /** Layer visibility states by ID */
  layerVisibility: Record<string, boolean>;

  /** Custom track colors by ID */
  trackColors: Record<string, string>;
}
```

---

### 12. RecentPlot

Entry in the recent plots list.

```typescript
interface RecentPlot {
  /** Plot ID */
  plotId: string;

  /** Plot title */
  title: string;

  /** Store ID */
  storeId: string;

  /** Last opened timestamp */
  lastOpened: string;

  /** URI for quick open */
  uri: string;
}
```

---

## Entity Relationship Diagram

```
StacStore (1) ─────contains──────▶ (N) Catalog
    │
    └──────────────────────────────────────▶ (N) Plot
                                               │
                                               ├──contains──▶ (N) Track
                                               │
                                               └──contains──▶ (N) ReferenceLocation

Selection ────references────▶ Track, ReferenceLocation

AnalysisTool ────executes on────▶ Selection
    │
    └──produces────▶ ToolExecution ────creates────▶ ResultLayer

MapViewState ────references────▶ TimeRange, Selection, Track (colors)

RecentPlot ────references────▶ Plot, StacStore
```

---

## State Management

### Extension Host State

| State | Scope | Persistence |
|-------|-------|-------------|
| `StacStore[]` | Global | debrief-config |
| `Catalog[]` | Per store | Cached, refreshed on demand |
| `AnalysisTool[]` | Global | Cached from MCP |
| `RecentPlot[]` | Global | Workspace state |

### Webview State (per panel)

| State | Scope | Persistence |
|-------|-------|-------------|
| `Plot` | Per panel | None (loaded on open) |
| `Track[]` | Per panel | None (from Plot) |
| `Selection` | Per panel | Webview state |
| `MapViewState` | Per panel | Webview state |
| `ResultLayer[]` | Per panel | None (recompute on restore) |
| `ToolExecution` | Per panel | None (transient) |
