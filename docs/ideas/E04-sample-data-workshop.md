# E04 Sample Data Workshop

Pseudocode generators for all result types, producing golden fixture files for E04 renderer development.

## Overview

The E04 Results Visualization system needs sample data covering every result type to develop and test:
- The **dataset-to-spec transformer** (converts datasets → Vega-Lite)
- The **chart renderer** (renders transformed specs)
- The **results panel** (hosts multiple result tabs)

Tools output standard result datasets (per `tool-result.yaml` schema). The transformer is the only component that knows about Vega-Lite.

## Result Type Classification

| Category | Goes to... | Needs transformer? |
|----------|-----------|-------------------|
| `addition/*` (GeoJSON) | Map layer | No — map renders directly |
| `mutation/*` (GeoJSON) | Map layer (replaces existing) | No — map handles updates |
| `deletion/*` (text) | Log panel notification | No — text display only |
| `artifact/image/*` | Image viewer | No — native display |
| `artifact/report/*` | Report viewer | Maybe — structured JSON |
| `addition/dataset/*` | **Chart renderer** | **Yes — transformer converts** |
| `addition/*/statistics` | **Chart/card renderer** | **Yes — transformer converts** |

The transformer's primary job is converting `dataset/*` and `*/statistics` types into Vega-Lite specs.

## Generators

### GEN-01: Range/Bearing Time Series

**Result type**: `addition/dataset/range_bearing_series`
**Renderer output**: Dual-axis line chart (range vs time + bearing vs time)
**Fixture**: `range-bearing-series.json`

```pseudocode
FUNCTION generate_range_bearing_series(n_points=24, hours=6):
    base_time = "2024-03-15T06:00:00Z"
    from_feature = "NELSON"
    to_feature = "COLLINGWOOD"

    entries = []
    FOR i FROM 0 TO n_points-1:
        time = base_time + i * (hours/n_points) hours
        # Closing scenario: range decreases, bearing rotates
        range_nm = 15.0 - (i / n_points) * 10.0 + sin(i * 0.5) * 1.5
        bearing_deg = 45.0 + (i / n_points) * 30.0 + cos(i * 0.3) * 5.0
        entries.APPEND({time, range_nm: round(2), bearing_deg: round(1)})

    RETURN wrap_as_addition(
        data = {type: "range-bearing-series", from_feature, to_feature, entries},
        result_subtype = "dataset/range_bearing_series",
        source_features = [from_feature, to_feature],
        label = "Range/bearing: NELSON to COLLINGWOOD"
    )
```

### GEN-02: Track Statistics

**Result type**: `addition/track/statistics`
**Renderer output**: Summary card with key metrics
**Fixture**: `track-statistics.json`

```pseudocode
FUNCTION generate_track_statistics():
    source_track = "NELSON"
    centroid = [-4.15, 50.37]  # Plymouth Sound

    RETURN wrap_as_addition(
        data = GeoJSON_Feature(
            id = "stats-nelson-001",
            geometry = Point(centroid),
            properties = {
                kind: "analysis",
                source_track: source_track,
                source_name: "NELSON",
                statistics: {
                    point_count: 145,
                    duration_hours: 6.25,
                    distance_nm: 48.3,
                    average_speed_kts: 7.73
                }
            }
        ),
        result_subtype = "track/statistics",
        source_features = [source_track],
        label = "Statistics for NELSON"
    )
```

### GEN-03: Region/Area Statistics

**Result type**: `addition/region/statistics`
**Renderer output**: Summary card with area dimensions
**Fixture**: `region-statistics.json`

```pseudocode
FUNCTION generate_region_statistics():
    bounds = [-4.20, 50.33, -4.10, 50.41]  # [minx, miny, maxx, maxy]
    centroid = [-4.15, 50.37]

    RETURN wrap_as_addition(
        data = GeoJSON_Feature(
            id = "area-region-001",
            geometry = Polygon_from_bounds(bounds),
            properties = {
                kind: "analysis",
                statistics: {
                    area_sq_nm: 12.7,
                    width_nm: 4.2,
                    height_nm: 4.8,
                    centroid: centroid
                },
                bounds: bounds
            }
        ),
        result_subtype = "region/statistics",
        source_features = ["exercise-area-alpha"],
        label = "Area summary for Exercise Area Alpha"
    )
```

### GEN-04: Zone Histogram (E03 #082)

**Result type**: `addition/dataset/zone_histogram`
**Renderer output**: Bar chart (zone name vs point count), colored by zone
**Fixture**: `zone-histogram.json`

```pseudocode
FUNCTION generate_zone_histogram():
    zones = [
        {name: "inner",  distance_nm: 2.0, color: "#e74c3c", count: 12},
        {name: "middle", distance_nm: 5.0, color: "#f39c12", count: 27},
        {name: "outer",  distance_nm: 10.0, color: "#27ae60", count: 18},
        {name: "beyond", distance_nm: null,  color: "#95a5a6", count: 43}
    ]
    total = SUM(zones[].count)

    RETURN wrap_as_addition(
        data = {
            type: "zone-histogram",
            source_track: "NELSON",
            sensor_model: "active-sonar-shallow",
            zones: zones,
            total_points: total
        },
        result_subtype = "dataset/zone_histogram",
        source_features = ["NELSON", "ref-points-001"],
        label = "Buffer zone point counts for NELSON"
    )
```

### GEN-05: Reference Points (E03 #078)

**Result type**: `addition/analysis/reference_points`
**Renderer output**: Map layer (Points) — NOT a chart
**Fixture**: `reference-points.json`

```pseudocode
FUNCTION generate_reference_points(grid_rows=5, grid_cols=5):
    origin = [-4.20, 50.33]
    spacing_deg = 0.02  # ~1nm at this latitude
    features = []

    FOR row FROM 0 TO grid_rows-1:
        FOR col FROM 0 TO grid_cols-1:
            lon = origin[0] + col * spacing_deg
            lat = origin[1] + row * spacing_deg
            id = FORMAT("ref-pt-%03d", row * grid_cols + col)
            features.APPEND(GeoJSON_Feature(
                id = id,
                geometry = Point([lon, lat]),
                properties = {
                    kind: "reference",
                    name: id,
                    grid_row: row,
                    grid_col: col
                }
            ))

    RETURN wrap_as_addition(
        data = features,  # multiple features
        result_subtype = "analysis/reference_points",
        source_features = ["exercise-area-alpha"],
        label = FORMAT("Generated %d reference points (5x5 grid)", grid_rows * grid_cols)
    )
```

### GEN-06: Moved Track (E03 #079)

**Result type**: `mutation/track/offset`
**Renderer output**: Map layer (replaces existing track) — NOT a chart
**Fixture**: `track-offset.json`

```pseudocode
FUNCTION generate_track_offset():
    # Original track: NELSON, 6 positions in Plymouth Sound
    original_coords = [
        [-4.18, 50.35], [-4.16, 50.36], [-4.14, 50.37],
        [-4.12, 50.38], [-4.10, 50.39], [-4.08, 50.40]
    ]
    original_times = [
        "2024-03-15T06:00:00Z", "2024-03-15T07:00:00Z",
        "2024-03-15T08:00:00Z", "2024-03-15T09:00:00Z",
        "2024-03-15T10:00:00Z", "2024-03-15T11:00:00Z"
    ]

    # Offset: 3nm at bearing 135° (SE)
    offset_range_nm = 3.0
    offset_bearing_deg = 135.0
    dlat, dlon = bearing_range_to_delta(offset_bearing_deg, offset_range_nm)

    moved_coords = []
    FOR coord IN original_coords:
        moved_coords.APPEND([coord[0] + dlon, coord[1] + dlat])

    RETURN wrap_as_mutation(
        data = GeoJSON_Feature(
            id = "NELSON",
            geometry = LineString(moved_coords),
            properties = {
                kind: "TRACK",
                name: "NELSON",
                times: original_times,
                offset: {range_nm: 3.0, bearing_deg: 135.0}
            }
        ),
        result_subtype = "track/offset",
        source_features = ["NELSON"],
        label = "NELSON offset 3.0nm at 135°"
    )
```

### GEN-07: Buffer Zones (E03 #080)

**Result type**: `addition/analysis/buffer_zones`
**Renderer output**: Map layer (Polygons) — NOT a chart
**Fixture**: `buffer-zones.json`

```pseudocode
FUNCTION generate_buffer_zones():
    # Sensor model returns 3 detection distances
    sensor_model = "active-sonar-shallow"
    zones = [
        {name: "inner",  distance_nm: 2.0, confidence: 0.90, color: "#e74c3c"},
        {name: "middle", distance_nm: 5.0, confidence: 0.50, color: "#f39c12"},
        {name: "outer",  distance_nm: 10.0, confidence: 0.10, color: "#27ae60"}
    ]

    # Source track centroid (simplified: buffer around centroid)
    track_centroid = [-4.13, 50.375]
    features = []

    FOR zone IN zones:
        # Generate circle polygon (36 vertices) around centroid
        ring = circle_polygon(track_centroid, zone.distance_nm, n_vertices=36)
        features.APPEND(GeoJSON_Feature(
            id = FORMAT("buffer-%s", zone.name),
            geometry = Polygon(ring),
            properties = {
                kind: "analysis",
                name: FORMAT("Detection zone: %s (%.0f%%)", zone.name, zone.confidence * 100),
                zone_name: zone.name,
                distance_nm: zone.distance_nm,
                confidence: zone.confidence,
                sensor_model: sensor_model,
                style: {
                    fill: true,
                    fill_color: zone.color,
                    fill_opacity: 0.15,
                    stroke: true,
                    color: zone.color,
                    weight: 2,
                    dash_array: "5,5"
                }
            }
        ))

    RETURN wrap_as_addition(
        data = features,
        result_subtype = "analysis/buffer_zones",
        source_features = ["NELSON"],
        label = FORMAT("3 buffer zones from %s model", sensor_model)
    )
```

### GEN-08: Classified Reference Points (E03 #081)

**Result type**: `mutation/analysis/zone_classified`
**Renderer output**: Map layer (recolored Points) — NOT a chart
**Fixture**: `zone-classified-points.json`

```pseudocode
FUNCTION generate_classified_points():
    # Classify 25 reference points by zone membership
    # Zone assignments based on distance from track centroid
    classifications = [
        # inner zone (red): 12 points
        {ids: ["ref-pt-006","ref-pt-007","ref-pt-008",
               "ref-pt-011","ref-pt-012","ref-pt-013",
               "ref-pt-016","ref-pt-017","ref-pt-018",
               "ref-pt-021","ref-pt-022","ref-pt-023"],
         zone: "inner", color: "#e74c3c"},
        # middle zone (orange): 8 points
        {ids: ["ref-pt-001","ref-pt-002","ref-pt-003",
               "ref-pt-005","ref-pt-009","ref-pt-010",
               "ref-pt-015","ref-pt-019"],
         zone: "middle", color: "#f39c12"},
        # outer zone (green): 3 points
        {ids: ["ref-pt-004","ref-pt-014","ref-pt-024"],
         zone: "outer", color: "#27ae60"},
        # beyond (grey): 2 points
        {ids: ["ref-pt-000","ref-pt-020"],
         zone: "beyond", color: "#95a5a6"}
    ]

    features = []
    FOR group IN classifications:
        FOR id IN group.ids:
            features.APPEND(GeoJSON_Feature(
                id = id,
                geometry = Point(lookup_original_coords(id)),
                properties = {
                    kind: "reference",
                    name: id,
                    zone: group.zone,
                    style: {
                        point: {radius: 6, fill: true, fill_color: group.color, fill_opacity: 0.8}
                    }
                }
            ))

    RETURN wrap_as_mutation(
        data = features,
        result_subtype = "analysis/zone_classified",
        source_features = ["ref-points-001", "buffer-inner", "buffer-middle", "buffer-outer"],
        label = "Classified 25 reference points by buffer zone"
    )
```

### GEN-09: Track Styling Mutation

**Result type**: `mutation/track/styled`
**Renderer output**: Map layer (restyled track) — NOT a chart
**Fixture**: already exists as `mutation.json` (smoothed), adding `track-styled.json`

```pseudocode
FUNCTION generate_styled_track():
    RETURN wrap_as_mutation(
        data = GeoJSON_Feature(
            id = "COLLINGWOOD",
            geometry = LineString([
                [-4.22, 50.34], [-4.20, 50.35], [-4.18, 50.36],
                [-4.16, 50.37], [-4.14, 50.38]
            ]),
            properties = {
                kind: "TRACK",
                name: "COLLINGWOOD",
                times: ["2024-03-15T06:00:00Z", ... ],
                style: {
                    line: {stroke: true, color: "#2980b9", weight: 3, opacity: 0.9},
                    point: {shape: "circle", radius: 4, fill: true, fill_color: "#2980b9"}
                }
            }
        ),
        result_subtype = "track/styled",
        source_features = ["COLLINGWOOD"],
        label = "Set COLLINGWOOD color to blue"
    )
```

### GEN-10: Outlier Report Artifact

**Result type**: `artifact/report/outlier_summary`
**Renderer output**: JSON report panel or structured card
**Fixture**: already in `multi-result.json`, adding standalone `outlier-report.json`

```pseudocode
FUNCTION generate_outlier_report():
    report = {
        outliers: 5,
        threshold_sigma: 2.5,
        method: "modified_z_score",
        affected_contacts: [
            {id: "contact_012", z_score: 3.1, time: "2024-03-15T08:15:00Z"},
            {id: "contact_027", z_score: 2.8, time: "2024-03-15T09:30:00Z"},
            {id: "contact_034", z_score: 4.2, time: "2024-03-15T10:05:00Z"},
            {id: "contact_041", z_score: 2.7, time: "2024-03-15T10:45:00Z"},
            {id: "contact_058", z_score: 3.5, time: "2024-03-15T11:20:00Z"}
        ],
        total_contacts: 72,
        retention_rate: 0.931
    }

    RETURN wrap_as_artifact(
        data = JSON.encode(report),
        mime_type = "application/json",
        result_subtype = "report/outlier_summary",
        source_features = ["NELSON"],
        label = "Outlier analysis: 5 of 72 contacts removed (σ > 2.5)",
        href = "./results/outlier_report_001.json"
    )
```

## Wrapper Functions (Schema Compliance)

All generators use these wrappers to produce MCP-compliant output:

```pseudocode
FUNCTION wrap_as_addition(data, result_subtype, source_features, label):
    IF data IS list:  # multiple features
        content = []
        FOR feature IN data:
            content.APPEND({
                type: "resource",
                resource: {
                    uri: FORMAT("feature://%s", feature.id),
                    mimeType: "application/geo+json",
                    text: JSON.encode(feature)
                },
                annotations: {
                    "debrief:resultType": FORMAT("addition/%s", result_subtype),
                    "debrief:sourceFeatures": source_features,
                    "debrief:label": label
                }
            })
    ELSE:  # non-GeoJSON dataset
        content = [{
            type: "resource",
            resource: {
                uri: FORMAT("dataset://%s", generate_uuid()),
                mimeType: "application/json",
                text: JSON.encode(data)
            },
            annotations: {
                "debrief:resultType": FORMAT("addition/%s", result_subtype),
                "debrief:sourceFeatures": source_features,
                "debrief:label": label
            }
        }]
    RETURN {content: content}

FUNCTION wrap_as_mutation(data, result_subtype, source_features, label):
    # Same as addition but with "mutation/" prefix
    # data is always GeoJSON Feature or list of Features
    ...

FUNCTION wrap_as_artifact(data, mime_type, result_subtype, source_features, label, href):
    IF mime_type STARTS WITH "image/":
        content_item = {
            type: "image",
            data: base64_encode(data),
            mimeType: mime_type,
            annotations: {
                "debrief:resultType": FORMAT("artifact/%s", result_subtype),
                "debrief:sourceFeatures": source_features,
                "debrief:label": label,
                "debrief:href": href
            }
        }
    ELSE:
        content_item = {
            type: "resource",
            resource: {
                uri: FORMAT("artifact://%s", href),
                mimeType: mime_type,
                text: data
            },
            annotations: { ... }
        }
    RETURN {content: [content_item]}
```

## Fixture File Summary

| # | Fixture File | Result Type | Transformer Target |
|---|-------------|-------------|-------------------|
| 1 | `range-bearing-series.json` | `addition/dataset/range_bearing_series` | Line chart |
| 2 | `track-statistics.json` | `addition/track/statistics` | Summary card |
| 3 | `region-statistics.json` | `addition/region/statistics` | Summary card |
| 4 | `zone-histogram.json` | `addition/dataset/zone_histogram` | Bar chart |
| 5 | `reference-points.json` | `addition/analysis/reference_points` | Map layer |
| 6 | `track-offset.json` | `mutation/track/offset` | Map layer |
| 7 | `buffer-zones.json` | `addition/analysis/buffer_zones` | Map layer |
| 8 | `zone-classified-points.json` | `mutation/analysis/zone_classified` | Map layer |
| 9 | `track-styled.json` | `mutation/track/styled` | Map layer |
| 10 | `outlier-report.json` | `artifact/report/outlier_summary` | Report card |

**Transformer priority** (for E04 #085 development):
1. `zone-histogram.json` — bar chart (E03 demo critical path)
2. `range-bearing-series.json` — line chart (most common analysis output)
3. `track-statistics.json` — summary card
4. `region-statistics.json` — summary card
5. `outlier-report.json` — structured report

## Implementation Notes

- Generators are **test utilities**, not production tools — they live alongside fixtures
- Each fixture must pass existing `tool-result.yaml` schema validation
- Fixtures can be implemented in Python or TypeScript (language-neutral pseudocode above)
- E04 renderer development can start immediately using these fixtures
- E03 tool implementations (#078-082) will produce data matching these fixtures
