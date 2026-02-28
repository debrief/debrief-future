---
feature: "115-schema-validated-tool-io"
captured_at: "2026-02-28T14:56:00Z"
git_sha: "a89bbd2"
tests_passed: 1538
tests_failed: 0
tests_skipped: 29
coverage_pct: null
---

# Test Summary: Schema-Validated GeoJSON Across All Services

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 1567 |
| Passed | 1538 |
| Failed | 0 |
| Skipped | 29 |
| Coverage | N/A |

## Test Breakdown

### Schema Tests (shared/schemas) — 188 passed, 22 warnings

| Suite | Tests | Status |
|-------|-------|--------|
| test_golden.py — valid fixtures | 43 | Pass |
| test_golden.py — invalid fixtures | 43 | Pass |
| test_json_schema.py | 18 | Pass |
| test_roundtrip.py | 30 | Pass |
| test_validation.py — FEATURE_MODEL_MAP | 5 | Pass |
| test_validation.py — validate_feature() | 6 | Pass |
| test_validation.py — validate_features() | 3 | Pass |
| test_validation.py — resolve_feature_model() | 2 | Pass |
| test_validation.py — resolve_enum_values() | 7 | Pass |
| test_validation.py — SchemaValidationError | 3 | Pass |
| test_validation.py — Schema Field Rename | 5 | Pass |
| test_validation.py — New Required Field | 4 | Pass |

### Calc Service Tests — 440 passed

| Suite | Tests | Status |
|-------|-------|--------|
| test_executor.py | 35+ | Pass |
| test_schema_validation.py | 12+ | Pass |
| tools/track/styling/* | 50+ | Pass |
| tools/reference/* | 30+ | Pass |
| All other tool tests | 300+ | Pass |

### IO Service Tests — 201 passed

| Suite | Tests | Status |
|-------|-------|--------|
| test_rep_handler.py | 35 | Pass |
| test_parser.py | 11 | Pass |
| test_registry.py | 13 | Pass |
| test_annotations/* | 142 | Pass |

### STAC Service Tests — 105 passed, 7 skipped

| Suite | Tests | Status |
|-------|-------|--------|
| test_features.py | 13 | Pass |
| test_catalog.py | 12 passed, 1 skipped | Pass |
| test_stac_validation.py | 13 (6 skipped) | Pass |
| test_mcp.py | 12 | Pass |
| All other STAC tests | 55 | Pass |

### TypeScript Tests (@debrief/components) — 604 passed

| Suite | Tests | Status |
|-------|-------|--------|
| flattenFeatures.test.ts | 36 | Pass |
| drawingPalette.test.ts | 14 | Pass |
| paramTypeResolver.test.ts | 12 | Pass |
| GeometryDialog.test.tsx | 19 | Pass |
| All other component tests | 523 | Pass |

## Key Scenarios Verified

- **Schema field rename detection**: Renaming `name` → `display_name` is caught at all 4 write boundaries (tool_input, tool_output, parser_output, catalog_write)
- **Missing required field detection**: Omitting required fields like `location_type` or `style` is caught with structured error messages
- **Enum parameter validation**: `apply_symbol_style` and `generate-reference-points` reject invalid enum values using schema-derived valid value sets
- **Cross-boundary consistency**: The same `validate_feature()` function enforces schema at calc inputs/outputs, IO parser outputs, and STAC catalog writes
- **Backward compatibility**: All 934 existing Python tests and 604 TypeScript tests continue to pass with no regressions
- **TypeScript build safety**: `pnpm build` succeeds across components, web-shell, and vscode packages with corrected coordinate types

## Known Issues

- 22 schema test warnings: LinkML nested array limitation for GeoJSON coordinates (track-feature, vector-annotation fixtures). Known issue — does not affect runtime validation.
- 7 skipped STAC tests: Pre-existing skips for features requiring network access or specific environment setup.

## Environment

- Runner: pytest 9.0.2, vitest (via pnpm)
- Branch: claude/implement-speckit-115-kxnF2
- Date: 2026-02-28
