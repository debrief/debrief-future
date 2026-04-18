# Promote DisplayMode and PlaybackState to LinkML

## Problem
Two enum-style types are defined twice in TypeScript with drifted values:

**DisplayMode:**
- `shared/components/src/utils/types.ts`: `'full' | 'trail'`
- `services/session-state/src/types/temporal.ts`: `'normal' | 'snailTrail'`

Same concept ("render full track vs snail-trail up to current time"), two vocabularies. Whatever code crosses between the packages is doing an implicit translation.

**PlaybackState:**
- `shared/components/src/TimeController/types.ts`: `'playing' | 'paused'`
- `services/session-state/src/types/temporal.ts`: `'stopped' | 'playing' | 'paused'`

Session-state tracks the full lifecycle including a `stopped` state; components only needs the play/pause toggle. Rather than split into two types with different names, the canonical superset wins — components widens to accept three states and treats `stopped` and `paused` identically in rendering.

## Proposed Solution
1. **LinkML:**
   - Define `DisplayModeEnum` with values `full`, `trail`.
   - Define `PlaybackStateEnum` with values `stopped`, `playing`, `paused`.
   - Regenerate Pydantic + TypeScript.
2. **Runtime:**
   - Delete both TS copies of each enum.
   - All consumers import the generated enum types from `@debrief/schemas`.
   - Session-state: no behaviour change (already uses the superset vocabulary, just renamed).
   - Components: update existing `'full' | 'trail'` call sites to the LinkML-generated vocabulary; update `PlaybackState` consumers to handle the third state (`stopped`) by rendering it identically to `paused` — document the UI treatment explicitly.
3. Update any existing stored session-state JSON fixtures if the enum values change from what session-state currently writes.

## Success Criteria
- `DisplayModeEnum` and `PlaybackStateEnum` are defined in LinkML and generated into both Pydantic and TS
- Zero hand-typed copies of either enum remain in `apps/`, `shared/`, or `services/`
- No runtime translation logic needed between packages — single canonical vocabulary end to end
- Time controller, temporal track rendering, and playback controls behave identically to before

## Dependencies
None.

## Parallelisation
Shares LinkML-regen coordination with #203 and #204 (see #203's Parallelisation section). Independent of all non-LinkML items.

## Complexity
Medium

## Reference
Raised as part of the code-quality review pass; see PR #465 final report (Track 2 / Item 7) for discovery context.
