# Implementation Plan: Nuke and Regenerate Sample Catalog

**Branch**: `184-regenerate-sample-catalog` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/184-regenerate-sample-catalog/spec.md`

## Summary

Delete the existing sample STAC catalog and regenerate it from scratch through the enriched import pipeline. The regenerated catalog replaces deprecated flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) with `debrief:platforms` structured arrays. The implementation is a three-phase pipeline: (1) extract and stage source files, (2) reimport via `import_legacy_data()`, (3) enrich via `enrich-legacy-catalog.py`. Wrapped in a single orchestration script for repeatability.

## Technical Context

**Language/Version**: Python 3.11
**Primary Dependencies**: debrief-io (import pipeline), debrief-stac (catalog operations), debrief-data (platform registry loader), scripts/enrich-legacy-catalog.py (metadata enrichment)
**Storage**: Local filesystem — STAC catalog at `preview/workspace/samples/local-store/`
**Testing**: pytest (Python), task verify (full CI: lint + typecheck + test)
**Target Platform**: Linux (CI), macOS/Linux (development)
**Project Type**: Infrastructure script + data regeneration
**Performance Goals**: N/A — batch operation, run once or on-demand
**Constraints**: Must preserve source files before deletion; deterministic output (seeded RNG); no thumbnails post-regeneration (separate concern)
**Scale/Scope**: ~72 source files producing ~63 catalog items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All operations local filesystem | PASS | No network access needed |
| I.3 No silent failures | Script reports errors explicitly | PASS | Import pipeline raises on failure, warnings emitted for unregistered platforms |
| I.4 Reproducibility | Deterministic seed (42) for enrichment | PASS | Same inputs + seed = same output |
| II.1 Single source of truth | LinkML schemas define structures | PASS | `debrief:platforms` defined in LinkML, generated types used |
| II.2 Schema tests mandatory | `task verify` must pass after regen | PASS | Explicit requirement in spec (FR-011) |
| III.1 Provenance always | Import pipeline attaches provenance | PASS | `debrief:provenance` on source assets, `derived_from` links |
| III.2 Source preservation | Source files extracted before deletion | PASS | FR-002 requires staging before nuke |
| IV.1 Services never touch UI | Script is infrastructure, no UI | PASS | N/A |
| VI.1-4 Testing | Tests must pass, schema tests gate merge | PASS | FR-011 requires full verify |
| VIII.1 Specs before code | This spec + plan exist | PASS | Documentation first |
| IX.1 Minimal dependencies | No new dependencies added | PASS | Uses existing pipeline and scripts |
| XIV Pre-release freedom | Breaking changes to sample data OK | PASS | Pre-v4.0.0, data format change is expected |
| XV Strict type safety | Script uses typed models | PASS | Import pipeline uses Pydantic models; enrichment script uses typed dicts |

**Post-design re-check**: All gates still pass. No new dependencies, no architectural boundary violations.

## Project Structure

### Documentation (this feature)

```text
specs/184-regenerate-sample-catalog/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical research findings
├── data-model.md        # Data model (existing entities, no new models)
├── quickstart.md        # Developer quickstart guide
├── checklists/
│   └── requirements.md  # Quality checklist
├── media/
│   ├── planning-post.md # Blog post draft
│   └── linkedin-planning.md # LinkedIn summary
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
scripts/
├── enrich-legacy-catalog.py    # EXISTING — enrichment script (no changes needed)
└── regenerate-sample-catalog.py # NEW — orchestration script

services/io/
├── src/debrief_io/
│   └── import_catalog.py       # EXISTING — import pipeline (no changes needed)
└── tests/
    └── test_import_catalog.py  # EXISTING — import tests (no changes needed)

services/stac/
└── src/debrief_stac/
    └── collection.py           # EXISTING — collection summaries (no changes needed)

shared/data/
└── platform-registry.json      # EXISTING — platform registry (no changes needed)

preview/workspace/samples/
├── local-store/                # REGENERATED — fresh STAC catalog
│   ├── catalog.json
│   └── {item-id}/
│       ├── item.json           # With debrief:platforms, no flat aggregates
│       ├── features.geojson
│       └── assets/
│           └── {source-file}
├── boat1.rep                   # EXISTING — standalone sample files
├── boat2.rep
├── shapes.rep
├── example-track.rep
└── narrative.rep
```

**Structure Decision**: This feature adds one new script (`scripts/regenerate-sample-catalog.py`) and regenerates data files. No changes to existing service code, schemas, or tests. The orchestration script coordinates existing components: source file extraction, `import_legacy_data()`, and `enrich-legacy-catalog.py`.

## Design Decisions

### D-1: Single orchestration script

The regeneration is wrapped in a single Python script (`scripts/regenerate-sample-catalog.py`) that:
1. Collects source files from `local-store/*/assets/`
2. Copies them to a temporary staging directory
3. Deletes `local-store/`
4. Calls `import_legacy_data(staging_dir, catalog_path)`
5. Calls the enrichment logic (imported from `enrich-legacy-catalog.py` or invoked as subprocess)
6. Reports results (item count, warnings, duration)
7. Cleans up staging directory

**Rationale**: A single entry point satisfies FR-010 (scriptable, no manual intervention) and makes the process repeatable for future schema changes.

### D-2: No changes to existing pipeline code

The import pipeline, enrichment script, collection summaries, and platform registry all work correctly as-is. The only gap was that the enrichment script hadn't been re-run since it was updated to write `debrief:platforms` instead of flat aggregates. A fresh import+enrich naturally produces the correct output.

**Rationale**: Minimise blast radius. Changing existing code risks regressions in other features. The orchestration script is the only new code.

### D-3: Thumbnails are out of scope

Thumbnail generation (feature #174) requires browser automation via Playwright. The regeneration script does not generate thumbnails. Items will lack thumbnails until they are regenerated separately.

**Rationale**: Thumbnails are cosmetic and independently generated. Including them would add significant complexity (browser automation, rendering pipeline) for a non-structural concern. Schema tests pass without thumbnails.

### D-4: Source file staging via temp directory

Source files are copied (not moved) to a temporary directory before `local-store/` is deleted. The import pipeline then reads from the temp directory.

**Rationale**: Copy-then-delete is safer than move — if the script fails mid-way, the original files are still in `local-store/`. The temp directory is cleaned up after successful completion.

### D-5: Enrichment invoked as subprocess

The enrichment script (`scripts/enrich-legacy-catalog.py`) is invoked as a subprocess rather than importing its functions. This keeps the orchestration script simple and avoids coupling to the enrichment script's internal structure.

**Rationale**: The enrichment script has a `main()` function designed for CLI invocation. It hardcodes `CATALOG_DIR` and uses a module-level RNG seed. Calling it as a subprocess respects its design rather than working around its globals.

## Media Components

None - backend/infrastructure feature

## Storybook E2E Testing

None - no interactive UI components

## VS Code Webview E2E Testing

None - no extension workflow changes

## Complexity Tracking

No constitution violations to justify.
