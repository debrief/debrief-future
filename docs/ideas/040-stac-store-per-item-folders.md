# 040: Reorganize local STAC store to per-item folder structure

## Problem

The local STAC store currently uses a flat root folder containing `.json` item files alongside `.geojson` plot files. This structure doesn't accommodate additional assets per item (such as original source files), limiting the ability to fulfill Constitution Article III (source preservation as STAC assets).

## Proposed Solution

Reorganize the STAC store so each item gets its own folder, with an `assets/` subfolder for original input files:

**Current structure (flat):**
```
local-data/
  track_NELSON.json
  track_NELSON.geojson
  track_COLLINGWOOD.json
  track_COLLINGWOOD.geojson
```

**New structure (per-item folders):**
```
local-data/
  track_NELSON/
    track_NELSON.json
    track_NELSON.geojson
    assets/
      original_source_file.rep
  track_COLLINGWOOD/
    track_COLLINGWOOD.json
    track_COLLINGWOOD.geojson
    assets/
      original_source_file.rep
```

Changes required:
1. Update `debrief-stac` service to read/write using per-item folder structure
2. Update STAC item JSON `href` references to reflect new relative paths
3. Add a migration method to convert existing flat stores to the new structure
4. Run the migration against `apps/vs-code/test-data/local-data`

## Success Criteria

- Each STAC item lives in its own named folder
- Each item folder contains an `assets/` subfolder for source files
- GeoJSON plot files remain at item folder root (sibling to `assets/`)
- STAC item JSON href references correctly point to assets in new locations
- Migration function converts flat structure to new structure without data loss
- All existing tests pass with new structure
- Test data in `apps/vs-code/test-data/local-data` is migrated

## Constraints

- Must work offline (Constitution Article I)
- Source files must never be modified (Constitution Article III)
- Must maintain provenance chain

## Out of Scope

- Remote/cloud STAC catalog support
- Catalog-level reorganization (this is item-level only)
- New asset types beyond the structural change
