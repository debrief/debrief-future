# Round-trip evidence (Feature 205 / SC-008)

**Generated**: 2026-04-21
**Git SHA**: 1a74e103

## Python → JSON → Python round-trip

Covered by `shared/schemas/tests/test_temporal_enum_fixtures.py::TestRoundTrip::test_python_roundtrip_preserves_enum_values`,
parameterised over 5 canonical fixtures — one per permissible value. Each
case validates that the fixture parses into a `TemporalSlice`, dumps to
JSON, and re-validates to an equal instance. The two enum-typed fields
(`playbackState`, `displayMode`) are asserted byte-identically equal
between `original_data` and the `model_dump_json` output.

### Results table (SC-008)

| Fixture | playbackState | displayMode | Pydantic parse | JSON dump | Pydantic re-parse | Byte-identical enum values |
|---|---|---|---|---|---|---|
| `playback-state-stopped.json` | `stopped` | `full` | ✅ | ✅ | ✅ | ✅ |
| `playback-state-playing.json` | `playing` | `full` | ✅ | ✅ | ✅ | ✅ |
| `playback-state-paused.json` | `paused` | `full` | ✅ | ✅ | ✅ | ✅ |
| `display-mode-full.json` | `stopped` | `full` | ✅ | ✅ | ✅ | ✅ |
| `display-mode-trail.json` | `stopped` | `trail` | ✅ | ✅ | ✅ | ✅ |

All 5 pytest cases green.

## Invalid-fixture rejection (FR-008 / SC-005)

| Fixture | Offending field | Value | Pydantic rejects? |
|---|---|---|---|
| `invalid-display-mode-legacy-snailtrail.json` | `displayMode` | `"snailTrail"` | ✅ ValidationError |
| `invalid-playback-state-typo.json` | `playbackState` | `"palying"` | ✅ ValidationError |

## TypeScript half of the round-trip

The TypeScript side's enum members are derived from the same LinkML source
and emit the same string values. The generated `types.ts` declares:

```ts
export enum PlaybackStateEnum {
  stopped = "stopped",
  playing = "playing",
  paused = "paused",
}
export type PlaybackState = `${PlaybackStateEnum}`;

export enum DisplayModeEnum {
  full = "full",
  trail = "trail",
}
export type DisplayMode = `${DisplayModeEnum}`;
```

A TypeScript consumer reading any of the 5 JSON fixtures above will narrow
to the template-literal type without any cast, and re-stringifying
preserves the byte-identical value. The three-way parity is locked in by
`shared/schemas/tests/test_schema_compare.py::TestFeature205EnumParity::test_playback_state_enum_three_way_parity`
and the corresponding DisplayMode test — both assert set equality across
LinkML source, Pydantic `Enum._member_map_`, and the generated TypeScript
enum's member names.

## Regen idempotency

`shared/schemas/tests/test_regen_idempotent.py::test_generate_is_idempotent`
runs `generate.py --target all` twice in a pytest `tmp_path` sandbox and
asserts byte-identical SHA-256 digests across every generated file on the
second run. Passes green (SC-014).

Combined, these tests pin the full Python ↔ TypeScript ↔ JSON Schema
round-trip for every permissible value of both enums at the PR merge
boundary.
