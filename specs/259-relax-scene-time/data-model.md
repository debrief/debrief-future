# Phase 1 — Data Model: Relax Scene Timestamp Uniqueness

**Feature**: 259-relax-scene-time
**Date**: 2026-05-18
**Source of truth**: `shared/schemas/src/linkml/storyboard.yaml` (post-#259)

## Entity changes

### SceneProperties — modified

| Slot | Type | Required | Constraint | Change |
|------|------|----------|------------|--------|
| `kind` | `FeatureKindEnum` (= `"STORYBOARD_SCENE"`) | Yes | unchanged | — |
| `id` | `string` (ULID) | Yes | `^[0-9A-HJKMNP-TV-Z]{26}$`; immutable | — |
| `storyboard_id` | `string` (ULID) | Yes | foreign key to `StoryboardProperties.id` | — |
| `title` | `string` | Yes | non-empty | — |
| `description` | `string` | No | — | — |
| `viewport` | `Viewport` | Yes | — | — |
| `timestamp` | `datetime` | Yes | **`unique-within-Storyboard` constraint REMOVED** | **MODIFIED** |
| `time_range` | `string` | No | MUST be absent in v1/v2 | — |
| `visible_feature_ids` | `string[]` | Yes | canonicalised | — |
| `feature_set_hash` | `string` | Yes | SHA-256 hex | — |
| `thumbnail_asset_ref` | `string` | Yes | STAC asset key | — |
| `transition_duration_ms` | `integer` | Yes | ≥ 0; default 500 | — |
| `display_mode` | `DisplayModeEnum` | No | — | — |
| `_polygon_source` | `PolygonSourceEnum` | No | — | — |
| **`creation_order`** | **`integer`** | **Yes** | **≥ 0; unique within Storyboard; assigned monotonically at capture** | **NEW** |

### StoryboardProperties — unchanged structurally; documentation updated

`schema_version` semantics:
- `schema_version < 2` — pre-#259 plot. Readers reject with `UnsupportedSchemaVersionError`. No migration.
- `schema_version = 2` — Scenes carry `creation_order`; reader trusts the on-disk values.

Writers always emit `schema_version = 2` after this feature ships. Article XIV (pre-release freedom) authorises the hard break.

## Invariants

| ID | Statement | Severity | Check site |
|----|-----------|----------|------------|
| SC-I1 | Scenes within a Storyboard are ordered by `(timestamp, creation_order)` ascending. | Documentation only (ordering is a derived view, not a stored property) | `ordering.ts` |
| SC-I2 | A Scene's `creation_order` is unique within its Storyboard. | Validation error | `validate.ts` |
| SC-I3 | A Scene's `creation_order` is ≥ 0. Upper bound is unspecified — gaps are permitted (see "Gap policy" below). | Validation error (defensive, lower bound only) | `validate.ts` |
| FC-I1 | Scene's `storyboard_id` resolves to an existing Storyboard. | unchanged from #215 | `validate.ts` |
| FC-I2 | Scene's `thumbnail_asset_ref` matches an existing asset. | unchanged from #216 | `validate.ts` |
| ~~FC-I3~~ | ~~No two Scenes in the same Storyboard share a `timestamp`.~~ | **REMOVED** | — |
| FC-I4 | No two Scenes in the same Storyboard share a `creation_order`. | Validation error (`DuplicateCreationOrderError`) | `validate.ts` |
| FC-I5 | Every Scene MUST carry a `creation_order` value. | Validation error (`MissingCreationOrderError`) — catches pre-#259 plots and malformed input | `validate.ts` |
| FC-V1 | Plot's `schema_version` ≥ 2 for any Storyboard. | Validation error (`UnsupportedSchemaVersionError`) — fires first on a pre-#259 plot | `validate.ts` (entry) |

**Note on SC-I3**: Only the lower bound is enforced. Gaps (from `deleteScene`) are normal and permitted; see "Gap policy" below. The defensive intent is to catch obviously corrupt input (e.g., a negative value) — not to enforce contiguity.

## State transitions

### Scene lifecycle (with `creation_order`)

```
                  ┌────────────────────────────┐
                  │ Storyboard with N Scenes,  │
                  │ creation_order ∈ {0..N-1}  │
                  └────────────┬───────────────┘
                               │ createScene(timestamp=T, ...)
                               ▼
            assign creation_order = N (= max + 1)
                               │
                               ▼
                  ┌────────────────────────────┐
                  │ Storyboard with N+1 Scenes │
                  │ creation_order ∈ {0..N}    │
                  └────────────┬───────────────┘
                               │ reorderSceneInTiedGroup(sceneId, newIdx)
                               ▼
            re-sequence creation_order within tied group:
                  group_min, group_min+1, …, group_min+(G−1)
                               │
                               ▼
                  ┌────────────────────────────┐
                  │ Storyboard with N+1 Scenes │
                  │ creation_order unchanged   │
                  │   for non-group Scenes;    │
                  │   permuted within group    │
                  └────────────┬───────────────┘
                               │ deleteScene(sceneId)
                               ▼
            remove Scene; remaining creation_order values are NOT renumbered.
                               │
                               ▼
                  ┌────────────────────────────┐
                  │ Storyboard with N Scenes;  │
                  │ creation_order may have    │
                  │ gaps (e.g., {0,1,3})       │
                  └────────────────────────────┘
```

**Gap policy**: deleting a Scene leaves a hole in the `creation_order` sequence. Holes are permitted and do not violate any invariant. New Scenes are appended at `max(creation_order) + 1`, so the gap remains.

### Pre-#259 plot read path (hard fail)

```
load plot from disk
        │
        ▼
validator: is StoryboardProperties.schema_version >= 2?
        │ no
        ▼
throw UnsupportedSchemaVersionError(storyboard_id, found_version, required=2)
        │
        ▼ (if any Storyboard scrapes through, e.g. hand-edited version field)
validator: every Scene carries creation_order?
        │ no
        ▼
throw MissingCreationOrderError(storyboard_id, scene_id)
        │
        ▼
load fails; user sees explicit error naming what is missing and where.
```

No silent migration. No in-memory backfill. The on-disk file is untouched (Article III source preservation).

## Errors

| Error class | Code | Thrown when | Replaces |
|-------------|------|-------------|----------|
| ~~`DuplicateTimestampError`~~ | ~~`STORYBOARD_DUPLICATE_TIMESTAMP`~~ | ~~Two Scenes share a timestamp in one Storyboard~~ | **DELETED** |
| `DuplicateCreationOrderError` | `STORYBOARD_DUPLICATE_CREATION_ORDER` | Two Scenes share a `creation_order` in one Storyboard | NEW |
| `CreationOrderOutOfRangeError` | `STORYBOARD_CREATION_ORDER_OUT_OF_RANGE` | `reorderSceneInTiedGroup` called with `newPositionInGroup` outside `[0, group.length)` | NEW |
| `MissingCreationOrderError` | `STORYBOARD_MISSING_CREATION_ORDER` | A Scene lacks the required `creation_order` field on load (pre-#259 plot or malformed input) | NEW |
| `UnsupportedSchemaVersionError` | `STORYBOARD_UNSUPPORTED_SCHEMA_VERSION` | `StoryboardProperties.schema_version < 2` on load | NEW (uses existing pattern from sibling clusters) |

Error classes follow the existing pattern in `shared/components/src/storyboard/errors.ts` (one class per code, `cause` + `code` + structured `details`).

## Breaking-change mapping (no migration)

| Field / symbol | Pre-#259 | Post-#259 |
|----------------|----------|-----------|
| `SceneProperties.creation_order` | absent | required `integer ≥ 0` |
| `StoryboardProperties.schema_version` | `1` | `2` |
| `DuplicateTimestampError` (exported from `@debrief/components`) | exported | **REMOVED** |
| Public export list (`storyboard/index.ts`) | `{ DuplicateTimestampError, ... }` | `{ DuplicateCreationOrderError, CreationOrderOutOfRangeError, MissingCreationOrderError, UnsupportedSchemaVersionError, reorderSceneInTiedGroup, ... }` |
| Pre-#259 plots on disk | loadable | **load fails** (`UnsupportedSchemaVersionError` or `MissingCreationOrderError`) |

Article XIV (pre-release freedom) authorises:
- removing `DuplicateTimestampError` from the public surface without a deprecation period; and
- the hard load-fail on pre-#259 plots without a compatibility shim.

The user has confirmed (planning conversation, 2026-05-18) that no shipped user data exists that this break could regress.
