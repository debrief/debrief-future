# Data Model: STAC Browser Web UI

**Feature**: 048-stac-browser-web-ui
**Date**: 2026-02-04

## Overview

This feature composes existing components from `@debrief/components` with mock services. All data types are already defined in existing packages. This document catalogs the types used and defines the mock service interfaces.

## Existing Types (from @debrief/components)

### DebriefFeature

```typescript
// From @debrief/components (via @debrief/schemas)
type DebriefFeature = TrackFeature | ReferenceLocation;

interface TrackFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][] | [number, number, number][];
  };
  properties: {
    kind: 'TRACK';
    id: string;
    name: string;
    times?: string[];  // ISO 8601 timestamps per coordinate
    track_type?: string;
    color?: string;
    // ... additional properties
  };
}

interface ReferenceLocation {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number] | [number, number, number];
  };
  properties: {
    kind: 'POINT';
    id: string;
    name: string;
    location_type?: string;
    // ... additional properties
  };
}
```

### CatalogOverviewItem

```typescript
// From @debrief/components/CatalogOverview
interface CatalogOverviewItem {
  id: string;
  title: string;
  itemPath: string;
  bbox: [number, number, number, number] | null;  // [west, south, east, north]
  datetime: string | null;           // ISO 8601
  startDatetime: string | null;      // ISO 8601
  endDatetime: string | null;        // ISO 8601
}
```

### UseSelectionReturn

```typescript
// From @debrief/components/hooks/useSelection
interface UseSelectionReturn {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  select: (id: string) => void;
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  toggleMultiple: (ids: string[]) => void;
  clear: () => void;
  selectAll: (ids: string[]) => void;
  count: number;
  hasSelection: boolean;
}
```

### Tool

```typescript
// From @debrief/schemas (via @debrief/components/ToolMatch)
interface Tool {
  id: string;
  name: string;
  description?: string;
  version?: string;
  requirements?: SelectionRequirement[];
}

interface SelectionRequirement {
  kind: string;      // e.g., 'TRACK', 'POINT'
  min?: number;      // default: 1
  max?: number;      // undefined = no limit
}
```

## Mock Service Interfaces

### MockStacService

```typescript
// apps/web-shell/src/mocks/stacService.ts
interface MockStacService {
  /**
   * List all items from the mock catalog.
   * @returns Array of catalog overview items
   */
  listItems(): Promise<CatalogOverviewItem[]>;

  /**
   * Load plot data for a specific item.
   * @param itemId - The item identifier (e.g., 'exercise-alpha')
   * @returns Features and computed time extent
   * @throws Error if itemId is unknown
   */
  loadPlotData(itemId: string): Promise<{
    features: DebriefFeature[];
    timeExtent: [string, string];  // [startISO, endISO]
  }>;
}
```

### MockCalcService

```typescript
// apps/web-shell/src/mocks/calcService.ts
interface ToolExecutionResult {
  success: boolean;
  features?: DebriefFeatureCollection;
  message?: string;
  error?: string;
  durationMs: number;
}

interface MockCalcService {
  /**
   * Execute a mock tool on selected features.
   * @param toolId - Tool identifier ('track-length' or 'bounding-box')
   * @param selectedIds - Set of selected feature IDs
   * @returns Execution result
   */
  execute(toolId: string, selectedIds: Set<string>): Promise<ToolExecutionResult>;
}

// Mock tools definition
const mockTools: Tool[] = [
  {
    id: 'track-length',
    name: 'Track Length',
    description: 'Calculate total length of selected tracks',
    requirements: [{ kind: 'TRACK', min: 1 }],
  },
  {
    id: 'bounding-box',
    name: 'Bounding Box',
    description: 'Compute bounding box of selection',
    requirements: [{ kind: 'TRACK', min: 1 }],
  },
];
```

## App State Model

```typescript
// apps/web-shell/src/App.tsx
interface AppState {
  // View state
  view: 'welcome' | 'analysis';
  activePlot: { id: string; title: string } | null;

  // Data state
  features: DebriefFeature[];
  catalogItems: CatalogOverviewItem[];

  // Selection state (via useSelection hook)
  selection: UseSelectionReturn;

  // Temporal state (via @debrief/session-state)
  temporal: {
    currentTime: { epoch: number } | null;
    timeRange: { start: number; end: number } | null;
    displayMode: 'full' | 'snailTrail';
  };
}
```

## State Transitions

### View State Machine

```
┌──────────┐  double-click item   ┌──────────┐
│ welcome  │ ──────────────────▶  │ analysis │
│          │                      │          │
└──────────┘  ◀────────────────── └──────────┘
               "Back to Catalog"
```

### Selection State

```
┌──────────────┐  click feature   ┌──────────────┐
│ selectedIds  │ ───────────────▶ │ selectedIds  │
│ = Set()      │                  │ = Set([id])  │
└──────────────┘                  └──────────────┘
       ▲                                 │
       │       click background          │
       └─────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          App.tsx                                │
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │ catalogItems│ ──▶ │CatalogOverview│ ──▶ │ onItemSelect│       │
│  └─────────────┘     └─────────────┘     └──────┬──────┘       │
│                                                  │              │
│                                    ┌─────────────▼──────────────┐
│                                    │ loadPlotData(itemId)       │
│                                    │ setFeatures(data.features) │
│                                    │ setView('analysis')        │
│                                    └─────────────┬──────────────┘
│                                                  │              │
│  ┌─────────────┐                  ┌──────────────▼───────────┐  │
│  │  features   │ ──────────────▶ │       MapView            │  │
│  │  selection  │ ──────────────▶ │     FeatureList          │  │
│  │  temporal   │ ──────────────▶ │     TimeController       │  │
│  └─────────────┘                  └──────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Fixture Data Schema

Located at `apps/vscode/test-data/local-store/`:

### catalog.json

```json
{
  "type": "Catalog",
  "stac_version": "1.0.0",
  "id": "local-store",
  "description": "Local STAC store for testing",
  "links": [
    { "rel": "self", "href": "./catalog.json" },
    { "rel": "item", "href": "./exercise-alpha/item.json", "title": "Exercise Alpha" },
    { "rel": "item", "href": "./training-run-1/item.json", "title": "Training Run 1" }
  ]
}
```

### {plot}/item.json

```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "id": "exercise-alpha",
  "geometry": null,
  "bbox": [-5.0, 50.0, 2.0, 55.0],
  "properties": {
    "title": "Exercise Alpha",
    "datetime": null,
    "start_datetime": "2024-01-15T08:00:00Z",
    "end_datetime": "2024-01-15T12:00:00Z"
  },
  "assets": {
    "data": {
      "href": "./exercise-alpha.geojson",
      "type": "application/geo+json"
    }
  },
  "links": [...]
}
```

### {plot}/{plot}.geojson

GeoJSON FeatureCollection containing `TrackFeature` and `ReferenceLocation` objects.

## Validation Rules

| Rule | Scope | Validation |
|------|-------|------------|
| Feature ID uniqueness | Per plot | All feature IDs must be unique within a plot |
| Track has times array | TrackFeature | `times.length === coordinates.length` |
| Valid bbox | CatalogOverviewItem | `west < east && south < north` |
| Valid time extent | Plot data | `startDatetime <= endDatetime` |

## No New Entities

This feature introduces no new persistent data structures. All data flows through existing types from `@debrief/components` and `@debrief/schemas`.
