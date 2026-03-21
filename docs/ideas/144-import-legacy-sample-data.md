# Import Legacy Debrief Sample Data into STAC Catalog

## Problem

Future Debrief has no real-world sample data for demos or integration testing. The legacy Debrief repository (`debrief/debrief`) contains ~148 data files across REP, DPF, and DSF formats documented in [SAMPLE_DATA.md](https://github.com/debrief/debrief/blob/develop/SAMPLE_DATA.md). This data represents decades of maritime analysis scenarios and is ideal for showcasing Debrief v4 capabilities to stakeholders in Spring 2026.

## Proposed Solution

Import all legacy sample data files into a committed STAC catalog in the debrief-future repository:

1. **Build a DPF parser** — new `debrief-io` handler for Debrief Plot File (XML) format, extracting tracks, sensors, and plot metadata into GeoJSON features
2. **Import all REP files** (~75 files) — using the existing REP parser pipeline
3. **Import all DSF files** (~27 files) — standalone sensor contact files (same record format as REP sensor lines)
4. **Import all DPF files** (~46 files) — using the new DPF parser
5. **Commit the STAC catalog** — resulting catalog committed to the repo (~10-20 MB)

Data sources span: tutorial scenarios (Demo/), multi-path propagation, multi-static sonar, SATC algorithm test data, S2R bug reproduction data, and miscellaneous track/sensor files.

### Data Inventory (from SAMPLE_DATA.md)

- **287 total files**, 86 MB, 31 distinct extensions
- **REP** (75 files, 16 MB): Text-based tracks, narratives, shapes
- **DPF** (46 files, 14.5 MB): XML plot files with full state
- **DSF** (27 files, 300 KB): Standalone sensor contacts
- Key track names: NELSON, COLLINGWOOD, Frigate, New_SSK, HVU, T23_A/B, SSK_001-300
- Geographic regions: Caribbean, UK, generic coordinates

## Success Criteria

- All ~148 files (REP + DPF + DSF) from legacy `sample_data/` are imported into a STAC catalog
- DPF parser handles the 46 DPF files, extracting tracks and sensor data as GeoJSON
- DSF files are parsed as standalone sensor contacts
- STAC catalog is committed to the repository and browseable via the STAC file tree component
- Catalog is usable for Spring 2026 stakeholder demos
- Source files preserved as STAC assets (CONSTITUTION Art. III.2)
- Provenance recorded for each import (CONSTITUTION Art. III.1)

## Constraints

- Must work offline (CONSTITUTION Art. I.1)
- Schema compliance required — imported data must conform to LinkML master schemas (CONSTITUTION Art. II.1)
- Strict on import (CONSTITUTION Art. XIV.4) — fix non-compliant data rather than relaxing parsers
- DPF parser scope: extract spatial/temporal data and track metadata; full UI state restoration is out of scope

## Out of Scope

- Formats beyond REP/DPF/DSF (GPX, NMEA, CS2, JPG etc.) — deferred to F8 Multi-Source Data Import
- DPF UI state reconstruction (projection settings, styling, panel layout)
- Automated CI regeneration of the catalog (committed directly)
- SATC algorithm execution (data imported as raw tracks/sensors only)
