# Contracts: LinkML Enum Definitions and Generator Outputs

**Feature**: 205-promote-enums-linkml
**Date**: 2026-04-21

---

## 1. LinkML schema change

**File**: `shared/schemas/src/linkml/session-state.yaml`

### Before

```yaml
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
  DisplayModeEnum:
    description: >-
      Track visualization display mode.
      'full': entire track always visible.
      'trail': snail-trail up to current time cursor only.
      Canonical vocabulary aligns with shared/components usage;
      the session-state 'normal'/'snailTrail' naming is retired.
    permissible_values:
      full:
        description: Entire track rendered at all times, regardless of time cursor position
      trail:
        description: Only the track portion from start up to the current time cursor is rendered
```

`PlaybackStateEnum` description is also updated (no value changes):

```yaml
  PlaybackStateEnum:
    description: >-
      Current state of time playback.
      'stopped': initial state or after rewind.
      'playing': advancing through time.
      'paused': holds position mid-sequence.
      Canonical superset — components that previously exposed only two-value
      state ('playing'/'paused') treat 'stopped' identically to 'paused' in rendering.
    permissible_values:
      stopped:
        description: Playback is stopped (initial state or after rewind)
      playing:
        description: Playback is advancing through time
      paused:
        description: Playback is paused mid-sequence
```

---

## 2. Expected generator outputs

### 2.1 Python (Pydantic) — `debrief_schemas/__init__.py`

```python
class PlaybackStateEnum(str, Enum):
    """
    Current state of time playback.
    'stopped': initial state or after rewind.
    'playing': advancing through time.
    'paused': holds position mid-sequence.
    ...
    """
    stopped = "stopped"
    playing = "playing"
    paused = "paused"


class DisplayModeEnum(str, Enum):
    """
    Track visualization display mode.
    'full': entire track always visible.
    'trail': snail-trail up to current time cursor only.
    ...
    """
    full = "full"      # changed from 'normal'
    trail = "trail"    # changed from 'snailTrail'
```

`TemporalSlice` Pydantic model already references the enum types — no change to model structure, only `DisplayModeEnum` values:

```python
class TemporalSlice(ConfiguredBaseModel):
    playbackState: PlaybackStateEnum = Field(...)   # unchanged
    displayMode: DisplayModeEnum = Field(...)       # values change
```

### 2.2 TypeScript — `typescript/types.ts` (post-processed)

```typescript
export enum PlaybackStateEnum {
    stopped = "stopped",
    playing = "playing",
    paused = "paused",
};
/**
 * Template-literal union of PlaybackStateEnum values.
 * Narrows playbackState fields on TemporalSlice.
 */
export type PlaybackState = `${PlaybackStateEnum}`;
// expands to: 'stopped' | 'playing' | 'paused'

export enum DisplayModeEnum {
    full = "full",       // changed from normal
    trail = "trail",     // changed from snailTrail
};
/**
 * Template-literal union of DisplayModeEnum values.
 * Narrows displayMode fields on TemporalSlice.
 */
export type DisplayMode = `${DisplayModeEnum}`;
// expands to: 'full' | 'trail'

// TemporalSlice — narrowed fields (post-processed):
export interface TemporalSlice {
    currentTime?: TimeInstant,
    timeRange?: TimeRange,
    timeFilter?: TimeFilter,
    stepSize: TimeStep,
    playbackRate: number,
    playbackState: PlaybackState,   // narrowed from string
    displayMode: DisplayMode,       // narrowed from string
}
```

### 2.3 JSON Schema — `debrief.schema.json`

`DisplayModeEnum` permissible values in JSON Schema:

```json
"DisplayModeEnum": {
  "type": "string",
  "enum": ["full", "trail"]
}
```

`PlaybackStateEnum` (unchanged):

```json
"PlaybackStateEnum": {
  "type": "string",
  "enum": ["stopped", "playing", "paused"]
}
```

---

## 3. `generate.py` post-processor additions

Two new patches to add in `generate_typescript()`, following the `PointShape` pattern (search for the existing `_point_shape_sentinel` block to find the correct insertion point):

### Patch A: Inject `PlaybackState` type alias

```python
_playback_state_decl = (
    "};\n"
    "/**\n"
    "* Template-literal union of PlaybackStateEnum values.\n"
    "* Narrows playbackState fields on TemporalSlice.\n"
    "* Consumers can use string literals ('playing', 'paused', 'stopped') —\n"
    "* they satisfy this type without coercion.\n"
    "*/\n"
    "export type PlaybackState = `${PlaybackStateEnum}`;\n"
)
_playback_state_sentinel = "export enum PlaybackStateEnum {"
if _playback_state_sentinel in content and "export type PlaybackState" not in content:
    enum_start = content.index(_playback_state_sentinel)
    enum_end = content.index("};\n", enum_start)
    content = content[:enum_end] + _playback_state_decl + content[enum_end + len("};\n"):]
```

### Patch B: Inject `DisplayMode` type alias

```python
_display_mode_decl = (
    "};\n"
    "/**\n"
    "* Template-literal union of DisplayModeEnum values.\n"
    "* Narrows displayMode fields on TemporalSlice.\n"
    "* Consumers can use string literals ('full', 'trail') —\n"
    "* they satisfy this type without coercion.\n"
    "*/\n"
    "export type DisplayMode = `${DisplayModeEnum}`;\n"
)
_display_mode_sentinel = "export enum DisplayModeEnum {"
if _display_mode_sentinel in content and "export type DisplayMode" not in content:
    enum_start = content.index(_display_mode_sentinel)
    enum_end = content.index("};\n", enum_start)
    content = content[:enum_end] + _display_mode_decl + content[enum_end + len("};\n"):]
```

### Patch C: Narrow `TemporalSlice` fields

```python
_temporal_slice_start = content.find("export interface TemporalSlice {\n")
if _temporal_slice_start == -1:
    raise RuntimeError(
        "generate.py: gen-typescript did not emit `export interface TemporalSlice`."
    )
_temporal_slice_end = content.index("}\n", _temporal_slice_start) + 2
_temporal_slice_block = content[_temporal_slice_start:_temporal_slice_end]
_new_temporal_block = _temporal_slice_block.replace(
    "    playbackState: string,\n", "    playbackState: PlaybackState,\n", 1
).replace(
    "    displayMode: string,\n", "    displayMode: DisplayMode,\n", 1
)
content = content[:_temporal_slice_start] + _new_temporal_block + content[_temporal_slice_end:]
```

---

## 4. Schema fixture contracts

Fixtures for the schema adherence test suite. Integrated with the existing `test_golden.py` framework.

### Valid fixtures (`shared/schemas/fixtures/session-state/valid/`)

These must pass validation against `PlaybackStateEnum` / `DisplayModeEnum` values as part of `TemporalSlice`:

```json
// playback-state-stopped.json
{ "playbackState": "stopped" }

// playback-state-playing.json
{ "playbackState": "playing" }

// playback-state-paused.json
{ "playbackState": "paused" }

// display-mode-full.json
{ "displayMode": "full" }

// display-mode-trail.json
{ "displayMode": "trail" }
```

### Invalid fixtures (`shared/schemas/fixtures/session-state/invalid/`)

These must **fail** validation:

```json
// playback-state-unknown.json — unknown value
{ "playbackState": "rewinding" }

// display-mode-legacy-normal.json — legacy value, no longer permissible
{ "displayMode": "normal" }
```

The `display-mode-legacy-normal.json` invalid fixture is the key regression guard: after the vocabulary rename, `"normal"` must be rejected. If the rename is ever accidentally reverted, this fixture will catch it.
