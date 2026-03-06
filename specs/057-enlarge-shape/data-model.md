# Data Model: Enlarge Shape Tool

**Feature**: 057-enlarge-shape | **Date**: 2026-02-13

## Entities

### ScaleParameters

Tool input parameters provided in the FeatureCollection's `parameters` field.

| Field | Type | Required | Default | Choices (presets) | Description |
|-------|------|----------|---------|-------------------|-------------|
| `scale_factor` | number | No | 3.0 | 0.25, 0.5, 1.5, 2.0, 3.0, 5.0 | Multiplicative scale factor. >1 enlarges, <1 shrinks, =1 no-op. Must be >= 0. Choices are presets; any non-negative number is accepted. |
| `origin` | [number, number] | No | computed centroid | — | Scale origin point as [longitude, latitude]. Defaults to geometric centroid of each shape. |

**Validation rules**:
- `scale_factor` MUST be >= 0 (negative values return error)
- `scale_factor` choices are **presets** for frontend context menus — the tool accepts any non-negative numeric value, not only the listed choices
- `origin`, if provided, MUST be a valid [lon, lat] coordinate with lon in [-180, 180] and lat in [-90, 90]

### Input: FeatureCollection

Standard GeoJSON FeatureCollection containing annotation features to scale.

```json
{
  "type": "FeatureCollection",
  "features": [ ... ],
  "parameters": {
    "scale_factor": 3.0,
    "origin": [lon, lat]
  }
}
```

**Supported annotation kinds** (from `annotations.yaml`):

| Kind | Geometry Type | Special Properties |
|------|--------------|-------------------|
| CIRCLE | Polygon | `center`: [lon, lat] — must be scaled with vertices |
| RECTANGLE | Polygon | None beyond geometry |
| LINE | LineString | None beyond geometry |
| TEXT | Point | Single coordinate — centroid is the point itself |
| VECTOR | LineString | `origin`: [lon, lat] — must be scaled; `range` and `bearing` — preserved |

### Output: ToolResponse

Standard ToolResponse envelope with mutation content items.

| Field | Type | Description |
|-------|------|-------------|
| `content` | ContentItem[] | Array of scaled annotation features |
| `content[].type` | "resource" | Always "resource" for feature mutations |
| `content[].uri` | string | `feature://{feature-id}` |
| `content[].mimeType` | string | `application/geo+json` |
| `content[].text` | string | Serialized GeoJSON Feature (stringified JSON) |
| `content[].annotations` | object | Provenance metadata (see below) |

### Annotations (Provenance)

Required on each content item:

| Annotation | Type | Description |
|------------|------|-------------|
| `debrief:resultType` | string | Always `mutation/shape/scaled` |
| `debrief:sourceFeatures` | string[] | IDs of input features that were scaled |
| `debrief:label` | string | Human-readable: `"Scaled {n} shape(s) by factor {scale_factor} from {origin_description}"` |

### Error Response

Returned when input is invalid.

| Field | Type | Description |
|-------|------|-------------|
| `error.code` | number | `-32000` (standard MCP error) |
| `error.message` | string | Human-readable error description |
| `error.data.debrief:errorCategory` | string | `"invalid_input"` |
| `error.data.debrief:affectedFeatures` | string[] | IDs of features involved (empty if no features) |

## State Transitions

This tool has no state — it is a pure function. Input FeatureCollection goes in, ToolResponse comes out. No persistence, no side effects.

## Relationships

```
FeatureCollection (input)
  ├── features[]: Feature (annotation shapes)
  │   ├── geometry: Polygon | LineString | Point
  │   └── properties: { kind, center?, origin?, range?, bearing?, ... }
  └── parameters: ScaleParameters
        ├── scale_factor: number
        └── origin?: [lon, lat]

ToolResponse (output)
  └── content[]: ContentItem
       ├── text: serialized Feature (scaled geometry)
       └── annotations: { resultType, sourceFeatures, label }
```
