# Data Model: Spatial Types Consolidation

**Feature**: 203-spatial-types-linkml
**Phase**: 1 — Design
**Date**: 2026-04-20

This document specifies the canonical shapes of the three types in scope, after this feature lands. All shapes are rooted in LinkML at `shared/schemas/src/linkml/session-state.yaml` and `shared/schemas/src/linkml/common.yaml`. Pydantic, JSON Schema, and TypeScript representations are derived.

---

## Coordinate

**Purpose**: A geographic point. The fundamental spatial unit of the application.

**LinkML definition** (`shared/schemas/src/linkml/session-state.yaml`):

```yaml
Coordinate:
  description: A geographic coordinate (longitude, latitude)
  attributes:
    longitude:
      description: Longitude in degrees (-180 to 180)
      range: float
      required: true
      minimum_value: -180
      maximum_value: 180
    latitude:
      description: Latitude in degrees (-90 to 90)
      range: float
      required: true
      minimum_value: -90
      maximum_value: 90
```

**Generated TypeScript** (conceptual — actual shape produced by `gen-typescript`):

```typescript
export interface Coordinate {
  longitude: number;
  latitude: number;
}
```

**Validation rules**:

- `longitude` MUST be a finite number in `[-180, 180]`.
- `latitude` MUST be a finite number in `[-90, 90]`.
- Both fields REQUIRED.

**State**: Immutable value type. No transitions.

**Where used**: `ViewportPolygon.coordinates`, map click events, drawing-tool outputs, feature geometry (indirectly via GeoJSON boundary).

**No change from the current LinkML definition** — already exists as this shape. This feature's role is to make it the only definition.

---

## ViewportPolygon

**Purpose**: The visible map area, represented as a 4-corner polygon to support rotated views and to restore view state on reload. The optional `zoom` lets consumers reconstruct the map's zoom level even when the polygon alone does not uniquely determine it (edge cases at very high/low zoom).

**LinkML definition** (`shared/schemas/src/linkml/session-state.yaml`):

```yaml
ViewportPolygon:
  description: Geographic area as a 4-corner polygon supporting rotated views (FR-012, FR-013)
  attributes:
    coordinates:
      description: Four corners in clockwise order [NW, NE, SE, SW]
      range: Coordinate
      multivalued: true
      required: true
      minimum_cardinality: 4
      maximum_cardinality: 4
    zoom:
      description: Map zoom level for restoring the view (optional)
      range: float
      required: false
```

**Generated TypeScript** (conceptual):

```typescript
export interface ViewportPolygon {
  /** Four corners in clockwise order [NW, NE, SE, SW]. Runtime-enforced length === 4. */
  coordinates: Coordinate[];
  /** Map zoom level for restoring the view. Optional. */
  zoom?: number;
}
```

**Validation rules**:

- `coordinates.length` MUST equal 4 (enforced by `validateViewportPolygon`).
- Each `coordinates[i]` MUST pass `validateCoordinate`.
- `zoom`, if present, SHOULD be a non-negative number (not enforced in schema; convention matches Leaflet).

**State**: Immutable value type. No transitions.

**Where used**: `SpatialSlice.viewport` in the session-state store; persisted across sessions; emitted by the map on viewport change.

**Change from current LinkML definition**:

- Added optional `zoom: float` attribute to match runtime usage (research R-001).
- Existing fixtures remain valid because `zoom` is optional.

---

## TimeFilter

**Purpose**: A user-controlled constraint on the visible time window. Drives which features are shown on the map and the timeline. Updated continuously during time-slider drag — hot path.

**LinkML definition** (`shared/schemas/src/linkml/session-state.yaml`):

```yaml
TimeFilter:
  description: Constraints on the visible time window (epoch milliseconds; null = unbounded)
  attributes:
    start:
      description: Filter start as epoch milliseconds (null/missing = unbounded on the start)
      range: integer
      required: false
    end:
      description: Filter end as epoch milliseconds (null/missing = unbounded on the end)
      range: integer
      required: false
```

**Generated TypeScript** (conceptual):

```typescript
export interface TimeFilter {
  /** Epoch milliseconds. null or missing means the filter is unbounded on the start. */
  start?: number | null;
  /** Epoch milliseconds. null or missing means the filter is unbounded on the end. */
  end?: number | null;
}
```

**Validation rules**:

- `start` and `end` (when both present and non-null) SHOULD satisfy `start <= end`. This is a convention; the type does not enforce it. Consumers MAY normalise by swapping on disorder.

**State**: Immutable value type. Replaced wholesale on each user interaction.

**Where used**: `TemporalSlice.timeFilter`; drives the visibility predicate applied in the map, the timeline, and the feature list.

**Change from current LinkML definition**:

- `start` and `end` changed from `range: TimeInstant` (required) to `range: integer` (optional/nullable) — research R-002.
- `TimeInstant` class retained for use by `TimeRange` (unchanged).

---

## GeoJSON coordinate tuple (boundary type — NOT persisted)

**Purpose**: The RFC 7946 wire representation of a single position. Appears only in code that reads/writes GeoJSON or passes coordinates to a GeoJSON-consuming library. Not persisted in session state. Not exported from `@debrief/schemas`.

**Shape** (pure TypeScript, no LinkML equivalent):

```typescript
type GeoJSONPosition = [number, number]; // [longitude, latitude]
```

**Validation rules**: Array of length 2, both elements finite numbers. Validated implicitly by the consuming GeoJSON library (or by `validateCoordinate` applied to the converted object form).

**Construction and consumption**: ONLY via `@debrief/utils` helpers `toGeoJSONCoord` / `fromGeoJSONCoord`. Direct literal construction (`[lon, lat]`) in new code is a PR-review failure.

---

## Relationships

```text
SpatialSlice (session-state, out of scope)
  └── viewport: ViewportPolygon | null   ◄── canonical from @debrief/schemas
        └── coordinates: Coordinate[4]   ◄── canonical from @debrief/schemas
              └── longitude, latitude: number

TemporalSlice (session-state, out of scope)
  ├── timeFilter: TimeFilter | null      ◄── canonical from @debrief/schemas
  │     └── start, end: number | null   (epoch milliseconds)
  ├── timeRange: TimeRange | null        (out of scope — unchanged)
  │     └── start, end: TimeInstant     (unchanged)
  └── currentTime, stepSize, etc.        (out of scope)

GeoJSON Feature geometry (wire format, at IO boundary)
  └── coordinates: GeoJSONPosition[]     ◄── constructed via toGeoJSONCoord / fromGeoJSONCoord
```

---

## Migration notes

### Persisted state

Rehydration MUST detect `Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number'` as a legacy tuple-form coordinate and convert it to `{ longitude: value[0], latitude: value[1] }`. Applied recursively within `viewport.coordinates` of a persisted `SpatialSlice`.

Persistence schema version bumped by 1 (exact previous value read from `services/session-state/src/persistence/` during implementation).

### In-flight messages (MCP, web-shell IPC)

No backward-compatibility shim is required. Per Constitution Article XIV (Pre-Release Freedom), breaking changes are permitted. All in-flight producers and consumers are in this repo and are updated atomically in the same PR.

---

## Invariants preserved

- Schema tests (golden fixtures, round-trip, structural comparison) MUST continue to pass.
- `Coordinate` bounds validation behaviour is unchanged; the function signature accepts object form instead of tuple.
- `ViewportPolygon` 4-corner constraint is preserved (enforced at validator level; see research R-006).
- `SpatialSlice`, `TemporalSlice`, and other session-state types retain all fields they currently have; only the shapes of the three in-scope types change.
