# Tool Contract: buffer-zone-generator

**Version**: 1.0
**Date**: 2026-02-12

## MCP Tool Registration

```yaml
name: buffer-zone-generator
description: >
  Generate detection likelihood buffer zones around a track using a sensor model.
  Returns 3 concentric polygon features at increasing distances, each named with
  its detection likelihood percentage.
input_kinds: [TRACK]
output_kind: addition/feature
context_type: SINGLE
```

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| distance_1_nm | number | No | 3.0 | Innermost buffer distance in nautical miles |
| distance_2_nm | number | No | 6.0 | Middle buffer distance in nautical miles |
| distance_3_nm | number | No | 12.0 | Outermost buffer distance in nautical miles |

## Input Contract

**SelectionContext** with `type: SINGLE` containing at least one feature with `kind: "TRACK"` and LineString geometry.

```json
{
  "type": "SINGLE",
  "features": [
    {
      "type": "Feature",
      "id": "track-001",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-4.5, 50.2, 0, 1705305600000], [-4.4, 50.3, 0, 1705309200000]]
      },
      "properties": { "kind": "TRACK", "name": "HMS Example" }
    }
  ]
}
```

## Output Contract

**Success**: List of 3 GeoJSON Feature dicts (zone polygons), ordered innermost to outermost.

```json
[
  {
    "type": "Feature",
    "id": "zone-<uuid>",
    "geometry": { "type": "Polygon", "coordinates": [[ ... ]] },
    "properties": {
      "kind": "ZONE",
      "name": "75%",
      "detection_likelihood_pct": 75,
      "buffer_distance_nm": 3.0
    }
  },
  {
    "type": "Feature",
    "id": "zone-<uuid>",
    "geometry": { "type": "Polygon", "coordinates": [[ ... ]] },
    "properties": {
      "kind": "ZONE",
      "name": "50%",
      "detection_likelihood_pct": 50,
      "buffer_distance_nm": 6.0
    }
  },
  {
    "type": "Feature",
    "id": "zone-<uuid>",
    "geometry": { "type": "Polygon", "coordinates": [[ ... ]] },
    "properties": {
      "kind": "ZONE",
      "name": "25%",
      "detection_likelihood_pct": 25,
      "buffer_distance_nm": 12.0
    }
  }
]
```

## MCP Response Wrapping

The result builder wraps zones as:

```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://zone-<uuid>",
      "mimeType": "application/geo+json",
      "text": "<serialized zone feature>",
      "annotations": {
        "debrief:resultType": "addition/feature",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Generated 3 detection zones (75%, 50%, 25%) for track"
      }
    }
  ]
}
```

## Error Contract

| Condition | Error Category | Message |
|-----------|---------------|---------|
| No features in input | invalid_input | "No track features found in input" |
| No TRACK kind features | invalid_input | "No track features found in input" |
| Distance <= 0 | invalid_input | "All buffer distances must be positive" |
| Empty track geometry | invalid_input | "Track has no coordinates" |
