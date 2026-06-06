# Phase 1 — Data Model: STAC catalog cluster

**Feature**: 223-linkml-stac-catalog
**Date**: 2026-05-19
**Source file**: `shared/schemas/src/linkml/stac.yaml` (new — created in implementation)

Enumerates every class to be added to LinkML, its fields, ranges,
multiplicity, and consumer mapping. Authoritative checklist for
FR-001 / FR-002 and the input for fixture-corpus test authoring in
FR-006.

Cross-references:

- **Spec FR-001** lists the named classes.
- **Spec §Edge Cases** records the open-record / extension exceptions.
- **Research R-001** sets the discriminator pattern for
  `StacCatalogOrCollection`.
- **Research R-002** sets the open-record pattern for `assets` and
  `properties` extension keys.
- **Research R-003** sets the `mixins:` pattern for composing
  `StacExtensionProperties` into `StacItemProperties`.

## Naming and slot conventions

- Class names match the audit's existing TypeScript names verbatim
  (`StacItem`, `StacCatalog`, `StacCollection`, `StacLink`,
  `StacAsset`, `StacExtent`, `StacSummaries`, `StacProvider`).
- Slot names use STAC-spec field names exactly as they appear on
  disk (`stac_version`, `stac_extensions`, `start_datetime`,
  `end_datetime`). LinkML's snake_case-on-disk matches what STAC
  files actually use, so the generator's output requires no
  per-slot aliasing.
- Optional slots use `required: false` (default); required slots
  are marked `required: true` explicitly.
- Open-record slots (`StacItem.properties`, `StacAsset` extension
  keys, `StacCollection.item_assets`, `StacCollection.summaries`)
  use the LinkML 1.7 `additional_properties: true` directive at the
  class level. Each is annotated with a docstring citing
  Article XV.2 and spec §Edge Cases.

---

## Group 1 — Envelopes (P1)

### `StacItem`

Persists to `<store>/<catalog>/<plot-slug>/item.json`. Closes audit
§3.1 rows 58, 77, 84 and §3.2 `StacItem` drift cluster (3 members).

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `type` | `StacTypeEnum` (`equals_string: Feature`) | Yes | Discriminator. STAC mandates `"Feature"`. |
| `stac_version` | `string` | Yes | `"1.0.0"` or `"1.1.0"` — accepted as a string (R-005 / A-001). |
| `stac_extensions` | `string` (multivalued) | No | Extension schema URLs; absent on STAC 1.0, present on STAC 1.1 (R-005). |
| `id` | `string` | Yes | STAC item ID. |
| `geometry` | `GeoJSONPoint \| GeoJSONLineString \| GeoJSONPolygon \| GeoJSONMultiPoint \| GeoJSONMultiLineString \| GeoJSONMultiPolygon \| GeoJSONEmptyPoint` (any_of) | Yes | Reuses existing GeoJSON classes from `geojson.yaml`. Spec §Edge Cases — "GeoJSON geometry composition." |
| `bbox` | `float` (multivalued, min 4, max 6) | Yes | 4-element 2D or 6-element 3D bbox per STAC 1.1 (R-004). |
| `properties` | `StacItemProperties` (inline class) | Yes | Open-record properties — see class definition below. |
| `links` | `StacLink` (multivalued, ordered) | Yes | Catalog navigation links (`self`, `root`, `parent`, `derived_from`, etc.). |
| `assets` | `StacAsset` (multivalued, inlined_as_dict) | Yes | Open-record map keyed by asset name. |
| `collection` | `string` | No | STAC 1.1 — items belonging to a Collection carry the parent ID here. |

**Consumers DELETED**:

- `apps/vscode/src/types/stac.ts:127` (declaration removed; file
  becomes a re-export module per FR-004)
- `apps/vscode/src/services/sceneThumbnailService.ts:73` (private
  alias removed; imports `StacItem` from `@debrief/schemas`)
- `apps/web-shell/src/mocks/stacService.ts:23` (private declaration
  removed; imports `StacItem` from `@debrief/schemas`)
- `apps/web-shell/src/mocks/stacService.ts:464-474` (JSON projection
  cast removed — same `StacItem` used at both ends, closes A-009)

### `StacItemProperties` (open-record, mixin)

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `datetime` | `string` | Yes | ISO 8601. May be `null` per STAC spec when `start_datetime` + `end_datetime` set — accepted as `string` because the live fixtures always carry a non-null value. |
| `start_datetime` | `string` | No | ISO 8601. Required if `datetime` is null (STAC spec); accepted as optional for backward compat with point-in-time items. |
| `end_datetime` | `string` | No | ISO 8601. |
| `title` | `string` | No | Plot title. |
| `description` | `string` | No | Plot description. |
| `license` | `string` | No | SPDX or `"other"`. STAC 1.1 addition. |
| `providers` | `StacProvider` (multivalued) | No | STAC 1.1 addition; present in live fixtures. |
| `created` | `string` | No | ISO 8601, processing-time. STAC 1.1 addition. |
| `updated` | `string` | No | ISO 8601, processing-time. STAC 1.1 addition. |
| **`mixins`** | `StacExtensionProperties` | — | Mixes in `debrief:platforms`, `debrief:tags`, `debrief:feature_tags`, `overrides`, `provenance_log` slots (R-003). |
| **(open record)** | `Any` | — | Per spec FR-005: `additional_properties: true` permits arbitrary `<extension>:<key>` keys (`processing:*`, `proj:*`, etc.) without rejection. Article XV.2 exception — see Complexity Tracking. |

### `StacCatalog`

Persists to `<store>/<catalog>/catalog.json` for stores **not**
upgraded to STAC 1.1 Collection. Closes audit §3.1 rows 59, 85 and
§3.2 `StacCatalog` drift cluster (2 members).

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `type` | `StacTypeEnum` (`equals_string: Catalog`) | Yes | Discriminator (R-001). |
| `stac_version` | `string` | Yes | `"1.0.0"` or `"1.1.0"`. |
| `stac_extensions` | `string` (multivalued) | No | Optional; STAC 1.1 addition. |
| `id` | `string` | Yes | Catalog ID. |
| `title` | `string` | No | Display title. |
| `description` | `string` | Yes | STAC-mandated description. |
| `links` | `StacLink` (multivalued, ordered) | Yes | `self`, `root`, `parent`, child `item` links. |

**Consumers DELETED**:

- `apps/vscode/src/types/stac.ts:166` (declaration removed; file
  becomes re-export per FR-004)
- `apps/web-shell/src/mocks/stacService.ts:39` (private declaration
  removed)

---

## Group 2 — Members (P2)

### `StacLink`

Used by `StacItem.links`, `StacCatalog.links`, `StacCollection.links`.
Closes R4-masked audit row 175 (`apps/vscode/src/types/stac.ts:143`).

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `rel` | `string` | Yes | Link relation (`self`, `root`, `parent`, `item`, `derived_from`, etc.). |
| `href` | `string` | Yes | URI (relative or absolute). |
| `type` | `string` | No | MIME type. |
| `title` | `string` | No | Display title. |

**Consumers DELETED**:

- `apps/vscode/src/types/stac.ts:143` (declaration removed; re-export)
- Inline `Array<{ rel: string; href: string }>` shapes at
  `apps/web-shell/src/mocks/stacService.ts:37, 41` (replaced with
  `StacLink[]` from `@debrief/schemas`)

### `StacAsset`

Used by `StacItem.assets`, `StacCollection.item_assets`. Closes
R4-masked audit row 176 (`apps/vscode/src/types/stac.ts:153`) and the
inline `StacItemAssets` at
`apps/vscode/src/services/sceneThumbnailService.ts:63`.

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `href` | `string` | Yes | URI to the asset. |
| `type` | `string` | No | MIME type. |
| `title` | `string` | No | Display title. |
| `description` | `string` | No | STAC 1.1 addition. |
| `roles` | `string` (multivalued) | No | `"data"`, `"thumbnail"`, `"overview"`, `"source"`, etc. |
| **(open record)** | `Any` | — | `additional_properties: true` permits `file:checksum`, `file:size`, `file:local_path`, `processing:datetime`, `processing:software`, `proj:shape`, `debrief:provenance`, and future extension keys (R-002). Article XV.2 exception. |

**Consumers DELETED**:

- `apps/vscode/src/types/stac.ts:153` (declaration removed; re-export)
- `apps/vscode/src/services/sceneThumbnailService.ts:63-71` (inline
  `StacItemAssets` removed; `Record<string, StacAsset>` imported from
  `@debrief/schemas`)
- Inline shape at `apps/web-shell/src/mocks/stacService.ts:36`
  (`assets?: Record<string, { href; type?; roles? }>` replaced with
  `assets?: Record<string, StacAsset>`)

---

## Group 3 — Collection family (P3)

### `StacCollection`

Persists to `<store>/<catalog>/catalog.json` for stores upgraded to
STAC 1.1 (the `preview/workspace/samples/local-store/` case). Closes
R4-masked audit row 179 (`apps/vscode/src/types/stac.ts:188`).

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `type` | `StacTypeEnum` (`equals_string: Collection`) | Yes | Discriminator (R-001). |
| `stac_version` | `string` | Yes | Always `"1.1.0"` in current fixtures. |
| `stac_extensions` | `string` (multivalued) | No | Optional. |
| `id` | `string` | Yes | Collection ID. |
| `title` | `string` | No | Display title. |
| `description` | `string` | Yes | STAC-mandated. |
| `license` | `string` | Yes | STAC 1.1 mandates this on Collections. |
| `extent` | `StacExtent` | Yes | Spatial + temporal extent. |
| `summaries` | `StacSummaries` | No | Pre-aggregated extension summaries (open-record per R-002). |
| `providers` | `StacProvider` (multivalued) | No | STAC 1.1 addition; present in live fixtures (R-006). |
| `item_assets` | `StacAsset` (multivalued, inlined_as_dict) | No | STAC 1.1 addition — declares per-item asset shape (R-006). |
| `links` | `StacLink` (multivalued, ordered) | Yes | |

**Consumers DELETED**: `apps/vscode/src/types/stac.ts:201`
(declaration removed; re-export).

### `StacExtent`

Used by `StacCollection.extent`. Closes R4-masked audit row 177
(`apps/vscode/src/types/stac.ts:178`).

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `spatial` | `StacSpatialExtent` (inline) | Yes | |
| `temporal` | `StacTemporalExtent` (inline) | Yes | |

Where:

| Class | Slot | Range | Required | Notes |
|-------|------|-------|----------|-------|
| `StacSpatialExtent` | `bbox` | `float` (multivalued list-of-lists, min cardinality 1) | Yes | `[[west, south, east, north]]` arrays. LinkML expresses this as a multivalued slot whose value class wraps a nested 4–6 element float array. The plan phase resolves the exact construct (`inlined_as_list` on a `Bbox` class, or `linkml.list_value_specification`); the test corpus passes either way. |
| `StacTemporalExtent` | `interval` | `string` (multivalued list-of-pairs) | Yes | `[[start, end]]` — ISO 8601 or null. Same nested-array construct decision applies. |

### `StacSummaries`

Used by `StacCollection.summaries`. Closes R4-masked audit row 178
(`apps/vscode/src/types/stac.ts:192`).

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `debrief:platforms` | `PlatformRecord` (multivalued, from `stac-extension.yaml`) | No | Aggregated across all items in the Collection. |
| `debrief:tags` | `string` (multivalued) | No | |
| `debrief:feature_tags` | `string` (multivalued) | No | |
| **(open record)** | `Any` | — | `additional_properties: true` to accept other extension summary keys (e.g. `proj:epsg` rollups landing in #241). Article XV.2 exception. |

### `StacProvider`

Used by `StacCollection.providers` and `StacItemProperties.providers`.
New class — no audit row (the live fixtures' `providers` field was
previously implicit, masked as part of the catch-all hand-type).

| Slot | Range | Required | Notes |
|------|-------|----------|-------|
| `name` | `string` | Yes | Provider name. |
| `description` | `string` | No | |
| `roles` | `string` (multivalued) | No | `"licensor"`, `"producer"`, `"processor"`, `"host"`. |
| `url` | `string` | No | Provider URL. |

---

## TS-only aliases (not LinkML classes)

These live in `shared/schemas/src/typescript/aliases/stac-unions.ts`
(new file, inside `@debrief/schemas` — see Research R-001). Python
equivalents at `debrief_schemas/aliases/stac_unions.py`.

### `StacCatalogOrCollection`

```ts
export type StacCatalogOrCollection = StacCatalog | StacCollection;
```

The original hand-spelled definition at
`apps/vscode/src/types/stac.ts:216` is DELETED.

```python
StacCatalogOrCollection = Union[StacCatalog, StacCollection]
```

---

## Permissible-value enums (new)

### `StacTypeEnum`

`Feature`, `Catalog`, `Collection`.

Used as the discriminator field on `StacItem` / `StacCatalog` /
`StacCollection` with `equals_string` constraint per R-001. STAC
mandates only these three top-level values.

---

## Per-site migration plan

The 5 audit-flagged sites + 7 R4-masked siblings + 1 inline alias =
**13 declarations deleted across 4 files**. Each delete is paired
with an `import type ... from '@debrief/schemas'` add.

| # | File | Line (at audit SHA) | Declaration | Group | Migration step |
|---|------|---------------------|-------------|-------|----------------|
| 1 | `apps/vscode/src/types/stac.ts` | 114 | `interface StacItem` | P1 | Replace declaration with `export type { StacItem } from '@debrief/schemas'` |
| 2 | `apps/vscode/src/types/stac.ts` | 153 | `interface StacCatalog` | P1 | Replace with re-export |
| 3 | `apps/vscode/src/services/sceneThumbnailService.ts` | 73 | `interface StacItem` (private) | P1 | Delete; import `StacItem` from `@debrief/schemas` at top of file |
| 4 | `apps/web-shell/src/mocks/stacService.ts` | 23 | `interface StacItem` (private) | P1 | Delete; import from `@debrief/schemas` |
| 5 | `apps/web-shell/src/mocks/stacService.ts` | 39 | `interface StacCatalog` (private) | P1 | Delete; import from `@debrief/schemas` |
| 6 | `apps/vscode/src/types/stac.ts` | 143 | `interface StacLink` | P2 | Re-export |
| 7 | `apps/vscode/src/types/stac.ts` | 153 | `interface StacAsset` | P2 | Re-export |
| 8 | `apps/vscode/src/services/sceneThumbnailService.ts` | 63 | `interface StacItemAssets` (private) | P2 | Delete; use `Record<string, StacAsset>` |
| 9 | `apps/vscode/src/types/stac.ts` | 178 | `interface StacExtent` | P3 | Re-export |
| 10 | `apps/vscode/src/types/stac.ts` | 192 | `interface StacSummaries` | P3 | Re-export |
| 11 | `apps/vscode/src/types/stac.ts` | 201 | `interface StacCollection` | P3 | Re-export |
| 12 | `apps/vscode/src/types/stac.ts` | 216 | `type StacCatalogOrCollection` | P3 | Delete; import alias from `@debrief/schemas` |
| 13 | `apps/web-shell/src/mocks/stacService.ts` | 464-474 | JSON projection cast onto `@debrief/stac-writer.StacItem` | P1 | Delete cast — both ends now use the same `@debrief/schemas.StacItem` (A-009) |

**Files retained (out of scope, OOS-001 / OOS-002)**:

- `apps/vscode/src/types/stac.ts` continues to declare: `StoreStatus`
  (line 11), `StacStore` (line 16), `Catalog` (line 36 — UI-only
  catalog summary, NOT the STAC Catalog), the camelCase
  `StacItemSummary` adapter (line 67), and helper functions
  `createStore` / `isValidStorePath` / `buildStacUri` /
  `parseStacUri` (lines 221+).

**Python writer migration (FR-012)**:

- `scripts/enrich-legacy-catalog.py` and any `services/stac/`
  module that constructs `dict[str, Any]` STAC payloads MUST be
  audited and switched to `debrief_schemas.StacItem` /
  `StacCatalog` / `StacCollection` Pydantic constructions, then
  serialised via `model.model_dump(mode='json', by_alias=True,
  exclude_none=True)`. The exhaustive list of sites is resolved
  during /speckit.tasks per Research R-009. Estimated 3–5 sites.

---

## Class summary table

| # | Class / Enum | Group | Audit row(s) closed | Consumer migration |
|---|--------------|-------|--------------------|----------------------|
| 1 | `StacItem` | Envelopes (P1) | §3.1 rows 58, 77, 84 + §3.2 `StacItem` cluster (3 members) | 3 sites |
| 2 | `StacItemProperties` *(inline class for `StacItem.properties`)* | Envelopes (P1) | — | (inline) |
| 3 | `StacCatalog` | Envelopes (P1) | §3.1 rows 59, 85 + §3.2 `StacCatalog` cluster (2 members) | 2 sites |
| 4 | `StacTypeEnum` *(enum)* | Envelopes (P1) | — | (new discriminator) |
| 5 | `StacLink` | Members (P2) | R4-masked row 175 | 1 site + 2 inline shapes |
| 6 | `StacAsset` | Members (P2) | R4-masked row 176 + 1 inline alias | 2 sites + 1 inline |
| 7 | `StacCollection` | Collection (P3) | R4-masked row 179 | 1 site |
| 8 | `StacExtent` | Collection (P3) | R4-masked row 177 | 1 site |
| 9 | `StacSpatialExtent` *(inline)* | Collection (P3) | — | (inline) |
| 10 | `StacTemporalExtent` *(inline)* | Collection (P3) | — | (inline) |
| 11 | `StacSummaries` | Collection (P3) | R4-masked row 178 | 1 site |
| 12 | `StacProvider` | Collection (P3) | — | (new — captures live fixtures) |
| TS-1 | `StacCatalogOrCollection` *(alias)* | Collection (P3) | R4-masked row 180 | 1 site |

**Total**: 10 LinkML classes + 1 enum + 1 TS-only alias =
**12 new declarations** under `@debrief/schemas`. **13 hand-typed
sites deleted** (5 audit-flagged + 7 R4-masked + 1 projection cast).
Matches spec FR-001 + FR-003 scope.

## Fixture-corpus test inputs (FR-006)

The schema-adherence test under `shared/schemas/tests/test_stac_fixtures.py`
loads every committed STAC artefact through the generated Pydantic
validators:

| Source directory | File count | STAC version |
|-------|-----:|-------|
| `preview/workspace/samples/local-store/` | 73 `item.json` | 1.1.0 |
| `preview/workspace/samples/local-store/catalog.json` | 1 | 1.1.0 Collection |
| `apps/vscode/test-data/local-store/catalog.json` | 1 | 1.0.0 Catalog |
| `apps/vscode/test-data/local-store/` | (any) `item.json` | 1.0.0 / 1.1.0 |

**Pass criterion**: each file deserialises into the appropriate
Pydantic class (`StacItem` / `StacCatalog` / `StacCollection`) with
**no field coercion** (Pydantic's `extra='forbid'` rejects unknown
*core* fields, but the open-record slots permit unknown
`<ns>:<key>` keys). Round-trip back to JSON produces byte-identical
output modulo key ordering (which Pydantic's `model_dump` already
canonicalises).

## TypeScript adoption is types-only (Decision 4A)

**No runtime validation on the TypeScript side.** The migration installs
generated *types* from `@debrief/schemas` at the consumer call sites
(`apps/vscode/src/types/stac.ts`,
`apps/vscode/src/services/sceneThumbnailService.ts`,
`apps/web-shell/src/mocks/stacService.ts`); it does NOT introduce
runtime Zod parsers, ad-hoc `.parse()` calls, or `is*()` predicates on
the imported types.

The rationale, in three lines:

1. **Pydantic on the Python side IS the validation point.** Article II
   plus the new `test_stac_fixtures.py` corpus tests cover every
   committed STAC artefact; if Pydantic accepts a payload, TypeScript
   structurally trusts it.
2. **Article IV.1 — thick services / thin frontends.** Frontends
   consume already-validated data. Re-validating in TypeScript would
   duplicate the schema definition in a second runtime form and create
   exactly the drift this feature is designed to prevent.
3. **Article XV's narrowing exception covers extension keys at the
   boundary.** The open-record slots (`StacItemProperties`,
   `StacAsset`, `StacSummaries`) intentionally accept arbitrary
   `<namespace>:<key>` extensions; consumers narrow per extension via
   the existing per-extension type guards (e.g. the `debrief:platforms`
   typed reader). This pattern was already in place before #223.

**Enforcement**: a grep gate runs in `quickstart.md` Step 3 — `z.object`,
`.parse(`, `is${StacClass}` predicates on imported `@debrief/schemas`
STAC types are absent from the diff. Existing narrowing helpers in
unrelated modules are not affected.

Cross-references: Constitution Article IV.1 (frontends never duplicate
validation); Constitution Article II.2 (schema-adherence tests are the
cross-language validator); plan.md Complexity Tracking (Article XV.2
exception for the three open-record classes).

## Open follow-ups (deferred — not blocking #223)

- Per-extension typed narrowing for `StacAsset[file:*]`,
  `StacAsset[processing:*]`, `StacAsset[proj:*]` — future E11 phase
  once the extension landscape stabilises post-#241/#258. Today the
  open-record pattern is the right starting point.
- Strict tuple typing for `bbox` (4-element vs 6-element distinct
  shapes) — blocked on `gen-typescript` emitting tuple types, out of
  scope here.
- Unifying the camelCase `StacItemSummary` adapter with the
  snake_case `@debrief/schemas#StacItemSummary` — separate backlog
  item (#214 follow-up).
