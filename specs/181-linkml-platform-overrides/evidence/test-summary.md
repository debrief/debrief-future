---
feature: "181-linkml-platform-overrides"
captured_at: "2026-04-13T21:00:00Z"
git_sha: "39e4d5b"
tests_passed: 2921
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary: LinkML Per-Platform Override Fields

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 2922 |
| Passed | 2921 |
| Failed | 0 |
| Skipped | 1 |
| Coverage | N/A |

## Test Breakdown

### Python Schema Tests (shared/schemas/)

| Suite | Tests | Status |
|-------|-------|--------|
| test_golden.py (TrackFeature fixtures) | 92 | All Pass |
| test_stac_extension.py (STAC extension) | 23 | All Pass |
| test_roundtrip.py (round-trip) | 200 | All Pass |

### Python Service Tests

| Suite | Tests | Status |
|-------|-------|--------|
| pytest (all) | 1626 | 1625 Pass, 1 Skip |

### TypeScript Component Tests (shared/components/)

| Suite | Tests | Status |
|-------|-------|--------|
| filter-engine matchers | 35 | All Pass |
| filter-engine cql2-json | 22 | All Pass |
| filter-engine integration | 18 | All Pass |
| FilterBar tests | 45 | All Pass |
| ExerciseListView tests | 30 | All Pass |
| StacBrowser tests | 25 | All Pass |
| TimelineView tests | 15 | All Pass |
| colour-engine tests | 20 | All Pass |
| vitest total | 1273 | All Pass |

### Type Checking

| Tool | Status |
|------|--------|
| pyright | 0 errors, 0 warnings |
| tsc (@debrief/components) | Pass (pre-existing @debrief/utils errors only) |
| tsc (@debrief/web-shell) | Pass |
| tsc (@debrief/schemas) | Pass |

## Key Scenarios Verified

- TrackProperties accepts all six optional override fields with correct pattern validation
- TrackProperties rejects invalid nationality (3-letter code) and invalid domain ("air")
- PlatformRecord validates id as required, all other fields optional
- StacExtensionProperties.platforms accepts full and sparse records
- Old flat fields (vessel_classes, nationalities, track_names) rejected by schema
- 100 exercise fixtures regenerated with debrief:platforms format, all pass validation
- Filter engine matches on platforms[].vessel_class with hierarchical expansion
- Filter engine matches on platforms[].nationality case-insensitively
- useDistinctValues derives distinct nationalities/vessel classes/track names from platforms
- Round-trip: Python -> JSON -> Python preserves all override fields and platform records
- STAC service reads debrief:platforms and maps to internal types correctly

## Known Issues

- Pre-existing: @debrief/utils module not found in apps/loader and shared/components (exists on main)
- Pre-existing: ESLint config missing for shared/config-ts and shared/data packages

## Environment

- Runner: pytest 9.0.2, vitest, pyright, tsc
- Branch: claude/implement-speckit-181-3A7rw
- Date: 2026-04-13
