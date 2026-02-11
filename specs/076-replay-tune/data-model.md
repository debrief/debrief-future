# Data Model: Replay and Parameter Tuning

**Feature**: 076-replay-tune | **Date**: 2026-02-11

## Entity Relationship Overview

```
┌──────────────┐     extends      ┌──────────────────┐
│   LogEntry   │ ◄────────────── │ SoftDeletedEntry  │
│ (existing)   │                 │ (+deleted flag)    │
└──────┬───────┘                 └──────────────────┘
       │
       │ has one
       ▼
┌──────────────┐
│TuneAnnotation│  (existing type, Phase 6 populates it)
│              │
└──────────────┘

┌──────────────┐     produces     ┌──────────────────┐
│ ReplayEngine │ ────────────── ▶│   ReplayResult    │
│              │                 │                    │
└──────┬───────┘                 └──────────────────┘
       │                                  │
       │ uses                             │ contains
       ▼                                  ▼
┌──────────────┐                 ┌──────────────────┐
│ ReplayPlan   │                 │  ReplayProgress   │
│              │                 │                    │
└──────────────┘                 └──────────────────┘

┌──────────────────┐   provides   ┌──────────────────┐
│ ParameterEditor  │ ◄───────── │ParameterTypeInfo  │
│ (React component)│             │ (from tool def)    │
└──────────────────┘             └──────────────────┘
```

## New Types

### ReplayPlan

Describes the work the Replay Engine needs to perform.

| Field | Type | Description |
|-------|------|-------------|
| `startFromSnapshot` | `string \| null` | Snapshot asset filename to load as initial state, or null for current segment |
| `entries` | `ReplayEntry[]` | Ordered list of entries to replay |
| `tuneTarget` | `TuneTarget \| null` | The entry being tuned and new parameter value, or null for revert operations |
| `preReplayState` | `GeoJsonFeatureCollection` | Deep clone of features before replay (for rollback) |

### ReplayEntry

A single entry in the replay plan.

| Field | Type | Description |
|-------|------|-------------|
| `activityId` | `string` | The original entry's activity ID |
| `toolId` | `string` | Tool identifier from `wasGeneratedBy.tool` |
| `toolVersion` | `string` | Expected tool version from `wasGeneratedBy.toolVersion` |
| `parameters` | `Record<string, unknown>` | Parameter values to use (unwrapped from ParameterValue) |
| `featureIds` | `string[]` | Feature IDs from `used` field |
| `isTuneTarget` | `boolean` | Whether this is the entry being tuned (uses new params) |

### TuneTarget

Describes the parameter being tuned.

| Field | Type | Description |
|-------|------|-------------|
| `activityId` | `string` | The activity ID of the entry being tuned |
| `parameter` | `string` | The parameter name being changed |
| `previousValue` | `unknown` | The current/original value |
| `newValue` | `unknown` | The analyst's desired new value |

### ReplayResult

Outcome of a replay operation.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `'completed' \| 'halted' \| 'cancelled'` | Final status |
| `entriesReplayed` | `number` | Count of entries successfully replayed |
| `totalEntries` | `number` | Total entries in the plan |
| `haltReason` | `ReplayHaltReason \| null` | Why replay stopped (if halted) |
| `tuneAnnotation` | `TuneAnnotation \| null` | The annotation applied (if tuning) |
| `artifactsCreated` | `ArtifactVersion[]` | New artifact versions produced |

### ReplayHaltReason

Why replay stopped before completing.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'version-mismatch' \| 'dependency-missing' \| 'execution-error'` | Error category |
| `entryActivityId` | `string` | Which entry caused the halt |
| `toolId` | `string` | Which tool was involved |
| `message` | `string` | Human-readable explanation |
| `details` | `VersionMismatchDetails \| DependencyDetails \| ErrorDetails` | Type-specific details |

### VersionMismatchDetails

| Field | Type | Description |
|-------|------|-------------|
| `recordedVersion` | `string` | Version in the Log entry |
| `installedVersion` | `string` | Currently installed version |

### DependencyDetails

| Field | Type | Description |
|-------|------|-------------|
| `missingFeatureId` | `string` | Feature that was expected but not found |
| `deletedByActivityId` | `string` | The activity that was reverted, removing the feature |

### ReplayProgress

Progress updates emitted during replay for UI feedback.

| Field | Type | Description |
|-------|------|-------------|
| `current` | `number` | Index of currently executing entry (0-based) |
| `total` | `number` | Total entries to replay |
| `currentToolId` | `string` | Tool being executed now |
| `phase` | `'loading-snapshot' \| 'replaying' \| 'finalising'` | Current phase |

### ArtifactVersion

A new versioned artifact created during replay.

| Field | Type | Description |
|-------|------|-------------|
| `resultId` | `string` | Stable result ID (unchanged across versions) |
| `version` | `number` | New version number |
| `path` | `string` | File path of the new artifact |
| `previousPath` | `string` | File path of the previous version |

### ParameterTypeInfo

Type information for rendering parameter editors (derived from tool definitions).

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'float' \| 'integer' \| 'duration' \| 'enum' \| 'boolean' \| 'string'` | Parameter type |
| `min` | `number \| undefined` | Minimum value (numeric types) |
| `max` | `number \| undefined` | Maximum value (numeric types) |
| `allowedValues` | `string[] \| undefined` | Enum options |
| `pattern` | `string \| undefined` | Regex pattern (string type) |
| `label` | `string` | Human-readable parameter name |

## Extended Existing Types

### LogEntry (extended)

The existing `LogEntry` interface gains an optional `deleted` flag:

| Field | Type | Change |
|-------|------|--------|
| `deleted` | `boolean \| undefined` | NEW — `true` when soft-deleted via "Revert this" |

### LogService (updated signatures)

The existing stubs are replaced with full implementations:

| Method | Old Signature | New Signature |
|--------|---------------|---------------|
| `tuneEntry` | `(activityId, parameter, newValue) => Promise<void>` | `(storePath, itemPath, activityId, parameter, newValue) => Promise<ReplayResult>` |
| `revertTo` | `(activityId) => Promise<void>` | `(storePath, itemPath, activityId) => Promise<void>` |
| `revertThis` | `(activityId) => Promise<void>` | `(storePath, itemPath, activityId) => Promise<ReplayResult>` |

Note: The signatures gain `storePath` and `itemPath` for consistency with `recordToolResult` and `getTimeline`. Return types change from `void` to `ReplayResult` for tune and revert-this (which involve replay).

### assembleTimeline (extended options)

| Option | Type | Description |
|--------|------|-------------|
| `includeDeleted` | `boolean` | If true, include soft-deleted entries (for Log Panel display). Default: false. |

## State Transitions

### LogEntry Lifecycle

```
                    ┌─────────────┐
                    │   Created   │  recordToolResult()
                    │ (tune=null) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌────────────┐ ┌─────────┐ ┌──────────┐
       │   Tuned    │ │ Soft-   │ │ Permanently│
       │ (tune≠null)│ │ Deleted │ │  Removed   │
       │            │ │(deleted)│ │ (truncated)│
       └──────┬─────┘ └────┬────┘ └──────────┘
              │             │
              │             ▼
              │      ┌────────────┐
              │      │  Restored  │  analyst clicks "Restore"
              │      │(deleted=   │
              │      │ undefined) │
              │      └────────────┘
              │
              ▼
       ┌────────────┐
       │ Re-tuned   │  tune field overwritten with latest
       │(tune=new)  │
       └────────────┘
```

### Replay Operation Lifecycle

```
┌──────────┐     plan()     ┌───────────┐    execute()   ┌────────────┐
│  Idle    │ ──────────── ▶│ Planning  │ ─────────── ▶ │ Replaying  │
│          │               │(validating)│               │ (progress) │
└──────────┘               └─────┬──────┘               └─────┬──────┘
                                 │                             │
                           validation                    ┌─────┼─────┐
                           failure                       │     │     │
                                 │                       ▼     ▼     ▼
                                 ▼                 completed halted cancelled
                          ┌──────────┐                         │     │
                          │  Error   │                         ▼     ▼
                          │(rejected)│                    ┌──────────────┐
                          └──────────┘                    │  Rollback    │
                                                         │(restore pre- │
                                                         │ replay state)│
                                                         └──────────────┘
```

## Validation Rules

| Parameter Type | Validation | Error Message |
|----------------|------------|---------------|
| `float` | Must be a finite number; within min/max if defined | "Value must be a number between {min} and {max}" |
| `integer` | Must be an integer; within min/max if defined | "Value must be a whole number between {min} and {max}" |
| `duration` | Must be valid ISO 8601 duration (e.g., `PT60S`) | "Value must be a valid duration (e.g., PT30S, PT1M)" |
| `enum` | Must be one of `allowedValues` | "Value must be one of: {values}" |
| `boolean` | Must be `true` or `false` | "Value must be true or false" |
| `string` | Must match `pattern` if defined; non-empty | "Value does not match required format" |
