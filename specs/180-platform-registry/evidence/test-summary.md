---
feature: "180-platform-registry"
captured_at: "2026-04-13T19:10:00Z"
git_sha: "4ee8e84"
tests_passed: 66
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Platform Registry

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 66 |
| Passed | 66 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### Python — pytest (33 tests)

| Test | Status |
|------|--------|
| TestResolve::test_known_platform | Pass |
| TestResolve::test_unknown_platform | Pass |
| TestResolve::test_empty_string | Pass |
| TestResolve::test_whitespace_only | Pass |
| TestResolve::test_case_sensitive | Pass |
| TestResolve::test_subsurface_platform | Pass |
| TestResolve::test_us_platform | Pass |
| TestListPlatforms::test_returns_all_10 | Pass |
| TestListPlatforms::test_sorted_by_id | Pass |
| TestListPlatforms::test_includes_surface_and_subsurface | Pass |
| TestListPlatforms::test_golden_fixture_parity | Pass |
| TestListPlatforms::test_all_have_required_fields | Pass |
| TestFindByClass::test_by_domain_surface | Pass |
| TestFindByClass::test_by_domain_subsurface | Pass |
| TestFindByClass::test_by_role_frigate | Pass |
| TestFindByClass::test_by_role_destroyer | Pass |
| TestFindByClass::test_by_type | Pass |
| TestFindByClass::test_sorted_by_id | Pass |
| TestFindByClass::test_invalid_path | Pass |
| TestFindByClass::test_empty_string | Pass |
| TestIsValidClass::test_valid_domain | Pass |
| TestIsValidClass::test_valid_deep_path | Pass |
| TestIsValidClass::test_invalid_path | Pass |
| TestIsValidClass::test_empty_string | Pass |
| TestIsValidClass::test_partial_valid_path | Pass |
| TestIsValidClass::test_class_with_no_platforms | Pass |
| TestValidation::test_missing_file | Pass |
| TestValidation::test_invalid_json | Pass |
| TestValidation::test_missing_vessel_classes_root | Pass |
| TestValidation::test_duplicate_platform_id | Pass |
| TestValidation::test_missing_name | Pass |
| TestValidation::test_missing_nationality | Pass |
| TestValidation::test_default_path_loads | Pass |

### TypeScript — vitest (33 tests)

| Test | Status |
|------|--------|
| resolve > resolves a known platform with all fields | Pass |
| resolve > returns undefined for unknown platform | Pass |
| resolve > returns undefined for empty string | Pass |
| resolve > returns undefined for whitespace-only | Pass |
| resolve > is case-sensitive | Pass |
| resolve > resolves subsurface platform | Pass |
| resolve > resolves US platform | Pass |
| listPlatforms > returns all 10 platforms | Pass |
| listPlatforms > returns platforms sorted by ID | Pass |
| listPlatforms > includes surface and subsurface domains | Pass |
| listPlatforms > matches golden fixture field-by-field | Pass |
| listPlatforms > all platforms have required fields | Pass |
| findByClass > finds all surface platforms | Pass |
| findByClass > finds all subsurface platforms | Pass |
| findByClass > finds frigates by role | Pass |
| findByClass > finds destroyers by role | Pass |
| findByClass > finds platforms by type | Pass |
| findByClass > returns results sorted by ID | Pass |
| findByClass > returns empty for invalid path | Pass |
| findByClass > returns empty for empty string | Pass |
| isValidClass > recognises valid domain | Pass |
| isValidClass > recognises valid deep path | Pass |
| isValidClass > rejects invalid path | Pass |
| isValidClass > rejects empty string | Pass |
| isValidClass > rejects partial valid path with invalid end | Pass |
| isValidClass > recognises class node with no direct platforms | Pass |
| validation > throws for missing file | Pass |
| validation > throws for invalid JSON | Pass |
| validation > throws for missing vessel_classes root | Pass |
| validation > throws for duplicate platform ID | Pass |
| validation > throws for platform missing name | Pass |
| validation > throws for platform missing nationality | Pass |
| validation > loads the default bundled registry | Pass |

## Key Scenarios Verified

- Platform resolution returns all 8 fields (id, name, short_name, nationality, vessel_class, vessel_type, vessel_role, domain) correctly derived from tree position
- Cross-language parity: golden fixture confirms Python and TypeScript produce identical results for all 10 platforms
- Tree traversal at all levels: domain, role, type — with correct descendant collection
- Load-time validation catches all structural errors: missing file, invalid JSON, missing root key, duplicate IDs, missing required fields
- Edge cases: empty string, whitespace, case sensitivity, unknown IDs all return None/undefined

## Known Issues

- None

## Environment

- Runner: pytest 9.0.2 + vitest 1.6.1
- Branch: claude/implement-speckit-180-qK7Kz
- Date: 2026-04-13
