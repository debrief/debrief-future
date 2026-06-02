# Phase 1 Data Model: Prefix-Aware TypeScript Typing for STAC Extension Properties

**Feature**: 256-prefix-aware-stac-typing
**Date**: 2026-06-01 (revised 2026-06-02 for expanded scope)

> This feature is **mostly** type-declaration changes. The one genuine schema
> change is two additive optional slots on `StacAsset` (their on-disk keys
> already exist). No JSON shape changes. The "model" here is the shape of the
> *generated TypeScript/Pydantic* and the slot→`slot_uri` mapping that drives
> the transform across **three** classes.

## Target classes & slot→key mapping

The schema-driven transform rewrites each modelled slot's emitted TS key to its
LinkML `slot_uri` verbatim. Source files: `stac-extension.yaml`
(`StacExtensionProperties`) and `stac.yaml` (`StacSummaries`, `StacAsset`).

### `StacExtensionProperties` (item `properties`) — `stac-extension.yaml`

| LinkML slot name | `slot_uri` (on-disk key) | Value type (generated) | Multivalued |
|------------------|--------------------------|------------------------|-------------|
| `platforms`      | `debrief:platforms`      | `PlatformRecord[]`     | yes |
| `tags`           | `debrief:tags`           | `string[]`             | yes |
| `feature_tags`   | `debrief:feature_tags`   | `string[]`             | yes |
| `overrides`      | `debrief:overrides`      | `string[]`             | yes |
| `provenance_log` | `debrief:provenance_log` | `PropertiesProvenanceEntry[]` | yes |

### `StacSummaries` (Collection summaries) — `stac.yaml`

| LinkML slot name      | `slot_uri` (on-disk key) | Value type (generated) | Multivalued |
|-----------------------|--------------------------|------------------------|-------------|
| `debrief_platforms`   | `debrief:platforms`      | `PlatformRecord[]`     | yes |
| `debrief_tags`        | `debrief:tags`           | `string[]`             | yes |
| `debrief_feature_tags`| `debrief:feature_tags`   | `string[]`             | yes |

> Note the **substitution**, not prefix: bare key `debrief_platforms` →
> `debrief:platforms`. A pure-text "prepend `debrief:`" rule would wrongly
> produce `debrief:debrief_platforms`; the schema-driven `slot_uri` read is
> correct.

### `StacAsset` (asset metadata) — `stac.yaml` — **NEW slots**

| LinkML slot name (new) | `slot_uri` (on-disk key)      | Value type | Multivalued |
|------------------------|-------------------------------|------------|-------------|
| `tool_id`              | `debrief:toolId`              | `string`   | no |
| `snapshot_timestamp`   | `debrief:snapshotTimestamp`   | `string`   | no |

> Existing `StacAsset` slots (`href`, `type`, `title`, `description`, `roles`)
> declare **no** extension `slot_uri` and are left untouched by the transform —
> proving the schema-driven rule's selectivity (FR-013).

## Transformation (what the generator emits)

### `StacExtensionProperties` — before → after

```ts
// BEFORE (prefix stripped)               // AFTER (slot_uri verbatim)
platforms?: PlatformRecord[],             'debrief:platforms'?: PlatformRecord[],
tags?: string[],                          'debrief:tags'?: string[],
feature_tags?: string[],                  'debrief:feature_tags'?: string[],
overrides?: string[],                     'debrief:overrides'?: string[],
provenance_log?: PropertiesProvenanceEntry[],  'debrief:provenance_log'?: PropertiesProvenanceEntry[],
```

`StacItemProperties extends StacExtensionProperties` (+ STAC core +
`[key: string]: unknown`) inherits the prefixed slots, so
`props['debrief:provenance_log']` resolves to
`PropertiesProvenanceEntry[] | undefined`.

### `StacSummaries` — before → after

```ts
// BEFORE                                 // AFTER
debrief_platforms?: PlatformRecord[],     'debrief:platforms'?: PlatformRecord[],
debrief_tags?: string[],                  'debrief:tags'?: string[],
debrief_feature_tags?: string[],          'debrief:feature_tags'?: string[],
[key: string]: unknown,                   [key: string]: unknown,
```

### `StacAsset` — before → after (slots added + the two prefixed)

```ts
// BEFORE                                 // AFTER
href: string,                            href: string,            // untouched
type?: string,                           type?: string,           // untouched
title?: string,                          title?: string,          // untouched
description?: string,                    description?: string,     // untouched
roles?: string[],                        roles?: string[],         // untouched
                                          'debrief:toolId'?: string,            // NEW, prefixed
                                          'debrief:snapshotTimestamp'?: string, // NEW, prefixed
[key: string]: unknown,                   [key: string]: unknown,
```

## Entities

### LinkML change: two `StacAsset` slots
- **Location**: `shared/schemas/src/linkml/stac.yaml`, `StacAsset.attributes`.
- **Change**: add `tool_id` (`slot_uri: debrief:toolId`) and `snapshot_timestamp`
  (`slot_uri: debrief:snapshotTimestamp`), both `range: string`, optional.
- **Consequence**: `gen-pydantic` re-emits the `StacAsset` Python model with two
  additional optional fields (additive, backward-compatible); `gen-typescript`
  emits two bare-key slots that the transform then prefixes.

### Generated artefacts: `types.ts` (TS) + `debrief_schemas` (Pydantic)
- **Location**: `shared/schemas/src/generated/typescript/types.ts` and
  `.../python/debrief_schemas/` (committed, drift-gated).
- **Change**: slot keys gain the `debrief:` form across the three classes;
  Python `StacAsset` gains two fields.
- **Invariant**: value types unchanged; no new imports; the three classes remain
  open via their `[key: string]: unknown`.

### Generator post-processor step (`generate.py` → `generate_typescript()`)
- **Structure**: a **pure function** `prefix_extension_slots(block_text,
  slot_uri_map) -> text` (testable in isolation — FR-002, Issue 3A), invoked per
  target class.
- **Input**: gen-typescript text output + the `{class → {slot_name → slot_uri}}`
  map read from the LinkML source.
- **Output**: bare-key declarations whose slot carries an extension `slot_uri`
  rewritten to the `slot_uri` key; non-extension slots untouched.
- **Guard**: `raise RuntimeError` if an expected class block or bare-key token is
  absent (matches existing post-processor convention).

### Consumers: writer access sites
- **VS Code** (`apps/vscode/src/services/stacService.ts`):
  - read sites (`item.properties['debrief:platforms' | …]`, lines ~304–306) —
    redundant `as` casts removed;
  - **write path** (`const props = item.properties as Record<string, unknown>`,
    line 1315) — re-typed to `StacItemProperties`; cast + `ADR-011`
    eslint-disable removed (Issue 2A / FR-012);
  - **asset hand-cast** (`asset as StacAsset & { 'debrief:toolId'?: string }`,
    line 674) — removed; `asset['debrief:toolId']` now typed via `StacAsset`
    (FR-011 / SC-007).
- **web-shell** (`apps/web-shell/src/services/stacWriterIdb.ts`):
  - **write path** (`const props: Record<string, unknown> = { ...baseItem.properties }`,
    line 309) — re-typed to `StacItemProperties`; `as` casts on modelled keys
    removed.

## Validation rules / invariants

- **VR-1 (FR-003/FR-013)**: The emitted TS key for a modelled slot MUST equal its
  on-disk JSON key (`slot_uri`), derived from the schema — never hard-coded.
- **VR-2 (FR-005/FR-006)**: The three target classes MUST remain open
  (`[key: string]: unknown`) so STAC core + unmodelled keys type-check.
- **VR-3 (FR-008)**: Emitted JSON for any write MUST be byte-for-byte identical
  to pre-feature output (round-trip golden), including asset-level keys.
- **VR-4 (FR-002)**: A new slot added to a target class with an extension
  `slot_uri` MUST appear as a prefixed typed slot after regeneration, with no
  hand-edit to `generate.py` or any writer type (proved by the pure-fn unit test).
- **VR-5 (FR-009)**: Both writer hosts consume the single generated definition;
  no per-host re-declaration.
- **VR-6 (FR-012)**: The write/mutation path locals MUST be typed as
  `StacItemProperties` (not `Record<string, unknown>`), so a mis-typed modelled
  *write* fails the build.
- **VR-7 (FR-011)**: `asset['debrief:toolId']` and
  `asset['debrief:snapshotTimestamp']` MUST resolve to `string | undefined` via
  `StacAsset`, with no hand-cast.

## State transitions

None — static type declarations + additive optional schema slots.
