# Factory API Contracts — STAC 1.1.0 upgrade

This document specifies the new and changed function signatures inside `services/stac/src/debrief_stac/`. The contracts here pair with the JSON-Schema files in this directory: a unit test that calls one of these functions and validates the resulting JSON against the matching schema is the gate for FR-001 through FR-014.

---

## `plot.create_plot()` — additive changes

```python
def create_plot(
    *,
    title: str,
    datetime_iso: str,
    description: str | None = None,
    item_dir: Path,
    license_value: str = "other",          # NEW — defaults to "other"
    providers: list[Provider] | None = None,  # NEW — defaults to DEFAULT_PROVIDERS
) -> STACItem:
    """Create a fresh Item.

    Postconditions:
      - return["stac_version"] == "1.1.0"
      - "https://stac-extensions.github.io/processing/v1.2.0/schema.json"
          in return["stac_extensions"]
      - "https://stac-extensions.github.io/file/v2.1.0/schema.json"
          in return["stac_extensions"]
      - return["properties"]["created"] == return["properties"]["updated"] == iso_now_utc()
      - return["properties"]["license"] in {SPDX, "other"}; never "proprietary"|"various"
      - return["properties"]["providers"] is a non-empty list of Provider entries
      - return["properties"]["created"] is preserved on subsequent edits
    """
```

`DEFAULT_PROVIDERS` lives in a new module `debrief_stac/providers.py`:

```python
DEFAULT_PROVIDERS: list[Provider] = [
    {"name": "Debrief", "roles": ["producer", "host"], "url": "https://debrief.info"}
]
```

---

## `assets.add_source_asset()` — additive changes

```python
def add_source_asset(
    item: STACItem,
    *,
    asset_key: str,
    source_path: Path,
    media_type: str,
    tool_versions: dict[str, str],   # mirrors debrief:provenance.tool_version
    load_timestamp: datetime,         # mirrors debrief:provenance.load_timestamp; will be UTC-normalised
) -> STACItem:
    """Attach a source asset.

    Postconditions:
      - item["assets"][asset_key]["roles"] == ["source"]
      - item["assets"][asset_key]["debrief:provenance"]   # unchanged shape
      - item["assets"][asset_key]["processing:software"] == tool_versions
      - item["assets"][asset_key]["processing:datetime"] == utc_iso(load_timestamp)
      - if source_path.exists():
            item["assets"][asset_key]["file:size"] == source_path.stat().st_size
            item["assets"][asset_key]["file:checksum"] == multihash_sha256(source_path)
        else:
            "file:size" not in item["assets"][asset_key]
            "file:checksum" not in item["assets"][asset_key]
      - item["properties"]["updated"] == iso_now_utc()
    """
```

---

## `thumbnails.attach_thumbnails()` — key + role changes

```python
def attach_thumbnails(
    item: STACItem,
    *,
    item_dir: Path,
    small_png: bytes,    # 200×150
    large_png: bytes,    # 800×600
) -> STACItem:
    """Write thumbnail.png (200x150) and overview.png (800x600) to disk
    and register them in item.assets.

    Postconditions on disk:
      - (item_dir / "thumbnail.png").read_bytes() == small_png
      - (item_dir / "overview.png").read_bytes() == large_png

    Postconditions on item:
      - item["assets"]["thumbnail"]["href"] == "./thumbnail.png"
      - item["assets"]["thumbnail"]["roles"] == ["thumbnail"]
      - item["assets"]["thumbnail"]["proj:shape"] == [150, 200]
      - item["assets"]["thumbnail"]["file:size"] == len(small_png)
      - item["assets"]["thumbnail"]["file:checksum"] == multihash_sha256_bytes(small_png)
      - item["assets"]["overview"]["href"] == "./overview.png"
      - item["assets"]["overview"]["roles"] == ["overview"]
      - item["assets"]["overview"]["proj:shape"] == [600, 800]
      - item["assets"]["overview"]["file:size"] == len(large_png)
      - item["assets"]["overview"]["file:checksum"] == multihash_sha256_bytes(large_png)
      - item["properties"]["updated"] == iso_now_utc()

    Removed: the old "thumbnail-sm" key. Callers that still expect it must
    migrate to the new naming (caught by tsc / ruff in lockstep).
    """
```

---

## `collection.rebuild_collection_summaries()` — additive changes

```python
def rebuild_collection_summaries(
    catalog_root: Path,
    *,
    license_value: str = "other",
    providers: list[Provider] | None = None,
) -> STACCollection:
    """Promote catalog.json to a Collection and recompute summaries.

    Postconditions:
      - return["stac_version"] == "1.1.0"
      - return["license"] != "proprietary" and != "various"
      - return["providers"] is a non-empty list of Provider entries
      - return["item_assets"] has keys {"features", "thumbnail", "overview", "source"}
      - if return["license"] == "other":
            any(link["rel"] == "license" for link in return["links"])
      - return["summaries"] contents unchanged from 1.0 baseline
        (same keys, same value sets — only the surrounding envelope evolved)
    """
```

`item_assets` content lives in a new module-level constant:

```python
ITEM_ASSETS_TEMPLATE: dict[str, dict[str, object]] = {
    "features": {
        "type": "application/geo+json",
        "roles": ["data"],
        "title": "Plot features",
    },
    "thumbnail": {
        "type": "image/png",
        "roles": ["thumbnail"],
        "title": "Thumbnail (200×150)",
    },
    "overview": {
        "type": "image/png",
        "roles": ["overview"],
        "title": "Overview (800×600)",
    },
    "source": {
        "type": "application/octet-stream",
        "roles": ["source"],
        "title": "Source data",
    },
}
```

---

## New utility — `checksum.multihash_sha256()`

```python
def multihash_sha256(path: Path) -> str:
    """Compute the multihash-encoded SHA-256 of a file's bytes.

    Returns lower-case hex string in multihash format:
      <varint algo=0x12><varint length=0x20><32 bytes digest>

    Implementation uses the `multiformats` PyPI package.
    """

def multihash_sha256_bytes(data: bytes) -> str:
    """Same as multihash_sha256() but operates on an in-memory bytes object."""
```

---

## New utility — `timestamps.iso_now_utc()` and `timestamps.normalise_to_utc()`

```python
def iso_now_utc() -> str:
    """RFC 3339 UTC timestamp with millisecond precision: '2026-05-02T10:23:14.123Z'."""

def normalise_to_utc(ts: str | datetime) -> str:
    """Coerce any RFC 3339 timestamp (timezone-naive accepted) to UTC RFC 3339.
    Raises ValueError if the input is unparseable."""
```

---

## Regeneration script — `scripts/upgrade-catalog-to-stac-1.1.py`

```python
def main(catalog_root: Path = Path("preview/workspace/samples/local-store")) -> int:
    """Upgrade every Item and the Collection in `catalog_root` to STAC 1.1.0
    + processing/file extensions + new asset-key conventions.

    Steps per item:
      1. Read the existing item.json
      2. Compute created from `git log --diff-filter=A --format=%aI -- {item.json} | tail -1`
         (fallback to mtime if git returns empty)
      3. Bump stac_version to "1.1.0"
      4. Add processing/file URIs to stac_extensions[] (idempotent — does not duplicate)
      5. Set properties.created (preserved if already present), properties.updated = now()
      6. Set properties.license = "other" if missing (preserved if SPDX); never "proprietary"
      7. Set properties.providers = DEFAULT_PROVIDERS if missing (preserved if present)
      8. For each source asset: mirror debrief:provenance.* into processing:* (idempotent)
      9. For each disk-backed asset: compute file:size + file:checksum (re-computed each run is OK
         because file content is stable; idempotency assertion is on the OUTPUT, not the work)
     10. Rename thumbnail.png → overview.png via `git mv`; rename thumbnail-sm.png → thumbnail.png
         via `git mv`. Update asset entries to match.
     11. Add proj:shape to thumbnail/overview entries
     12. Validate against item-shape.schema.json + the official STAC 1.1 Item schema. Halt on failure.

    Steps for catalog.json:
      1. Bump stac_version, set license="other", set providers=DEFAULT_PROVIDERS
      2. Add item_assets block (ITEM_ASSETS_TEMPLATE)
      3. Add rel="license" link
      4. Validate against collection-shape.schema.json + the official STAC 1.1 Collection schema.

    Idempotency: a second run produces exactly zero diff (verified by `git diff --stat` in CI).
    """
```

---

## VS Code reader rename (TypeScript)

In `apps/vscode/src/types/stac.ts`:

```typescript
// BEFORE
interface StacItemSummary {
  thumbnailHref?: string;     // 800×600
  thumbnailSmHref?: string;   // 200×150
  // ...
}

// AFTER
interface StacItemSummary {
  thumbnailHref?: string;     // 200×150 (was thumbnailSmHref)
  overviewHref?: string;      // 800×600 (was thumbnailHref)
  // ...
}
```

Every consumer is updated in lockstep — tsc strict mode enforces complete migration. No fallback / shim added.

---

## Test contract summary

| Functional Requirement | Contract test |
|---|---|
| FR-001..FR-009 | Unit test in `services/stac/tests/test_plot.py` calls `create_plot()` then `add_source_asset()` then `attach_thumbnails()` and validates the resulting Item against `contracts/item-shape.schema.json` AND the official STAC 1.1 Item schema |
| FR-010..FR-014 | Unit test in `services/stac/tests/test_collection.py` calls `rebuild_collection_summaries()` and validates against `contracts/collection-shape.schema.json` AND the official STAC 1.1 Collection schema |
| FR-015..FR-021 | Integration test runs `scripts/upgrade-catalog-to-stac-1.1.py` against a fixture mini-catalog (3 items), then runs it AGAIN and asserts zero diff |
| FR-022..FR-027 | Playwright test at `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts` |
| FR-028..FR-029 | Existing VS Code + web-shell unit tests pass with the renamed type fields (caught by tsc) |
