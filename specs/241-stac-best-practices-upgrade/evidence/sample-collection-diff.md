# Sample collection before/after diff — `catalog.json`

The promoted Catalog-as-Collection at `preview/workspace/samples/local-store/catalog.json`.

## Top-level envelope

| Field | Before (1.0) | After (1.1) |
|---|---|---|
| `type` | `Collection` | `Collection` (unchanged) |
| `stac_version` | `"1.0.0"` | `"1.1.0"` |
| `stac_extensions` | absent | `[debrief]` (canonicalised) |
| `license` | `"proprietary"` (deprecated in 1.1) | `"other"` (SPDX-or-other per 1.1) |
| `providers` | absent | NEW — `[{name: "Debrief", roles: ["producer", "host"], url: "https://debrief.info"}]` |
| `item_assets` | absent | NEW — declares the contract for every Item's assets shape (features, thumbnail, overview, source, scene-thumbnail) |
| `summaries` | populated | unchanged content (FR-013) |
| `extent` | populated | unchanged |
| `links` | item links + self/root | NEW: adds `rel: "license"` link required when `license == "other"` |

## New `item_assets` block

```json
"item_assets": {
  "features":         { "type": "application/geo+json",       "roles": ["data"],      "title": "Plot features" },
  "thumbnail":        { "type": "image/png",                  "roles": ["thumbnail"], "title": "Thumbnail (200x150)" },
  "overview":         { "type": "image/png",                  "roles": ["overview"],  "title": "Overview (800x600)" },
  "source":           { "type": "application/octet-stream",   "roles": ["source"],    "title": "Source data (placeholder; per-item keys are source-*)" },
  "scene-thumbnail":  { "type": "image/png",                  "roles": ["thumbnail"], "title": "Storyboard scene thumbnail (placeholder; per-scene keys are scene-thumbnail-* and scene-thumbnail-*-sm)" }
}
```

Per-item asset naming variation (`source-boat1`, `scene-thumbnail-{ulid}`,
`scene-thumbnail-{ulid}-sm`) is captured at the Item level via the
`patternProperties` in `contracts/item-shape.schema.json`. The Collection
block declares the *contract*, not the instances — which is exactly what
STAC Browser needs to render a "what's in here?" summary.

## New `links` entries

The previous `links[]` had `self`, `root`, and 73 `item` entries. The new
shape adds a single license link (required by STAC 1.1 when `license == "other"`):

```json
{
  "rel": "license",
  "href": "./LICENSE",
  "title": "Sample-catalog license (Debrief internal use)"
}
```

## What did NOT change

- `summaries` block — same keys, same values (FR-013 invariant)
- `extent` (spatial bbox + temporal interval) — recomputed on the next rebuild but identical content for the unchanged item set
- All 73 `links[].rel == "item"` entries
- `id`, `description`, self-link href

## Validation

`catalog.json` validates against the official STAC 1.1.0 Collection JSON
Schema (`https://schemas.stacspec.org/v1.1.0/collection-spec/json-schema/collection.json`),
proven by `services/stac/tests/test_stac_validation.py::test_sample_catalog_root_validates_against_stac_1_1`.
