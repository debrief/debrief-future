# Quickstart: GeoJSON Position Metadata

**Feature**: 048-geojson-position-metadata
**Audience**: Developers implementing this feature

## Prerequisites

- Python 3.11+ with `uv` for dependency management
- Node.js 18+ with `pnpm` for TypeScript tooling
- LinkML CLI installed (`pip install linkml`)
- Familiarity with the schema generation pipeline

## Implementation Order

### Step 1: Schema Changes (LinkML)

**Files to modify:**
- `shared/schemas/src/linkml/common.yaml` - Remove coordinates from TimestampedPosition
- `shared/schemas/src/linkml/styling.yaml` - Add PositionStyle, PositionStyleOverride
- `shared/schemas/src/linkml/geojson.yaml` - Add new fields to TrackProperties

**Verification:**
```bash
cd shared/schemas
make lint  # Validate LinkML syntax
```

### Step 2: Add Parallel Array Validator

**File:** `shared/schemas/src/pydantic_hooks/track_validators.py` (new file)

Add Pydantic model_validator for TrackFeature to enforce:
```
len(geometry.coordinates) == len(properties.positions)
```

See `data-model.md` for implementation details.

### Step 3: Migrate Fixtures

**Files to update:**
- `shared/schemas/src/fixtures/valid/track-feature-valid-01.json`
- `shared/schemas/src/fixtures/valid/track-feature-valid-02.json`

**Changes:**
1. Remove `coordinates` from each position in `properties.positions[]`
2. Add `default_position_style` to properties:
   ```json
   "default_position_style": {
     "show_symbol": false,
     "symbol": "circle",
     "show_label": false
   }
   ```

### Step 4: Add New Fixture

**File:** `shared/schemas/src/fixtures/valid/track-feature-position-styling.json`

Create fixture demonstrating:
- `default_position_style` with custom values
- `symbol_interval: "PT5M"`
- `position_style_overrides` array with 1-2 entries

### Step 5: Regenerate Schemas

```bash
cd shared/schemas
make generate  # Regenerate Pydantic, TypeScript, JSON Schema
make test      # Run all schema tests
```

### Step 6: Update Track Renderer

**File:** `apps/vscode/src/webview/web/trackRenderer.ts`

Add methods:
1. `resolvePositionStyle(track, positionIndex)` - Apply style cascade
2. `renderPositionSymbols(track)` - Render symbols for positions where show_symbol=true
3. `renderPositionLabels(track)` - Render labels for positions where show_label=true

Integrate into `renderTrack()` method.

### Step 7: Add Renderer Tests

**File:** `apps/vscode/tests/unit/trackRenderer.test.ts` (or create)

Test cases:
- Default style only (no interval, no overrides)
- Interval-based symbols at 5-min marks
- Override suppressing a symbol
- Override adding custom label

## Key Files Reference

| File | Purpose |
|------|---------|
| `shared/schemas/src/linkml/common.yaml` | TimestampedPosition definition |
| `shared/schemas/src/linkml/styling.yaml` | PositionStyle, PositionStyleOverride |
| `shared/schemas/src/linkml/geojson.yaml` | TrackProperties definition |
| `shared/schemas/Makefile` | Schema generation commands |
| `apps/vscode/src/webview/web/trackRenderer.ts` | Map rendering logic |

## Common Pitfalls

1. **Forgetting to update all fixtures** - The schema validation will fail until all fixtures match the new schema.

2. **Interval duration format** - Use `PT5M` not `5M` or `5 minutes`. The `T` separator is required.

3. **Parallel array mismatch** - If you add/remove positions, you must also add/remove coordinates AND overrides (if present).

4. **Missing default_position_style** - This field is required. Every track must have it.

5. **Override array length mismatch** - If `position_style_overrides` is present, it must have exactly the same length as `positions`. Use `null` for positions without overrides.

## Validation Commands

```bash
# Validate schemas
cd shared/schemas && make lint

# Run Python tests
cd shared/schemas && make test

# Run TypeScript checks
cd apps/vscode && pnpm typecheck

# Run full test suite
pnpm test
```

## Example Track with Position Styling

```json
{
  "type": "Feature",
  "id": "track-001",
  "geometry": {
    "type": "LineString",
    "coordinates": [[-5.0, 50.0], [-4.9, 50.1], [-4.8, 50.2]]
  },
  "properties": {
    "kind": "TRACK",
    "platform_id": "HMS-EXAMPLE",
    "track_type": "OWNSHIP",
    "start_time": "2026-01-09T10:00:00Z",
    "end_time": "2026-01-09T12:00:00Z",
    "positions": [
      {"time": "2026-01-09T10:00:00Z", "course": 45, "speed": 12},
      {"time": "2026-01-09T11:00:00Z", "course": 45, "speed": 12},
      {"time": "2026-01-09T12:00:00Z", "course": 45, "speed": 12}
    ],
    "default_position_style": {
      "show_symbol": false,
      "symbol": "circle",
      "show_label": false
    },
    "symbol_interval": "PT1H",
    "label_interval": null,
    "position_style_overrides": [
      null,
      {"show_symbol": true, "show_label": true, "label": "Contact Alpha"},
      null
    ],
    "style": {
      "line": {"color": "#0066CC", "weight": 2},
      "point": {"shape": "circle", "radius": 4, "fill_color": "#0066CC", "color": "#FFFFFF"}
    }
  }
}
```

**Note**: The `position_style_overrides` array is parallel to `positions`:
- Index 0: `null` → position 0 uses defaults + interval rules
- Index 1: `{...}` → position 1 has custom symbol and label
- Index 2: `null` → position 2 uses defaults + interval rules
