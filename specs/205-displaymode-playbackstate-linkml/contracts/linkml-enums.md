# Contract: LinkML enum edits and expected generator outputs

**Feature**: 205-displaymode-playbackstate-linkml
**Date**: 2026-04-21
**Input**: [data-model.md](../data-model.md) — the target shape. This doc pins the exact YAML and generator outputs the implementer must produce.

## 1. LinkML source edit

**File**: `shared/schemas/src/linkml/session-state.yaml`
**Section**: `enums:` (lines 24–40)

### Before

```yaml
enums:
  PlaybackStateEnum:
    description: Current state of time playback
    permissible_values:
      stopped:
        description: Playback is stopped
      playing:
        description: Playback is running
      paused:
        description: Playback is paused

  DisplayModeEnum:
    description: Track visualization display mode
    permissible_values:
      normal:
        description: Standard track display
      snailTrail:
        description: Trail showing recent positions
```

### After

```yaml
enums:
  PlaybackStateEnum:
    description: >-
      Current state of time playback. Component consumers treat
      `stopped` as equivalent to `paused`. See ADR-NN in
      docs/project_notes/decisions.md.
    permissible_values:
      stopped:
        description: Playback is stopped
      playing:
        description: Playback is running
      paused:
        description: Playback is paused

  DisplayModeEnum:
    description: >-
      Track visualization display mode. `full` renders the entire track
      regardless of current time; `trail` renders a snail-trail from
      track start up to current time.
    permissible_values:
      full:
        description: Render the entire track regardless of current time
      trail:
        description: Render a snail-trail from track start up to current time
```

**Diff summary**:
- `PlaybackStateEnum.description` — replaced single-line with short UI-agnostic description (review 7A) that cites the ADR via the FR-032 convention. UI-element detail (play button, pause button, playhead) moves to the ADR body, not the schema. No permissible-value edits.
- `DisplayModeEnum.description` — replaced with multi-line block describing the two canonical values.
- `DisplayModeEnum.permissible_values.normal` **renamed** to `full` with a new description.
- `DisplayModeEnum.permissible_values.snailTrail` **renamed** to `trail` with a new description.

**ADR-NN placeholder**: `ADR-NN` is a placeholder replaced at implementation time with the two-digit ADR number assigned during commit to `docs/project_notes/decisions.md`. The `See ADR-NN in docs/project_notes/decisions.md` cross-reference form is the convention introduced by FR-032 / review D3 and is validated at lint time by `scripts/check-adr-refs.sh` (which fails if the cited `ADR-NN` heading does not exist in `decisions.md`).

**No other LinkML edits anywhere in `shared/schemas/src/linkml/`.** Verified via `grep -rnE "PlaybackStateEnum|DisplayModeEnum|'normal'|'snailTrail'" shared/schemas/src/linkml/` — only `session-state.yaml` references these names, and no `.yaml` file carries the legacy value strings.

## 2. Generator post-processor edit

**File**: `shared/schemas/scripts/generate.py`
**Section**: immediately following the Feature 201 `PointShape` post-processing block (currently lines 439–475), before the existing `#214` / `#204` blocks.

### Rule to add

```python
# Post-process (Feature 205 / FR-007): narrow `playbackState: string` /
# `displayMode: string` on `TemporalSlice` to the template-literal unions
# `PlaybackState` / `DisplayMode` derived from PlaybackStateEnum /
# DisplayModeEnum. gen-typescript emits `string` for enum-ranged
# attributes (see Feature 201 / FR-014 precedent above); without this
# narrowing, callers cannot catch `{ playbackState: 'palying' }` or
# `{ displayMode: 'snailTrail' }` at compile time.
#
# Injected declarations mirror the PointShape pattern: a template-literal
# alias on the enum, placed immediately after the enum's closing brace.
_playback_state_decl = (
    "};\n"
    "/**\n"
    "* Template-literal derivation of the permissible playback states from\n"
    "* PlaybackStateEnum. Narrows the `playbackState` field on TemporalSlice\n"
    "* so TypeScript rejects an unknown state at compile time (Feature 205 /\n"
    "* FR-007).\n"
    "*/\n"
    "export type PlaybackState = `${PlaybackStateEnum}`;\n"
)
_display_mode_decl = (
    "};\n"
    "/**\n"
    "* Template-literal derivation of the permissible display modes from\n"
    "* DisplayModeEnum. Narrows the `displayMode` field on TemporalSlice so\n"
    "* TypeScript rejects an unknown mode at compile time (Feature 205 /\n"
    "* FR-007).\n"
    "*/\n"
    "export type DisplayMode = `${DisplayModeEnum}`;\n"
)
_playback_state_sentinel = "export enum PlaybackStateEnum {"
_display_mode_sentinel = "export enum DisplayModeEnum {"

if _playback_state_sentinel in content and "export type PlaybackState" not in content:
    enum_start = content.index(_playback_state_sentinel)
    enum_end = content.index("};\n", enum_start)
    content = (
        content[:enum_end]
        + _playback_state_decl
        + content[enum_end + len("};\n") :]
    )

if _display_mode_sentinel in content and "export type DisplayMode" not in content:
    enum_start = content.index(_display_mode_sentinel)
    enum_end = content.index("};\n", enum_start)
    content = (
        content[:enum_end]
        + _display_mode_decl
        + content[enum_end + len("};\n") :]
    )

# Narrow the two TemporalSlice fields from string → template-literal type.
_temporal_slice_start = content.find("export interface TemporalSlice {\n")
if _temporal_slice_start == -1:
    raise RuntimeError(
        "generate.py: gen-typescript did not emit `export interface TemporalSlice`."
    )
_temporal_slice_end = content.index("}\n", _temporal_slice_start) + 2
_temporal_slice_block = content[_temporal_slice_start:_temporal_slice_end]
_new_block = _temporal_slice_block.replace(
    "    playbackState: string,\n", "    playbackState: PlaybackState,\n", 1
).replace(
    "    displayMode: string,\n", "    displayMode: DisplayMode,\n", 1
)
if _new_block == _temporal_slice_block:
    raise RuntimeError(
        "generate.py: TemporalSlice enum-slot post-processor had no "
        "effect — gen-typescript output no longer contains the expected "
        "`playbackState: string` / `displayMode: string` tokens. Update "
        "generate.py (Feature 205)."
    )
content = (
    content[:_temporal_slice_start]
    + _new_block
    + content[_temporal_slice_end:]
)
```

### Rationale
- Sentinel-anchored replacement (not line-number-based) so description-text changes don't break the rule.
- `RuntimeError` on sentinel miss — same defensive pattern as the existing `RawGeoJSONFeature` rule at `generate.py:493-496` and `generate.py:517-523`.
- Template-literal injection placed inside the `};\n` replacement so the injection survives a regeneration where `gen-typescript` changes the enum's member spacing (the closing-brace sentinel is stable).

## 3. Expected generator outputs (regenerated artefacts)

### 3.1 `shared/schemas/src/generated/typescript/types.ts`

**Enum blocks** (lines 393–411 pre-feature; line numbers likely shift after regen — match by name, not line):

```ts
/**
 * Current state of time playback. Component consumers treat `stopped`
 * as equivalent to `paused`. See ADR-NN in
 * docs/project_notes/decisions.md.
 */
export enum PlaybackStateEnum {
    /** Playback is stopped */
    stopped = "stopped",
    /** Playback is running */
    playing = "playing",
    /** Playback is paused */
    paused = "paused",
};
/**
 * Template-literal derivation of the permissible playback states from
 * PlaybackStateEnum. Narrows the `playbackState` field on TemporalSlice
 * so TypeScript rejects an unknown state at compile time (Feature 205 /
 * FR-007).
 */
export type PlaybackState = `${PlaybackStateEnum}`;
/**
 * Track visualization display mode. `full` renders the entire track
 * regardless of current time; `trail` renders a snail-trail from
 * track start up to current time.
 */
export enum DisplayModeEnum {
    /** Render the entire track regardless of current time */
    full = "full",
    /** Render a snail-trail from track start up to current time */
    trail = "trail",
};
/**
 * Template-literal derivation of the permissible display modes from
 * DisplayModeEnum. Narrows the `displayMode` field on TemporalSlice so
 * TypeScript rejects an unknown mode at compile time (Feature 205 /
 * FR-007).
 */
export type DisplayMode = `${DisplayModeEnum}`;
```

**`TemporalSlice` interface** (currently at lines 1795–1810; match by name):

```ts
/**
 * Time-related state including navigation, playback, and filtering
 */
export interface TemporalSlice {
    /** Current playback/display time (FR-005) */
    currentTime?: TimeInstant,
    /** Full temporal extent of loaded data (FR-006) */
    timeRange?: TimeRange,
    /** Optional visible time window constraint (FR-007) */
    timeFilter?: TimeFilter,
    /** Step size for discrete navigation (FR-008) */
    stepSize: TimeStep,
    /** Playback speed multiplier 0.1-100x (FR-009) */
    playbackRate: number,
    /** Current playback state - ephemeral (FR-010) */
    playbackState: PlaybackState,
    /** Track visualization mode (FR-011) */
    displayMode: DisplayMode,
}
```

### 3.2 `shared/schemas/src/generated/python/debrief_schemas/__init__.py`

Relevant fragments (match by class name):

```python
class PlaybackStateEnum(str, Enum):
    """
    Current state of time playback. Component consumers treat `stopped` as
    equivalent to `paused`. See ADR-NN in docs/project_notes/decisions.md.
    """
    stopped = "stopped"
    playing = "playing"
    paused = "paused"


class DisplayModeEnum(str, Enum):
    """
    Track visualization display mode. `full` renders the entire track regardless
    of current time; `trail` renders a snail-trail from track start up to current time.
    """
    full = "full"
    trail = "trail"


class TemporalSlice(ConfiguredBaseModel):
    # ... other fields unchanged ...
    playbackState: PlaybackStateEnum = Field(
        default=..., description="""Current playback state - ephemeral (FR-010)""", ...
    )
    displayMode: DisplayModeEnum = Field(
        default=..., description="""Track visualization mode (FR-011)""", ...
    )
```

### 3.3 `shared/schemas/src/generated/json-schema/debrief.schema.json`

Relevant fragments (match by `$defs` key):

```json
{
  "$defs": {
    "PlaybackStateEnum": {
      "type": "string",
      "enum": ["stopped", "playing", "paused"],
      "description": "Current state of time playback. Component-side rendering rule ..."
    },
    "DisplayModeEnum": {
      "type": "string",
      "enum": ["full", "trail"],
      "description": "Track visualization display mode. `full` renders the entire track..."
    },
    "PlaybackStateEnum": {
      "type": "string",
      "enum": ["stopped", "playing", "paused"],
      "description": "Current state of time playback. Component consumers treat `stopped` as equivalent to `paused`. See ADR-NN in docs/project_notes/decisions.md."
    },
    "TemporalSlice": {
      "type": "object",
      "required": ["stepSize", "playbackRate", "playbackState", "displayMode"],
      "properties": {
        "playbackState": { "$ref": "#/$defs/PlaybackStateEnum" },
        "displayMode": { "$ref": "#/$defs/DisplayModeEnum" }
      }
    }
  }
}
```

Note: exact JSON Schema shape (ref resolution, `$defs` vs inline) follows whatever `gen-json-schema` produces today; the contract is only that the enum values change in the emitted file.

## 4. Invariants the regenerated artefacts MUST satisfy

1. **No legacy values survive.** The strings `"normal"` and `"snailTrail"` MUST NOT appear anywhere in `shared/schemas/src/generated/` after regeneration (verifiable: `grep -rE '"normal"|"snailTrail"' shared/schemas/src/generated/` returns zero matches).
2. **`PlaybackState` and `DisplayMode` template-literal types are exported** from `shared/schemas/src/generated/typescript/types.ts` and therefore from `@debrief/schemas` (transitive via the generated index barrel).
3. **`TemporalSlice.playbackState` and `.displayMode` are typed as `PlaybackState` / `DisplayMode`** in the generated TypeScript — not `string`, not `PlaybackStateEnum` (the bare enum).
4. **Pydantic field types are the bare enum classes** (`PlaybackStateEnum`, `DisplayModeEnum`) — not `str`. This is the Pydantic-native, Article-XV-compliant path.
5. **JSON Schema enum arrays contain exactly the canonical members** — `["stopped", "playing", "paused"]` and `["full", "trail"]`, in that order.
6. **The regeneration is idempotent** — running `python shared/schemas/scripts/generate.py all` twice produces byte-identical output on the second run (regression guard against non-deterministic ordering in the post-processor).

## 5. Schema-adherence fixture set (FR-008)

**Location**: `shared/schemas/fixtures/temporal-enums/` (new subdirectory, or wherever existing `TemporalSlice` fixtures live — plan-phase inventory finalises this path).

### Valid fixtures (5)

Each fixture is a minimal `TemporalSlice` JSON payload. All required slice fields are populated; only the field under test varies.

```json
// playback-state-stopped.json
{
  "stepSize": { "value": 1, "unit": "minute" },
  "playbackRate": 1.0,
  "playbackState": "stopped",
  "displayMode": "full"
}
```

```json
// playback-state-playing.json
{
  "stepSize": { "value": 1, "unit": "minute" },
  "playbackRate": 1.0,
  "playbackState": "playing",
  "displayMode": "full"
}
```

```json
// playback-state-paused.json
{
  "stepSize": { "value": 1, "unit": "minute" },
  "playbackRate": 1.0,
  "playbackState": "paused",
  "displayMode": "full"
}
```

```json
// display-mode-full.json
{
  "stepSize": { "value": 1, "unit": "minute" },
  "playbackRate": 1.0,
  "playbackState": "stopped",
  "displayMode": "full"
}
```

```json
// display-mode-trail.json
{
  "stepSize": { "value": 1, "unit": "minute" },
  "playbackRate": 1.0,
  "playbackState": "stopped",
  "displayMode": "trail"
}
```

### Invalid fixtures (≥ 2)

```json
// invalid-display-mode-legacy-snailtrail.json
{
  "stepSize": { "value": 1, "unit": "minute" },
  "playbackRate": 1.0,
  "playbackState": "stopped",
  "displayMode": "snailTrail"
}
// expected: Pydantic validation fails with "value is not a valid enum member"
```

```json
// invalid-playback-state-typo.json
{
  "stepSize": { "value": 1, "unit": "minute" },
  "playbackRate": 1.0,
  "playbackState": "palying",
  "displayMode": "full"
}
// expected: Pydantic validation fails
```

Optional third invalid fixture — `invalid-display-mode-legacy-normal.json` — mirrors the legacy-snailtrail regression guard.

### Round-trip test (`test_roundtrip.py`)

For each of the 5 valid fixtures, assert:

1. Pydantic parses the JSON → `TemporalSlice` instance.
2. `instance.model_dump_json()` → JSON string.
3. TypeScript (via the existing roundtrip harness or a manual fixture comparison) parses the JSON → the expected slice shape.
4. TypeScript re-emits the JSON.
5. Pydantic re-parses the TS-emitted JSON → instance.
6. Final instance equals the initial instance (byte-identical JSON round trip for the two enum-typed fields).

### Schema-compare test (`test_schema_compare.py`)

Assert that for each of `PlaybackStateEnum` and `DisplayModeEnum`:

1. The set of permissible values listed in the LinkML YAML `permissible_values` block equals
2. The set of values in the Pydantic `Enum._member_map_`, and
3. The set of values in the generated JSON Schema `enum` array.

This is the existing schema-compare harness; only the `ENTITY_MAP` or equivalent fixture map is extended.

## 6. Acceptance checks (to be run before commit)

Run in order:

```sh
# 1. Regenerate everything
cd shared/schemas && uv run python scripts/generate.py all && cd ../..

# 2. Verify canonical values in generated TS
grep -E '^\s*(full|trail|stopped|playing|paused) = "' shared/schemas/src/generated/typescript/types.ts
# expected: 5 matches (full, trail, stopped, playing, paused)

# 3. Verify no legacy values survive in generated artefacts
! grep -rE '"normal"|"snailTrail"' shared/schemas/src/generated/
# expected: exit 0 (no matches)

# 4. Verify template-literal types are emitted
grep -E 'export type (PlaybackState|DisplayMode) = `\$\{' shared/schemas/src/generated/typescript/types.ts
# expected: 2 matches

# 5. Verify TemporalSlice field narrowing
grep -E '(playbackState|displayMode): (PlaybackState|DisplayMode),' shared/schemas/src/generated/typescript/types.ts
# expected: 2 matches

# 6. Run schema-adherence suite
uv run pytest shared/schemas/tests/

# 7. Verify the regeneration is idempotent
cd shared/schemas && uv run python scripts/generate.py all && git diff --exit-code src/generated/
# expected: exit 0 (no changes on the second run)

# 8. Verify no hand-typed duplicates remain in consumer packages
! grep -rnE '^(export\s+)?type\s+(DisplayMode|PlaybackState)\b' apps/ shared/ services/ --include='*.ts' --include='*.tsx'
# expected: exit 0 (no matches)

# 9. Verify no translator ternaries remain
! grep -rnE "=== 'snailTrail'|=== 'normal' |(state|mode|temporal).*\\.displayMode === 'snailTrail'" apps/ shared/ --include='*.ts' --include='*.tsx'
# expected: exit 0 (no matches)
```

All 9 checks plus the 6 checks added post-review below MUST pass before the PR is ready for review.

### Post-review additional checks (review 1A + 2A + 3A + 9A + 10A + 11B + D1 + D2 + D3)

```sh
# 10. Verify the two `as never` casts at load.ts are gone (review 1A + D2 / SC-012)
! grep -nE "as never" services/session-state/src/persistence/load.ts
# expected: exit 0 (no `as never` remains in the file)

# 11. Verify the silent-narrowing translator at timeRangeView.ts:241 is gone (review 3A)
! grep -n "message.state === 'playing' ? 'playing' : 'paused'" apps/vscode/src/views/timeRangeView.ts
# expected: exit 0 (no match)

# 12. Verify the extended IPC retypes landed (review 2A)
! grep -nE "(state|mode): 'playing' \| 'paused'|'full' \| 'trail'" apps/vscode/src/views/timeRangeView.ts apps/vscode/src/webview/messages.ts
# expected: exit 0 (no hand-typed narrow string unions remain in those files)

# 13. Run the new PlaybackControls test (review 10A / FR-029 / SC-015)
pnpm --filter @debrief/components exec vitest run src/TimeController/PlaybackControls.test.tsx
# expected: 3 tests pass, one per PlaybackState value, with 'stopped' and 'paused' assertions identical

# 14. Run the new persistence load-boundary validation tests (review 9A / FR-028; R2-3A — LoadResult assertion shape)
pnpm --filter @debrief/session-state exec vitest run tests/unit/persistence.test.ts
# expected: all existing cases pass; 2+ new cases pass
#   - Negative cases assert `result.success === false` + `result.error` matches a regex.
#   - Positive cases assert `result.success === true` + `result.error === undefined`.
#   - No case uses `rejects.toThrow(...)` — `loadSessionState` returns LoadResult, never throws (R2-1A).

# 15. Run the regeneration-idempotency pytest (review 11B / FR-030 / SC-014)
uv run pytest shared/schemas/tests/test_regen_idempotent.py -v
# expected: pass — `generate.py all` run twice produces byte-identical output

# 16. Run the drift-prevention guard script (review D1 / FR-031 / SC-013)
bash scripts/check-no-hand-typed-temporal-enums.sh
# expected: exit 0 on post-change tree

# 17. Run the ADR-ref convention guard script (review D3 / FR-032 / SC-016)
bash scripts/check-adr-refs.sh
# expected: exit 0 — the `See ADR-NN in docs/project_notes/decisions.md` reference in
#           session-state.yaml resolves to the new `## ADR-NN` heading in decisions.md
```
