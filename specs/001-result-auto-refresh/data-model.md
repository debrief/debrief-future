# Data Model: Result View Auto-Refresh

**Feature**: 089 (001-result-auto-refresh) | **Date**: 2026-02-17

## Entities

### AutoRefreshState

Per-view state managed by the auto-refresh controller.

| Field | Type | Description |
|-------|------|-------------|
| `resultId` | `string` | The logical result ID this view is bound to |
| `viewId` | `string` | Unique identifier for the view instance |
| `paused` | `boolean` | Whether auto-refresh is paused for this view |
| `stale` | `boolean` | Whether data has changed while the view was not visible or paused |
| `visible` | `boolean` | Whether the view is currently visible to the user |
| `lastRefreshTimestamp` | `number \| null` | Epoch timestamp of the last successful refresh |
| `pendingEvent` | `ResultIdChangeEvent \| null` | The most recent unprocessed change event (when paused or not visible) |
| `status` | `'active' \| 'paused' \| 'error' \| 'unavailable'` | Current auto-refresh status |
| `errorMessage` | `string \| null` | Description of the error if status is `'error'` or `'unavailable'` |

### ViewportState

Captured viewport state for preservation across refreshes.

| Field | Type | Description |
|-------|------|-------------|
| `signals` | `Record<string, unknown>` | Named Vega signals representing interactive state (domain ranges, selections) |
| `capturedAt` | `number` | Epoch timestamp when the viewport was captured |

### RefreshEvent (Provenance)

Provenance record for each refresh cycle, logged via LogService.

| Field | Type | Description |
|-------|------|-------------|
| `operation` | `'result:refresh'` | Operation type constant |
| `resultId` | `string` | Logical result ID that triggered the refresh |
| `previousPath` | `string \| null` | Previous file path (null if first render) |
| `newPath` | `string` | New file path after the change |
| `previousVersion` | `number \| null` | Previous version number |
| `newVersion` | `number \| null` | New version number |
| `viewportPreserved` | `boolean` | Whether viewport state was successfully preserved |
| `timestamp` | `number` | When the refresh occurred |

## Relationships

```
ResultIdRegistry (existing #087)
  │
  │ emits ResultIdChangeEvent
  ▼
AutoRefreshController (new)
  │
  │ manages 1..* AutoRefreshState (one per open view)
  │
  │ captures/restores ViewportState
  │
  │ logs RefreshEvent via LogService
  ▼
Result Views (existing: ChartPanelWrapper, future: Custom Editor)
```

## State Transitions

### AutoRefreshState Status

```
                 ┌──────────┐
    subscribe    │  active   │◄──── initial state (on view open)
    ┌───────────►│          │
    │            └──┬───┬───┘
    │               │   │
    │   user pauses │   │ registry error
    │               ▼   ▼
    │         ┌────────┐  ┌─────────────┐
    │         │ paused │  │ unavailable │
    │         └───┬────┘  └──────┬──────┘
    │             │              │
    │  user resumes  registry recovers
    │             │              │
    │             ▼              │
    │       (flush pending) ────┘
    │             │
    └─────────────┘
```

### Stale Flag Lifecycle

```
1. View visible, data changes → immediate refresh (stale stays false)
2. View hidden, data changes → stale = true, no refresh
3. View becomes visible, stale = true → trigger refresh, stale = false
4. View paused, data changes → pendingEvent updated, stale stays as-is
5. View resumed → flush pendingEvent, trigger refresh if needed
```

## Existing Types Consumed (No Modifications)

These types from #087 are consumed as-is:

- `ResultIdMapping` — resolved mapping from logical ID to file path
- `ResultIdChangeEvent` — change notification with previous/new paths
- `ResultIdChangeCallback` — callback signature for subscriptions
- `ResultIdRegistry` — the registry interface with subscribe/subscribeAll

These types from #085 are consumed as-is:

- `DatasetEnvelope` — standard result dataset schema
- `TransformResult` — transformer output (ok/error discriminated union)
- `ChartRendererProps` — React component props

## Validation Rules

- `resultId` must be a non-empty string matching an existing registry entry
- `viewId` must be unique across all active auto-refresh states
- `pendingEvent` is only set when `paused = true` or `visible = false`
- `stale` is only `true` when `visible = false` and an event was received
- `errorMessage` is only non-null when `status` is `'error'` or `'unavailable'`
