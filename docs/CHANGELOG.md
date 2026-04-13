# Changelog

## [Unreleased]

### Added
- **Regenerate Sample Catalog** (#184) — New `scripts/regenerate-sample-catalog.py` orchestration script that nukes and rebuilds `preview/workspace/samples/local-store/` via the enriched import pipeline. 73 items regenerated, all with `debrief:platforms` structured arrays; zero deprecated flat aggregate fields remain. Extends `enrich-legacy-catalog.py` with `derive_vessel_fields()` to populate `vessel_type`/`vessel_role`/`domain` from the `vessel_class` path (FR-006). [E10 Phase 3] ([#427](https://github.com/debrief/debrief-future/pull/427))
  - Pipeline: extract → stage → delete → reimport → enrich (safe-by-construction, `--stage-only` dry-run supported)
  - Idempotent: two consecutive runs produce identical 73 items / 500 warnings (`random.Random(42)`)
  - Tests: 1,643 Python passed, all TypeScript passed, 79 Playwright E2E passed
  - Evidence: `specs/184-regenerate-sample-catalog/evidence/test-summary.md`, `usage-example.md`, `validation-output.txt`, `item-before.json`, `item-after.json`
- **Import Platform Warnings** (#182) — Post-parse validation checks extracted `platform_id` values against the platform registry after import; emits advisory `UNREGISTERED_PLATFORM` warnings for unregistered platforms. Import always succeeds regardless of registry coverage. [E10 Phase 2]
  - New function: `_validate_platform_ids()` in `import_catalog.py` with registry loading and graceful fallback
  - Warning codes: `UNREGISTERED_PLATFORM` (per platform per file), `REGISTRY_UNAVAILABLE` (registry load failure)
  - Tests: 17/17 passing (9 unit + 8 integration), 344 existing tests unaffected
  - Evidence: `specs/182-import-platform-warnings/evidence/test-summary.md`, `usage-example.md`, `sample-warnings.json`
- **LinkML Per-Platform Override Fields** (#181) — Six optional override fields on TrackProperties, new PlatformRecord entity, and `debrief:platforms` structured array replacing flat aggregates on STAC extension. Full consumer code migration across filter engine, VS Code, web-shell, and Python services. [E10 Phase 1]
  - Schema: 3 LinkML YAML files modified, VesselDomainEnum moved to common.yaml for cross-module use
  - New entity: PlatformRecord (id required + 6 optional classification fields)
  - Breaking: removed vessel_classes, nationalities, track_names from StacExtensionProperties/StacItemSummary
  - Migration: ~40 files updated across TypeScript (types, services, filter engine, stories, tests) and Python (STAC service, collection summaries)
  - Fixtures: 100 exercise fixtures regenerated with debrief:platforms format, 7 new golden fixtures
  - Tests: 2921/2921 passing, 0 failures
  - Evidence: `specs/181-linkml-platform-overrides/evidence/test-summary.md`, `usage-example.md`, `round-trip-evidence.md`
- **Platform Registry** (#180) — Shared JSON registry defining a vessel class taxonomy tree with 10 seeded platforms. Dual Python (`debrief-data`) and TypeScript (`@debrief/data`) loaders with resolve, enumerate, tree traversal, and class validation APIs. [E10 Phase 0]
  - New package: `shared/data/` with `platform-registry.json`, Python `registry.py`, TypeScript `registry.ts`
  - Golden fixture cross-language parity: both loaders produce identical results
  - Load-time validation: duplicate IDs, missing fields, malformed JSON
  - Tests: 66/66 passing (33 Python + 33 TypeScript), zero new dependencies
  - Evidence: `specs/180-platform-registry/evidence/test-summary.md`, `usage-example.md`, `validation-output.txt`
- **Sensor Rendering** (#118) — Leaflet custom canvas layer for sensor bearing lines, ambiguous bearings, sensor arcs, snail mode time-trail fading, contact labels, and line styling. [E07 Phase 3]
  - New components: `SensorBearingLayer.tsx` (canvas layer), `sensor-utils.ts` (geometry/interpolation/colour utilities)
  - 7 Storybook stories covering all rendering modes
  - Tests: 81/81 passing (67 unit + 14 component), no new dependencies
  - Evidence: `specs/118-sensor-rendering/evidence/test-summary.md`, `usage-example.md`
- **REP Sensor Import** — Parse `;SENSOR:` (v1), `;SENSOR2:` (v2), `;SENSOR3:` (v3), and `;SENSORARC` lines from REP files, embedding sensor contacts into `TrackFeature.properties.sensors[]` via `pending_sensor_data`. Replaces standalone annotation features.
  - New module: `sensor_parser.py` with 4 parser functions + contact grouping
  - Tests: 90/90 passing (56 new), 10k-line performance benchmark under 1s
  - Evidence: test-summary.md, usage-example.md, sample-input.rep, parsed-output.json
- **Tabular Results Panel** (#177) — Display `debrief-calc` tool outputs as tables (flat statistics) or charts (Vega-Lite time-series) in a panel beneath the map. Supports Save / Save As to CSV in the plot's assets folder, surfaces saved files in the LayersToolbar Associated Files dropdown, and wires Open / Reveal in Explorer / Open With file actions in the web-shell.
  - New components: `TableRenderer`, expanded `ChartPanelWrapper` with save UI and tab management
  - New utilities: `buildCsvContent`, `generateCsvFilename`, `sanitizeFilename`, `formatCsvValue` in `@debrief/utils`
  - Auto-synthesis of table datasets from MCP tools that return `properties.statistics` (track-stats, area-summary)
  - All user-facing strings externalised via `ResultsPanelLabels` interface (Constitution Article XI)
  - Tests: 33 new unit tests (26 CSV + 7 TableRenderer), 8 new E2E tests across save flow, file actions, and panel persistence
  - Evidence: `specs/177-tabular-results-panel/evidence/test-summary.md`, `usage-example.md`
- **VS Code integration SRD** for the Tabular Results Panel — captures the deferred work to bring feature parity to the VS Code extension (`docs/tabular-results-vscode-integration-srd.md`)

### Fixed
- **GoldenLayout panel persistence** — sidebar panels (Navigation, Activity, Log) no longer disappear after navigating between plots. Layout version bumped from 1 to 2; corrupted layouts that pass type validation but lack essential panels are now rejected and replaced with the default. Layout saves are suppressed during reset to prevent intermediate empty state from being persisted.

## [2026-03-18]

### Added
- **REP Loader Temporal Metadata** — Compute `start_datetime`/`end_datetime` from track position timestamps during REP file loading; enables accurate Timeline/Gantt view and Duration filter.
  - Tests: 9/9 passing (9 new)
  - Evidence: test-summary.md, usage-example.md, sample-request.json, sample-response.json

## [2026-03-07]

### Added
- **Vessel Taxonomy and Hierarchical Filtering** — Human-readable labels, in-menu type-ahead search, per-node match counts, and current-selection marking for the vessel class filter dropdown.
  - Tests: 944/944 passing (72 new)
- **Saved Filter Configurations** — Save/load/delete named filter sets as CQL2 JSON; historic filters dropdown for the STAC Browser filter bar.
  - Tests: 120/120 passing (47 new)
  - Evidence: test-summary.md, usage-example.md

## [2026-03-06]

### Added
- **Filter Bar with Lozenge UI and AND/OR Logic** — Persistent filter bar with pill-shaped lozenges, all 10 SRD filter types, OR groups with drag-to-group, and CQL2 serialisation.
  - Tests: 64/64 passing
  - Evidence: test-summary.md, usage-example.md
- **Client-Side CQL2 Filter Engine** — Reference implementation of CQL2 AND/OR filter logic for 9 metadata types, operating on mock STAC items; validates query model without backend.
  - Tests: 74/74 passing
  - Evidence: test-summary.md, usage-example.md, filter-output-samples.json
- **STAC Extension Spec + Mock Data Fixtures** — Define `debrief:` STAC extension namespace with 6 properties; generate 100 deterministic fixture items for Discovery UI development.
  - Tests: 210/210 passing
  - Evidence: test-summary.md, usage-example.md, round-trip-evidence.md, validation-output.txt
- **End-to-End Workflow Tests** — Dual-platform E2E test suite: 18 VS Code E2E specs + 13 web-shell specs with real Python services. ([#300](https://github.com/debrief/debrief-future/pull/300))
  - Tests: ~25 active, ~28 fixme (features pending implementation)
  - Evidence: test-summary.md, usage-example.md, integration-flow.md, 4 screenshots
