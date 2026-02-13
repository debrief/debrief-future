# Data Model: Logical Result ID Registry

**Feature**: 087-logical-result-id-registry
**Date**: 2026-02-13

## Entities

### ResultIdMapping

A single entry in the registry, linking a logical result ID to its current versioned file path.

| Field | Type | Description |
|-------|------|-------------|
| `resultId` | `string` | Stable logical result ID (e.g., `bt_plot_001`). Primary key. |
| `currentPath` | `string` | Current versioned file path (e.g., `./results/bt_plot_001_v2.png`). |
| `version` | `number \| null` | Current version number, if known from STAC metadata. Null when inferred from Log entries only. |
| `mimeType` | `string \| null` | MIME type of the artifact (e.g., `image/png`, `application/json`). Null if unknown. |

### ResultIdChangeEvent

Notification payload emitted when a mapping changes.

| Field | Type | Description |
|-------|------|-------------|
| `resultId` | `string` | The result ID that changed. |
| `previousPath` | `string \| null` | Previous file path (null for first registration). |
| `newPath` | `string` | New file path after the update. |
| `previousVersion` | `number \| null` | Previous version number, if known. |
| `newVersion` | `number \| null` | New version number, if known. |

### ResultIdRegistry (Service Interface)

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `resolve` | `resultId: string` | `ResultIdMapping \| undefined` | Look up the current mapping for a result ID. |
| `listAll` | — | `ResultIdMapping[]` | Return all registered mappings. |
| `registerFromLogEntry` | `entry: LogEntry` | `void` | Extract result ID from a Log entry and register/update the mapping. No-op if entry has no `generatedResultId`. |
| `registerFromRecordResult` | `result: RecordResult` | `void` | Process all entries in a RecordResult, delegating to `registerFromLogEntry` for each. |
| `registerFromReplayResult` | `artifacts: ArtifactVersion[]` | `void` | Process artifact versions from a replay result. |
| `hydrateFromAssets` | `assets: Record<string, StacAssetWithResultId>` | `void` | Scan STAC assets for `debrief:resultId` metadata and populate the registry. |
| `subscribe` | `resultId: string, callback: ChangeCallback` | `() => void` | Subscribe to changes for a specific result ID. Returns unsubscribe function. |
| `subscribeAll` | `callback: ChangeCallback` | `() => void` | Subscribe to all result ID changes. Returns unsubscribe function. |
| `clear` | — | `void` | Remove all mappings and subscriptions. Called on plot close. |
| `size` | — | `number` | Return the number of registered mappings. |

### Supporting Types

#### StacAssetWithResultId

STAC asset entry that includes Debrief result ID metadata. Only assets with both fields participate in hydration.

| Field | Type | Description |
|-------|------|-------------|
| `href` | `string` | Relative file path. |
| `type` | `string \| undefined` | MIME type. |
| `roles` | `string[] \| undefined` | Asset roles (e.g., `["result"]`). |
| `debrief:resultId` | `string \| undefined` | Logical result ID. |
| `debrief:version` | `number \| undefined` | Version number. |

#### ChangeCallback

```
(event: ResultIdChangeEvent) => void
```

## Relationships

```
LogService.recordToolResult()
    │
    ▼ returns RecordResult { entries: LogEntry[] }
    │
    ▼ LogEntry.generatedResultId + LogEntry.generated
    │
ResultIdRegistry.registerFromRecordResult()
    │
    ▼ updates internal Map<resultId, ResultIdMapping>
    │
    ▼ emits ResultIdChangeEvent
    │
    ├──► per-ID subscribers (result views)
    └──► global subscribers (activity panel, etc.)
```

```
stacService.loadItem()
    │
    ▼ returns StacItem { assets: Record<string, StacAsset> }
    │
ResultIdRegistry.hydrateFromAssets()
    │
    ▼ scans for debrief:resultId metadata
    │
    ▼ populates Map<resultId, ResultIdMapping>
    │
    (no change events emitted during hydration)
```

## State Transitions

```
                    ┌──────────┐
                    │  Empty   │ (after clear() or initialization)
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         hydrateFrom  register   register
          Assets()   FromLog()  FromRecord()
              │          │          │
              ▼          ▼          ▼
                    ┌──────────┐
                    │ Populated│ (has mappings)
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
          update     resolve()   listAll()
         (re-run)    (lookup)    (list)
              │
              ▼
         Change event
         emitted to
         subscribers
              │
              ▼
                    ┌──────────┐
                    │ Populated│ (updated mapping)
                    └────┬─────┘
                         │
                     clear()
                         │
                         ▼
                    ┌──────────┐
                    │  Empty   │
                    └──────────┘
```

## Validation Rules

- `resultId` must be a non-empty string.
- `currentPath` must be a non-empty string.
- `version`, when present, must be a positive integer.
- Duplicate `resultId` entries are not allowed — `registerFromLogEntry` updates in place.
- `hydrateFromAssets` selects the highest `debrief:version` per unique `debrief:resultId`.
- `hydrateFromAssets` does NOT emit change events (it is bulk initialization, not incremental update).
