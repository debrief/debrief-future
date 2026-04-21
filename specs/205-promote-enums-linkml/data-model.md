# Data Model: Promote DisplayMode and PlaybackState to LinkML

**Feature**: 205-promote-enums-linkml
**Date**: 2026-04-21

---

## Enum Definitions

### `PlaybackStateEnum` (unchanged values)

Represents the animation playback lifecycle. Already correct in the LinkML schema — no value changes required.

| Value | Meaning | Previous state |
|-------|---------|----------------|
| `stopped` | Initialised but never started, or fully rewound | Present in `session-state` hand-typed copy |
| `playing` | Advancing through time | Present in both hand-typed copies |
| `paused` | Mid-sequence, holds current position | Present in both hand-typed copies |

Schema-level description (carried into generated docstrings):
> "Current state of time playback. `stopped`: initial state or after rewind. `playing`: advancing. `paused`: holds position mid-sequence. Canonical superset — components that previously exposed only two-value state (`playing`/`paused`) treat `stopped` identically to `paused` in rendering."

---

### `DisplayModeEnum` (vocabulary rename)

Represents how a track is rendered temporally. **Values change from `normal`/`snailTrail` to `full`/`trail`.**

| Value (new) | Value (old, deleted) | Meaning |
|-------------|----------------------|---------|
| `full` | `normal` | Entire track rendered at all times, regardless of time cursor |
| `trail` | `snailTrail` | Only the portion from track start up to the current time cursor is rendered |

Schema-level description (carried into generated docstrings):
> "Track visualization display mode. `full`: entire track always visible. `trail`: snail-trail up to current time cursor only. Canonical vocabulary aligns with the `shared/components` usage — the session-state `normal`/`snailTrail` naming is retired."

---

## `TemporalSlice` — affected fields

`TemporalSlice` already references both enums via `range:` in LinkML. The only change is the TypeScript post-processor narrowing:

| Field | LinkML `range:` | Python type (current) | TypeScript type (before) | TypeScript type (after) |
|-------|-----------------|----------------------|--------------------------|-------------------------|
| `playbackState` | `PlaybackStateEnum` | `PlaybackStateEnum` ✅ | `string` ❌ | `PlaybackState` ✅ |
| `displayMode` | `DisplayModeEnum` | `DisplayModeEnum` ✅ | `string` ❌ | `DisplayMode` ✅ |

---

## Generated type aliases (TypeScript only)

Two template-literal type aliases are injected by `generate.py` immediately after each enum closing brace:

```typescript
export enum PlaybackStateEnum {
    stopped = "stopped",
    playing = "playing",
    paused = "paused",
};
/**
 * Template-literal union of PlaybackStateEnum values.
 * Narrows playbackState fields on TemporalSlice.
 * Consumers can use string literals ('playing', 'paused', 'stopped') — they
 * satisfy this type without coercion.
 */
export type PlaybackState = `${PlaybackStateEnum}`;  // = 'stopped' | 'playing' | 'paused'

export enum DisplayModeEnum {
    full = "full",
    trail = "trail",
};
/**
 * Template-literal union of DisplayModeEnum values.
 * Narrows displayMode fields on TemporalSlice.
 * Consumers can use string literals ('full', 'trail') — they satisfy this type
 * without coercion.
 */
export type DisplayMode = `${DisplayModeEnum}`;  // = 'full' | 'trail'
```

---

## State transitions

### `PlaybackState`

```
             ┌──────────────────────────────────────────┐
             │                                          │
   Initial ──► stopped ──► playing ──► paused ──► playing
                  ▲          │           │
                  │          ▼           │
                  └────── stopped ◄──────┘
```

`stopped` is the initial state (see `DEFAULT_TEMPORAL_SLICE`). `playing` ↔ `paused` is the primary toggle. `stopped` can be reached from any state via an explicit reset/rewind action.

Components that previously only handled `playing`/`paused` render `stopped` identically to `paused` — a non-interactive hold state.

### `DisplayMode`

No state machine — a simple two-value toggle with no ordering constraint:

```
full ◄──────► trail
```

---

## Entities removed

| Entity | Location | Reason |
|--------|----------|--------|
| `type DisplayMode = 'full' \| 'trail'` | `shared/components/src/utils/types.ts:80` | Replaced by schema-generated `DisplayMode` |
| `type PlaybackState = 'playing' \| 'paused'` | `shared/components/src/TimeController/types.ts:17` | Replaced by schema-generated `PlaybackState` |
| `type DisplayMode = 'normal' \| 'snailTrail'` | `services/session-state/src/types/temporal.ts:110` | Replaced by schema-generated `DisplayMode`; vocabulary retired |
| `type PlaybackState = 'stopped' \| 'playing' \| 'paused'` | `services/session-state/src/types/temporal.ts:105` | Replaced by schema-generated `PlaybackState` |
