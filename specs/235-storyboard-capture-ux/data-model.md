# Phase 1 Data Model — Storyboard Capture & Maintenance UX (Cross-Host)

**Feature**: 235-storyboard-capture-ux
**Date**: 2026-04-28

## Overview

**This spec introduces no new persisted entities and no schema changes.**
All persisted entities (`Storyboard`, `Scene`, `Viewport`, `LogEntry`)
remain exactly as defined in:

- [`specs/215-storyboarding-schema/spec.md` § Key Entities](../215-storyboarding-schema/spec.md#key-entities-schema-first-authoritative)
  — authoritative for `Storyboard`, `Scene`, `Viewport`, and the
  `LogEntry`-based provenance encoding.

Reusing #215's data model is a deliberate design constraint — see
*Constitution Check § II Schema Integrity* in `plan.md`.

What this spec **does** introduce is two new pieces of **transient
state**, mirrored on `useStoryboardEditReducer` and pushed by the host
through the existing `snapshot` / `scenes` payloads (see
`contracts/panel-messages.md`). Neither piece is persisted; both vanish
when the panel unmounts.

**Source-of-truth split**: the host owns the *framing* fields
(`visible`, `defaultName`, `knownNames`, `conflictingSceneId`,
`offsetCount`, `offsetWouldExceedTimeRange`, etc.) and pushes them on
each snapshot. The panel reducer adds *panel-local typing state* on
top — only `pendingName` in the naming row, derived from the user's
keystrokes. Stateless action posts (`naming-row-confirm`,
`collision-offset`, etc.) ask the host to advance, the host updates
its slice, and the next push re-flows the truth into the reducer.

## Transient state — owned by `useStoryboardEditReducer`

### `NamingRowState`

The first-capture inline naming row. Present only on a plot with no
Storyboards, between the analyst pressing Capture Scene and either
confirming or dismissing.

**Shape**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `visible` | `boolean` | yes | `false` outside the first-capture window. |
| `pendingName` | `string` | yes | Pre-filled with a default (plot display name + `" — storyboard"`); analyst edits in place. Trimmed on confirm. |
| `collisionWith` | `string \| null` | yes | When the analyst types a name that already exists on this plot, set to that existing Storyboard's name; otherwise `null`. Drives the inline collision warning slot. |
| `defaultName` | `string` | yes | The unedited default — used to suppress "you've changed nothing" UX when the analyst types nothing. |

**Lifecycle**:

```text
                      capture pressed (no Storyboards on plot)
                                    ↓
                              { visible:true, pendingName:default,
                                collisionWith:null, defaultName:default }
                                    │
              ┌─────────────────────┼─────────────────────────────┐
              ↓                     ↓                             ↓
       analyst types     analyst presses Confirm           analyst presses
       (collision live‐  with non-colliding name           Escape / clicks
       checked)                                            outside the row
              │                     ↓                             │
              └────────→  Storyboard + Scene persisted  ←──────── │
                                    ↓                             │
                              { visible:false }  ←────────────────┘
```

**Invariants**:

- `pendingName` MUST be a non-empty trimmed string before Confirm is
  enabled.
- `collisionWith` MUST be null OR a real Storyboard name on the plot.
- `visible` is `true` for at most one continuous interval per panel
  mount per plot (only the first capture).

---

### `CollisionBannerState`

The duplicate-timestamp banner. Present only when an attempted capture
or update-to-current conflicts with an existing Scene's timestamp.

**Shape**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `visible` | `boolean` | yes | `false` outside the resolution window. |
| `conflictingSceneId` | `string` (ULID) | yes | The Scene whose timestamp the new capture/update wants to take. |
| `originalTimestamp` | `string` (ISO-8601) | yes | The timestamp the capture op started with — fixed for the lifetime of this banner instance. |
| `proposedTimestamp` | `string` (ISO-8601) | yes | The timestamp the new capture wants. Updated when the analyst presses Offset (+1 s); each Offset adds one second and re-runs the collision check. |
| `offsetCount` | `integer ≥ 0` | yes | How many times the analyst has pressed Offset on this banner instance. Cap at 60 (one minute of offsets) — past that, the banner replaces Offset with a "pick a different time" message and only Replace / Cancel remain. |
| `offsetWouldExceedTimeRange` | `boolean` | yes | Set by the host whenever the next Offset would push `proposedTimestamp` outside the plot's time range (FR-CAP-017a). When `true` the panel hides the Offset button and surfaces an inline "this would push past the plot's time range" message; only Replace and Cancel remain available. |
| `cause` | `'capture' \| 'update-to-current'` | yes | What op triggered the banner. |

**Lifecycle**:

```text
                  CRUD raises DuplicateTimestampError on capture/update
                                    ↓
                       { visible:true, conflictingSceneId:X,
                         proposedTimestamp:T, offsetCount:0 }
                                    │
            ┌───────────────────────┼───────────────────────┬──────────────────┐
            ↓                       ↓                       ↓                  ↓
      analyst clicks          analyst clicks          analyst clicks     offset cap reached
      Replace                 Offset (+1 s)           Cancel             (offsetCount>=60)
            │                       │                       │                  │
      conflicting             { proposedTimestamp:T+1s,    abort, reset       Replace+Cancel
      scene replaced via      offsetCount++ }             reducer slice       only; offset
      #215.updateScene;       re-run collision check                          button hidden
      banner closes           (may re-raise → loop, may
                              succeed → close banner)
```

**Invariants**:

- `conflictingSceneId` MUST resolve to a Scene in the active Storyboard
  for the entire banner lifetime.
- `proposedTimestamp` MUST be inside the plot's time range (the
  out-of-range guard in FR-CAP-014 fires before the banner ever
  appears).
- `offsetCount` MUST equal `floor((proposedTimestamp - originalTimestamp) / 1s)`
  — derivable, kept explicit for cap enforcement.

---

### View-model updates that surface these slices

Two new view-model types live alongside the existing
`SceneRowViewModel` / `StoryboardOptionViewModel` in
`shared/components/src/panels/StoryboardPanel/types.ts`:

```ts
export interface NamingRowViewModel {
  readonly visible: boolean;
  readonly pendingName: string;
  readonly defaultName: string;
  readonly collisionWith: string | null;
  readonly canConfirm: boolean;          // derived: pendingName.trim() !== '' && collisionWith === null
}

export interface CollisionBannerViewModel {
  readonly visible: boolean;
  readonly conflictingSceneId: string | null;
  readonly conflictingSceneTitle: string | null;
  readonly proposedTimestamp: string | null;     // ISO-8601
  readonly proposedTimestampDtg: string | null;  // formatDtg(proposedTimestamp); presentational only
  readonly offsetCount: number;
  readonly offsetCapReached: boolean;            // derived: offsetCount >= 60
}
```

Both view models are presentational; the reducer owns the source-of-
truth state, the view models are projected on each render. This is
the same pattern #230 established for `SceneEditViewModel` /
`StoryboardEditViewModel`.

## Schema-version vs. transient-state interaction

**No `schema_version` bump.** This spec produces no on-disk changes
that round-trip through the LinkML schema. The transient state above
exists only in memory; it is not represented in JSON, in Python, or
in TypeScript-generated types.

This is a deliberate Article II compliance choice — adding view-model
types under `shared/components/src/panels/StoryboardPanel/types.ts`
puts them outside the LinkML adherence-test surface, which is correct
because they are not data, they are UI projections.

## Relationship to the persisted entities

| Persisted entity (#215) | This spec's view models | Relationship |
|-------------------------|-------------------------|--------------|
| `StoryboardFeature` | `StoryboardOptionViewModel` (existing), header dropdown | One-to-one when projected; many entries when listing |
| `SceneFeature` | `SceneRowViewModel` (existing) | One-to-one |
| n/a (transient) | `NamingRowViewModel` | At most one per plot per panel mount, only on first capture |
| n/a (transient) | `CollisionBannerViewModel` | At most one per attempted capture/update, anchored to a `SceneFeature` |
| `LogEntry` (#215, append-only) | n/a | This spec adds **no new `op` values** to `was_generated_by.parameters.op`. Capture appends `create`; update-to-current appends `update-to-current`; delete appends `delete`; etc. — all per #215 § Provenance encoding. |
