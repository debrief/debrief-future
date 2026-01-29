# Research: Save Analysis Results to STAC

**Feature**: #040 Save Analysis Results to STAC
**Date**: 2026-01-29

## Research Questions

### RQ-1: How should result STAC Items be created — via Python debrief-stac or TypeScript direct file writes?

**Decision**: Use Python debrief-stac via its existing MCP interface.

**Rationale**: The debrief-stac service already handles catalog link management, bbox computation, and STAC validation. Bypassing it with direct file writes in TypeScript would duplicate logic and risk catalog inconsistency. The existing MCP wrapper (`services/stac/debrief_stac/mcp/server.py`) already exposes `create_plot` and `add_features` tools.

**Alternatives considered**:
- TypeScript direct file writes: Faster (no MCP round-trip) but duplicates catalog management logic and risks inconsistency.
- New TypeScript STAC library: Over-engineered; the Python service is battle-tested.

### RQ-2: How to map source feature IDs back to parent STAC Item IDs for `derived_from` links?

**Decision**: Extend `ResultLayer.provenance` to include `sourceItemIds: string[]` alongside `sourceFeatureIds`. Populated at tool execution time by the `executeTool` command, which already knows the current plot context.

**Rationale**: The MapPanel/CalcService knows which plot is loaded when a tool executes. Recording plot IDs at execution time is simpler and more reliable than reverse-lookups at save time.

**Alternatives considered**:
- Maintain a global `featureId → plotId` map: Adds ongoing bookkeeping burden for a one-time-use lookup.
- Parse feature IDs to extract plot IDs: Fragile, assumes naming conventions.

### RQ-3: How to generate deterministic result IDs for idempotency?

**Decision**: Use the `executionId` already present on `ResultLayer` as the STAC Item ID. Each tool execution produces a unique `executionId`. If a result with that ID already exists in the catalog, the save is a no-op.

**Rationale**: The execution ID is already unique per tool run. Using it as the STAC Item ID gives natural idempotency with no additional hashing logic. The `executionId` is a UUID generated at execution time.

**Alternatives considered**:
- Hash of (toolId + sorted sourceFeatureIds + parameters): Deterministic but complex; re-running the same tool would silently overwrite instead of creating a new result.
- Timestamp-based ID: Not idempotent; each save attempt would generate a new ID.

### RQ-4: How should saved results be distinguished from loaded plots when listing catalog items?

**Decision**: Use `properties["debrief:kind"] = "calc-result"` on the STAC Item. The existing `list_plots()` function returns all items; the VS Code extension can filter or group by kind.

**Rationale**: STAC supports arbitrary properties. Using a namespaced `debrief:kind` property follows STAC extension conventions and requires no schema changes to the catalog structure.

### RQ-5: How should saved results render when reopened?

**Decision**: Reuse the existing `loadPlotData()` path in `stacService.ts`. Result GeoJSON features will be loaded into the map just like plot features. The `debrief:kind = "calc-result"` property on the STAC item tells the extension to apply result styling (dashed lines, distinct colours) rather than track styling.

**Rationale**: The map rendering path already handles arbitrary GeoJSON features. Adding kind-aware styling is a minor conditional in the existing renderer.

### RQ-6: What new MCP tool is needed in debrief-stac?

**Decision**: Add a `save_result` MCP tool to `services/stac/debrief_stac/mcp/server.py` that wraps a new `create_result()` function. This function:
1. Creates a STAC Item with `debrief:kind = "calc-result"` and tool metadata properties
2. Writes the GeoJSON FeatureCollection as the `features` asset
3. Adds `derived_from` links to source item IDs
4. Updates the catalog with the new item link

**Rationale**: Separating the domain function (`create_result`) from the MCP wrapper follows Constitution Article IV.3 (services have zero MCP dependency).
