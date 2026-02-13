# Data Model: Buffer Zone Generator

**Feature**: 080-buffer-zone-generator
**Date**: 2026-02-12

## Entities

### SensorModelZone

Represents a single detection zone definition returned by the sensor model.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| distance_nm | float | Buffer distance in nautical miles | > 0 |
| likelihood_pct | int | Detection likelihood as percentage | 1-100 |
| name | str | Human-readable zone label | Non-empty |

**Example** (stub model default):
```
{ distance_nm: 3.0, likelihood_pct: 75, name: "75%" }
{ distance_nm: 6.0, likelihood_pct: 50, name: "50%" }
{ distance_nm: 12.0, likelihood_pct: 25, name: "25%" }
```

### Detection Zone Feature (GeoJSON)

A GeoJSON Feature representing a computed buffer zone around a track.

| Property | Type | Description | Constraints |
|----------|------|-------------|-------------|
| kind | str | Feature kind identifier | "ZONE" |
| name | str | Zone label (percentage) | Matches SensorModelZone.name |
| detection_likelihood_pct | int | Detection probability | 1-100 |
| buffer_distance_nm | float | Distance from track | > 0 |

**Geometry**: Polygon (single exterior ring, no holes). Ring is closed (first point = last point). Coordinates are `[longitude, latitude]` pairs.

**Example**:
```json
{
  "type": "Feature",
  "id": "zone-<uuid>",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[ [lon1, lat1], [lon2, lat2], ..., [lon1, lat1] ]]
  },
  "properties": {
    "kind": "ZONE",
    "name": "75%",
    "detection_likelihood_pct": 75,
    "buffer_distance_nm": 3.0
  }
}
```

### Track Feature (Input — existing schema)

| Property | Type | Description |
|----------|------|-------------|
| kind | str | "TRACK" |
| name | str | Track name (e.g., vessel name) |
| platform_type | str | Platform category |
| start_time | str | ISO 8601 timestamp |
| end_time | str | ISO 8601 timestamp |

**Geometry**: LineString with coordinates as `[longitude, latitude, altitude, timestamp_ms]` tuples.

## Relationships

```
Track Feature (input)
    │
    ├── [1] ──→ SensorModel.get_detection_zones() ──→ [3] SensorModelZone
    │
    └── [1] ──→ buffer_zone_generator() ──→ [3] Detection Zone Features
                    │
                    └── Each zone references source track via debrief:sourceFeatures
```

- One Track produces exactly three Detection Zones (one per SensorModelZone).
- Each Detection Zone links back to its source Track via provenance annotations.
- The SensorModel is queried once per invocation, returning three zone definitions.

## Validation Rules

- Track must have LineString geometry with at least 1 coordinate position.
- All buffer distances must be > 0 (validated before zone generation).
- Zone polygon rings must be closed (first coordinate == last coordinate).
- Zone polygon rings must have at least 4 coordinates (triangle + closing point).
- Zone coordinates must have valid longitude [-180, 180] and latitude [-90, 90].
- Zones must be returned ordered by distance ascending (innermost first).

## Schema Extension Required

The `ZONE` value must be added to `FeatureKindEnum` in `shared/schemas/src/linkml/common.yaml`. This is tracked as a dependency on #062 (missing feature kind enum values).
