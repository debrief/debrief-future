---
feature: "187-build-time-enums"
captured_at: "2026-04-14T18:00:00Z"
git_sha: "45c6139"
tests_passed: 44
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Build-Time Enum Extraction

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 44 |
| Passed | 44 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A (module-level; no coverage gate) |

## Test Breakdown

### Phase 2 — Foundational helpers (T009)

| Test | Status |
|------|--------|
| `TestCanonicalKey::test_strips_whitespace_and_casefolds` | Pass |
| `TestCanonicalKey::test_empty_string_stays_empty` | Pass |
| `TestCanonicalKey::test_mixed_case_collapses` | Pass |
| `TestCanonicalKey::test_does_not_touch_interior_whitespace` | Pass |
| `TestDedupPreservingFirst::test_dedupes_by_canonical_key_preserving_first_casing` | Pass |
| `TestDedupPreservingFirst::test_drops_empty_and_whitespace_only` | Pass |
| `TestDedupPreservingFirst::test_sort_is_case_insensitive` | Pass |
| `TestDedupPreservingFirst::test_trailing_whitespace_collapses_with_stripped_form` | Pass |
| `TestParseExerciseName::test_title_with_separator_returns_prefix` | Pass |
| `TestParseExerciseName::test_title_without_separator_returns_none` | Pass |
| `TestParseExerciseName::test_bare_colon_without_space_returns_none` | Pass |
| `TestParseExerciseName::test_none_returns_none` | Pass |
| `TestParseExerciseName::test_leading_separator_returns_none` | Pass |
| `TestParseExerciseName::test_prefix_is_trimmed` | Pass |
| `TestParseExerciseName::test_multiple_separators_keeps_first` | Pass |

### Phase 3 — US1: Generate enum bundle (T010–T016)

| Test | Status |
|------|--------|
| `TestExtractClassTree::test_strips_platform_leaves` | Pass |
| `TestExtractClassTree::test_preserves_class_metadata` | Pass |
| `TestExtractClassTree::test_preserves_interior_class_nodes` | Pass |
| `TestScanCatalog::test_returns_catalog_scan_result` | Pass |
| `TestScanCatalog::test_deduplicates_and_unions_tags` | Pass |
| `TestScanCatalog::test_deduplicates_feature_tags` | Pass |
| `TestScanCatalog::test_collects_platform_nationalities` | Pass |
| `TestScanCatalog::test_harvests_exercise_names_from_titles` | Pass |
| `TestScanCatalogGracefulFields::test_missing_tags_does_not_pollute` | Pass |
| `TestScanCatalogGracefulFields::test_missing_feature_tags_does_not_pollute` | Pass |
| `TestScanCatalogGracefulFields::test_missing_title_contributes_no_exercise` | Pass |
| `TestScanCatalogGracefulFields::test_missing_platforms_contributes_no_nationality` | Pass |
| `TestScanCatalogGracefulFields::test_platform_without_nationality_is_skipped` | Pass |
| `TestBuildBundle::test_has_meta_header` | Pass |
| `TestBuildBundle::test_unions_registry_and_catalog_nationalities` | Pass |
| `TestBuildBundle::test_contains_all_five_sections` | Pass |
| `TestSerializeConformsToSchema::test_fixture_bundle_validates` | Pass |
| `TestBundleSize::test_real_bundle_stays_under_65kib` | Pass |
| `TestCliExitCodes::test_missing_registry_exits_code_1` | Pass |
| `TestCliExitCodes::test_malformed_registry_exits_code_2` | Pass |

### Phase 4 — US2: Determinism + drift detection (T023–T027)

| Test | Status |
|------|--------|
| `TestDeterminism::test_two_runs_byte_identical` | Pass |
| `TestDriftDetection::test_new_interior_vessel_class_surfaces` | Pass |
| `TestDriftDetection::test_new_registry_nationality_surfaces` | Pass |
| `TestDriftDetection::test_new_catalog_tag_surfaces` | Pass |
| `TestDriftDetection::test_new_exercise_prefix_surfaces` | Pass |

### Phase 5 — US3: Conservative extraction (T028–T030)

| Test | Status |
|------|--------|
| `TestConservativeExtraction::test_unique_tag_surfaces_even_if_only_on_one_item` | Pass |
| `TestConservativeExtraction::test_catalog_only_nationality_appears` | Pass |
| `TestConservativeExtraction::test_title_without_separator_contributes_nothing` | Pass |

### Smoke

| Test | Status |
|------|--------|
| `test_bundle_round_trips_as_json` | Pass |

## Key Scenarios Verified

- **Canonicalisation rule** — values differing only in trim/case collapse to a single entry, first-seen casing preserved (`_canonical_key`, `_dedup_preserving_first`).
- **Conservative exercise parsing** — titles without the literal `": "` separator contribute nothing to `exercise_names`, preventing spurious entries from titles like `"AIS:dropoff"`.
- **Vessel-class tree projection** — platform-instance leaves stripped; `_class` metadata and interior nodes preserved so the LLM can reason about parent classes (e.g. "frigates").
- **Nationality union** — bundle's `nationalities` list is the deduplicated union of registry + catalog sources.
- **Schema conformance** — serialised bundle validates against `contracts/enum-bundle.schema.json` (uses `jsonschema` draft 2020-12).
- **Size budget** — real-catalog bundle stays under 65,536 bytes (FR-009 / SC-002).
- **Determinism** — two consecutive serialise calls are byte-identical (FR-008 / SC-004).
- **CLI exit codes** — missing registry → exit 1; malformed JSON → exit 2; both name the offending path on stderr (FR-010).
- **Graceful degradation** — each of `debrief:tags`, `debrief:feature_tags`, `debrief:platforms`, and `properties.title` can be missing on individual items without polluting output or raising (FR-014).
- **Drift surfaces** — adding a new vessel class, nationality, tag, or exercise prefix to the inputs produces the expected addition to the bundle (US2 acceptance criteria).

## Known Issues

- None.

## Environment

- Runner: `pytest` 9.0.2 via `uv run`
- Branch: `claude/implement-feature-187-IhYEz`
- Date: 2026-04-14
- Full repo also green: `uv run pytest` — 1687 passed, 1 skipped, 1 xfailed.
- Lint (`uv run ruff check .`) and typecheck (`uv run pyright`) both clean.
