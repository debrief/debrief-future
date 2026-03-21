# Quickstart: Import Legacy Sample Data

**Feature**: 144-import-legacy-sample-data
**Date**: 2026-03-20

## Prerequisites

1. Python 3.11+ with `uv` installed
2. Clone the legacy Debrief repository (one-time):
   ```bash
   git clone https://github.com/debrief/debrief.git ~/debrief-legacy
   ```

## Import the Data

```bash
# From the debrief-future repository root
uv run python -m debrief_io.cli.import_cmd \
    ~/debrief-legacy/org.mwc.cmap.combined.feature/root_installs/sample_data \
    demo/catalog \
    --title "Debrief Legacy Sample Data"
```

## Verify the Catalog

```bash
# Check catalog exists and has expected structure
ls demo/catalog/catalog.json

# Count imported plots
ls -d demo/catalog/*/item.json | wc -l
# Expected: ~140+ plots

# Validate a single plot
uv run python -c "
from debrief_stac.catalog import open_catalog
from debrief_stac.collection import read_collection_summaries
cat = open_catalog('demo/catalog')
print(f'Type: {cat[\"type\"]}')
summaries = read_collection_summaries('demo/catalog')
if summaries:
    extent, sums = summaries
    print(f'Track names: {len(sums.get(\"debrief:track_names\", []))}')
"
```

## Run Tests

```bash
# Run DPF parser unit tests
uv run pytest services/io/tests/test_dpf_handler.py -v

# Run DSF parser unit tests
uv run pytest services/io/tests/test_dsf_handler.py -v

# Run import pipeline integration test
uv run pytest services/io/tests/test_import_catalog.py -v
```

## Project Structure

```
services/io/
├── src/debrief_io/
│   ├── handlers/
│   │   ├── dpf.py          # NEW: DPF XML parser
│   │   ├── dsf.py          # NEW: DSF sensor file parser
│   │   ├── rep.py          # Existing REP parser
│   │   └── base.py         # BaseHandler ABC
│   ├── import_catalog.py   # NEW: Batch import pipeline
│   └── cli/
│       └── import_cmd.py   # NEW: CLI entry point
└── tests/
    ├── test_dpf_handler.py # NEW: DPF parser tests
    ├── test_dsf_handler.py # NEW: DSF parser tests
    └── test_import_catalog.py # NEW: Integration tests

demo/catalog/                # NEW: Committed STAC catalog (import output)
├── catalog.json
├── {plot-id}/
│   ├── item.json
│   ├── features.geojson
│   └── assets/
│       └── {source-file}
└── ...
```
