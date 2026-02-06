# Data Model: Cross-Service End-to-End Workflow Tests

## Data Flow Overview

The e2e workflow tests validate data transformations across three service boundaries. No new entities are introduced — the tests verify that existing entities flow correctly between services.

```
REP File (text)
    │
    ▼
┌──────────┐    ParseResult
│ debrief-io│ ──────────────►  list[GeoJSON Feature]
│  parse()  │                  + warnings, source_file, handler
└──────────┘
    │
    ▼
┌──────────────┐    FeatureCollection
│ debrief-stac  │ ──────────────────►  STAC Item (plot)
│ add_features()│                      + bbox, assets, provenance
│ add_asset()   │
└──────────────┘
    │
    ▼
┌──────────────┐    ToolResult
│ debrief-calc  │ ──────────────────►  list[GeoJSON Feature]
│    run()      │                      + provenance, duration_ms
└──────────────┘
    │
    ▼
┌──────────────┐    Updated FeatureCollection
│ debrief-stac  │ ──────────────────►  STAC Item (plot)
│ add_features()│                      + updated bbox, mixed feature kinds
└──────────────┘
```

## Entity Descriptions

### ParseResult (io output)

The output of `debrief_io.parse()`. Contains a list of GeoJSON features extracted from a source file.

| Field | Type | Description |
|-------|------|-------------|
| features | list[dict] | GeoJSON Feature objects (tracks, annotations) |
| warnings | list[ParseWarning] | Non-fatal parse issues with line numbers |
| source_file | str | Absolute path to the source file |
| handler | str | Name of the handler that processed the file |
| parse_time_ms | float | Duration of the parse operation |

### GeoJSON Track Feature (io -> stac boundary)

A track parsed from REP format. This is the primary entity that flows from io to stac.

| Field | Path | Type | Description |
|-------|------|------|-------------|
| type | `.type` | "Feature" | GeoJSON type |
| id | `.id` | str (UUID) | Unique feature identifier |
| geometry.type | `.geometry.type` | "LineString" | Track geometry type |
| geometry.coordinates | `.geometry.coordinates` | list[list[float]] | [lon, lat] coordinate pairs |
| kind | `.properties.kind` | "TRACK" | Feature classification |
| platform_id | `.properties.platform_id` | str | Track identifier (e.g., "NELSON") |
| times | `.properties.times` | list[str] | ISO 8601 timestamps parallel to coordinates |
| source_file | `.properties.source_file` | str | Original file path |
| positions | `.properties.positions` | list[dict] | Kinematic data (time, course, speed, depth) |

### PlotMetadata (stac input)

Metadata for creating a new STAC plot.

| Field | Type | Description |
|-------|------|-------------|
| title | str | Human-readable plot title (required) |
| description | str or None | Optional description |
| timestamp | datetime | Creation timestamp (defaults to UTC now) |

### SelectionContext (stac -> calc boundary)

The input to `debrief_calc.run()`. Wraps features from a STAC plot for analysis.

| Field | Type | Description |
|-------|------|-------------|
| type | ContextType enum | SINGLE, MULTI, REGION, or NONE |
| features | list[dict] | GeoJSON features from the STAC plot |
| bounds | list[float] or None | Geographic bounds [minx, miny, maxx, maxy] |

### ToolResult (calc output)

The output of `debrief_calc.run()`. Contains analysis results as GeoJSON features.

| Field | Type | Description |
|-------|------|-------------|
| tool | str | Name of the executed tool |
| success | bool | Whether execution succeeded |
| features | list[dict] or None | Output GeoJSON features (if success) |
| error | ToolError or None | Error details (if failure) |
| duration_ms | float | Execution time in milliseconds |

### Provenance Record (calc -> stac boundary)

Embedded in `properties.provenance` of calc output features. Verified by tests.

| Field | Type | Description |
|-------|------|-------------|
| tool | str | Tool name that produced the feature |
| version | str | Tool version |
| timestamp | str (ISO 8601) | When the analysis was executed |
| sources | list[SourceRef] | References to input features (id + kind) |
| parameters | dict | Parameters passed to the tool |

## Validation Points

Tests must verify data conformance at each boundary:

1. **io -> stac**: Every feature from `ParseResult.features` has `type: "Feature"`, valid `geometry`, and `properties.kind`
2. **stac storage**: After `add_features()`, the plot's FeatureCollection contains all features and `bbox` reflects actual geometry bounds
3. **stac -> calc**: Features read from the plot can construct a valid `SelectionContext` with the correct `ContextType`
4. **calc -> stac**: `ToolResult.features` each have `properties.provenance` with source references matching the input feature IDs
