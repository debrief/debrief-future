# Schema Round-Trip Evidence: Time-Range Scenes (#263)

This document captures the cross-language round-trip evidence for the new
`TimeRange` class and the `SceneProperties.viewport_end` slot. Round-trip
direction tested: **LinkML → Pydantic → JSON → TypeScript → JSON →
Pydantic**.

## Source: LinkML (`shared/schemas/src/linkml/storyboard.yaml`)

```yaml
classes:
  TimeRange:
    attributes:
      start:
        range: datetime
        required: true
      end:
        range: datetime
        required: true

  SceneProperties:
    attributes:
      ...
      time_range:
        range: TimeRange     # was: range: string (reserved-null slot)
        required: false
      viewport_end:          # NEW
        range: Viewport
        required: false
      ...
    rules:
      - description: Scene flavour XOR
        preconditions:
          slot_conditions: { time_range: { value_presence: PRESENT } }
        postconditions:
          slot_conditions: { viewport_end: { value_presence: PRESENT } }
      - description: Scene flavour XOR (reverse)
        preconditions:
          slot_conditions: { viewport_end: { value_presence: PRESENT } }
        postconditions:
          slot_conditions: { time_range: { value_presence: PRESENT } }
```

## Generated Pydantic (`src/generated/python/debrief_schemas/__init__.py`)

```python
class TimeRange(ConfiguredBaseModel):
    """
    Time interval for a time-range Scene (#263). The interval is closed on
    both ends. `end` MUST be strictly greater than `start`.
    """
    start: datetime
    end: datetime

class SceneProperties(BaseFeatureProperties):
    # ... existing fields ...
    time_range: Optional[TimeRange] = Field(default=None, ...)
    viewport_end: Optional[Viewport] = Field(default=None, ...)
    # rules block preserved in linkml_meta for inspection
```

**Note on Pydantic enforcement**: LinkML 1.7's `rules:` block translates
to JSON Schema `if/then` constraints but does **not** generate Pydantic
`model_validator` functions. The XOR cross-field rule is enforced at the
application layer (`flavourCheck` in `validate.ts`) and on the JSON-Schema
boundary. Pinned by the explicit
`test_pydantic_does_not_reject_xor_violations` test so any future LinkML
upgrade surfaces.

## Generated JSON Schema (`src/generated/json-schema/debrief.schema.json`)

The XOR rules lower cleanly to JSON Schema's `if/then`:

```json
{
  "$defs": {
    "TimeRange": {
      "additionalProperties": false,
      "properties": {
        "start": { "type": "string", "format": "date-time" },
        "end":   { "type": "string", "format": "date-time" }
      },
      "required": ["end", "start"],
      "title": "TimeRange",
      "type": "object"
    },
    "SceneProperties": {
      "allOf": [
        {
          "if": {
            "properties": { "time_range": {} },
            "required": ["time_range"]
          },
          "then": {
            "properties": { "viewport_end": {} },
            "required": ["viewport_end"]
          }
        },
        {
          "if": {
            "properties": { "viewport_end": {} },
            "required": ["viewport_end"]
          },
          "then": {
            "properties": { "time_range": {} },
            "required": ["time_range"]
          }
        }
      ],
      "properties": {
        "time_range": {
          "anyOf": [{ "$ref": "#/$defs/TimeRange" }, { "type": "null" }]
        },
        "viewport_end": {
          "anyOf": [{ "$ref": "#/$defs/Viewport" }, { "type": "null" }]
        }
      }
    }
  }
}
```

## Generated TypeScript (`src/generated/typescript/types.ts`)

```ts
/**
 * Time interval for a time-range Scene (#263).
 */
export interface TimeRange {
  /** ISO-8601 instant. */
  start: string,
  /** ISO-8601 instant. MUST be strictly greater than `start`. */
  end: string,
}

export interface SceneProperties {
  // ... existing fields ...
  time_range?: TimeRange,
  viewport_end?: Viewport,
}
```

## Round-trip evidence — valid time-range Scene

### Fixture: `shared/schemas/fixtures/scene-263-time-range-valid.json`

```json
{
  "type": "Feature",
  "id": "01HZ263263263263263263263A",
  "properties": {
    "kind": "STORYBOARD_SCENE",
    "id": "01HZ263263263263263263263A",
    "storyboard_id": "01HZ7777777777777777777777",
    "title": "151200Z MAY 26",
    "viewport": { "center": [-1.25, 50.75], "zoom": 11.0, "bearing": 0 },
    "viewport_end": { "center": [-1.10, 50.85], "zoom": 12.0, "bearing": 0 },
    "timestamp": "2026-05-15T12:00:00Z",
    "time_range": {
      "start": "2026-05-15T12:00:00Z",
      "end":   "2026-05-15T12:01:30Z"
    },
    ...
  }
}
```

### Pydantic round-trip (Python)

`test_time_range_scene_round_trip` parses the fixture, serialises via
`model_dump_json(by_alias=True)`, re-parses, and asserts:

- `reparsed.properties.time_range.start == feature.properties.time_range.start`
- `reparsed.properties.time_range.end == feature.properties.time_range.end`
- `reparsed.properties.viewport_end.center == feature.properties.viewport_end.center`
- `reparsed.properties.viewport_end.zoom == feature.properties.viewport_end.zoom`

**Result**: PASS — byte-equivalent round-trip.

### TypeScript round-trip

`round-trips a time-range Scene preserving both flavour slots` in
`tests/ts/storyboard-scene-flavour.test.ts` parses the same fixture via
`JSON.parse`, runs `JSON.stringify → JSON.parse`, and asserts:

- `result.properties.time_range?.start === fixture.properties.time_range?.start`
- `result.properties.time_range?.end === fixture.properties.time_range?.end`
- `result.properties.viewport_end?.center` is `toEqual` to the original
- The whole feature is deep-equal to the source

**Result**: PASS — JSON parse/stringify is lossless under the new
schema.

## Round-trip evidence — instant Scene (regression anchor)

### Fixture: `shared/schemas/fixtures/scene-258-with-display-mode.json`

A pre-#263 instant Scene. Round-trip asserts:

- `feature.properties.time_range` is `None` / `undefined` after parse.
- Serialising with `exclude_none=True` / `JSON.stringify` does NOT inject
  `time_range` or `viewport_end` keys into the JSON.
- Deep-equality holds across the round-trip.

**Result**: PASS — no implicit defaults injected; Article III.2 source
preservation honoured. The instant flavour is unchanged from #259.

## Round-trip evidence — invalid fixtures (negative coverage)

### `scene-263-time-range-missing-viewport-end.json`

`time_range` set, `viewport_end` absent. Application-layer validation:

```ts
flavourCheck(scene); // throws SceneFlavourXorViolationError
```

Pydantic parses the structure cleanly (no rules-generated validator), so
the test `test_pydantic_does_not_reject_xor_violations` pins that
behaviour. JSON Schema rejects via the `if/then` rule.

### `scene-263-instant-with-viewport-end.json`

`viewport_end` set, `time_range` absent. Same dual-layer outcome:
application layer throws `SceneFlavourXorViolationError`; JSON Schema
rejects via the reverse `if/then` rule.

### `scene-263-time-range-end-not-after-start.json`

`time_range.end <= time_range.start`. Pydantic parses (datetimes are
well-formed); `flavourCheck` throws
`SceneTimeRangeEndNotAfterStartError`.

## Cross-language consistency

| Layer | Time-range valid | XOR missing viewport_end | XOR instant with viewport_end | Reversed range |
|-------|------------------|---------------------------|--------------------------------|----------------|
| LinkML rules | ✓ | rejected | rejected | rejected (datetime compare — application layer) |
| JSON Schema (`if/then`) | ✓ | rejected | rejected | n/a (datetime compare not lowerable) |
| Pydantic | ✓ (structural) | structurally valid (XOR is app-layer) | structurally valid | structurally valid (app-layer rejects) |
| TypeScript types | ✓ (`Optional` slots) | compile-time: still `SceneFeature`; runtime: rejected | runtime: rejected | runtime: rejected |
| `flavourCheck` (TS, runtime) | ✓ | `SceneFlavourXorViolationError` | `SceneFlavourXorViolationError` | `SceneTimeRangeEndNotAfterStartError` |
| `createScene` (TS, CRUD) | ✓ | thrown before mutation | thrown before mutation | thrown before mutation |

The XOR + range-validity rules are **layered** rather than enforced in one
place: the structural shape lives in LinkML (and propagates everywhere),
the cross-field semantics live in the application layer (one TS function,
one Python test pin). This is consistent with the spec's data-model §3
review note 2A.
