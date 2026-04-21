# LinkML Source Patch

Target file: `shared/schemas/src/linkml/session-state.yaml`

## Change 1 — `ViewportPolygon` gains optional `zoom`

**Before**:

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
```

**After**:

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

## Change 2 — `TimeFilter` attributes change from `TimeInstant` to nullable epoch integer

**Before**:

```yaml
TimeFilter:
  description: Constraints on the visible time window
  attributes:
    start:
      description: Filter start (null = unbounded)
      range: TimeInstant
    end:
      description: Filter end (null = unbounded)
      range: TimeInstant
```

**After**:

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

## No change — `Coordinate`

The existing `Coordinate` class in `session-state.yaml` is already the canonical object form. No edit required.

## No change — `TimeInstant`, `TimeRange`

Retained as-is. `TimeInstant` continues to be used by `TimeRange` (out of scope for this feature).

## Regeneration

Running `pnpm --filter @debrief/schemas build` (or equivalent) MUST:

- Emit updated Pydantic models under `shared/schemas/generated/python/`.
- Emit updated TypeScript types under `shared/schemas/generated/typescript/`.
- Emit updated JSON Schema documents under `shared/schemas/generated/jsonschema/`.
- Pass all schema adherence tests.
