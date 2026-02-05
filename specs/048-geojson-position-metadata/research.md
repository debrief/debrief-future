# Research: GeoJSON Position Metadata Strategy

**Feature**: 048-geojson-position-metadata
**Date**: 2026-02-04

## Research Topics

This document captures technical decisions and research findings for the position metadata feature.

---

## 1. ISO 8601 Duration Parsing

### Decision
Use `isodate` library for Python and inline parsing for TypeScript (avoid new dependency).

### Rationale

**Python:**
- Standard library has no ISO 8601 duration parser (`datetime.timedelta` doesn't parse ISO strings)
- `isodate` is well-established, lightweight, and returns standard `timedelta` objects
- Already used in similar maritime/geospatial projects

**TypeScript:**
- For interval calculations with only hours/minutes/seconds, inline parsing is sufficient
- Avoids adding npm dependency for simple use case
- Pattern: Extract numeric values via regex, compute total milliseconds

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Python `isodate` | Mature, returns timedelta | External dependency | ✅ Selected |
| Python `isoduration` | Newer, better typing | Less widely used | Rejected |
| TypeScript `iso8601-duration` | Full ISO support | New npm dependency | Rejected |
| TypeScript `Temporal.Duration` | Native standard | Still in proposal, limited browser support | Future option |
| TypeScript inline parsing | No dependency | Limited to PT durations | ✅ Selected for MVP |

### Implementation Notes

**Python parsing:**
```python
from isodate import parse_duration

interval = parse_duration("PT5M")  # Returns timedelta
interval_ms = interval.total_seconds() * 1000
```

**TypeScript inline parsing (PT durations only):**
```typescript
function parsePTDuration(iso: string): number {
  // Parse "PT5M", "PT1H30M", "PT30S" to milliseconds
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!match) throw new Error(`Invalid duration: ${iso}`);
  const [, h, m, s] = match;
  return ((parseInt(h || '0') * 3600) +
          (parseInt(m || '0') * 60) +
          parseFloat(s || '0')) * 1000;
}
```

**Constraint:** Only support `PT` durations (hours/minutes/seconds). Full day/month/year durations (`P1D`, `P1M`) require a reference date and are out of scope for interval-based display.

---

## 2. Cross-Field Array Length Validation

### Decision
Implement parallel array validation via Pydantic `model_validator`, not LinkML rules.

### Rationale

- LinkML's `rules` section with `postconditions` exists but is not yet implemented for cross-field validation
- Pydantic v2 `model_validator` provides runtime validation with clear error messages
- Validation runs during deserialization, catching issues early

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| LinkML rules | Declarative, schema-level | Not implemented for array length comparison | Rejected |
| Pydantic `model_validator` | Works now, clear errors | Python-only (not in JSON Schema) | ✅ Selected |
| Custom test assertions | No runtime dependency | Only catches issues in tests | Supplementary |
| JSON Schema `if/then` | Cross-platform | Complex, limited array length support | Rejected |

### Implementation Notes

**Pydantic validator in generated model:**
```python
from pydantic import model_validator

class TrackFeature(BaseModel):
    geometry: GeoJSONLineString
    properties: TrackProperties

    @model_validator(mode='after')
    def validate_parallel_arrays(self) -> 'TrackFeature':
        coords_len = len(self.geometry.coordinates)
        positions_len = len(self.properties.positions)
        if coords_len != positions_len:
            raise ValueError(
                f"geometry.coordinates length ({coords_len}) must equal "
                f"properties.positions length ({positions_len})"
            )
        return self
```

**Note:** This validator must be added manually to the generated Pydantic model or via a post-generation hook, as LinkML generators don't produce cross-field validators.

---

## 3. Interval Alignment Algorithm

### Decision
Use "nearest position" algorithm: for each interval mark, show symbol at the position with timestamp closest to that mark.

### Rationale

- Track positions rarely align exactly with round intervals (e.g., positions at :00:03, :00:33, :01:03 won't match "every 30 seconds" exactly)
- "Nearest position" provides intuitive behavior matching user expectations
- Simple to implement with O(n) complexity

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Exact match only | Simple | Almost never matches; useless for real data | Rejected |
| Nearest position | Intuitive, handles irregular data | Slight visual offset from ideal | ✅ Selected |
| Floor/round to interval | Predictable pattern | May skip positions or double-mark | Rejected |
| Interpolate virtual positions | Precise interval markers | Adds complexity; markers not at real data | Rejected |

### Implementation Notes

**Algorithm:**
```typescript
function getIntervalPositions(
  timestamps: number[],  // epoch ms, sorted
  startTime: number,
  intervalMs: number
): number[] {
  const indices: number[] = [];
  let nextMark = startTime;

  for (let i = 0; i < timestamps.length; i++) {
    // If this position is closest to the current mark
    if (timestamps[i] >= nextMark - intervalMs/2) {
      indices.push(i);
      // Advance to next interval mark after this position
      nextMark = timestamps[i] + intervalMs;
    }
  }

  return indices;
}
```

**Edge cases:**
- First position always included (interval starts at track start)
- Last position included if within half-interval of a mark
- Empty track: no positions to mark

---

## 4. PositionStyleOverride Lookup Strategy

### Decision
Use parallel array with direct index lookup for O(1) override access.

### Rationale

- Extends existing parallel array pattern: `coordinates[i] ↔ positions[i] ↔ overrides[i]`
- Direct index lookup is simpler than Map construction
- No orphan timestamps possible - index guarantees correspondence
- Null entries for positions without overrides (minimal storage overhead)

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Sparse array keyed by timestamp | Smaller storage | Requires Map build, orphan risk | Rejected |
| Parallel array with nulls | O(1) direct lookup, guaranteed correspondence | Nulls for unoverridden positions | ✅ Selected |

### Implementation Notes

**Direct index lookup:**
```typescript
// No Map construction needed
const override = track.position_style_overrides?.[i] ?? null;
if (override?.show_symbol !== undefined) {
  showSymbol = override.show_symbol;
}
```

**Consistency with existing pattern:**
```typescript
// All three arrays have same length
const coord = track.geometry.coordinates[i];      // [lon, lat]
const position = track.properties.positions[i];   // { time, course, speed, ... }
const override = track.properties.position_style_overrides?.[i];  // { show_symbol, label, ... } or null
```

---

## 5. Default Position Style Handling

### Decision
`default_position_style` is required on `TrackProperties`. All boolean fields default to `false` if not explicitly set.

### Rationale

- Explicit defaults avoid ambiguity in style resolution
- Matches legacy Debrief behavior (symbols off by default)
- Required field ensures every track has defined baseline styling

### Schema Design

```yaml
PositionStyle:
  attributes:
    show_symbol:
      range: boolean
      required: true
    symbol:
      range: PointShapeEnum
      required: true
    show_label:
      range: boolean
      required: true

TrackProperties:
  attributes:
    default_position_style:
      range: PositionStyle
      required: true
```

---

## Summary of Decisions

| Topic | Decision | Key Reason |
|-------|----------|------------|
| Duration parsing (Python) | `isodate` library | Mature, returns timedelta |
| Duration parsing (TypeScript) | Inline PT parser | Avoid dependency for simple case |
| Array length validation | Pydantic `model_validator` | LinkML rules not implemented |
| Interval alignment | Nearest position algorithm | Handles irregular timestamps |
| Override lookup | Map by timestamp string | O(1) lookup for sparse overrides |
| Default style | Required field, booleans default false | Explicit, matches legacy behavior |
