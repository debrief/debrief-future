# Sample item before/after diff — `core--boat1/item.json`

Concrete demonstration of the spec-241 shape change for one canonical item.
The same shape applies to all 73 sample-catalog items.

## Top-level envelope

| Field | Before (1.0) | After (1.1) |
|---|---|---|
| `stac_version` | `"1.0.0"` | `"1.1.0"` |
| `stac_extensions` | `[debrief]` | `[debrief, processing, file]` |
| `bbox` | populated array | populated array (unchanged for items with geometry; key omitted for null-geometry items per STAC 1.1) |

## `properties` additions

**Before** — only the 1.0 baseline fields:

```json
{
  "title": "Saxon Warrior: Boat1",
  "datetime": "1995-12-12T05:00:00+00:00",
  "description": "Saxon Warrior: Boat1 — Royal Navy training exercise...",
  "start_datetime": "1995-12-12T05:00:00+00:00",
  "end_datetime": "1995-12-12T11:41:00+00:00",
  "debrief:platforms": [...],
  "debrief:tags": [...],
  "debrief:feature_tags": [...]
}
```

**After** — five new keys (created/updated/license/providers + bbox handling):

```json
{
  "title": "...",
  "datetime": "...",
  "created": "2026-04-13T23:12:32.611Z",   // NEW — git introduction date
  "updated": "2026-05-02T08:42:53.617Z",   // NEW — regeneration timestamp
  "license": "other",                       // NEW — never "proprietary" per STAC 1.1
  "providers": [                            // NEW — Debrief default
    {"name": "Debrief", "roles": ["producer", "host"], "url": "https://debrief.info"}
  ],
  // ... existing debrief:* fields preserved byte-for-byte ...
}
```

## `assets` re-keying + new fields

**Before** — large 800×600 keyed at `assets.thumbnail`, small 200×150 at `assets.thumbnail-sm`. Source asset only carries `debrief:provenance`.

**After** — STAC-conventional naming + standard extension co-publishing:

```json
{
  "features": { "href": "./features.geojson", "type": "application/geo+json", "roles": ["data"] },

  "thumbnail": {                                          // 200×150 (was thumbnail-sm)
    "href": "./thumbnail.png",
    "type": "image/png",
    "roles": ["thumbnail"],
    "title": "Plot thumbnail (200x150)",
    "proj:shape": [150, 200],                             // NEW — STAC Browser layout reservation
    "file:size": 13719,                                    // NEW — file extension
    "file:checksum": "12206b467232b83cee1be12b62eb62e2d434937254ba978047953fb8aa93085b856e"  // NEW — multihash SHA-256
  },

  "overview": {                                           // 800×600 (was thumbnail, now reclassified)
    "href": "./overview.png",
    "type": "image/png",
    "roles": ["overview"],
    "title": "Plot overview (800x600)",
    "proj:shape": [600, 800],
    "file:size": 39471,
    "file:checksum": "1220ce42128a19bdc0102ee55adc26bdca856ee3fc82d02ea66a6a217aedb03716d6"
  },

  "source-boat1": {
    "href": "./assets/boat1.rep",
    "type": "application/vnd.businessobjects",
    "roles": ["source"],
    "title": "boat1.rep",
    "debrief:provenance": {                               // PRESERVED byte-for-byte
      "source_path": "/tmp/debrief-regen-4x2tftum/boat1.rep",
      "load_timestamp": "2026-04-13T23:12:32.611844Z",
      "tool_version": "0.1.0"
    },
    "processing:software": {"debrief-stac": "0.1.0"},     // NEW — mirrors debrief:provenance.tool_version
    "processing:datetime": "2026-04-13T23:12:32.611Z",    // NEW — UTC-normalised debrief:provenance.load_timestamp
    "file:size": 32562,                                    // NEW — file extension
    "file:checksum": "122021be77fa4f174fb3505aece2bdd15224513c7acf98342fcd9945bb08521fa312"
  },

  "thumbnail-sm": REMOVED                                  // legacy key dropped
}
```

## On-disk filesystem rename (via `git mv`)

```text
core--boat1/
  thumbnail.png      (was 800×600 large)  →  overview.png    (now keyed at assets.overview)
  thumbnail-sm.png   (was 200×150 small)  →  thumbnail.png   (now keyed at assets.thumbnail)
```

The `git mv` is split into two passes (large→overview across all items, then
small→thumbnail across all items) so the canonical `thumbnail.png` filename
isn't double-claimed mid-rename.
