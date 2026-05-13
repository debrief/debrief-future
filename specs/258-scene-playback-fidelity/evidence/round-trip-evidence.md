# Round-Trip Evidence: SceneProperties.display_mode + _polygon_source

**Feature**: 258 | **Captured**: 2026-05-12 | **HEAD**: `fb7b0b1`

Spec #258 adds two new optional slots to `SceneProperties`. This evidence
demonstrates that both slots survive every leg of the round-trip pipeline
(Pydantic → JSON wire → Pydantic, and JSON → TypeScript → JSON) without loss
or unintended default injection.

## Schema source (`shared/schemas/src/linkml/storyboard.yaml`)

Two LinkML additions:

```yaml
enums:
  # ... DisplayModeEnum mirrored from session-state.yaml ...
  PolygonSourceEnum:
    description: Provenance of a Scene's stored polygon geometry. ...
    permissible_values:
      bounds:        # post-#258 norm — trust the on-disk polygon
      placeholder:   # pre-#258 ~100m square — recompute on render
      manual:        # reserved — user-drawn rectangles

classes:
  SceneProperties:
    is_a: BaseFeatureProperties
    attributes:
      # ... existing slots ...
      display_mode:
        range: DisplayModeEnum
        required: false
      _polygon_source:
        range: PolygonSourceEnum
        required: false
```

## Generated Pydantic model

```python
class SceneProperties(BaseFeatureProperties):
    # ... existing slots ...
    display_mode: Optional[DisplayModeEnum] = Field(default=None, ...)
    polygon_source: Optional[PolygonSourceEnum] = Field(
        default=None,
        alias="_polygon_source",  # ← preserves the on-disk underscore-prefix
        ...
    )
```

## Generated TypeScript type

```ts
export interface SceneProperties extends BaseFeatureProperties {
  // ... existing slots ...
  display_mode?: DisplayMode,           // narrowed to `'full' | 'trail'`
  _polygon_source?: PolygonSource,       // narrowed to `'bounds' | 'placeholder' | 'manual'`
}
```

The `DisplayMode` and `PolygonSource` template-literal types are added by
the post-processor in `shared/schemas/scripts/generate.py` (mirrors the
existing `PlaybackState` narrowing for `TemporalSlice`).

## Fixture A — post-#258 scene (both slots present)

`shared/schemas/fixtures/scene-258-with-display-mode.json`:

```json
{
  "type": "Feature",
  "id": "01HZ8K8K8K8K8K8K8K8K8K8K8K",
  "geometry": { "type": "Polygon", "coordinates": [[ ... 5-point ring ... ]] },
  "properties": {
    "kind": "STORYBOARD_SCENE",
    "id": "01HZ8K8K8K8K8K8K8K8K8K8K8K",
    "storyboard_id": "01HZ7777777777777777777777",
    "title": "121530Z MAR 26",
    "viewport": { "center": [-1.25, 50.75], "zoom": 11.0, "bearing": 0 },
    "timestamp": "2026-03-12T15:30:00Z",
    "visible_feature_ids": ["track-001", "track-002"],
    "feature_set_hash": "0000...0000",
    "thumbnail_asset_ref": "scene-thumbnail-01HZ8K8K8K8K8K8K8K8K8K8K8K",
    "transition_duration_ms": 500,
    "display_mode": "trail",
    "_polygon_source": "bounds"
  }
}
```

### Python round-trip

```python
raw = json.loads(Path("scene-258-with-display-mode.json").read_text())
feature = SceneFeature.model_validate(raw)
assert feature.properties.display_mode == DisplayModeEnum.trail
assert feature.properties.polygon_source == PolygonSourceEnum.bounds

# Serialise → JSON → parse back
serialised = feature.model_dump_json(by_alias=True)
reparsed = SceneFeature.model_validate_json(serialised)
assert reparsed.properties.display_mode == DisplayModeEnum.trail
assert reparsed.properties.polygon_source == PolygonSourceEnum.bounds
assert reparsed.geometry.coordinates == feature.geometry.coordinates
```

✅ Test `shared/schemas/tests/test_scene_properties_258.py::test_with_display_mode_round_trips` — PASS

### TypeScript round-trip

```ts
const fixture = loadFixture<SceneFeature>("scene-258-with-display-mode.json");
const result = JSON.parse(JSON.stringify(fixture));
expect(result.properties.display_mode).toBe("trail");
expect(result.properties._polygon_source).toBe("bounds");
expect(result).toEqual(fixture);  // deep equality
```

✅ Test `shared/schemas/tests/ts/scene-properties-258.test.ts > preserves display_mode=trail and _polygon_source=bounds` — PASS

## Fixture B — legacy scene (both slots absent)

`shared/schemas/fixtures/scene-258-legacy.json`:

```json
{
  "type": "Feature",
  "id": "01HZ8M2N3P4Q5R6S7T8V9W0X1Y",
  "geometry": { "type": "Polygon", "coordinates": [[ ... tiny ~100m square ... ]] },
  "properties": {
    "kind": "STORYBOARD_SCENE",
    "id": "01HZ8M2N3P4Q5R6S7T8V9W0X1Y",
    "storyboard_id": "01HZ7777777777777777777777",
    "title": "121500Z MAR 26",
    "viewport": { "center": [-1.5, 50.75], "zoom": 8.0, "bearing": 0 },
    "timestamp": "2026-03-12T15:00:00Z",
    "visible_feature_ids": ["track-001"],
    "feature_set_hash": "0000...0000",
    "thumbnail_asset_ref": "scene-thumbnail-01HZ8M2N3P4Q5R6S7T8V9W0X1Y",
    "transition_duration_ms": 500
  }
}
```

### Python round-trip — no defaults injected

```python
raw = json.loads(Path("scene-258-legacy.json").read_text())
feature = SceneFeature.model_validate(raw)
assert feature.properties.display_mode is None
assert feature.properties.polygon_source is None

# Round-trip with exclude_none=True — both slots stay absent in the wire form
serialised = feature.model_dump_json(by_alias=True, exclude_none=True)
parsed_back = json.loads(serialised)
assert "display_mode" not in parsed_back["properties"]
assert "_polygon_source" not in parsed_back["properties"]
```

✅ Tests `test_legacy_fixture_parses_without_optional_slots` + `test_legacy_round_trips_without_introducing_slots` — PASS

### TypeScript round-trip — both slots stay undefined

```ts
const fixture = loadFixture<SceneFeature>("scene-258-legacy.json");
const result = JSON.parse(JSON.stringify(fixture));
expect(result.properties.display_mode).toBeUndefined();
expect(result.properties._polygon_source).toBeUndefined();
expect(result).toEqual(fixture);
```

✅ Test `legacy scene (no display_mode / no _polygon_source) round-trips unchanged` — PASS

## Enum membership

Out-of-vocabulary values are rejected at the Pydantic boundary:

```python
raw = json.loads(Path("scene-258-with-display-mode.json").read_text())
raw["properties"]["display_mode"] = "blink"
with pytest.raises(ValidationError):
    SceneFeature.model_validate(raw)

raw["properties"]["_polygon_source"] = "telemetry"
with pytest.raises(ValidationError):
    SceneFeature.model_validate(raw)
```

✅ Tests `test_display_mode_enum_membership` + `test_polygon_source_enum_membership` — PASS

The TypeScript template-literal types reject the same values at compile
time (`@ts-expect-error` confirmation in the test).

## Summary

Both new slots round-trip cleanly through Pydantic and TypeScript:

| Direction | Display mode preserved | Polygon-source preserved | Notes |
|---|---|---|---|
| JSON → Pydantic → JSON (alias=true) | ✓ | ✓ (`_polygon_source` alias preserved) | — |
| JSON → TS interface → JSON.stringify | ✓ | ✓ | Deep equality holds |
| Pydantic exclude_none=true with legacy fixture | ✓ (omitted) | ✓ (omitted) | No default injection |
| Enum vocabulary | rejected at boundary | rejected at boundary | FR-001/FR-006 enforced |

No information is lost or fabricated by the schema layer. The behavioural
contract (legacy compatibility, no implicit defaults, provenance integrity)
is intact in both languages.
