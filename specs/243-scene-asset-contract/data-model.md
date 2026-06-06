# Phase 1 Data Model — Per-Scene Asset Key Contract Formalisation

**Feature**: 243-scene-asset-contract
**Date**: 2026-05-02
**Source-of-truth**: LinkML class declarations (this document is the
human-readable counterpart to the YAML edits enumerated in
`tasks.md`).

---

## 1. New LinkML Class — `SceneThumbnailAssetEntry`

**Lives in**: `shared/schemas/src/linkml/storyboard.yaml` (the
storyboarding schema owns the semantics — Scenes are the producers
and consumers).

**Conceptual role**: Represents the **value** of a single per-Scene
thumbnail entry inside an Item's `assets` map (one entry per variant,
so a Scene contributes two entries — large + small).

### Slots

| Slot | Type | Required | Constraint | Source |
|------|------|----------|------------|--------|
| `href` | string | yes | URI-reference relative to the Item directory; conventionally `./scene-thumbnails/scene-{ULID}.png` (large) or `./scene-thumbnails/scene-{ULID}-sm.png` (small) | Existing service contract (`sceneThumbnailService.ts:248-259`) |
| `type` | string | yes | `equals_string: "image/png"` | Spec FR-004 |
| `roles` | string (multivalued) | yes | Exactly `["thumbnail"]` (single role) | Spec FR-004 |
| `title` | string | no | Free-text human label; service emits `"Scene thumbnail"` / `"Scene thumbnail (small)"` | Service convention |
| `variant` | enum (`SceneThumbnailVariantEnum`: `large`, `small`) | **derived, not stored** | Determined from the asset key suffix; encoded as a docstring rule, not a slot | Pairing rule §2 |

**Note on `variant`**: We deliberately do **not** add `variant` as an
explicit slot in v1. The variant is encoded by the *key suffix* in the
parent assets map (`-sm` ⇒ small; absence ⇒ large). Storing it inside
the entry would duplicate state and risk drift with the key. The
forward-compatibility recipe (research §D2) revisits this when adding
`-md` etc.

### Class docstring (verbatim — flows through to generated outputs)

```text
A single STAC Item asset entry produced by Storyboarding (#216) for one
variant of one Scene's thumbnail. Always appears as part of a
**pair** in an Item's `assets` map: a large entry under the key
`scene-thumbnail-{ULID}` and a small entry under the key
`scene-thumbnail-{ULID}-sm`, where `{ULID}` is the owning Scene's
identifier (matches `SceneProperties.id`).

  • **Why ULID?** The owning Scene's id; lets every per-Scene asset
    be traced back to its Scene without an explicit foreign-key field
    in the asset payload.
  • **Why pairs?** The Storyboarding capture pipeline produces both
    sizes atomically (800×600 large for inspection; 200×150 small for
    timeline strips). A single-variant entry is a defect — see
    *Schema rule scene-thumbnail-pair-rule-001*.
  • **Lifecycle.** Created when a Scene is captured. Deleted when the
    Scene is deleted (garbage-collection invariant — see *Schema rule
    scene-thumbnail-orphan-rule-001*). Both rules are enforced by the
    debrief-stac audit module; the JSON Schema layer enforces the
    value shape and key format only.

This shape supersedes the spec-241 placeholder
`item_assets["scene-thumbnail"]` and the
`^scene-thumbnail(-.+)?$` patternProperties rule that briefly stood
in for it. See spec 243 for migration history.
```

This docstring satisfies **FR-014** (answers the four diagnostic
questions: what / why-ULID / why-pairs / what-deletes) and flows
unchanged into:

- **Pydantic** `SceneThumbnailAssetEntry.__doc__`
- **JSON Schema** `description` field on the generated `$defs/SceneThumbnailAssetEntry`
- **TypeScript** TSDoc block above the generated `interface SceneThumbnailAssetEntry`

---

## 2. Schema Rules (named, referable invariants)

These are documented inside the LinkML class docstring (above) and in
the audit module that enforces them. Each carries a **stable ID** so a
CI failure can cite the rule by name.

### Rule `scene-thumbnail-pair-rule-001` — Variant Pairing

**Statement**: For every key matching the pattern
`^scene-thumbnail-([0-9A-HJKMNP-TV-Z]{26})$` in an Item's `assets`
map, the sibling key `scene-thumbnail-{$1}-sm` MUST also be present,
and vice versa.

**Enforced by**: `services/stac/src/debrief_stac/scene_thumbnail_audit.py::audit_scene_thumbnail_pairing(item: dict) -> list[Violation]`

**Citation in failure**: `"scene-thumbnail-pair-rule-001: missing -sm
counterpart for asset key 'scene-thumbnail-{ULID}'"`

**Spec mapping**: FR-005 (pairing invariant); spec acceptance scenario
US2.1.

### Rule `scene-thumbnail-orphan-rule-001` — Scene-Asset Garbage Collection

**Statement**: For every key matching
`^scene-thumbnail-([0-9A-HJKMNP-TV-Z]{26})(?:-sm)?$` in an Item's
`assets` map, the captured ULID MUST equal the `properties.id` of
some Scene Feature in the owning Plot's `features.geojson`.

**Enforced by**: `services/stac/src/debrief_stac/scene_thumbnail_audit.py::audit_scene_thumbnail_orphans(item: dict, features: list[dict]) -> list[Violation]`

**Citation in failure**: `"scene-thumbnail-orphan-rule-001: asset key
'scene-thumbnail-{ULID}' has no matching Scene in the owning Plot"`

**Spec mapping**: FR-009 (lifecycle invariant); spec acceptance
scenario US3.1.

### Rule `scene-thumbnail-key-format-rule-001` — ULID Key Format

**Statement**: Any key beginning with the literal `scene-thumbnail-`
MUST match the full pattern `^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(?:-sm)?$`.
Keys with non-ULID suffixes (e.g. `scene-thumbnail-foo`) are invalid.

**Enforced by**: JSON Schema overlay (see §4 below) — captured by
`patternProperties` + an explicit `additionalProperties` denial for
keys matching `^scene-thumbnail-` but not the full ULID form.

**Citation in failure**: Validator-emitted, e.g. `"property
'scene-thumbnail-foo' does not match any patternProperties pattern"`.

**Spec mapping**: FR-003.

---

## 3. Variant Enum — `SceneThumbnailVariantEnum` (informational, not in v1)

Recorded here as the **forward-compatibility marker** for research §D2.
The enum is **not** added in v1 but its membership documents the v1
contract:

| Value | Key suffix | Pixel dimensions | Purpose |
|-------|------------|------------------|---------|
| `large` | (no suffix) | 800 × 600 | Inspection / preview pane |
| `small` | `-sm` | 200 × 150 | Timeline strip / lozenge thumbnail |

A future spec adding `medium` would (a) add the enum value, (b)
extend the overlay regex, (c) update the pair rule to require all
declared variants. No v1 work.

---

## 4. JSON Schema Overlay — `scene-thumbnail-asset.schema.json`

**Lives in**: `shared/schemas/contracts/scene-thumbnail-asset.schema.json`

**Authored by hand** (the `patternProperties` construct cannot be
emitted by `gen-json-schema`; see research §B1).

**Wraps** the LinkML-generated `SceneThumbnailAssetEntry` value shape
via `$ref` (see research §B2 for the full file shape).

**Validates against**: A bare `assets`-style object containing zero
or more scene-thumbnail keys, optionally co-occurring with other
keys.

**Composition**: This overlay is **not** a standalone Item schema. It
is intended to be referenced from the spec-241 Item shape contract
via `allOf` + `$ref`, and from the new adherence test suite directly.

### Overlay structure (illustrative, not the final file — see contracts/)

```jsonc
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://debrief.info/schemas/contracts/scene-thumbnail-asset.schema.json",
  "title": "Scene-thumbnail asset map fragment",
  "description": "Layered overlay enforcing the patternProperties and ULID key format for per-Scene thumbnail asset entries inside a STAC Item's `assets` map. Value shape is sourced via $ref from the LinkML-generated SceneThumbnailAssetEntry.",
  "type": "object",
  "patternProperties": {
    "^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(?:-sm)?$": {
      "$ref": "https://debrief.info/schemas/storyboard.schema.json#/$defs/SceneThumbnailAssetEntry"
    }
  },
  "$comment": "Pair invariant (scene-thumbnail-pair-rule-001) and orphan rule (scene-thumbnail-orphan-rule-001) are enforced by services/stac/src/debrief_stac/scene_thumbnail_audit.py — not by this schema."
}
```

---

## 5. Removals & Modifications

### 5.1 Removed: `ITEM_ASSETS_TEMPLATE["scene-thumbnail"]` placeholder

**File**: `services/stac/src/debrief_stac/collection.py:~74-82`

**Reason**: FR-008. Replaced by the named overlay; collection-level
template no longer needs a placeholder for per-scene entries because
they're not part of the *collection* asset surface — they're per-Item
entries with formally modelled keys.

**Side-effect**: `preview/workspace/samples/local-store/catalog.json`
will be regenerated on next sample-data refresh; the placeholder
disappears from sample data automatically. No manual sample edits.

### 5.2 Modified: `specs/241-stac-best-practices-upgrade/contracts/item-shape.schema.json`

**Change**: Replace the inline `^scene-thumbnail(-.+)?$`
patternProperties block at lines 109-117 with a delegation to the new
overlay:

```jsonc
// before (deleted):
"patternProperties": {
  "^source(-.+)?$": { ... },
  "^scene-thumbnail(-.+)?$": { /* inline 8-line block */ }
}

// after:
"patternProperties": {
  "^source(-.+)?$": { ... }
},
"allOf": [
  { "$ref": "https://debrief.info/schemas/contracts/scene-thumbnail-asset.schema.json" }
]
```

**Reason**: FR-008. The new overlay is the single source for the
per-scene asset key contract; the spec-241 Item shape inherits it by
reference rather than re-declaring it.

**Test impact**: `services/stac/tests/test_plot.py` continues to
validate Items against the spec-241 contract (no changes in test
code). The `$ref` resolution requires the validator to load the
overlay; we configure this via a local file resolver in the test
helper (one-line change, documented in tasks.md).

### 5.3 Modified: `apps/vscode/src/services/sceneThumbnailService.ts`

**Change**: File-header docstring (lines 1-20) loses its current
implicit "I am the documentation" framing and gains a single-line
pointer to the LinkML class:

```ts
/**
 * Per-Scene thumbnail writer for Feature 216 (Storyboarding — Capture).
 *
 * Asset-key contract documented at:
 *   shared/schemas/src/linkml/storyboard.yaml :: SceneThumbnailAssetEntry
 *   shared/schemas/contracts/scene-thumbnail-asset.schema.json
 * (see spec 243 for the contract formalisation history).
 *
 * ...rest of existing docstring unchanged...
 */
```

**Reason**: FR-013. The TS code's behaviour is unchanged; only the
documentation pointer moves.

---

## 6. Entity Relationship Summary

```text
                 ┌────────────────────────┐
                 │  SceneFeature          │
                 │  (storyboard.yaml)     │
                 │  properties.id: ULID   │
                 └─────────────┬──────────┘
                               │  owned-by (ULID)
                               ▼
   ┌───────────────────────────────────────────────────────┐
   │  Item.assets                                          │
   │                                                       │
   │  "scene-thumbnail-{ULID}":     SceneThumbnailAssetEntry  ──┐
   │  "scene-thumbnail-{ULID}-sm":  SceneThumbnailAssetEntry  ──┤  pair
   │                                                            │  invariant
   │                                                            │  (rule 001)
   │                                                       <────┘
   └───────────────────────────────────────────────────────┘
                               ▲
                               │
              ┌────────────────┴────────────────┐
              │                                 │
   gen-json-schema                  gen-pydantic / gen-typescript
              │                                 │
              ▼                                 ▼
   storyboard.schema.json            Pydantic class /
   #/$defs/SceneThumbnailAssetEntry  TS interface — same docstring,
                                     same type, single source.
              │
              │  $ref
              ▼
   shared/schemas/contracts/scene-thumbnail-asset.schema.json
   (overlay: patternProperties + ULID key format)
              │
              │  $ref / allOf
              ▼
   specs/241-…/contracts/item-shape.schema.json
              │
              │  validates
              ▼
   services/stac/tests/test_plot.py
   + services/stac/src/debrief_stac/scene_thumbnail_audit.py
     (pair-rule-001, orphan-rule-001)
```

The diagram makes the spec's central improvement visible at a glance:
**one LinkML class → three generated outputs → one overlay → one
contract → one validator + audit pair**. Every consumer reaches the
same source. That replaces the current shape, where the only source
is a regex in a contract file plus a TypeScript service docstring,
with no shared definition between them.
