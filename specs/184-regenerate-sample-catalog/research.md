# Research: Nuke and Regenerate Sample Catalog

**Feature**: 184-regenerate-sample-catalog  
**Date**: 2026-04-13  
**Status**: Complete

## Research Questions

### RQ-1: Where are the legacy source files and how do we preserve them?

**Decision**: Extract source files from `local-store/*/assets/` into a staging directory before deletion, then reimport from that staging directory.

**Rationale**: The original import source directory (`/tmp/legacy-source-data/`) no longer exists. The only copies of the source `.rep`/`.dpf`/`.dsf` files live as STAC assets inside each item directory under `preview/workspace/samples/local-store/*/assets/`. Deleting `local-store/` without extraction would permanently lose the source data. The 5 standalone `.rep` files at `preview/workspace/samples/` (boat1.rep, boat2.rep, shapes.rep, example-track.rep, narrative.rep) are duplicates of files already stored as assets — they do not need special handling but will serve as a cross-check.

**Alternatives considered**:
- **Git recovery**: Source files are tracked in git, so `git checkout` could recover them. However, this couples the regeneration script to git state and won't work in CI from a clean clone.
- **Keep assets in place and reimport from within local-store**: This would mean importing from within the directory being deleted — ordering issues and potential corruption.
- **Move local-store instead of delete+extract**: Simpler, but the directory structure inside local-store doesn't match what `import_legacy_data()` expects (it expects a flat source directory, not per-item directories).

### RQ-2: What is the complete regeneration pipeline?

**Decision**: Three-phase pipeline: (1) extract source files, (2) reimport via `import_legacy_data()`, (3) enrich via `enrich-legacy-catalog.py`. Wrapped in a single orchestration script.

**Rationale**: The import pipeline and enrichment script are separate concerns by design:
- `import_legacy_data()` (in `services/io/`) creates a raw STAC catalog with parsed features, temporal metadata, provenance, and source assets. It does NOT add debrief extension metadata.
- `enrich-legacy-catalog.py` (in `scripts/`) adds exercise metadata: `debrief:platforms`, `debrief:tags`, `debrief:feature_tags`, titles, and descriptions. It also computes catalog-level summaries.

The import pipeline already calls `update_collection_summaries()` after each item, which promotes Catalog to Collection and aggregates extent. The enrichment script then overwrites the summaries with its richer aggregation (including `debrief:platforms`).

**Alternatives considered**:
- **Single combined script**: Would duplicate logic already in import_catalog.py. Violates DRY.
- **Modify import pipeline to also enrich**: Mixes concerns — the import pipeline is format-agnostic; enrichment is domain-specific metadata assignment.
- **Skip enrichment, rely on save-time resolution only**: Save-time resolution is not yet implemented. The enrichment script is the only mechanism that populates `debrief:platforms` today.

### RQ-3: Does the enrichment script remove deprecated flat aggregate fields?

**Decision**: No code change needed for the enrichment script. Fresh items from `import_legacy_data()` have no debrief extension fields. The enrichment script only adds `debrief:platforms`, `debrief:tags`, and `debrief:feature_tags` — it never writes the deprecated flat fields.

**Rationale**: Investigation of `enrich_item()` (lines 569-575 of `scripts/enrich-legacy-catalog.py`) shows it writes exactly three debrief extension properties:
```python
item["properties"]["debrief:platforms"] = platforms
item["properties"]["debrief:tags"] = tags
item["properties"]["debrief:feature_tags"] = feature_tags
```

The OLD flat fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) exist in the current catalog because they were added by a previous version of the enrichment script that has since been updated. Since `import_legacy_data()` creates items with no debrief extension fields at all, and the current enrichment script only adds the new fields, a fresh import+enrich produces clean items automatically.

**Alternatives considered**:
- **Add explicit removal of old fields in enrichment script**: Defensive but unnecessary — the old fields are never created by the current import pipeline.

### RQ-4: How does the enrichment script handle collection summaries?

**Decision**: The enrichment script's `update_catalog_summaries()` writes summaries using only the new format (`debrief:platforms`, `debrief:tags`, `debrief:feature_tags`). It does not write deprecated flat aggregate summaries.

**Rationale**: The function (lines 585-613) aggregates `debrief:platforms` by deduplicating on `id` (first-seen wins), collects all tags and feature_tags into sorted sets, and writes them as the `summaries` dict on catalog.json. The current catalog.json has both old and new summary fields because the summaries were computed before the enrichment script was updated — a fresh run will produce clean summaries.

Additionally, `services/stac/src/debrief_stac/collection.py`'s `_extract_item_summaries()` only handles `debrief:platforms`, `debrief:tags`, and `debrief:feature_tags` — confirming the service layer is also aligned with the new format.

### RQ-5: What happens to thumbnails during regeneration?

**Decision**: Thumbnails will not be present after reimport+enrich. Thumbnail generation is a separate concern handled by feature #174 (thumbnail capture). The regeneration script should document this gap but not block on it.

**Rationale**: The current catalog items have `thumbnail.png` and `thumbnail-sm.png` files. These were generated by a separate thumbnail capture process (feature #174). Neither `import_legacy_data()` nor `enrich-legacy-catalog.py` generate thumbnails. After regeneration, items will lack thumbnails until they are regenerated separately. This is acceptable because:
1. Thumbnails are cosmetic, not structural — all schema tests pass without them.
2. Thumbnail regeneration is an independent operation that can run after catalog regeneration.
3. The item.json `assets` section will not reference thumbnails (since they won't exist), so there are no broken references.

**Alternatives considered**:
- **Extract and restore thumbnails**: Complex, and the thumbnails may be stale (rendered from old data). Better to regenerate fresh.
- **Add thumbnail generation to the regeneration pipeline**: Scope creep — thumbnail capture requires browser automation and is a separate feature.

### RQ-6: What is the deterministic seed mechanism?

**Decision**: The enrichment script uses `random.Random(42)` — a hardcoded seed that produces deterministic output. The regeneration will produce consistent results across runs.

**Rationale**: Line 618 of `enrich-legacy-catalog.py` creates `rng = random.Random(42)`. All randomization in platform assignment, tag selection, and exercise naming uses this seeded RNG. This means repeated runs of the regeneration pipeline produce identical output, satisfying FR-010 (scriptable) and the idempotency requirement.

### RQ-7: How many items will the regenerated catalog contain?

**Decision**: The catalog should contain approximately 63 items (the current count), not 71 as originally estimated.

**Rationale**: Investigation reveals the current catalog has 63 item directories (not 71 as the spec estimated). The import pipeline creates one item per parseable source file, with DSF sensor files merged into companion tracks rather than creating standalone items. The source file count (72-77 total) differs from the item count because some files are sensor-only (DSF) and some may share a plot when they have the same base name. The exact count depends on the source files available.

### RQ-8: Does the platform registry need updating?

**Decision**: The existing platform registry at `shared/data/platform-registry.json` already contains the 10 known platforms from `PLATFORM_VESSEL_MAP`. No registry changes are needed for regeneration — the enrichment script handles platform assignment independently.

**Rationale**: The registry exists for import-time validation (warning on unregistered platforms) and future save-time resolution. The enrichment script has its own `PLATFORM_VESSEL_MAP` that maps legacy platform IDs to metadata. All platforms assigned by the enrichment script that have known legacy IDs are already in the registry. Platforms assigned random names (for unknown IDs) don't need registry entries because the enrichment script provides their metadata directly in the `debrief:platforms` array.

### RQ-9: What about the `derived_from` links pointing to `/tmp/legacy-source-data/`?

**Decision**: Accept that `derived_from` links will point to the staging directory used during regeneration. This is cosmetic — the important provenance is the `debrief:provenance` metadata on the source asset.

**Rationale**: The `derived_from` link in item.json records the original source file path as a `file://` URI. Currently these point to `/tmp/legacy-source-data/` which no longer exists. After regeneration, they'll point to whatever staging directory was used. The substantive provenance (source path, load timestamp, tool version) lives in the `debrief:provenance` property on the source asset, which is always populated by the import pipeline.

### RQ-10: Do any tests depend on the specific content of the sample catalog?

**Decision**: No tests directly validate sample catalog content. Tests use independently constructed fixtures.

**Rationale**: Search for tests referencing `local-store` found only test fixtures in `services/config/tests/conftest.py` and `services/stac/tests/fixtures.py` — these create their own minimal STAC structures for testing, not reading from the sample catalog. The schema validation tests (`shared/schemas/tests/`) validate against generated fixtures in `shared/schemas/fixtures/stac-browser/`, not the sample catalog. The sample catalog is a demo artifact, not a test dependency.
