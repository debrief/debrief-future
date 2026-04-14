# Usage Example: Regenerate Sample Catalog

This evidence document captures a full end-to-end invocation of the
regeneration orchestration script.

## Prerequisites

- Python 3.11+ and `uv` installed
- Dependencies installed (`uv sync`)
- Repository checked out with `preview/workspace/samples/local-store/` present

## Command

```bash
uv run python scripts/regenerate-sample-catalog.py
```

## Abbreviated Output

```
INFO [regenerate-sample-catalog] Discovered 72 asset files + 5 standalone files = 77 total sources
INFO [regenerate-sample-catalog] Staged 77 source files to /tmp/debrief-regen-***
INFO [regenerate-sample-catalog] Deleting existing catalog at /home/user/.../local-store
INFO [regenerate-sample-catalog] Running import_legacy_data(/tmp/debrief-regen-***, /home/user/.../local-store)

============================================================
Import Summary
============================================================
Catalog: /home/user/debrief-future/preview/workspace/samples/local-store
Duration: 4.5s

Files processed: 77
Files succeeded: 75
Files failed:    2

Total tracks:     437
Total sensors:    15257
Total narratives: 63

Warnings (500):
  [UNKNOWN_RECORD] BAD_boat2.rep: Unknown record type: ...
  [UNREGISTERED_PLATFORM] BULK_BLUE_TRACKS.rep: Platform 'HVU' is not registered ...
  [UNREGISTERED_PLATFORM] BULK_BLUE_TRACKS.rep: Platform 'T23_A' is not registered ...
  ... and 480 more

Errors (2):
  narrative.rep: SchemaValidationError at catalog_write: Feature (NARRATIVE)
  - geometry.coordinates: List should have at least 2 items after validation, not 0
  shapes.rep: SchemaValidationError at catalog_write: Feature (ELLIPSE)
  - properties.kind: Unknown feature kind: ELLIPSE
============================================================

INFO [regenerate-sample-catalog] Warning summary: {'UNKNOWN_RECORD': 18, 'UNREGISTERED_PLATFORM': 402, 'NO_FEATURES': 1, 'SCHEMA_VALIDATION': 77, 'ORPHAN_SENSOR': 2}
WARNING [regenerate-sample-catalog] Unregistered platform IDs found (380): ALLIANCE, B11, B12, B13, ...
WARNING [regenerate-sample-catalog] 2 source files failed to import (see errors above)
INFO [regenerate-sample-catalog] Running enrichment: uv run python .../scripts/enrich-legacy-catalog.py
INFO [regenerate-sample-catalog] Enrichment completed:
  Unique platforms:      375
  Unique vessel classes: 13
  Unique nationalities:  4 — ['DE', 'FR', 'GB', 'US']
  Unique tags:           20
  Unique feature tags:   16
Done.
INFO [regenerate-sample-catalog] Regeneration complete: 73 items, 500 warnings, 4.8s
```

## Verification — Before / After

### Before

```bash
$ grep -rl "debrief:vessel_classes\|debrief:nationalities\|debrief:track_names" \
    preview/workspace/samples/local-store/*/item.json | wc -l
72
```

All 72 items contained flat aggregate fields.

### After

```bash
$ grep -rl "debrief:vessel_classes\|debrief:nationalities\|debrief:track_names" \
    preview/workspace/samples/local-store/*/item.json | wc -l
0

$ grep -l "debrief:platforms" preview/workspace/samples/local-store/*/item.json | wc -l
73

$ ls preview/workspace/samples/local-store/*/item.json | wc -l
73
```

Zero items use flat aggregates; all 73 items use `debrief:platforms`.

## Inspect an Enriched Item

```bash
$ jq '.properties."debrief:platforms"' \
    preview/workspace/samples/local-store/core--sample/item.json
[
  {
    "id": "NELSON",
    "name": "HMS Nelson",
    "nationality": "GB",
    "vessel_class": "surface/warship/frigate/type23",
    "domain": "surface",
    "vessel_type": "type23",
    "vessel_role": "frigate"
  },
  {
    "id": "COLLINGWOOD",
    "name": "HMS Collingwood",
    "nationality": "DE",
    "vessel_class": "surface/warship/destroyer/type45",
    "domain": "surface",
    "vessel_type": "type45",
    "vessel_role": "destroyer"
  }
]
```

Each `PlatformRecord` carries all fields required by FR-006: `id`, `name`,
`nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`.

## Idempotency Check

```bash
# First run
$ uv run python scripts/regenerate-sample-catalog.py
... Regeneration complete: 73 items, 500 warnings, 4.8s

# Second run (immediately after)
$ uv run python scripts/regenerate-sample-catalog.py
... Regeneration complete: 73 items, 500 warnings, 4.6s
```

Both runs produce identical item counts and warning totals, satisfying FR-010 (scriptable) and US5 (idempotency).

## Options

```bash
# Verbose mode — shows subprocess output live
uv run python scripts/regenerate-sample-catalog.py --verbose

# Stage-only mode — extracts source files to a temp dir and stops
uv run python scripts/regenerate-sample-catalog.py --stage-only
```
