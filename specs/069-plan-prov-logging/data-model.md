# Data Model: PROV Logging Integration — Entity Inventory

**Feature**: 069 — Plan PROV Logging Integration
**Date**: 2026-02-08

This document inventories all entities affected by the PROV logging transition, comparing current state to target state.

## 1. ToolResult (Python → expanded)

### Current State

**File**: `services/calc/debrief_calc/models.py` (lines 115-137)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool` | `str` | Yes | Tool name |
| `success` | `bool` | Yes | Pass/fail |
| `features` | `list[dict] \| None` | Conditional | Output GeoJSON features |
| `error` | `ToolError \| None` | Conditional | Error details |
| `duration_ms` | `float` | Yes | Execution time |

### Target State (SRD Annex A.8)

| Field | Type | Required | New? | Description |
|-------|------|----------|------|-------------|
| `tool` | `str` | Yes | No | Tool identifier |
| `toolVersion` | `str` | Yes | **Yes** | Semantic version |
| `success` | `bool` | Yes | No | Pass/fail |
| `features` | `list[dict] \| None` | Conditional | No | Output features (kept for compatibility) |
| `modifiedFeatures` | `list[ModifiedFeature]` | No | **Yes** | Feature IDs + changed properties |
| `createdFeatures` | `list[str]` | No | **Yes** | New feature references |
| `createdAssets` | `list[CreatedAsset]` | No | **Yes** | Artifact files with resultId + path |
| `parameters` | `dict[str, ParameterValue]` | Yes | **Yes** | Full resolved params with defaults |
| `error` | `ToolError \| None` | Conditional | No | Error details |
| `duration_ms` | `float` | Yes | No | Execution time (maps to executionDuration) |

### New Supporting Types

```python
class ModifiedFeature(BaseModel):
    featureId: str
    changedProperties: dict[str, PropertyDelta]

class PropertyDelta(BaseModel):
    previousValue: Any
    newValue: Any

class CreatedAsset(BaseModel):
    resultId: str          # Stable logical identity (e.g., "bt_plot_001")
    path: str              # Full versioned path (e.g., "./results/bt_plot_001_v2.png")
    mimeType: str | None

class ParameterValue(BaseModel):
    value: Any
    default: bool = False
    tunable: bool = True
```

## 2. Provenance / Log Entry (feature.properties.provenance)

### Current State (debrief-calc)

**File**: `services/calc/debrief_calc/models.py` (lines 49-63), written by `provenance.py:69`

```json
{
  "tool": "calculate-range",
  "version": "1.0.0",
  "timestamp": "2026-01-15T10:30:00Z",
  "sources": [{"id": "track-a", "kind": "TRACK"}],
  "parameters": {"interval": 60}
}
```

### Current State (debrief-stac)

**File**: `services/stac/src/debrief_stac/provenance.py:35` — writes to `properties.prov`

```json
{
  "tool": "calculate-range",
  "version": "1.0.0",
  "timestamp": "2026-01-15T10:30:00Z",
  "sources": [{"id": "track-a", "kind": "TRACK"}],
  "parameters": {"interval": 60}
}
```

### Target State (SRD Annex A.3)

```json
{
  "activityId": "act-001",
  "timestamp": "2026-02-06T14:38:00Z",
  "wasGeneratedBy": {
    "tool": "calculate-range",
    "toolVersion": "1.2.0",
    "parameters": {
      "interval": { "value": "PT60S", "default": true, "tunable": true },
      "method": { "value": "linear", "default": false, "tunable": true }
    }
  },
  "used": ["feature-id-Neptune", "feature-id-alpha"],
  "generated": ["feature-id-range-result"],
  "executionDuration": "PT0.3S",
  "tune": null
}
```

### Key Differences

| Aspect | Current | Target |
|--------|---------|--------|
| Identity | None | `activityId` (UUID, shared across multi-feature ops) |
| Tool info | `tool` + `version` | `wasGeneratedBy.tool` + `wasGeneratedBy.toolVersion` |
| Parameters | Flat `dict[str, Any]` | Typed with `value`, `default`, `tunable` per param |
| Inputs | `sources: [{id, kind}]` | `used: [featureId]` |
| Outputs | Not tracked | `generated: [featureId or path]` |
| Duration | Not tracked (on ToolResult only) | `executionDuration` (ISO 8601 duration) |
| Tuning | Not supported | `tune: {timestamp, parameter, previousValue, newValue}` |
| Storage key | `properties.provenance` (calc) / `properties.prov` (stac) | `properties.provenance` (unified, array) |

## 3. System Record Feature

### Current State

Does not exist as a concrete implementation. The `SYSTEM` kind discriminator was added in feature 022, but no system record features are created.

### Target State (SRD Annex A.4)

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": []
  },
  "properties": {
    "featureType": "system",
    "snapshotLinks": {
      "prev": {
        "asset": "plot-snapshot-2026-02-06T14-00.geojson",
        "provEntryCount": 12
      },
      "next": null
    },
    "branches": [
      {
        "branchId": "branch-alt-tma",
        "branchedFrom": "act-008",
        "branchedAt": "2026-02-06T16:00:00Z",
        "targetAsset": "plot-branch-alt-tma.geojson"
      }
    ],
    "provenance": [
      {
        "activityId": "file-001",
        "type": "snapshot",
        "timestamp": "2026-02-06T14:00:00Z",
        "asset": "plot-snapshot-2026-02-06T14-00.geojson"
      }
    ]
  }
}
```

## 4. StateSnapshot (undo/redo)

### Current State

**File**: `services/session-state/src/store/index.ts` (lines 26-39)

| Field | Included | After Split |
|-------|----------|-------------|
| `currentTime` | Yes | Keep |
| `timeRange` | Yes | Keep |
| `timeFilter` | Yes | Keep |
| `stepSize` | Yes | Keep |
| `playbackRate` | Yes | Keep |
| `displayMode` | Yes | Keep |
| `viewport` | Yes | Keep |
| `rotation` | Yes | Keep |
| `featureCollectionUri` | Yes | **Remove** (data, not UI) |
| `selection` | Yes | Keep |
| `hiddenFeatureIds` | Yes | Keep |
| `savePath` | Yes | **Remove** (metadata, not undoable) |

### Target State

Same fields minus `featureCollectionUri` and `savePath`. No new fields added. The 50-step history limit and suppression logic remain unchanged.

## 5. Dirty Tracking Fields

### Current State

**File**: `services/session-state/src/store/middleware/dirty.ts` (lines 15-27)

Triggers: `currentTime`, `timeRange`, `timeFilter`, `stepSize`, `playbackRate`, `displayMode`, `viewport`, `rotation`, `featureCollectionUri`, `selection`, `hiddenFeatureIds`

### Target State

Same trigger fields for UI changes. Additionally, the Log Service must signal "features changed" (provenance entries added) which triggers dirty independently. This could be:
- A new `logEntryCount` field that increments on each Log write, or
- Direct `markDirty()` call from the Log Service after writing entries

## 6. ToolResultAnnotations (LinkML)

### Current State

**File**: `shared/schemas/src/linkml/tool-result.yaml` (lines 53-92)

Defines MCP content annotations: `resultType`, `sourceFeatures`, `label`, `href`, `deletedFeatures`. These are transport-level annotations on MCP responses, not persistence-level provenance.

### Target State

**No change required**. ToolResultAnnotations serve a different purpose (MCP response classification) from Log entries (provenance persistence). Both will coexist — annotations on the MCP wire, Log entries on features.

## 7. Files Requiring Updates (Breaking Change Inventory)

| File | Change | Phase |
|------|--------|-------|
| `services/calc/debrief_calc/models.py` | Expand ToolResult, add new types | 0 |
| `services/calc/debrief_calc/provenance.py` | Produce new Log Entry format | 0 |
| `services/calc/debrief_calc/executor.py` | Populate new ToolResult fields | 0 |
| `services/calc/debrief_calc/validation.py` | Validate new provenance schema | 0 |
| `services/stac/src/debrief_stac/provenance.py` | Remove or unify with new format | 0 |
| `shared/schemas/src/linkml/` | Add Log Entry schema | 0 |
| `shared/schemas/fixtures/tool-result/` | Update all fixtures | 0 |
| `services/calc/tests/test_provenance.py` | Update assertions | 0 |
| `services/calc/tests/test_executor.py` | Update assertions | 0 |
| `services/stac/tests/test_provenance.py` | Update or remove | 0 |
| `apps/vscode/src/types/tool.ts` | Add expanded ToolResult types | 1 |
| `apps/vscode/src/services/calcService.ts` | Parse expanded ToolResult | 1 |
| `apps/vscode/src/commands/executeTool.ts` | Route to Log Service | 1 |
| `services/session-state/src/store/index.ts` | Add Log Service integration | 1 |
| `services/session-state/src/store/index.ts` | Narrow StateSnapshot | 3 |
| `services/session-state/src/store/middleware/dirty.ts` | Add Log-triggered dirty | 1 |
| `apps/web-shell/src/services/toolService.ts` | Parse expanded ToolResult | 1 |
