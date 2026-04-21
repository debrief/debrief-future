# Research: Promote DisplayMode and PlaybackState to LinkML

**Feature**: 205-promote-enums-linkml
**Date**: 2026-04-21
**Status**: Complete — all decisions resolved

---

## §1. Current state audit

### 1.1 LinkML schema

Both enums **already exist** in `shared/schemas/src/linkml/session-state.yaml`:

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
      normal:           # ← wrong vocabulary; must change to 'full'
        description: Standard track display
      snailTrail:       # ← wrong vocabulary; must change to 'trail'
        description: Trail showing recent positions
```

`TemporalSlice` already references both enums via `range:`:

```yaml
  TemporalSlice:
    attributes:
      playbackState:
        description: Current playback state - ephemeral (FR-010)
        range: PlaybackStateEnum
        required: true
      displayMode:
        description: Track visualization mode (FR-011)
        range: DisplayModeEnum
        required: true
```

**Decision**: The only LinkML change required is renaming `DisplayModeEnum` values: `normal` → `full`, `snailTrail` → `trail`. `PlaybackStateEnum` values (`stopped`, `playing`, `paused`) are already correct.

**Rationale**: The `shared/components` vocabulary (`full`/`trail`) is clearer to users — it describes what the user sees, not the rendering technique. The session-state `normal`/`snailTrail` vocabulary was adopted when the session-state types were authored independently; there is no external contract (no stored files, no MCP wire format) that depends on these string values surviving.

**Alternatives considered**: Keeping `normal`/`snailTrail` as canonical and migrating components. Rejected — the components vocabulary is more user-facing and the simpler of the two; the session-state package is internal.

---

### 1.2 Python generated models

`shared/schemas/src/generated/python/debrief_schemas/__init__.py` already generates:

```python
class PlaybackStateEnum(str, Enum):
    stopped = "stopped"
    playing = "playing"
    paused = "paused"

class DisplayModeEnum(str, Enum):
    normal = "normal"       # ← changes to full
    snailTrail = "snailTrail"  # ← changes to trail
```

And `TemporalSlice` **already uses the Pydantic enum types**:

```python
class TemporalSlice(ConfiguredBaseModel):
    playbackState: PlaybackStateEnum = Field(...)
    displayMode: DisplayModeEnum = Field(...)
```

Python is already correct on the type structure. Only the `DisplayModeEnum` values change.

---

### 1.3 TypeScript generated types

`shared/schemas/src/generated/typescript/types.ts` generates:

```typescript
export enum PlaybackStateEnum {
    stopped = "stopped",
    playing = "playing",
    paused = "paused",
}
export enum DisplayModeEnum {
    normal = "normal",       // ← changes to full
    snailTrail = "snailTrail",  // ← changes to trail
}
```

But `TemporalSlice` emits **`string`** for both enum-ranged slots (a known `gen-typescript` limitation):

```typescript
export interface TemporalSlice {
    playbackState: string,   // ← must be narrowed
    displayMode: string,     // ← must be narrowed
}
```

This is an Article XV violation. The fix is a `generate.py` post-processor patch.

---

## §2. Generator behaviour: `gen-typescript` and enum-ranged slots

`gen-typescript` (LinkML ≥ 1.7.0) emits `string` for attributes whose `range:` is an enum. This is a documented upstream limitation — the generator treats enums as string aliases rather than emitting the enum type name in interface slots.

The project already handles this for `PositionStyle.symbol` (narrowed from `string` to `PointShape`) via a post-processor pattern in `shared/schemas/scripts/generate.py`:

```python
# Inject a template-literal type alias immediately after the enum closing brace
_point_shape_decl = (
    "};\n"
    "export type PointShape = `${PointShapeEnum}`;\n"
)
# Narrow the symbol field on PositionStyle and PositionStyleOverride
fixed_block = block.replace("symbol: string,", "symbol: PointShape,")
```

**Decision**: Apply the same pattern to `PlaybackStateEnum` and `DisplayModeEnum`:

1. Inject `export type PlaybackState = \`${PlaybackStateEnum}\`` after the `PlaybackStateEnum` enum closing brace.
2. Inject `export type DisplayMode = \`${DisplayModeEnum}\`` after the `DisplayModeEnum` enum closing brace.
3. Narrow `TemporalSlice.playbackState: string,` → `TemporalSlice.playbackState: PlaybackState,`
4. Narrow `TemporalSlice.displayMode: string,` → `TemporalSlice.displayMode: DisplayMode,`

**Rationale for template-literal type aliases** (vs direct enum type reference):
- Consumers currently use string-literal comparisons (`state === 'playing'`). String literals satisfy the template-literal union type without any coercion.
- A direct enum reference (`PlaybackStateEnum`) would require consumers to write `PlaybackStateEnum.playing` everywhere — a larger migration surface and a departure from the existing string-literal comparison idiom.
- The `PointShape` precedent in the codebase establishes this as the standard pattern.
- `export type PlaybackState = \`${PlaybackStateEnum}\`` produces `'stopped' | 'playing' | 'paused'` — a widened superset of the former `'playing' | 'paused'` that satisfies Article XV (narrow type, no `any`).

**Alternatives considered**: Direct enum type (`playbackState: PlaybackStateEnum`). Rejected — requires coercions at all string-literal call sites (`'playing' as PlaybackStateEnum` or `PlaybackStateEnum.playing`), multiplying migration effort for no additional type safety.

---

## §3. Consumer inventory

### 3.1 Hand-typed type definitions to delete (4 total)

| File | Definition | Action |
|------|-----------|--------|
| `shared/components/src/utils/types.ts:80` | `type DisplayMode = 'full' \| 'trail'` | Delete; import `DisplayMode` from `@debrief/schemas` |
| `shared/components/src/TimeController/types.ts:17` | `type PlaybackState = 'playing' \| 'paused'` | Delete; import `PlaybackState` from `@debrief/schemas` |
| `services/session-state/src/types/temporal.ts:110` | `type DisplayMode = 'normal' \| 'snailTrail'` | Delete; import `DisplayMode` from `@debrief/schemas` |
| `services/session-state/src/types/temporal.ts:105` | `type PlaybackState = 'stopped' \| 'playing' \| 'paused'` | Delete; import `PlaybackState` from `@debrief/schemas` |

### 3.2 Public re-exports to update (type-name-preserving)

| File | Current | Action |
|------|---------|--------|
| `shared/components/src/TimeController/index.ts:29-30` | Re-exports `PlaybackState`, `DisplayMode` from `./types` | Redirect to `@debrief/schemas` |
| `shared/components/src/index.ts:54-55` | Re-exports `PlaybackState`, `DisplayMode` | No change needed (transitive via TimeController/index.ts) |

### 3.3 Inline literal sites to update (use imported types)

| File | Lines | Change |
|------|-------|--------|
| `shared/components/src/ActivityPanel/types.ts` | 75, 94, 98 | Replace inline `'full' \| 'trail'` and `'playing' \| 'paused'` with `DisplayMode` / `PlaybackState` imports |
| `shared/components/src/ActivityPanel/ActivityPanel.tsx` | 241, 252 | Replace inline literal parameter types with imported types; add `'stopped'` handling |
| `shared/components/src/MapView/PositionSymbolsLayer.tsx` | 34 | Replace inline `'full' \| 'trail'` with `DisplayMode` import |

### 3.4 Vocabulary migration sites (session-state)

| File | Lines | Change |
|------|-------|--------|
| `services/session-state/src/types/temporal.ts` | 149 | `displayMode: 'normal'` → `displayMode: 'full'` in `DEFAULT_TEMPORAL_SLICE` |
| `services/session-state/tests/unit/slices/temporal.test.ts` | 43-44, 138-146 | `'normal'` → `'full'`, `'snailTrail'` → `'trail'` |
| `services/session-state/tests/unit/persistence.test.ts` | 38, 43, 160, 190, 206-207 | `'snailTrail'` → `'trail'`, `'normal'` → `'full'` |

### 3.5 Component behaviour change: `PlaybackState` widening

`ActivityPanel.tsx:241-242`:
```typescript
// Before
const handlePlaybackStateChange = useCallback(
  (state: 'playing' | 'paused') => {
    if (state === 'playing') {
```

After widening to `PlaybackState` (which includes `'stopped'`), the `if (state === 'playing')` check continues to work correctly — `'stopped'` falls through to the `else` branch (same as `'paused'`). No render difference. No additional guard needed; the existing logic treats non-`'playing'` states identically.

### 3.6 Persistence load coercion (session-state)

`services/session-state/src/persistence/load.ts:122-123`:
```typescript
if (temporal.displayMode) {
  store.getState().setDisplayMode(temporal.displayMode as never);
}
```

This path reads `displayMode` from a persisted JSON blob and coerces it with `as never` (a pre-existing type-safety workaround). After migration, this site must be updated to:
1. Accept the new `DisplayMode` type from `@debrief/schemas`.
2. Guard against legacy `'normal'`/`'snailTrail'` values if any users have persisted session state (not applicable yet — persistence is in-memory/test-only at this stage per Article XIV).

**Decision**: Update the load site to use the typed `DisplayMode` import and remove the `as never` cast. No backward-compatibility migration for legacy values is required (Article XIV: pre-release, no persisted user data).

---

## §4. Schema fixture plan

No schema fixtures currently exist for `PlaybackStateEnum` or `DisplayModeEnum`. Create `shared/schemas/fixtures/session-state/`:

**Valid fixtures** (one per permissible value):

| File | Content |
|------|---------|
| `valid/playback-state-stopped.json` | `{ "playbackState": "stopped" }` |
| `valid/playback-state-playing.json` | `{ "playbackState": "playing" }` |
| `valid/playback-state-paused.json` | `{ "playbackState": "paused" }` |
| `valid/display-mode-full.json` | `{ "displayMode": "full" }` |
| `valid/display-mode-trail.json` | `{ "displayMode": "trail" }` |

**Invalid fixtures** (must be rejected by schema validation):

| File | Content | Why invalid |
|------|---------|-------------|
| `invalid/playback-state-unknown.json` | `{ "playbackState": "rewinding" }` | Not a permissible value |
| `invalid/display-mode-legacy-normal.json` | `{ "displayMode": "normal" }` | Legacy value, no longer permissible after rename |

These fixtures are validated by the existing `test_golden.py` framework once the `ENTITY_MAP` is extended with a `DisplayModeEnum` / `PlaybackStateEnum` entry (or validated via a standalone `TemporalSlice` fixture with all required fields).

---

## §5. Generator upgrade risk

No generator upgrade is required. The vocabulary rename (`normal` → `full`) and post-processor patches both use existing `generate.py` mechanisms (`str.replace` on generated output). The `gen-pydantic` and `gen-typescript` versions in the current lockfile are sufficient.

**Risk**: If a future LinkML upgrade changes the enum closing-brace format (e.g., `};` vs `}`) the post-processor sentinel patterns may fail. The existing patterns use `"};\n"` as the sentinel — consistent across the codebase.

---

## §6. Parallelisation with #203 and #204

`#205` touches only `session-state.yaml` (enum vocabulary rename) and `generate.py` (two post-processor patches). `#204` touches `geojson.yaml`, `raw-geojson.yaml`, `debrief.yaml`, `session-state.yaml` (stub removal), and `generate.py` (RawGeoJSONFeature patches). `#203` touches `geojson.yaml`, `common.yaml`, and `generate.py` (spatial converters).

**Merge order**: `#205` can be reviewed and merged independently. The only potential conflict is in `generate.py` if `#204` lands first and shifts line numbers — but all three features use sentinel-string patterns (not line numbers), so conflicts are limited to the same function blocks and are resolvable with a standard rebase. The generated artefact files will conflict on merge regardless of order; whoever rebases last simply reruns `python shared/schemas/scripts/generate.py` to regenerate cleanly.
