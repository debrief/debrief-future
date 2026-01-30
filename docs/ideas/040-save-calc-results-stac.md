# Save Analysis Results to STAC

## Problem

When a user runs an analysis tool (e.g., range/bearing between two tracks via `debrief-calc`), the result is displayed as a transient layer in the VS Code extension. If the user closes the plot or restarts VS Code, the result is lost. There is no mechanism to persist calc tool outputs back into the STAC catalog, and no way to record which source items produced a given result.

Currently in the VS Code extension (`apps/vscode/src/commands/executeTool.ts`), results are added to the map panel and layers tree as in-memory `ResultLayer` objects with `ToolProvenance` metadata. This provenance includes `sourceFeatureIds`, `toolId`, `toolVersion`, and `executionTime` -- but none of it is persisted to disk.

The CONSTITUTION (Article III) requires that "every transformation records lineage." Transient result layers violate this principle because the lineage is discarded on session end.

## Proposed Solution

Add the ability to save `debrief-calc` tool results as new STAC Items within the existing catalog, with STAC Link objects pointing back to the source items that produced the result.

### Flow

1. User executes a calc tool (existing #038 flow)
2. Result layer is displayed on the map (existing behavior)
3. User triggers "Save Result" (new command, e.g., via context menu on result layer or notification action)
4. A new STAC Item is created in the catalog representing the result
5. The result GeoJSON FeatureCollection is stored as an asset of the new item
6. STAC `links` connect the result item back to its source items using `rel: "derived_from"`

### STAC Item Structure for Results

A saved result item would look like:

```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "stac_extensions": [],
  "id": "result-range-bearing-20260129T143000Z",
  "geometry": null,
  "bbox": null,
  "properties": {
    "title": "Range/Bearing: TRACK_A vs TRACK_B",
    "datetime": "2026-01-29T14:30:00Z",
    "debrief:kind": "calc-result",
    "debrief:tool": "range-bearing",
    "debrief:tool_version": "1.0.0",
    "debrief:parameters": {},
    "debrief:duration_ms": 42
  },
  "links": [
    { "rel": "root", "href": "../catalog.json", "type": "application/json" },
    { "rel": "parent", "href": "../catalog.json", "type": "application/json" },
    { "rel": "self", "href": "./item.json", "type": "application/geo+json" },
    {
      "rel": "derived_from",
      "href": "../plot-abc/item.json",
      "type": "application/geo+json",
      "title": "Source plot containing input tracks"
    }
  ],
  "assets": {
    "features": {
      "href": "./features.json",
      "type": "application/geo+json",
      "title": "Result features",
      "roles": ["data"]
    }
  }
}
```

### Provenance Model

Provenance is recorded at two levels:

1. **STAC Item level** -- `links` with `rel: "derived_from"` point to the source STAC Items (plots) that contained the input features. This is standard STAC and enables catalog-level lineage queries.

2. **Feature level** -- Each output GeoJSON feature already carries `properties.provenance` (from `debrief_calc.provenance.attach_provenance`) with `tool`, `version`, `timestamp`, `sources` (list of `{id, kind}`), and `parameters`. This is preserved as-is inside the saved asset.

The combination allows both coarse-grained discovery ("which results came from this plot?") via STAC links and fine-grained traceability ("which specific features were inputs?") via feature-level provenance.

### Source Item Resolution

The `sourceFeatureIds` from `ToolProvenance` must be mapped back to their parent STAC Item IDs. The VS Code extension's `StacService` already maintains a mapping from feature IDs to plot IDs (the loaded item context). This mapping is used to determine which STAC Items to reference in `derived_from` links.

## File Locations That Will Need Changes

| File | Change |
|------|--------|
| `services/stac/src/debrief_stac/plot.py` | Add `create_result_item()` function for creating result STAC Items with `derived_from` links |
| `services/stac/src/debrief_stac/models.py` | Add `ResultMetadata` model (tool ID, version, source item IDs, parameters) |
| `services/stac/src/debrief_stac/features.py` | Add `save_result_features()` to write result GeoJSON asset |
| `services/stac/src/debrief_stac/types.py` | Add result-specific type aliases if needed |
| `apps/vscode/src/services/stacService.ts` | Add `saveResultItem()` method that writes a result STAC Item to the catalog |
| `apps/vscode/src/services/calcService.ts` | Add `saveResult()` method or integrate with stacService |
| `apps/vscode/src/commands/executeTool.ts` | Add "Save Result" action to success notification; register `debrief.saveResult` command |
| `apps/vscode/src/providers/layersTreeProvider.ts` | Add "Save" context menu item on result layers |
| `apps/vscode/package.json` | Register `debrief.saveResult` command and context menu contribution |
| `services/stac/tests/` | Tests for result item creation, `derived_from` link structure, round-trip |
| `apps/vscode/tests/` | Tests for save result command and stacService integration |

## Acceptance Criteria

- [ ] A calc tool result can be saved as a new STAC Item in the catalog
- [ ] The saved STAC Item has `debrief:kind` = `"calc-result"` in its properties
- [ ] The saved item contains `derived_from` links pointing to all source STAC Items
- [ ] The result GeoJSON FeatureCollection is stored as a `features` asset
- [ ] Feature-level provenance (from `debrief_calc`) is preserved in the saved GeoJSON
- [ ] The item properties record the tool ID, tool version, execution timestamp, and parameters
- [ ] Saving a result is idempotent (saving the same result twice does not create duplicates)
- [ ] The VS Code extension provides a "Save Result" command accessible from result layers
- [ ] Saved results appear in `list_plots()` and can be reopened
- [ ] All new code has unit tests
- [ ] STAC Item validates against the STAC 1.0.0 specification

## Out of Scope

- Deleting or updating saved results
- Chaining results (using a saved result as input to another tool)
- Syncing results across catalogs
- Automatic saving (always requires explicit user action)
