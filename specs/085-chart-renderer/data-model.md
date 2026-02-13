# Data Model: Chart Renderer + Dataset-to-Spec Transformer

**Feature**: 085-chart-renderer
**Date**: 2026-02-13

## Entities

### 1. DatasetEnvelope

The standard wrapper for all result datasets. Every dataset artifact conforms to this envelope structure.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Dataset subtype identifier (e.g., `zone_histogram`, `range_bearing_series`). Matches the third segment of the `debrief:resultType` annotation path. |
| title | string | Yes | Human-readable title for the chart (e.g., "Buffer Zone Point Distribution"). |
| metadata | DatasetMetadata | Yes | Axis definitions and display hints. |
| data | object[] | Conditional | Array of data records (used for flat datasets like histograms). Mutually exclusive with `series`. |
| series | DataSeries[] | Conditional | Array of named data series (used for multi-line/multi-series charts). Mutually exclusive with `data`. |

**Validation rules**:
- Exactly one of `data` or `series` must be present (not both, not neither)
- `type` must be a non-empty string matching pattern `^[a-z_]+$`
- `title` must be a non-empty string

### 2. DatasetMetadata

Axis and display configuration derived from the tool's output.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| xAxis | AxisDefinition | Yes | X-axis label, type, and optional units. |
| yAxis | AxisDefinition | Yes | Y-axis label, type, and optional units. |

### 3. AxisDefinition

Describes a single axis.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| label | string | Yes | Human-readable axis label (e.g., "Zone", "Time", "Range"). |
| type | "nominal" \| "ordinal" \| "quantitative" \| "temporal" | Yes | Data type for the axis. Maps directly to Vega-Lite encoding type. |
| units | string | No | Display units (e.g., "nm", "points", "degrees"). Appended to axis label in chart. |

### 4. DataSeries

A named series of data points for multi-series charts (line charts, scatter plots).

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Series name for the legend (e.g., "Track A → Track B"). |
| data | object[] | Yes | Array of data records for this series. |

### 5. TransformerError

Structured error returned when the transformer cannot convert a dataset.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | "unsupported_type" \| "invalid_schema" \| "empty_data" | Yes | Error category. |
| message | string | Yes | Human-readable error description. |
| datasetType | string | No | The dataset type that caused the error (for `unsupported_type`). |
| details | object | No | Additional context (e.g., validation errors for `invalid_schema`). |

### 6. TransformerRegistry

Maps dataset type identifiers to their transformation functions.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| mappings | Map<string, TransformFunction> | Yes | Registry of dataset type → Vega-Lite spec transformation functions. |

**Operations**:
- `register(type: string, fn: TransformFunction)` — Add a new mapping
- `transform(dataset: DatasetEnvelope)` — Look up the mapping for `dataset.type` and execute it. Returns a Vega-Lite spec or a TransformerError.
- `getSupportedTypes()` — List all registered dataset types

## Relationships

```
DatasetEnvelope
  ├── has one → DatasetMetadata
  │                ├── has one → AxisDefinition (x)
  │                └── has one → AxisDefinition (y)
  ├── has many → DataRecord (flat data, e.g., histogram)
  └── has many → DataSeries
                    └── has many → DataRecord (series data, e.g., time-series)

TransformerRegistry
  ├── registers many → TransformFunction (one per dataset type)
  └── produces → Vega-Lite TopLevelSpec | TransformerError

ChartRenderer (React component)
  └── consumes → Vega-Lite TopLevelSpec
```

## Concrete Dataset Types

### zone_histogram

A flat dataset for bar charts.

**Data record fields**: `{ zone: string, count: number }`
- `zone`: Categorical label for each bar (nominal)
- `count`: Numeric value for bar height (quantitative)

**Example**:
```json
{
  "type": "zone_histogram",
  "title": "Buffer Zone Point Distribution",
  "metadata": {
    "xAxis": { "label": "Zone", "type": "nominal" },
    "yAxis": { "label": "Count", "type": "quantitative", "units": "points" }
  },
  "data": [
    { "zone": "Zone A (0-5 nm)", "count": 42 },
    { "zone": "Zone B (5-10 nm)", "count": 17 },
    { "zone": "Zone C (10-15 nm)", "count": 8 }
  ]
}
```

### range_bearing_series

A multi-series dataset for line charts with temporal x-axis.

**Data record fields**: `{ time: string (ISO 8601), value: number }`
- `time`: Timestamp for each data point (temporal)
- `value`: Numeric measurement (quantitative)

**Example**:
```json
{
  "type": "range_bearing_series",
  "title": "Range and Bearing over Time",
  "metadata": {
    "xAxis": { "label": "Time", "type": "temporal" },
    "yAxis": { "label": "Range", "type": "quantitative", "units": "nm" }
  },
  "series": [
    {
      "name": "Track A → Track B",
      "data": [
        { "time": "2024-01-15T10:00:00Z", "value": 12.5 },
        { "time": "2024-01-15T10:05:00Z", "value": 11.8 },
        { "time": "2024-01-15T10:10:00Z", "value": 10.2 }
      ]
    }
  ]
}
```

## State Transitions

The ChartRenderer component has four visual states:

```
                    ┌─────────┐
      spec=null ──→ │  Error  │
                    └─────────┘
                         ↑
                    render failure
                         │
┌──────────┐  spec   ┌────────┐  data.length=0  ┌───────┐
│ Loading  │ ──────→ │Parsing │ ──────────────→  │ Empty │
└──────────┘         └────────┘                  └───────┘
                         │
                    data.length>0
                         ↓
                    ┌─────────┐
                    │ Success │
                    └─────────┘
```

- **Loading**: Initial state while waiting for spec prop
- **Error**: Displayed when spec is null, malformed, or vega-embed throws
- **Empty**: Displayed when data array has zero items (title/axes shown, "No data" message)
- **Success**: Chart rendered via vega-embed
