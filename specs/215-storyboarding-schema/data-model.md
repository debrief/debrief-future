# Data Model: Storyboarding — Schema + CRUD Core

**Feature**: 215-storyboarding-schema
**Date**: 2026-04-20

This file is the authoritative, implementation-ready shape for the
four entities introduced by #215. It captures every field, every
invariant, and every error surface. Sibling specs (#216, #217, #218)
MUST reference this file — they do not redefine entities.

---

## 1. Storyboard (GeoJSON Feature)

**Discriminator**: `properties["debrief:type"] === "storyboard"`

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| `type` | `"Feature"` | yes | — | GeoJSON fixed. |
| `id` | string | yes | — | Equal to `properties.id`. ULID. |
| `geometry` | `GeoJSONPolygon` | yes | — | Computed hull covering union of child Scene viewport bounds. Recomputed by the module whenever the Scene set changes. |
| `properties.debrief:type` | string | yes | `"storyboard"` | `equals_string: "storyboard"`. |
| `properties.id` | string | yes | — | ULID. Pattern `^[0-9A-HJKMNP-TV-Z]{26}$`. Immutable after create. |
| `properties.name` | string | yes | — | Non-empty. Unique within plot FeatureCollection. |
| `properties.description` | string | no | `""` | Markdown. |
| `properties.schema_version` | integer | yes | `1` | Monotonically non-decreasing. v1 only in this spec. |
| `properties.created_by` | string | yes | — | Actor. |
| `properties.created_at` | ISO-8601 instant | yes | — | Immutable after create. |
| `properties.last_modified_by` | string | yes | — | Updated on every mutation. |
| `properties.last_modified_at` | ISO-8601 instant | yes | — | Updated on every mutation. |
| `properties.history` | array of `HistoryEntry` | yes | `[]` on create (+1 entry for `op: create`) | Append-only. |

### Invariants

| ID | Statement | Where enforced |
|----|-----------|----------------|
| SB-I1 | `name` unique within the owning FeatureCollection. | Module (`createStoryboard`, `renameStoryboard`). |
| SB-I2 | `id` is immutable after creation. | Module (no public op accepts an `id` patch). |
| SB-I3 | `schema_version` monotonically non-decreasing. | Module (migration hook only increases; CRUD ops never decrease). |
| SB-I4 | `history` length only grows. | Module (history is append-only; no op removes or mutates prior entries). |
| SB-I5 | Parent Storyboard Feature is **not rendered on the map**. | Out of scope here — enforced by the rendering layer in #217. |

### State transitions

There is no formal state machine. Life-cycle:

```
(nothing) ──createStoryboard──▶ Storyboard exists
Storyboard ──renameStoryboard──▶ Storyboard (name changed, history+1)
Storyboard ──<any Scene op>──▶ Storyboard (geometry recomputed, history+0 on parent)
Storyboard ──deleteStoryboard──▶ (nothing; cascades to Scenes)
```

### Generated artefacts

- Pydantic: `debrief_schemas.Storyboard` (class) + `StoryboardProperties`.
- JSON Schema: `shared/schemas/src/generated/json-schema/storyboard.schema.json`.
- TypeScript: `StoryboardFeature` + `StoryboardProperties` in the
  generated `.d.ts`, re-exported from `@debrief/schemas`.

---

## 2. Scene (GeoJSON Feature)

**Discriminator**: `properties["debrief:type"] === "storyboard_scene"`

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| `type` | `"Feature"` | yes | — | GeoJSON fixed. |
| `id` | string | yes | — | Equal to `properties.id`. ULID. |
| `geometry` | `GeoJSONPolygon` | yes | — | The map viewport bounds at capture time. Antimeridian-crossing: best-effort Polygon in MVP, module logs a warning (does not throw). |
| `properties.debrief:type` | string | yes | `"storyboard_scene"` | `equals_string: "storyboard_scene"`. |
| `properties.id` | string | yes | — | ULID. Immutable after create. |
| `properties.storyboard_id` | string | yes | — | ULID. Foreign key → `Storyboard.properties.id`. |
| `properties.title` | string | yes | DTG of `timestamp` in `DDHHmmZ MMM YY`; falls back to `timestamp` ISO-8601 string | Non-empty. |
| `properties.description` | string | no | `""` | Markdown. |
| `properties.viewport` | `Viewport` sub-record | yes | — | See §3. |
| `properties.timestamp` | ISO-8601 instant | yes | — | Drives Scene ordering. |
| `properties.time_range` | `{start, end}` or `null` | no | `null` | **MUST be `null` in v1** (reserved slot). |
| `properties.visible_feature_ids` | string[] | yes | — | Stable feature IDs visible at capture. Order-insensitive. MAY be empty. |
| `properties.feature_set_hash` | string | yes | — | SHA-256 hex of `JSON.stringify(sorted(visible_feature_ids))` UTF-8 bytes; see research.md R4. |
| `properties.thumbnail_asset_ref` | string | yes | — | STAC asset key (path + name within the plot's STAC item). Populated by #216 at capture time. |
| `properties.transition_duration_ms` | integer | yes | `500` | Must be ≥ 0. |
| `properties.created_by` | string | yes | — | Actor. |
| `properties.created_at` | ISO-8601 instant | yes | — | Immutable after create. |
| `properties.last_modified_by` | string | yes | — | Updated on every mutation. |
| `properties.last_modified_at` | ISO-8601 instant | yes | — | Updated on every mutation. |
| `properties.history` | array of `HistoryEntry` | yes | `[]` on create (+1 entry for `op: create`) | Append-only. |

### Invariants

| ID | Statement | Where enforced |
|----|-----------|----------------|
| SC-I1 | `timestamp` unique within a Storyboard. | Schema (`unique_keys` on the virtual Storyboard-grouped view) + Module (`createScene` / `updateScene` / `duplicateScene`). |
| SC-I2 | Ordering is derived from `timestamp` ascending; no explicit `order` field. | Module (`listScenesOrdered`). |
| SC-I3 | `feature_set_hash` matches `sha256(json(sorted(visible_feature_ids)))` at persist time. | Schema (slot has a `pattern: ^[0-9a-f]{64}$` check) + Module (recomputed on every create / update / duplicate). |
| SC-I4 | `time_range` is `null` in v1. | Schema (`value_presence: ABSENT` + Pydantic `@field_validator`) + Module (`ReservedSlotViolation` on any non-null input). |
| SC-I5 | `viewport.bearing === 0` in v1. | Schema (`equals_number: 0` / `min=max=0`) + Module (`ReservedSlotViolation`). |
| SC-I6 | `storyboard_id` references an existing Storyboard in the same FeatureCollection. | Module (`OrphanScene` on any CRUD op; `validatePlot` at save time). |
| SC-I7 | `visible_feature_ids` is order-insensitive; sorted before hashing. | Module (`computeFeatureSetHash`). |
| SC-I8 | `transition_duration_ms` ≥ 0. | Schema (`minimum_value: 0`). |

### State transitions

Scenes have a **stale** projection driven by read-time hash comparison:

```
          (ok)
           │
    hash_stored = hash_now
           │
  (hash mismatch → stale)
           │
 update_to_current ──▶ (ok) again
```

`stale` is **not a persisted field** — it is a read-time derivation by
the module. Consumers (#217 playback, #218 edit) decide whether to
surface it.

### Generated artefacts

- Pydantic: `debrief_schemas.StoryboardScene` + `SceneProperties`.
- JSON Schema: `storyboard-scene.schema.json` alongside Storyboard's.
- TypeScript: `SceneFeature` + `SceneProperties` re-exported from
  `@debrief/schemas`.

---

## 3. Viewport (sub-record)

Sub-record, not a Feature. Lives inside `SceneProperties.viewport`.

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `center` | `[float, float]` | yes | — | `[longitude, latitude]` degrees. Longitude ∈ [−180, 180], latitude ∈ [−90, 90]. |
| `zoom` | float | yes | — | Leaflet-native, not forced to integer. |
| `bearing` | float | yes | `0` | **MUST be 0 in v1** (reserved slot — SC-I5). |

---

## 4. HistoryEntry (sub-record)

Sub-record, not a Feature. Appended to `properties.history[]` on
Storyboards *and* Scenes.

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `timestamp` | ISO-8601 instant | yes | — | When the op ran. |
| `actor` | string | yes | — | Who ran it. |
| `op` | enum | yes | — | One of: `create`, `rename`, `describe`, `delete`, `restore`, `update-to-current`, `duplicate`, `copy-in`, `insert-middle`, `refresh-thumbnail`. |
| `summary` | string | yes | — | One-line human-readable summary for Analysis Log (#176). Non-empty. Bound to 140 chars. |

### `op` values — when each is used

| `op` | Emitted by |
|------|-----------|
| `create` | `createStoryboard`, `createScene` |
| `rename` | `renameStoryboard` (Storyboard) |
| `describe` | `updateScene` when only `description` / `title` changed (Scene) |
| `delete` | `deleteStoryboard`, `deleteScene` — appended *before* removal so the record survives in an undo buffer (#218 concern) |
| `restore` | Reserved for #218 undo — not emitted by this spec's module |
| `update-to-current` | `updateScene` when `visible_feature_ids` + hash changed |
| `duplicate` | `duplicateScene` (appended to the *new* Scene) |
| `copy-in` | `copySceneToOtherStoryboard` (appended to the *new* Scene in destination Storyboard) |
| `insert-middle` | `createScene` when inserted between two existing Scenes (detected by timestamp comparison) |
| `refresh-thumbnail` | Reserved for #218 — not emitted by this spec's module |

---

## 5. StoryboardError taxonomy

Defined in code (not schema). See research.md R7 for the table and
contracts/crud-module-api.md for the TypeScript declarations.

| Code | Carries |
|------|---------|
| `DuplicateTimestamp` | `conflictingSceneId`, `timestamp` |
| `OrphanScene` | `sceneId`, `storyboardId` |
| `UnknownStoryboard` | `storyboardId` |
| `UnknownScene` | `sceneId` |
| `ReservedSlotViolation` | `field`, `value` |
| `DuplicateStoryboardName` | `name`, `conflictingStoryboardId` |
| `ThumbnailDeepCopyFailed` | `cause` |
| `SchemaMigrationFailed` | `fromVersion`, `toVersion`, `cause` |
| `InvariantViolation` | `detail` |

---

## 6. FeatureCollection invariants (cross-entity)

These are invariants over an entire plot FeatureCollection — they
cannot be expressed in per-Feature LinkML schemas and are enforced at
the module boundary:

| ID | Statement |
|----|-----------|
| FC-I1 | Every Scene's `storyboard_id` resolves to a Storyboard Feature in the same FeatureCollection. |
| FC-I2 | No two Storyboards share the same `name`. |
| FC-I3 | No two Scenes with the same `storyboard_id` share the same `timestamp`. |
| FC-I4 | `deleteStoryboard` cascades — all Scenes with that `storyboard_id` are removed atomically. |
| FC-I5 | On copy across Storyboards, the destination Scene's thumbnail asset is a deep copy of the source's — they share no storage reference. |
| FC-I6 | Every mutation produces a new FeatureCollection object (no in-place mutation). |

---

## 7. Fixture inventory (Article II gate)

Seven fixtures ship with this spec. Locations follow the existing
project convention (`shared/schemas/src/fixtures/{valid,invalid}/`).

| File | Kind | Purpose |
|------|------|---------|
| `valid/storyboard-minimal.json` | valid Storyboard | Minimum required fields, empty `description`, no Scenes yet. |
| `valid/storyboard-full-featured.json` | valid plot FeatureCollection | One Storyboard + three Scenes at distinct timestamps, full provenance + history. |
| `valid/storyboard-scene-minimal.json` | valid Scene | Minimum required fields, hash present, `time_range: null`, `bearing: 0`. |
| `invalid/storyboard-scene-duplicate-timestamp.json` | invalid plot | Two Scenes, same `storyboard_id`, same `timestamp` — must reject. |
| `invalid/storyboard-scene-non-null-time-range.json` | invalid Scene | `time_range: {start, end}` in v1 — must reject. |
| `invalid/storyboard-scene-bearing-nonzero.json` | invalid Scene | `viewport.bearing: 3.14` in v1 — must reject. |
| `invalid/storyboard-scene-orphan.json` | invalid plot | Scene whose `storyboard_id` does not match any Storyboard in the FeatureCollection — must reject by module (`OrphanScene`). |

A **missing-thumbnail** fixture is explicitly out of scope for this
spec — that invariant is consumer-enforced by #216 at capture time.

---

## 8. Adherence-test mapping

| Spec § | Success Criterion | Test file | Test name(s) |
|--------|-------------------|-----------|--------------|
| US1 AS1 | SC-001 lossless round-trip | `shared/schemas/tests/test_roundtrip.py` | `test_storyboard_roundtrip`, `test_storyboard_scene_roundtrip` |
| US1 AS2 | SC-003 invariant coverage (negative) | `shared/schemas/tests/test_validation.py` | `test_rejects_duplicate_timestamp`, `test_rejects_non_null_time_range`, `test_rejects_bearing_nonzero`, `test_rejects_orphan_scene` |
| US1 AS3 | SC-002 schema compare | `shared/schemas/tests/test_schema_compare.py` | `test_storyboard_pydantic_vs_linkml_schema` |
| US2 AS1 | FR-MODULE-013 ordering | `shared/components/src/storyboard/__tests__/ordering.test.ts` | `listScenesOrdered returns ascending` |
| US2 AS2 | FR-MODULE-014 duplicate | `…/crud.test.ts` | `createScene rejects duplicate timestamp` |
| US2 AS3 | FR-MODULE-012 history+modified | `…/history.test.ts` | `every mutation appends one HistoryEntry` |
| US2 AS4 | FR-MODULE-015 deep-copy | `…/crud.test.ts` | `copySceneToOtherStoryboard deep-copies thumbnail` |
| US3 AS1–4 | FR-MODULE-017 missing-data | `…/missing-data.test.ts` | `detectMissingDataForScene ok | missing | out-of-range | pure` |
| SC-005 | atomicity | `…/atomicity.test.ts` | `compound op rollback on injected failure` |
| SC-007 | migration hook | `…/migration.test.ts` | `v1 migration hook invoked + no-op` |
| SC-008 | no UI coupling | `…/crud.test.ts` (build-time) | module compiles with React/VS Code/Leaflet unresolved |
| SC-009 | offline | CI config | network disabled in test runner (already enforced) |
