# Usage Example: STAC 1.1.0 + best-practices upgrade

Three commands take a fresh contributor from `git checkout` to a working,
validated, regenerated catalog they can browse in `radiantearth/stac-browser`.

## 1. Regenerate the bundled sample catalog

```sh
uv run python scripts/upgrade-catalog-to-stac-1.1.py
```

Expected output:

```
Upgrading catalog at preview/workspace/samples/local-store (regen timestamp 2026-05-02T...Z)
  thumbnail renames — large→overview: 73; small→thumbnail: 73
  upgrading 73 item.json files
  upgrading preview/workspace/samples/local-store/catalog.json
  validating against vendored STAC 1.1 schemas

Done — 73 items + 1 catalog upgraded and validated against vendored STAC 1.1 schemas.
```

Re-running the same command produces zero diff (idempotency guaranteed by
`scripts/upgrade-catalog-to-stac-1.1.py`'s update-suppression for
`properties.updated`).

## 2. Validate every item against vendored STAC 1.1 schemas

```sh
uv run pytest services/stac/tests/test_stac_validation.py -v
```

Expected: 13 tests pass (vendored fixtures present + minimal Item/Collection
validate + factory output validates + every one of the 73 sample items + the
promoted Catalog-as-Collection all validate against the official STAC 1.1
JSON Schema).

## 3. Browse the catalog in radiantearth/stac-browser

```sh
cd apps/web-shell
node run-playwright.mjs stac-browser-interop
```

Expected: the test spawns two `http-server` processes (catalog on `:4080`,
vendored stac-browser dist on `:8080`), drives the browser through Collection
→ Item → Assets, and writes three screenshots:

- `specs/241-stac-best-practices-upgrade/evidence/stac-browser-collection.png`
- `specs/241-stac-best-practices-upgrade/evidence/stac-browser-item.png`
- `specs/241-stac-best-practices-upgrade/evidence/stac-browser-assets.png`

Total runtime: ~6 s (well under the 60 s FR-026 budget).

## What you get

A single regenerated item now looks like:

```json
{
  "type": "Feature",
  "stac_version": "1.1.0",
  "stac_extensions": [
    "https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json",
    "https://stac-extensions.github.io/processing/v1.2.0/schema.json",
    "https://stac-extensions.github.io/file/v2.1.0/schema.json"
  ],
  "id": "core--boat1",
  "properties": {
    "title": "Saxon Warrior: Boat1",
    "datetime": "1995-12-12T05:00:00+00:00",
    "created": "2026-04-13T23:12:32.611Z",
    "updated": "2026-05-02T08:42:53.617Z",
    "license": "other",
    "providers": [{"name": "Debrief", "roles": ["producer", "host"], "url": "https://debrief.info"}],
    "debrief:platforms": [...],
    "debrief:tags": [...]
  },
  "assets": {
    "features": {"href": "./features.geojson", "type": "application/geo+json", "roles": ["data"]},
    "thumbnail": {
      "href": "./thumbnail.png", "type": "image/png", "roles": ["thumbnail"],
      "proj:shape": [150, 200],
      "file:size": 13719,
      "file:checksum": "12206b467232b83cee1be12b62eb62e2d434937254ba978047953fb8aa93085b856e"
    },
    "overview": {
      "href": "./overview.png", "type": "image/png", "roles": ["overview"],
      "proj:shape": [600, 800],
      "file:size": 39471,
      "file:checksum": "1220ce42128a19bdc0102ee55adc26bdca856ee3fc82d02ea66a6a217aedb03716d6"
    },
    "source-boat1": {
      "href": "./assets/boat1.rep", "roles": ["source"],
      "debrief:provenance": {...},                                      // preserved byte-for-byte
      "processing:software": {"debrief-stac": "0.1.0"},                  // mirrors debrief:provenance.tool_version
      "processing:datetime": "2026-04-13T23:12:32.611Z",                 // UTC-normalised debrief:provenance.load_timestamp
      "file:size": 32562,
      "file:checksum": "122021be77fa4f174fb3505aece2bdd15224513c7acf98342fcd9945bb08521fa312"
    }
  }
}
```

When loaded into `radiantearth/stac-browser` v3.3.4 (or the public SPA at
https://radiantearth.github.io/stac-browser/#/), the `processing:*` and
`file:*` fields render as first-class metadata; the `debrief:*` namespace
falls back to raw JSON without errors. See the three captured screenshots
for the rendered result.
