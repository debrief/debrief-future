# Usage example (Feature 205)

**Generated**: 2026-04-21
**Git SHA**: 1a74e103

After Feature 205 ships, consumers across the monorepo import the
canonical `DisplayMode` / `PlaybackState` types directly from
`@debrief/schemas`. No casts, no translator ternaries, no hand-typed
copies to drift against.

## TypeScript

### Import

```ts
import {
  DisplayMode,
  DisplayModeEnum,
  PlaybackState,
  PlaybackStateEnum,
} from '@debrief/schemas';
```

### Template-literal usage (string-literal assignability)

```ts
// Direct string-literal assignment — no cast needed.
const mode: DisplayMode = 'full';          // ✅
const trail: DisplayMode = 'trail';        // ✅
const stopped: PlaybackState = 'stopped';  // ✅
const playing: PlaybackState = 'playing';  // ✅
const paused: PlaybackState = 'paused';    // ✅

// Typos rejected at compile time:
// const bad: DisplayMode = 'snailTrail'; // ❌ ts2322
// const bad: PlaybackState = 'palying';   // ❌ ts2322
```

### Enum-member usage

```ts
const modeAsEnum: DisplayMode = DisplayModeEnum.full;    // ✅
const stateAsEnum: PlaybackState = PlaybackStateEnum.playing; // ✅

// Discriminated switch — exhaustive per TS narrowing
function glyphFor(state: PlaybackState): string {
  switch (state) {
    case PlaybackStateEnum.playing:
      return 'debug-pause';
    case PlaybackStateEnum.paused:
    case PlaybackStateEnum.stopped:
      // stopped ≡ paused rendering rule (ADR-022)
      return 'debug-start';
  }
}
```

### In an IPC message

```ts
interface SetDisplayModeMessage {
  type: 'setDisplayMode';
  displayMode: DisplayMode; // schema-rooted — no 'full' | 'trail' literal
}
```

### In a session-state setter

```ts
// services/session-state/src/persistence/load.ts validates inbound values
// against the canonical permissible-value set before calling:
store.getState().setDisplayMode(validated);    // (validated: DisplayMode)
store.getState().setPlaybackState(validated);  // (validated: PlaybackState)
// Any legacy 'normal' / 'snailTrail' / 'palying' in a persisted payload is
// rejected with `{ success: false, error: 'Invalid temporal.…' }`.
```

## Python

### Import

```python
from debrief_schemas import DisplayModeEnum, PlaybackStateEnum, TemporalSlice
```

### Validation

```python
slice_ = TemporalSlice(
    stepSize={"value": 1, "unit": "minute"},
    playbackRate=1.0,
    playbackState=PlaybackStateEnum.playing,
    displayMode=DisplayModeEnum.full,
)
# slice_.playbackState is `PlaybackStateEnum.playing` (not a bare string)
assert slice_.playbackState in PlaybackStateEnum  # ✅

# Legacy value raises pydantic.ValidationError at validate time:
# TemporalSlice(..., displayMode="snailTrail")  # ❌
```

## Expected TypeScript output

Running `pnpm -r typecheck` on the whole workspace produces zero errors
attributable to Feature 205. Running the two guard scripts produces:

```
✅ No hand-typed DisplayMode/PlaybackState or legacy translators found (regression guard passed)
✅ All LinkML ADR references resolve (regression guard passed)
```

No `as` casts, no suppressions, no `@ts-expect-error` at any consumer
site — the template-literal pattern preserves string-literal
assignability across the whole monorepo, and enum-member usage is
equivalent at the type-system level.
