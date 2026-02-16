# Data Model: Results Bottom Panel

**Feature**: 095-results-bottom-panel
**Date**: 2026-02-14

## Entities

### ResultTab

Represents a single open tab in the results panel. Managed by the extension host.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique tab identifier: `${plotItemPath}::${resultFilePath}` |
| `plotItemPath` | `string` | STAC item path for the source plot (e.g., `exercise-alpha/items/plot-001/item.json`) |
| `plotTitle` | `string` | Human-readable plot name for disambiguation |
| `resultFilePath` | `string` | Relative path to the result file within the STAC item's assets directory |
| `absolutePath` | `string` | Absolute filesystem path to the result file |
| `title` | `string` | Display title for the tab (from DatasetEnvelope.title, or filename fallback) |
| `artifactType` | `ResultArtifactType` | Content type category: `'dataset'`, `'image'`, or `'other'` |
| `mimeType` | `string` | MIME type from STAC asset metadata (e.g., `application/json`, `image/png`) |
| `isActive` | `boolean` | Whether this tab is currently selected |

### ResultArtifactType

Discriminated union for content routing.

| Value | Condition | Renderer |
|-------|-----------|----------|
| `'dataset'` | JSON file that successfully parses as `DatasetEnvelope` | `ChartRenderer` via `transformDataset()` |
| `'image'` | MIME type starts with `image/` | `ImageViewer` (inline `<img>`) |
| `'other'` | Everything else | `FallbackViewer` (filename + type + size summary) |

### TabContentPayload

Data sent from extension host to webview for rendering a tab's content. Discriminated by `artifactType`.

| Variant | Fields | Description |
|---------|--------|-------------|
| Dataset | `{ artifactType: 'dataset', spec: TopLevelSpec \| null, error?: string }` | Vega-Lite spec from transformer, or null with error message |
| Image | `{ artifactType: 'image', dataUri: string }` | Base64-encoded data URI for inline display |
| Other | `{ artifactType: 'other', filename: string, mimeType: string, sizeBytes: number }` | Metadata for fallback summary |

### TabState (extension host)

In-memory state maintained by `ResultsPanelViewProvider`. Session-scoped — lost on VS Code restart.

| Field | Type | Description |
|-------|------|-------------|
| `tabs` | `Map<string, ResultTab>` | Open tabs keyed by tab ID |
| `activeTabId` | `string \| null` | Currently active tab, or null if empty |
| `tabOrder` | `string[]` | Ordered list of tab IDs for rendering the tab bar |
| `watchers` | `Map<string, Disposable>` | File watchers keyed by tab ID |

## Relationships

```
TabState (1) ──── manages ──── (*) ResultTab
ResultTab (1) ──── displays ──── (1) TabContentPayload
ResultTab (1) ──── watches ──── (1) FileSystemWatcher
ResultTab (*) ──── belongs to ──── (1) Plot (STAC Item)
```

## State Transitions

### Tab Lifecycle

```
[No Tab] ──open──→ [Created + Loading] ──content ready──→ [Active + Rendered]
                                                               │
                         ┌──────────────────────────────────────┘
                         │
                    [Active + Rendered] ──file changed──→ [Active + Reloading] ──content ready──→ [Active + Rendered]
                         │
                    [Active + Rendered] ──switch tab──→ [Inactive + Cached]
                         │
                    [Active + Rendered] ──close──→ [Disposed] ──→ [No Tab]
```

### Panel Lifecycle

```
[Hidden] ──show command / auto-open──→ [Visible + Empty]
[Visible + Empty] ──open result──→ [Visible + Tabs]
[Visible + Tabs] ──close last tab──→ [Visible + Empty]
[Visible + Tabs] ──hide panel──→ [Hidden] (tabs preserved in extension host)
```

## Validation Rules

1. **Tab ID uniqueness**: No two tabs may share the same `id` (plotItemPath + resultFilePath). Opening a duplicate activates the existing tab.
2. **Active tab consistency**: Exactly one tab is active when `tabs.size > 0`. When the active tab is closed, the nearest tab (prefer right, then left) becomes active.
3. **Tab order integrity**: `tabOrder` contains exactly the keys present in `tabs`, in insertion order.
4. **Watcher lifecycle**: Every entry in `watchers` corresponds to an entry in `tabs`. Closing a tab disposes its watcher.
