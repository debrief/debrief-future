# Data Model: STAC 1.1.0 + best-practices upgrade

**Feature**: 241-stac-best-practices-upgrade
**Date**: 2026-05-02

This document captures the entities, fields, and validation rules introduced or changed by spec 241. The shape contracts here are the source of truth for the JSON-Schema-based contracts in `contracts/` and the Pydantic-typed factory updates in `services/stac/src/debrief_stac/`.

---

## Entity 1 — `STACItem` (envelope-level changes)

The `Feature`-typed JSON document at `<item-dir>/item.json`. Existing GeoJSON `geometry`/`bbox`/`properties.title`/`properties.datetime` and `links[]` semantics are unchanged. Changes are additive.

### New / changed fields

| Field | Type | Required | Source / value | Notes |
|---|---|---|---|---|
| `stac_version` | string | yes | constant `"1.1.0"` | was `"1.0.0"`. Change applies to every Item. |
| `stac_extensions` | string[] | yes | adds `processing` v1.2.0 + `file` v2.1.0 URIs alongside existing `debrief` URI | order: `[debrief, processing, file]` (alphabetical-by-shortname after `debrief` for stability) |
| `properties.created` | string (RFC 3339 UTC) | yes | factory: `now()` on first write. Regenerator: git introduction date of `item.json`, fallback to filesystem mtime | preserved across edits |
| `properties.updated` | string (RFC 3339 UTC) | yes | refreshed on every write (factory, feature add, asset write, metadata patch) | |
| `properties.license` | string | yes | `"other"` for the bundled sample catalog | SPDX expression OR literal `"other"`. `"proprietary"` and `"various"` are forbidden. |
| `properties.providers` | Provider[] | yes (≥1) | sample default: `[{name: "Debrief", roles: ["producer", "host"], url: "https://debrief.info"}]` | each entry's `roles` drawn from `licensor` / `producer` / `processor` / `host` |

### Provider (nested)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | display name |
| `roles` | string[] | yes (≥1) | enum: `licensor` / `producer` / `processor` / `host` |
| `url` | string (URI) | no | informational link |
| `description` | string | no | free text |

### Validation rules

- `properties.created` MUST NOT change after first write. Regression test: run factory, capture `created`, mutate Item, write, assert `created` unchanged.
- `properties.updated` MUST be ≥ `created`. Equality is allowed only on the very first write.
- `properties.updated` MUST be ≥ the previous `updated` value. Monotonic.
- Item MUST validate against `https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/item.json`.
- Item MUST validate against the `processing` and `file` extension schemas.

---

## Entity 2 — Asset object (changes within `assets`)

Every `assets.<key>` object continues to be a STAC Asset. New fields:

| Field | Type | Where | Required | Source / value |
|---|---|---|---|---|
| `processing:software` | `Map<string,string>` | source assets (`roles: ["source"]`) | yes for source assets | mirrors `debrief:provenance.tool_version` — e.g. `{"debrief-stac": "0.1.0", "debrief-io": "0.1.0"}` |
| `processing:datetime` | string (RFC 3339 UTC) | source assets | yes for source assets | mirrors `debrief:provenance.load_timestamp`, normalised to UTC |
| `file:size` | integer | every disk-backed asset | yes when reachable | size of the file in bytes |
| `file:checksum` | string (multihash, hex) | every disk-backed asset | yes when reachable | SHA-256 multihash, lower-case hex |

### Asset key changes

| Old key | New key | Meaning | `roles` |
|---|---|---|---|
| `thumbnail` (800×600 PNG) | `overview` | large preview | `["overview"]` |
| `thumbnail-sm` (200×150 PNG) | `thumbnail` | small preview / catalog tile | `["thumbnail"]` |
| `features` | `features` | unchanged | `["data"]` |
| `source-*` | `source-*` | unchanged | `["source"]` |

Both thumbnail-class assets MUST emit:

| Field | Value |
|---|---|
| `type` | `"image/png"` |
| `proj:shape` | `[150, 200]` for `thumbnail`, `[600, 800]` for `overview` |

### Validation rules

- For every asset whose `href` resolves to an existing file under the item directory: `file:size` MUST be the exact byte length, `file:checksum` MUST be the multihash-encoded SHA-256 of the file contents.
- For source assets whose `href` is a `/tmp/...` or otherwise unreachable URI: `file:size` and `file:checksum` MUST be omitted (not zero, not null). `processing:*` fields MUST still be emitted.
- Assets must not contain bare-hex SHA-256 — always multihash-encoded.

---

## Entity 3 — `STACCollection` (the promoted `catalog.json`)

The Catalog-as-Collection at `preview/workspace/samples/local-store/catalog.json`. Existing `extent` and `summaries` blocks are unchanged in semantics.

### New / changed fields

| Field | Type | Required | Source / value | Notes |
|---|---|---|---|---|
| `stac_version` | string | yes | constant `"1.1.0"` | was `"1.0.0"` |
| `license` | string | yes | `"other"` | was `"proprietary"`. SPDX-or-`"other"` enforced. |
| `providers` | Provider[] | yes (≥1) | same default as Item — `[{name: "Debrief", roles: ["producer", "host"], url: "https://debrief.info"}]` | |
| `item_assets` | `Map<string, AssetTemplate>` | yes | declares `features`, `thumbnail`, `overview`, `source` shape | new in 1.1.0 core spec |
| `links[]` | Link[] | yes (existing) | adds `{rel: "license", href: "https://debrief.info/license/sample-catalog", type: "text/html", title: "Debrief sample catalog license"}` when `license == "other"` | required by spec when `license == "other"` |

### `item_assets` block contents

| Key | `type` | `roles` | `title` |
|---|---|---|---|
| `features` | `application/geo+json` | `["data"]` | `Plot features` |
| `thumbnail` | `image/png` | `["thumbnail"]` | `Thumbnail (200×150)` |
| `overview` | `image/png` | `["overview"]` | `Overview (800×600)` |
| `source` | `application/octet-stream` | `["source"]` | `Source data` |

`item_assets` entries do not include `href` (per spec — `item_assets` describes the contract, not specific URLs).

### Validation rules

- Collection MUST validate against `https://schemas.stacspec.org/v1.1.0/collection-spec/json-schema/collection.json`.
- `summaries` block contents are unchanged from the 1.0 baseline. Specifically, `debrief:platforms` / `debrief:tags` / `debrief:feature_tags` summary aggregations behave identically.
- When `license == "other"`, exactly one `links[]` entry with `rel: "license"` MUST be present.

---

## Entity 4 — Item factory state machine

Distinguish three lifecycle events in the Item factory:

| Event | `created` | `updated` | Trigger |
|---|---|---|---|
| Item created (`create_plot()`) | set to `now()` | set to `now()` | New plot loaded from REP file |
| Item edited (`add_features()`, `set_metadata()`, `add_asset()`) | preserved | refreshed to `now()` | Subsequent writes by services |
| Item regenerated (one-shot script) | preserved (lifted from git history) | refreshed to regeneration timestamp | Migration only, runs once |

Persisting `created` correctly across edits requires the factory's "load existing JSON, mutate, write" path (in `plot.py` and `assets.py`) to read the on-disk `created` value before re-emitting. New plots use `now()`; mutated existing plots preserve.

---

## Entity 5 — On-disk filesystem layout

Per item directory:

```
<item-id>/
├── item.json
├── features.geojson
├── thumbnail.png       # 200×150 (was thumbnail-sm.png)
├── overview.png        # 800×600 (was thumbnail.png)
└── assets/
    ├── source-<name>.rep    # original source file (unchanged)
    └── ...
```

The rename `thumbnail.png → overview.png` AND `thumbnail-sm.png → thumbnail.png` is performed via `git mv` to preserve blame history. No PNG bytes are re-encoded.

---

## Out-of-scope shapes (unchanged)

- `debrief:platforms`, `debrief:tags`, `debrief:feature_tags`, `debrief:overrides`, `debrief:provenance_log`, `debrief:provenance` — all unchanged in shape and semantics.
- `geometry`, `bbox`, `properties.datetime`, `properties.start_datetime`, `properties.end_datetime` — unchanged.
- `extent.spatial.bbox`, `extent.temporal.interval`, `summaries` — unchanged.
- All `links[]` entries except the new `rel: "license"` link when `license == "other"`.
