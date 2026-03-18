# Data Model: REP Loader Temporal Metadata (#137)

**Date**: 2026-03-18

## Entity Changes

### STAC Item Properties (extended)

The STAC Item `properties` object gains two new optional fields alongside the existing `datetime`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `datetime` | ISO 8601 string | Yes | Representative timestamp — set to earliest track timestamp when tracks present, otherwise creation time |
| `start_datetime` | ISO 8601 string | No | Earliest timestamp across all tracks in the plot |
| `end_datetime` | ISO 8601 string | No | Latest timestamp across all tracks in the plot |

**Rules**:
- When tracks with temporal data exist: all three fields are populated
- When no tracks or no temporal data: `datetime` = creation time, `start_datetime`/`end_datetime` absent
- `start_datetime` <= `datetime` <= `end_datetime` (invariant)

### Track Feature Properties (unchanged)

No changes to track features. The following existing properties serve as **input** for temporal extent computation:

| Field | Type | Description |
|-------|------|-------------|
| `start_time` | ISO 8601 string | Earliest position timestamp in this track |
| `end_time` | ISO 8601 string | Latest position timestamp in this track |
| `kind` | string | Feature type — only features with `kind = "TRACK"` contribute to temporal extent |

### PlotMetadata Model (extended)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | str | required | Plot title |
| `description` | str or None | None | Plot description |
| `timestamp` | datetime | now(UTC) | Plot datetime (alias: "datetime") |
| `start_datetime` | datetime or None | None | **NEW** — temporal extent start |
| `end_datetime` | datetime or None | **NEW** — temporal extent end |

## State Transitions

```
create_plot() → Item with datetime=now(), no start/end
    ↓
add_features() → Features stored in features.geojson
    ↓
update_temporal_metadata() → Item updated:
    datetime = min(track.start_time for all tracks)
    start_datetime = min(track.start_time for all tracks)
    end_datetime = max(track.end_time for all tracks)
```

## Validation Rules

1. If `start_datetime` is set, `end_datetime` MUST also be set (and vice versa)
2. `start_datetime` MUST be <= `end_datetime`
3. `datetime` MUST be >= `start_datetime` and <= `end_datetime` when all three are present
4. All datetime values MUST be UTC (timezone-aware)
