# Research: Tool Results Architecture

**Feature**: #041 Tool Results Architecture
**Date**: 2026-01-30

## Existing Codebase Analysis

### debrief-calc (services/calc/)

**Current state**: Three tools implemented (track-stats, area-summary, range-bearing). The existing `ToolResult` model returns a flat structure with `tool`, `success`, `features[]`, `error`, and `duration_ms`. No result type classification exists — all results are implicitly "additions" (new features returned).

**Key file**: `debrief_calc/models.py` — `ToolResult` Pydantic model at line 115. The `Provenance` model (line 49) already tracks tool, version, timestamp, and sources per feature.

**MCP server**: `debrief_calc/mcp/server.py` — currently returns raw JSON with features or error. No MCP content type differentiation (ResourceContent vs TextContent vs ImageContent). No annotations.

**Gap**: Tools have no way to declare their result type (mutation vs addition vs deletion vs artifact). The response format doesn't use MCP-native content types or include Debrief annotations.

### debrief-stac (services/stac/)

**Current state**: `features.py` has `add_features()` only. No `update_features()` or `delete_features()`. No `results/` directory handling for artifacts. No provenance writing to `properties.prov`.

**Key file**: `debrief_stac/features.py` — `add_features()` at line 23. Validates features, appends to FeatureCollection, updates bbox, saves item.

**Gap**: Missing mutation (in-place update), deletion, artifact persistence, and provenance recording. Note: debrief-stac does NOT need result-type-aware routing — the orchestrator (frontend/LLM) interprets result types and calls the appropriate atomic STAC operation.

### LinkML Schemas (shared/schemas/)

**Current state**: `tool.yaml` defines `Tool` and `SelectionRequirement`. No result type definitions exist.

**Gap**: Need a new `tool-result.yaml` schema defining the four top-level types, annotation structure, and hierarchical type path.

### Shared Components (shared/components/)

**Current state**: No diff utility exists. The `diffFeatureCollections(old, new)` function described in TOOL-RESULTS.md has not been implemented.

## MCP Content Type Mapping

Based on TOOL-RESULTS.md architecture:

| Result Type | MCP Content Type | Content |
|-------------|-----------------|---------|
| mutation | ResourceContent | Modified GeoJSON feature(s) with `feature://` URI |
| addition | ResourceContent | New GeoJSON feature(s) with `feature://` URI |
| deletion | TextContent | Confirmation message |
| artifact | ImageContent / ResourceContent | Base64 data or file reference |

All types carry `annotations` object with `debrief:resultType`, `debrief:sourceFeatures`, `debrief:label`.

## Relationship to Spec 001 (Save Calc Results)

Spec 001 focuses on the VS Code "Save Result" command and STAC Item creation for persisted results. Spec 041 is the underlying architecture that 001 depends on:

- 041 defines result types and MCP response format → 001 consumes those responses
- 041 defines atomic STAC operations → 001 uses them to persist
- 041 defines the diff utility → frontends use it after persistence
- 041's orchestrator logic (iterating content array, calling atomic ops) is the mechanism 001 builds upon

Key architectural change: debrief-stac has no knowledge of result types. The orchestrator (frontend/LLM) interprets `debrief:resultType` on each content item and calls the appropriate atomic STAC operation (update_features, add_features, delete_features, store_artifact).

## Multi-Result Responses

Tools may return multiple content items in a single MCP response. For example, a "trim outliers" tool returns both a deletion (removing contacts) and an artifact (outlier report). The orchestrator processes each content item sequentially in array order, calling atomic STAC operations and updating the UI incrementally after each one.

## Provenance Design

Current `Provenance` model in debrief-calc tracks: tool, version, timestamp, sources, parameters. This maps to `properties.prov` in persisted features.

W3C PROV compliance is deferred, but the data structure should be forward-compatible:
- `prov:wasGeneratedBy` → tool + version + parameters
- `prov:wasDerivedFrom` → sources (feature IDs)
- `prov:generatedAtTime` → timestamp

## Hierarchical Type Matching

The type path `mutation/track/smoothed` needs a matcher that:
1. Accepts exact match: `mutation/track/smoothed` → specific handler
2. Falls back to prefix: `mutation/track` → track handler
3. Falls back to top-level: `mutation` → generic mutation handler

This is a simple string prefix match descending from most specific to least specific.

## Error Handling

Current `ToolError` model has: code, message, details. The architecture requires:
- MCP error structure with numeric code (-32000)
- `debrief:errorCategory` (invalid_input, algorithm_failure, resource_not_found)
- `debrief:affectedFeatures` (feature IDs)

The existing `ToolError.code` field (currently string-based: TOOL_NOT_FOUND, INVALID_CONTEXT, etc.) needs mapping to the new error categories.
