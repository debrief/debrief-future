# Data Model: Log Recording Service (#071)

**Date**: 2026-02-09
**Source**: spec.md, SRD Annex A.3, Phase 0 (#070) spec

## Entities

### LogEntry

A PROV-aligned provenance record stored in `feature.properties.provenance[]`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| activityId | string (UUID) | Yes | Unique operation identifier. Shared across features in multi-feature operations. |
| timestamp | string (ISO 8601) | Yes | When the operation was recorded by the Log Service. |
| wasGeneratedBy | WasGeneratedBy | Yes | Tool identity, version, and parameters. |
| used | string[] | Yes | Feature IDs that were inputs to this operation. |
| generated | string[] | Yes | Feature IDs or artifact paths created by this operation. |
| executionDuration | string (ISO 8601 duration) | Yes | Wall-clock time (e.g., `PT0.3S`). |
| generatedResultId | string or null | No | Stable logical ID for artifact-producing tools. |
| tune | TuneAnnotation or null | No | Null in Phase 1. Reserved for Phase 6 replay/tuning. |

### WasGeneratedBy

Generator information nested within a LogEntry.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tool | string | Yes | Tool identifier (kebab-case, e.g., `calculate-range`). |
| toolVersion | string | Yes | Semantic version of the tool. |
| parameters | Record<string, ParameterValue> | Yes | Full resolved parameter set including defaults. |

### ParameterValue

A typed parameter with metadata.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| value | any | Yes | The parameter value (number, string, boolean, etc.). |
| default | boolean | Yes | Whether this is the default value. |
| tunable | boolean | Yes | Whether this parameter can be tuned in replay (default: true). |

### TuneAnnotation (Phase 6 -- stub only)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | string (ISO 8601) | Yes | When the tune was applied. |
| parameter | string | Yes | Which parameter was changed. |
| previousValue | any | Yes | Value before tuning. |
| newValue | any | Yes | Value after tuning. |

### ExpandedToolResult (TypeScript mirror of Python model)

The contract received from Python tools via MCP. Extends the existing `ToolExecutionResult`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| success | boolean | Yes | Whether tool execution succeeded. |
| features | FeatureCollection | No | Output GeoJSON features (with provenance embedded by Python). |
| error | string | No | Error message if failed. |
| durationMs | number | Yes | Execution time in milliseconds. |
| resultType | string | No | MCP result type (e.g., `addition/track-statistics`). |
| label | string | No | Display label from annotations. |
| sourceFeatureIds | string[] | No | Input feature IDs from annotations. |
| artifactData | string | No | Artifact data string. |
| artifactHref | string | No | Artifact filename. |
| toolVersion | string | No | Semantic version (new in Phase 0). |
| modifiedFeatures | ModifiedFeature[] | No | Features modified with property deltas (new in Phase 0). |
| createdFeatures | string[] | No | New feature IDs (new in Phase 0). |
| createdAssets | CreatedAsset[] | No | Artifact files produced (new in Phase 0). |
| parameters | Record<string, ParameterValue> | No | Full resolved params (new in Phase 0). |

### ModifiedFeature

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| featureId | string | Yes | ID of the modified feature. |
| changedProperties | Record<string, PropertyDelta> | Yes | What changed on this feature. |

### PropertyDelta

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| previousValue | any | Yes | Value before the change. |
| newValue | any | Yes | Value after the change. |

### CreatedAsset

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| resultId | string | Yes | Stable logical identity (e.g., `bt_plot_001`). |
| path | string | Yes | Full versioned path (e.g., `./results/bt_plot_001_v2.png`). |
| mimeType | string | No | MIME type of the artifact. |

## Relationships

```
ToolResult (from Python via MCP)
  │
  ├── contains → output features (with LogEntry already attached by Python)
  ├── references → input feature IDs (via sourceFeatureIds / modifiedFeatures)
  └── references → created assets (via createdAssets)
        │
        ▼
LogService.recordToolResult()
  │
  ├── reads → activityId from output features' provenance (for consistency)
  ├── creates → LogEntry for each input feature
  ├── writes → LogEntry to input features via stacService.appendProvenance()
  └── calls → markDirty() on Zustand store
        │
        ▼
getTimeline()
  │
  ├── reads → all features from GeoJSON file
  ├── collects → properties.provenance[] from each feature
  ├── deduplicates → on activityId
  └── returns → sorted LogEntry[] (ascending timestamp)
```

## State Transitions

### Feature Provenance Array

```
[] (empty)
  → [entry-1] (first tool execution affecting this feature)
  → [entry-1, entry-2] (second tool execution)
  → [entry-1, entry-2, entry-3] (append-only, never modified)
```

### Document Dirty State

```
clean
  → dirty (after Log Service writes provenance and calls markDirty())
  → clean (after user saves via Ctrl+S)
```

## Validation Rules

1. `activityId` MUST be a non-empty string (UUID v4 format recommended).
2. `timestamp` MUST be a valid ISO 8601 datetime string.
3. `executionDuration` MUST be a valid ISO 8601 duration (e.g., `PT0.3S`).
4. `wasGeneratedBy.tool` MUST be a non-empty string.
5. `wasGeneratedBy.toolVersion` MUST be a non-empty string.
6. `used` MUST be an array (may be empty for tools that create features from scratch).
7. `generated` MUST be an array (may be empty for tools that only modify existing features).
8. `tune` MUST be `null` in Phase 1.
9. Log entries are validated against the Phase 0 LinkML-generated JSON Schema before writing.
