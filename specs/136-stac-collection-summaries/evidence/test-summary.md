---
feature: "136-stac-collection-summaries"
captured_at: "2026-03-07T12:00:00Z"
git_sha: "e3f1b69"
tests_passed: 137
tests_failed: 0
tests_skipped: 7
coverage_pct: null
---

# Test Summary: STAC Collection Summaries

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 144 |
| Passed | 137 |
| Failed | 0 |
| Skipped | 7 |
| Coverage | N/A |

## Test Breakdown

### Unit: Extract Helpers (test_collection.py)

| Test | Status |
|------|--------|
| test_extracts_bbox | Pass |
| test_null_bbox | Pass |
| test_datetime_used_as_start_and_end | Pass |
| test_explicit_start_end | Pass |
| test_extracts_extension_properties | Pass |
| test_missing_properties_not_included | Pass |
| test_null_values_filtered | Pass |

### Unit: Merge Helpers (test_collection.py)

| Test | Status |
|------|--------|
| test_first_item_sets_extent | Pass |
| test_expands_bbox | Pass |
| test_expands_temporal | Pass |
| test_null_bbox_skipped | Pass |
| test_first_item_sets_summaries | Pass |
| test_merges_deduplicated | Pass |
| test_sorted_alphabetically | Pass |

### US1: Automatic Collection Summaries (test_collection.py)

| Test | Status |
|------|--------|
| test_create_plot_promotes_catalog | Pass |
| test_add_item_expands_summaries | Pass |
| test_add_features_updates_collection_extent | Pass |
| test_item_without_bbox_excluded_from_spatial | Pass |
| test_item_missing_extension_properties_no_error | Pass |
| test_summaries_sorted_alphabetically | Pass |
| test_collection_validates_against_schema | Pass |

### US2: Backwards Compatibility (test_collection.py)

| Test | Status |
|------|--------|
| test_open_catalog_with_type_catalog_loads | Pass |
| test_create_plot_on_old_catalog_promotes | Pass |
| test_promoted_collection_retains_links | Pass |

### US3: Read Summaries API (test_collection.py)

| Test | Status |
|------|--------|
| test_read_summaries_returns_data_for_collection | Pass |
| test_read_summaries_returns_none_for_catalog | Pass |
| test_mcp_tool_returns_expected_format | Pass |
| test_mcp_tool_returns_not_promoted | Pass |

### US4: Deletion Rebuild (test_collection.py)

| Test | Status |
|------|--------|
| test_delete_item_contracts_temporal_range | Pass |
| test_delete_item_removes_unique_vessel_class | Pass |
| test_delete_all_items_clears_summaries | Pass |
| test_dangling_link_raises_plot_not_found | Pass |

### Existing Tests (Regression)

| Suite | Tests | Status |
|-------|-------|--------|
| test_catalog.py | 10 | All Pass |
| test_plot.py | 7 | All Pass |
| test_features.py | 9 | All Pass |
| test_integration.py | 3 | All Pass |
| test_mcp.py | 11 | All Pass |
| test_migrate.py | 7 | All Pass |
| test_provenance.py | 6 | All Pass |
| test_stac_validation.py | 14 | 8 Pass, 6 Skip |

## Key Scenarios Verified

- Catalog automatically promotes to Collection when first plot is created
- Incremental summary updates on add_features (O(1) reads)
- Full rebuild on item deletion (summaries contract correctly)
- Backwards compatibility: old Catalogs load without errors, promote on next write
- read_collection_summaries API returns structured extent + summaries
- MCP tool exposure follows existing patterns
- Collection JSON validates against contract schema
- Dangling item links raise PlotNotFoundError (strict failure)
- Zero-items edge case: summaries cleared, Collection type retained

## Known Issues

- 7 skipped tests are pre-existing STAC validator tests (require pystac library)

## Environment

- Runner: pytest 9.0.2
- Branch: claude/implement-speckit-136-CCIJM
- Date: 2026-03-07
