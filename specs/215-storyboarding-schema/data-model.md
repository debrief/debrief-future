# Data Model: Storyboarding — Schema + CRUD Core

**Feature**: 215-storyboarding-schema
**Date**: 2026-04-20

This file is the authoritative, implementation-ready shape for the
three entities introduced by #215 (Storyboard, Scene, Viewport) and the
one extension to an existing entity (`LogEntry.agent` slot). It
captures every field, every invariant, and every error surface.
Sibling specs (#216, #217, #218) MUST reference this file — they do
not redefine entities.

**Updated 2026-04-20** following post-plan review. Key deltas:
- Discriminator moved from `properties["debrief:type"]` → inherited
  `properties.kind` (`FeatureKindEnum` extension).
- Provenance unified on the inherited `BaseFeatureProperties.provenance:
  LogEntry[]` slot; `created_by`, `last_modified_by`,
  `last_modified_at`, and `history` are all DROPPED.
- The proposed `HistoryEntry` sub-entity is REMOVED; CRUD operations
  encode into the existing `LogEntry` via `WasGeneratedBy.tool =
  "storyboard-crud"` + `WasGeneratedBy.parameters.op`.
- `LogEntry` gains one optional slot: `agent: string` (this spec's
  only edit to the log-entry schema module).
- Fixtures split: valid fixtures now include two single-Feature
  round-trip fixtures and two FeatureCollection fixtures; invalid
  fixtures are unchanged.

---

## 1. Storyboard (GeoJSON Feature)

**Discriminator**: `properties.kind === "STORYBOARD"` (value added to
`FeatureKindEnum` in `common.yaml` by this spec).

**Inheritance**: `StoryboardProperties` **extends**
`BaseFeatureProperties`, picking up `kind`, `id`, `tags`,
`provenance: LogEntry[]`.

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| `type` | `"Feature"` | yes | — | GeoJSON fixed. |
| `id` | string | yes | — | Equal to `properties.id`. ULID. |
| `geometry` | `GeoJSONPolygon` | yes | — | Computed hull covering union of child Scene viewport bounds. Recomputed by the module whenever the Scene set changes. |
| `properties.kind` | `"STORYBOARD"` | yes | `"STORYBOARD"` | Inherited discriminator; `equals_string: "STORYBOARD"` in the LinkML slot usage. |
| `properties.id` | string | yes | — | ULID. Pattern `^[0-9A-HJKMNP-TV-Z]{26}$`. Immutable after create. Inherited slot. |
| `properties.name` | string | yes | — | Non-empty. Unique within plot FeatureCollection. |
| `properties.description` | string | no | `""` | Markdown. |
| `properties.schema_version` | integer | yes | `1` | Monotonically non-decreasing. v1 only in this spec. |
| `properties.tags` | string[] | no | `[]` | Inherited from `BaseFeatureProperties`. |
| `properties.provenance` | `LogEntry[]` | yes | `[]` on create (+1 entry for `op: create`) | **Inherited from `BaseFeatureProperties`.** Append-only. Encoding rules in §4 below. |

### Invariants

| ID | Statement | Where enforced |
|----|-----------|----------------|
| SB-I1 | `name` unique within the owning FeatureCollection. | Module (`createStoryboard`, `renameStoryboard`). |
| SB-I2 | `id` is immutable after creation. | Module (no public op accepts an `id` patch). |
| SB-I3 | `schema_version` monotonically non-decreasing. | Module (migration hook only increases; CRUD ops never decrease). |
| SB-I4 | `provenance` length only grows. | Module (provenance is append-only per FR-MODULE-020; no op removes or mutates prior entries). |
| SB-I5 | Parent Storyboard Feature is **not rendered on the map**. | Out of scope here — enforced by the rendering layer in #217. |
| SB-I6 | `created_at` / `last_modified_at` are **derived**, not stored. Consumers read them as `provenance[0].timestamp` and `provenance[provenance.length-1].timestamp`. | Module (helper getters in `provenance.ts`). |

### State transitions

There is no formal state machine. Life-cycle:

```
(nothing) ──createStoryboard──▶ Storyboard exists (provenance=[create])
Storyboard ──renameStoryboard──▶ Storyboard (name changed, +1 rename entry)
Storyboard ──<any Scene op>──▶ Storyboard (geometry recomputed; no provenance delta on the parent)
Storyboard ──deleteStoryboard──▶ (nothing; cascades to Scenes)
```

### Generated artefacts

- Pydantic: `debrief_schemas.StoryboardFeature` + `StoryboardProperties`.
- JSON Schema: `shared/schemas/src/generated/json-schema/storyboard.schema.json`.
- TypeScript: `StoryboardFeature` + `StoryboardProperties` in the
  generated `.d.ts`, re-exported from `@debrief/schemas`.

---

## 2. Scene (GeoJSON Feature)

**Discriminator**: `properties.kind === "STORYBOARD_SCENE"` (value added
to `FeatureKindEnum`).

**Inheritance**: `SceneProperties` **extends** `BaseFeatureProperties`.

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| `type` | `"Feature"` | yes | — | GeoJSON fixed. |
| `id` | string | yes | — | Equal to `properties.id`. ULID. |
| `geometry` | `GeoJSONPolygon` | yes | — | The map viewport bounds at capture time. Antimeridian-crossing: best-effort Polygon in MVP, module logs a warning (does not throw). |
| `properties.kind` | `"STORYBOARD_SCENE"` | yes | `"STORYBOARD_SCENE"` | Inherited discriminator. |
| `properties.id` | string | yes | — | ULID. Immutable after create. Inherited. |
| `properties.storyboard_id` | string | yes | — | ULID. Foreign key → `Storyboard.properties.id`. |
| `properties.title` | string | yes | DTG of `timestamp` in `DDHHmmZ MMM YY`; falls back to `timestamp` ISO-8601 string | Non-empty. |
| `properties.description` | string | no | `""` | Markdown. |
| `properties.viewport` | `Viewport` sub-record | yes | — | See §3. |
| `properties.timestamp` | ISO-8601 instant | yes | — | Drives Scene ordering. |
| `properties.time_range` | `{start, end}` or `null` | no | `null` | **MUST be `null` in v1** (reserved slot). |
| `properties.visible_feature_ids` | string[] | yes | — | Stable feature IDs visible at capture. Canonicalised (trim, reject empty, dedupe, sort) by the module before hashing. |
| `properties.feature_set_hash` | string | yes | — | SHA-256 hex of `JSON.stringify(canonicalIds)` UTF-8 bytes; see research.md R4. |
| `properties.thumbnail_asset_ref` | string | yes | — | STAC asset key (path + name within the plot's STAC item). Populated by #216 at capture time. |
| `properties.transition_duration_ms` | integer | yes | `500` | Must be ≥ 0. |
| `properties.tags` | string[] | no | `[]` | Inherited. |
| `properties.provenance` | `LogEntry[]` | yes | `[]` on create (+1 entry for `op: create`) | Inherited. Append-only. Encoding in §4. |

### Invariants

| ID | Statement | Where enforced |
|----|-----------|----------------|
| SC-I1 | `timestamp` unique within a Storyboard. | Schema (`unique_keys` on the virtual Storyboard-grouped view) + Module (`createScene` / `updateScene` / `duplicateScene`). |
| SC-I2 | Ordering is derived from `timestamp` ascending; no explicit `order` field. | Module (`listScenesOrdered`). |
| SC-I3 | `feature_set_hash` matches `sha256(json(canonical(visible_feature_ids)))` at persist time. | Schema (slot has a `pattern: ^[0-9a-f]{64}$` check) + Module (recomputed on every create / update / duplicate; async via Web Crypto). |
| SC-I4 | `time_range` is `null` in v1. | Schema (`value_presence: ABSENT` + Pydantic `@field_validator`) + Module (`ReservedSlotViolation` on any non-null input). |
| SC-I5 | `viewport.bearing === 0` in v1. | Schema (`equals_number: 0` / `min=max=0`) + Module (`ReservedSlotViolation`). |
| SC-I6 | `storyboard_id` references an existing Storyboard in the same FeatureCollection. | Module (`OrphanScene` on any CRUD op; `validatePlot` at save time). |
| SC-I7 | `visible_feature_ids` is order-insensitive; canonicalised (trim, dedupe, sort) before hashing. | Module (`computeFeatureSetHash`). |
| SC-I8 | `transition_duration_ms` ≥ 0. | Schema (`minimum_value: 0`). |
| SC-I9 | `created_at` / `last_modified_at` are derived as `provenance[0].timestamp` / `provenance[last].timestamp`. | Module (`provenance.ts` helpers). |

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
surface it. `readSceneWithStaleness` returns the stored hash + the
canonical list; the consumer awaits a recomputed hash if it wants
staleness, keeping the query itself synchronous (see research.md R11).

### Generated artefacts

- Pydantic: `debrief_schemas.SceneFeature` + `SceneProperties`.
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

## 4. Provenance encoding — how CRUD ops map to `LogEntry`

Per the 2026-04-20 clarification, the proposed `HistoryEntry` entity is
DROPPED. All mutations append one `LogEntry` to the inherited
`BaseFeatureProperties.provenance[]` slot.

### Schema edit landing in this spec

`LogEntry` gains one **new optional slot** (in `log-entry.yaml`):

| Slot | Type | Required | Notes |
|------|------|----------|-------|
| `agent` | string | no | Human actor (e.g. `"alice"`). Added by #215; opportunistically useful to every tool emitting `LogEntry` records. |

### Encoding table — one row per op

| `LogEntry` field | Value when emitted by this module |
|------------------|-----------------------------------|
| `activity_id` | fresh UUID v4 per op (NOT the Feature id) |
| `timestamp` | ISO-8601 instant when the op ran (`input.now ?? new Date().toISOString()`) |
| `agent` | caller-supplied actor string |
| `was_generated_by.tool` | `"storyboard-crud"` |
| `was_generated_by.tool_version` | `"1.0.0"` (semver of this spec) |
| `was_generated_by.parameters.op` | one of: `create`, `rename`, `describe`, `delete`, `restore`, `update-to-current`, `duplicate`, `copy-in`, `insert-middle`, `refresh-thumbnail` |
| `was_generated_by.parameters.summary` | one-liner for Analysis Log (#176); ≤ 140 chars |
| `used` | source Feature IDs (empty for `create`; source Scene id for `duplicate`/`copy-in`) |
| `generated` | output Feature IDs — the Storyboard or Scene id the entry is attached to |
| `execution_duration` | `"PT0S"` (CRUD is instantaneous; reserved for future long-running ops) |
| `rationale` | optional free-text analyst annotation |

### Op values — when each is emitted

| `op` | Emitted by |
|------|-----------|
| `create` | `createStoryboard`, `createScene` (appended to the new Feature) |
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
| FC-I6 | Every mutation produces a new FeatureCollection object (no in-place mutation); unmodified Features are reference-equal across input and output (FR-MODULE-022). |

---

## 7. Fixture inventory (Article II gate)

Nine fixtures ship with this spec. Valid fixtures are split into
**single-Feature** (for the cross-language round-trip harness — each
file holds exactly one Storyboard or Scene Feature, allowing direct
Pydantic validation) and **FeatureCollection** (integration shape).
Invalid fixtures mirror the negative test cases.

File-ordering note: `test_roundtrip.py` iterates its entity map by
insertion order and matches by filename **prefix**, so
`storyboard-scene` MUST be registered before `storyboard` in the map
(otherwise a Scene fixture would be parsed as a Storyboard first).
See adherence-test mapping below.

| File | Kind | Purpose |
|------|------|---------|
| `valid/storyboard-single-minimal.json` | valid Storyboard (bare Feature) | Single-Feature fixture for Py↔TS round-trip harness. Minimum required fields, `provenance` has one `create` entry. |
| `valid/storyboard-scene-single-minimal.json` | valid Scene (bare Feature) | Single-Feature fixture for round-trip harness. `visible_feature_ids: []`, `feature_set_hash` is the hash of `[]`, `time_range: null`, `bearing: 0`. |
| `valid/storyboard-full-featured.json` | valid plot FeatureCollection | One Storyboard + three Scenes at distinct timestamps; representative of a full captured session. |
| `valid/storyboard-scene-minimal.json` | valid plot FeatureCollection | One Storyboard + one Scene; minimum viable FeatureCollection. |
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
| US1 AS1 | SC-001 lossless round-trip (Python-side) | `shared/schemas/tests/test_roundtrip.py` | `test_storyboard_roundtrip`, `test_storyboard_scene_roundtrip` |
| US1 AS1 | SC-001 cross-language (Py→JSON→TS→JSON→Py) | `shared/schemas/tests/test_crosslang_roundtrip.py` | `test_storyboard_single_crosslang`, `test_storyboard_scene_single_crosslang` |
| US1 AS2 | SC-003 invariant coverage (negative) | `shared/schemas/tests/test_validation.py` | `test_rejects_duplicate_timestamp`, `test_rejects_non_null_time_range`, `test_rejects_bearing_nonzero`, `test_rejects_orphan_scene` |
| US1 AS3 | SC-002 schema compare | `shared/schemas/tests/test_schema_compare.py` | `test_storyboard_pydantic_vs_linkml_schema` |
| US2 AS1 | FR-MODULE-013 ordering | `shared/components/src/storyboard/__tests__/ordering.test.ts` | `listScenesOrdered returns ascending` |
| US2 AS2 | FR-MODULE-014 duplicate | `…/crud.test.ts` | `createScene rejects duplicate timestamp` |
| US2 AS3 | FR-MODULE-012 provenance append | `…/provenance.test.ts` | `every mutation appends one LogEntry to provenance[]` |
| US2 AS4 | FR-MODULE-015 deep-copy | `…/crud.test.ts` | `copySceneToOtherStoryboard deep-copies thumbnail` |
| US3 AS1–4 | FR-MODULE-017 missing-data | `…/missing-data.test.ts` | `detectMissingDataForScene ok \| missing \| out-of-range \| pure` |
| SC-005 | atomicity | `…/crud.test.ts` | `compound op rollback on injected failure` |
| SC-007 | migration hook | `…/migration.test.ts` | `v1 migration hook invoked + no-op` |
| SC-008 | no UI coupling | `…/crud.test.ts` (build-time) | module compiles with React/VS Code/Leaflet unresolved |
| SC-009 | offline | CI config | network disabled in test runner (already enforced) |
| FR-MODULE-022 | structural sharing | `…/crud.test.ts` | `unmodified Features are reference-equal across input and output` |
| FR-TEST-024 | perf bench | `…/perf.bench.ts` | `createScene p95 < 10 ms @ 100k`, `updateScene p95 < 10 ms @ 100k`, `copySceneToOtherStoryboard p95 < 10 ms @ 100k` |
