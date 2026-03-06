# Implementation Plan: Schema-Validated GeoJSON Across All Services

**Branch**: `115-schema-validated-tool-io` | **Date**: 2026-02-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/115-schema-validated-tool-io/spec.md`

## Summary

Enforce schema validation at every GeoJSON service boundary — parser output, catalog read/write, tool input/output — and migrate frontends to shared schema types. Currently all 11 calc tools, 17+ IO annotation builders, the STAC catalog service, and several frontend modules handle GeoJSON features as untyped dictionaries (`dict[str, Any]` / `Record<string, unknown>`). This creates field-name mismatches between producers and consumers that go undetected until runtime (e.g., the `apply-symbol-style` bug where the tool wrote to a different field than the renderer read).

The approach: add missing fields to the schema (provenance, datasets), create a shared `validate_feature()` function dispatching on the `kind` discriminator, then integrate it at all five service boundaries. Replace hardcoded enum sets with schema-derived enums. Migrate remaining frontend workaround types to `@debrief/schemas` imports.

## Technical Context

**Language/Version**: Python 3.11 (services, schemas), TypeScript 5.x (VS Code, shared components, web-shell)
**Primary Dependencies**: Pydantic v2 (validation), LinkML >= 1.7.0 (schema source), `debrief-schemas` (generated models)
**Storage**: Local filesystem STAC catalogs (JSON + GeoJSON)
**Testing**: pytest + pytest-cov (Python), vitest (TypeScript unit), Playwright (E2E)
**Target Platform**: Cross-platform desktop (VS Code extension, Electron), browser (web-shell)
**Project Type**: Monorepo — uv workspaces (Python), pnpm workspaces (TypeScript)
**Performance Goals**: Schema validation overhead < 10ms per feature for tracks with up to 10,000 positions
**Constraints**: Offline-capable, no network dependencies, no silent failures
**Scale/Scope**: 12 feature kinds, 11 calc tools, 17+ annotation builders, 5 validation boundaries, ~50 files modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | No network dependency introduced | PASS | Schema validation is local; no online calls |
| I.3 No silent failures | Validation failures are errors, not warnings | PASS | FR-017 mandates error treatment |
| II.1 Single source of truth | All types from LinkML → generated models | PASS | Core objective of this feature |
| II.2 Schema tests mandatory | Schema additions must pass adherence tests | PASS | Prerequisite phase includes test updates |
| III.1 Provenance always | Provenance recording unchanged | PASS | Validation is additive; provenance flow preserved |
| IV.1 Services never touch UI | Validation returns data/errors only | PASS | No UI in scope |
| IV.3 Services have zero MCP dependency | Validation is pure Python | PASS | MCP wrappers unaffected |
| V.2 Schema compliance | Extensions validated against schema | PASS | This feature enforces it |
| VI.1 Schema tests gate merges | New schema fields require tests | PASS | Golden fixtures updated in prerequisite phase |
| VI.2 Services require unit tests | Validation functions fully tested | PASS | Each boundary has test coverage |
| VII.1 Tests before implementation | Test-first for validation functions | PASS | Contract tests define expected behaviour |
| VIII.1 Specs before code | This spec exists before implementation | PASS | Spec 115 complete |
| IX.1 Minimal dependencies | Only adds workspace-internal dependency | PASS | `debrief-schemas` is already in the workspace |
| XV.1 Explicit types everywhere | Replaces `dict[str, Any]` with schema types | PASS | Core objective |
| XV.2 `Any` prohibited | Eliminates `Any` from GeoJSON handling | PASS | Core objective |
| XV.5 Type boundaries explicit | Every entry point validates through typed model | PASS | Five boundaries enforced |
| XV.6 CI enforces compliance | pyright + tsc catch type regressions | PASS | Existing CI infrastructure |

**Post-Phase 1 Re-check**: All gates continue to pass. No constitution violations introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/115-schema-validated-tool-io/
├── spec.md
├── plan.md                      # This file
├── research.md                  # Phase 0: key decisions and rationale
├── data-model.md                # Phase 1: entity relationships
├── quickstart.md                # Phase 1: developer guide
├── contracts/
│   └── validation-api.md        # Phase 1: validation function contracts
├── checklists/
│   └── requirements.md          # Quality validation checklist
└── media/
    ├── planning-post.md         # Blog post draft
    └── linkedin-planning.md     # LinkedIn summary
```

### Source Code (repository root)

```text
shared/schemas/
├── src/linkml/
│   ├── geojson.yaml             # MODIFY: add provenance field to all feature properties
│   ├── annotations.yaml         # MODIFY: add provenance field to annotation properties
│   ├── tool-result.yaml         # MODIFY: add provenance + __datasets fields
│   └── common.yaml              # (no changes — enums already defined)
├── src/generated/
│   ├── python/debrief_schemas/
│   │   ├── __init__.py          # REGENERATED after schema changes
│   │   └── validation.py        # NEW: validate_feature(), FEATURE_MODEL_MAP, resolve_enum_values()
│   └── typescript/
│       └── types.ts             # REGENERATED (fix coordinate types)
├── fixtures/                    # MODIFY: add valid/invalid feature fixtures with provenance
└── tests/
    └── test_validation.py       # NEW: tests for validation module

services/calc/
├── pyproject.toml               # MODIFY: add debrief-schemas dependency
├── debrief_calc/
│   ├── executor.py              # MODIFY: add validation hooks at input/output boundaries
│   ├── validation.py            # MODIFY: integrate schema validation alongside existing checks
│   ├── models.py                # MODIFY: type SelectionContext.features with schema union
│   └── tools/
│       ├── track/styling/
│       │   ├── apply_symbol_style.py   # MODIFY: remove hardcoded valid_symbols
│       │   ├── set_track_color.py      # MODIFY: remove hardcoded color defaults
│       │   ├── label_interval.py       # MODIFY: (enum already via param_type)
│       │   └── symbol_interval.py      # MODIFY: (enum already via param_type)
│       └── reference/
│           └── generation.py           # MODIFY: remove hardcoded pattern check
└── tests/
    ├── test_schema_validation.py       # NEW: schema validation integration tests
    └── tools/                          # MODIFY: update tool tests to verify schema compliance

services/io/
├── src/debrief_io/
│   ├── types.py                 # MODIFY: replace Feature = Any with schema union
│   └── handlers/
│       ├── base.py              # MODIFY: add validation after parse()
│       ├── rep.py               # MODIFY: ensure schema compliance
│       └── annotations/
│           └── builders.py      # MODIFY: ensure all 17+ builders produce schema-compliant output
└── tests/
    └── test_schema_compliance.py  # NEW: validate all parser outputs against schema

services/stac/
├── src/debrief_stac/
│   ├── types.py                 # MODIFY: replace GeoJSON aliases with schema types
│   ├── features.py              # MODIFY: add schema validation on write/read
│   └── mcp_server.py            # MODIFY: use schema types in function signatures
└── tests/
    └── test_schema_validation.py  # NEW: validate catalog operations against schema

apps/vscode/
└── src/services/
    └── stacService.ts           # MODIFY: replace SafeFeature with schema types

shared/components/
├── diff/src/
│   └── diffFeatureCollections.ts  # MODIFY: replace custom GeoJSONFeature with schema types
└── src/FeatureList/
    └── flattenFeatures.ts         # MODIFY: remove as unknown casts (after generator fix)

apps/web-shell/
└── src/App.tsx                  # MODIFY: replace as any casts with proper types
```

**Structure Decision**: This feature modifies files across the existing monorepo structure (6 packages). No new packages or workspaces are created. The only new module is `shared/schemas/src/generated/python/debrief_schemas/validation.py` containing the shared validation infrastructure.

## Media Components

None — backend/infrastructure feature

## Storybook E2E Testing

None — no interactive UI components

## VS Code Webview E2E Testing

None — no extension workflow changes. TypeScript type changes are compile-time only; no runtime behaviour change in the VS Code extension.

## Complexity Tracking

No constitution violations to justify.
