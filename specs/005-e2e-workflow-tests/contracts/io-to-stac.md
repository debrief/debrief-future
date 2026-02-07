# Contract: debrief-io -> debrief-stac

## Boundary

**Producer**: `debrief_io.parse(path)` -> `ParseResult`
**Consumer**: `debrief_stac.features.add_features(catalog_path, plot_id, features)`

## Data Format

The io service produces `ParseResult.features` — a list of GeoJSON Feature dictionaries. The stac service accepts `Sequence[GeoJSONFeature]` where each element must be a valid GeoJSON Feature.

### Required Fields (stac validates these)

```python
{
    "type": "Feature",          # Must be exactly "Feature"
    "geometry": {               # Must be a valid GeoJSON geometry
        "type": str,            # "LineString", "Point", "Polygon", etc.
        "coordinates": list     # Coordinate array matching geometry type
    },
    "properties": dict          # Must be a dictionary (may be empty)
}
```

### Fields Produced by io (not validated by stac, but expected by calc)

```python
{
    "id": str,                          # UUID assigned by io
    "properties": {
        "kind": str,                    # "TRACK", "NARRATIVE", etc.
        "platform_id": str,             # Track identifier
        "times": list[str],             # ISO 8601 timestamps
        "source_file": str,             # Original file path
        "positions": list[dict],        # Kinematic data
        "start_time": str,              # ISO 8601
        "end_time": str                 # ISO 8601
    }
}
```

## Contract Assertions (what e2e tests verify)

1. Every feature in `ParseResult.features` is accepted by `add_features()` without raising `ValueError`
2. After `add_features()`, `read_plot()` returns an item whose FeatureCollection contains the same features (by id)
3. The plot's `bbox` reflects the actual coordinate bounds of all added features
4. Source file can be added as an asset via `add_asset()` using `ParseResult.source_file`

## Error Boundaries

- If io produces a feature without `geometry`, stac's `_validate_feature()` raises `ValueError`
- If io produces a feature without `type: "Feature"`, stac's `_validate_feature()` raises `ValueError`
- Parse warnings from io do not affect stac — they are informational only
