# Data Model: PROV Schema Foundation

**Feature**: 070-prov-schema-foundation
**Date**: 2026-02-09

## Entity Relationship Overview

```
ToolResult ──produces──> LogEntry ──stored on──> GeoJSON Feature
    │                       │
    ├── ModifiedFeature     ├── WasGeneratedBy
    │    └── PropertyDelta  │    └── ParameterValue (dict)
    ├── CreatedAsset        ├── TuneAnnotation
    └── ParameterValue      └── (shared activityId across features)

SystemRecord ──carries──> SnapshotLink
    │                      BranchRecord
    └── file-level provenance entries
```

## Core Entities

### LogEntry

The central provenance record stored on GeoJSON features. Follows W3C PROV vocabulary.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| activity_id | string (UUID) | yes | Unique operation identifier; shared across features in multi-feature ops |
| timestamp | datetime (ISO 8601) | yes | When the operation occurred |
| was_generated_by | WasGeneratedBy | yes | Tool identity and parameters |
| used | string[] | yes | Feature IDs of inputs (may be empty) |
| generated | string[] | yes | Feature IDs or asset paths of outputs (may be empty) |
| execution_duration | string (ISO 8601 duration) | yes | Wall-clock time (e.g., "PT0.3S") |
| generated_result_id | string | no | Stable logical identity for artifact-producing tools |
| tune | TuneAnnotation | no | Parameter tuning record (null until tuned) |

**JSON serialization** (camelCase via Pydantic aliases):
`activity_id` → `activityId`, `was_generated_by` → `wasGeneratedBy`, `execution_duration` → `executionDuration`, `generated_result_id` → `generatedResultId`

**Validation rules**:
- `activity_id` must be a valid UUID v4 string
- `timestamp` must be ISO 8601 with timezone (UTC)
- `execution_duration` must be ISO 8601 duration format
- `tune` is null until a tuning operation modifies the entry (Phase 6)

### WasGeneratedBy

Identifies the tool and its parameters for a specific invocation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tool | string | yes | Tool identifier (kebab-case, e.g., "calculate-range") |
| tool_version | string | yes | Semantic version (e.g., "1.2.0") |
| parameters | dict[string, ParameterValue] | yes | Full resolved parameter set (may be empty dict) |

**JSON serialization**: `tool_version` → `toolVersion`

### ParameterValue

A typed parameter value with replay metadata.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| value | any | yes | — | The parameter value (string, number, boolean, etc.) |
| default | boolean | no | false | Whether this is the default value |
| tunable | boolean | no | true | Whether this parameter can be modified during replay |

### TuneAnnotation

Records a parameter modification (appended, not replacing original).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | datetime (ISO 8601) | yes | When the tuning occurred |
| parameter | string | yes | Name of the parameter that was changed |
| previous_value | any | yes | Value before tuning |
| new_value | any | yes | Value after tuning |

**JSON serialization**: `previous_value` → `previousValue`, `new_value` → `newValue`

## ToolResult Expansion

### ToolResult (expanded)

Existing fields preserved; new fields are all optional.

| Field | Type | Required | New? | Description |
|-------|------|----------|------|-------------|
| tool | string | yes | no | Tool name |
| success | boolean | yes | no | Pass/fail |
| features | list[dict] | conditional | no | Output GeoJSON features (required when success=True) |
| error | ToolError | conditional | no | Error details (required when success=False) |
| duration_ms | float | yes | no | Execution time in milliseconds |
| tool_version | string | no | **yes** | Semantic version of the tool |
| modified_features | list[ModifiedFeature] | no | **yes** | IDs + changed properties |
| created_features | list[string] | no | **yes** | IDs of new features |
| created_assets | list[CreatedAsset] | no | **yes** | Artifact files produced |
| parameters | dict[string, ParameterValue] | no | **yes** | Full resolved parameter set |

**JSON serialization**: `tool_version` → `toolVersion`, `modified_features` → `modifiedFeatures`, `created_features` → `createdFeatures`, `created_assets` → `createdAssets`

### ModifiedFeature

Associates a feature with the properties that changed.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| feature_id | string | yes | ID of the modified feature |
| changed_properties | dict[string, PropertyDelta] | yes | Property name → before/after values |

**JSON serialization**: `feature_id` → `featureId`, `changed_properties` → `changedProperties`

### PropertyDelta

Captures a single property change.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| previous_value | any | yes | Value before the change |
| new_value | any | yes | Value after the change |

**JSON serialization**: `previous_value` → `previousValue`, `new_value` → `newValue`

### CreatedAsset

Identifies an artifact file produced by a tool.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| result_id | string | yes | Stable logical identity (e.g., "bt_plot_001") |
| path | string | yes | Full versioned path (e.g., "./results/bt_plot_001_v2.png") |
| mime_type | string | no | MIME type of the artifact |

**JSON serialization**: `result_id` → `resultId`, `mime_type` → `mimeType`

## System Record Entities

### SystemRecordProperties

Properties for the non-spatial system record feature.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| feature_type | string ("system") | yes | Discriminator, always "system" |
| snapshot_links | SnapshotLinks | no | Doubly-linked snapshot chain |
| branches | list[BranchRecord] | no | Branch records |
| provenance | list[FileProvEntry] | no | File-level events (snapshots, branches) |

**JSON serialization**: `feature_type` → `featureType`, `snapshot_links` → `snapshotLinks`

### SnapshotLinks

Doubly-linked references to adjacent snapshots.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prev | SnapshotRef | no | Link to previous snapshot (null if first) |
| next | SnapshotRef | no | Link to next snapshot (null if current) |

### SnapshotRef

Reference to a snapshot file.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| asset | string | yes | Relative path to snapshot GeoJSON file |
| prov_entry_count | integer | yes | Number of provenance entries in the snapshot |

**JSON serialization**: `prov_entry_count` → `provEntryCount`

### BranchRecord

Reference to a branched plot.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| branch_id | string | yes | Unique branch identifier |
| branched_from | string | yes | Activity ID of the branch point |
| branched_at | datetime (ISO 8601) | yes | When the branch was created |
| target_asset | string | yes | Relative path to the branched plot file |

**JSON serialization**: `branch_id` → `branchId`, `branched_from` → `branchedFrom`, `branched_at` → `branchedAt`, `target_asset` → `targetAsset`

### FileProvEntry

File-level provenance event (snapshot or branch creation).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| activity_id | string | yes | Unique event identifier |
| type | string | yes | Event type: "snapshot" or "branch" |
| timestamp | datetime (ISO 8601) | yes | When the event occurred |
| asset | string | no | Path to snapshot file (for snapshot events) |
| branch_id | string | no | Branch identifier (for branch events) |
| direction | string | no | "source" or "target" (for branch events) |

**JSON serialization**: `activity_id` → `activityId`, `branch_id` → `branchId`

## State Transitions

### Provenance on a Feature

```
Empty feature (loaded)
    │
    ├── attach_log_entry() called
    │   └── properties.provenance = [entry1]
    │
    ├── second tool invocation
    │   └── properties.provenance = [entry1, entry2]
    │
    ├── property edit
    │   └── properties.provenance = [entry1, entry2, entry3]
    │
    └── (append-only — entries never modified or removed)
```

### ToolResult Lifecycle

```
Tool handler executes
    │
    ├── Returns output features (list[dict])
    │
    ├── Executor creates ToolResult
    │   ├── Populates existing fields (tool, success, features, duration_ms)
    │   └── Populates new optional fields if available (tool_version, parameters)
    │
    ├── Executor calls attach_log_entry() for each output feature
    │   └── Creates LogEntry from ToolResult fields + generated activityId
    │
    └── Returns ToolResult to caller
```

## Backward Compatibility

| Change | Impact | Migration |
|--------|--------|-----------|
| `properties.provenance` becomes array | Medium | Legacy single-object wrapped in array on read |
| `properties.prov` removed | Low | Key ignored; not read by any code after migration |
| New ToolResult fields | None | All optional with None defaults |
| Provenance field names change | Medium | Tests updated; no runtime migration needed |
| STAC provenance module removed | Low | Tests updated to use unified module |
