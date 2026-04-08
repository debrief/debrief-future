# Integration Flow — Tabular Results Panel (VS Code)

**Feature**: 178-vscode-tabular-results
**Captured at**: 2026-04-08

This document traces the end-to-end save flow that ties the new VS Code
Results panel to the existing STAC catalog, provenance log, and Associated
Files dropdown.  It supplements the `sequence.mermaid` diagram.

## Participants

| Name | Source file | Role |
|------|-------------|------|
| User | VS Code UI | Clicks Save on an unsaved Results tab |
| `ResultsPanelApp` (webview) | `apps/vscode/src/webview/web/resultsPanel.tsx` | Stateless React renderer; dispatches `results:save` messages |
| `ResultsPanelViewProvider` | `apps/vscode/src/views/resultsPanelView.ts` | Hosts the webview; routes inbound messages to the service |
| `ResultsPanelService` | `apps/vscode/src/services/resultsPanelService.ts` | Singleton coordinator (R5); owns in-memory tab list |
| `StacService` | `apps/vscode/src/services/stacService.ts` | Writes the CSV + registers the STAC asset |
| `LogService` | `services/session-state/src/log/logService.ts` | Appends the `FileSavedEvent` via `recordFileSaved` |
| `ActivityPanelViewProvider` | `apps/vscode/src/views/activityPanelView.ts` | Refreshes the Associated Files dropdown |

## End-to-end save sequence

### Entry: tool completes (pre-save)

1. `createExecuteToolCommand` runs a tool via `CalcService.executeTool(...)`.
2. On success, `LogService.recordToolResult(...)` is called, producing a
   `ToolRunEvent` LogEntry with a new `activity_id` (`parentActivityId`).
3. `executeTool.ts` then invokes
   `resultsPanelService.addDatasetsForToolResult({ plotKey, toolId, result,
   sourceFeatureIds, parameters, parentActivityId })`.
4. The service scans `result.features` for `__datasets` or falls back to
   `synthesizeTableDataset(properties)` when only `properties.statistics` is
   present.
5. One `ResultTab` is pushed per envelope, each in `{ kind: 'unsaved' }`.
6. The service posts `results:setVisibility { visible: true }` (first time
   only) and `results:setTabs { tabs, activeTabId }` to the webview.

### Save: user clicks Save / Save As

1. The webview dispatches `results:save { tabId }` (or
   `results:saveAs { tabId, baseName, tag? }`).
2. `ResultsPanelViewProvider._handleMessage` routes it to
   `ResultsPanelService.handleSave(tabId)` or `handleSaveAs(...)`.
3. `handleSaveAs` re-sanitises `baseName` + `tag` via `sanitizeFilename`
   before delegating to `_performSave`.
4. `_performSave`:
   1. Builds CSV via `buildCsvContent(tab.envelope.data)`.
   2. Generates filename via `generateCsvFilename(toolId, baseName?, tag?)`.
   3. Calls `stacService.addResultAsset(storePath, itemPath, filename, csv,
      'text/csv', { debrief:toolId, debrief:sourceFeatures,
      debrief:parentActivityId })`.
      - **On failure** (write or STAC register): mark tab
        `{ kind: 'error', message }` and broadcast `results:setTabs`.
        **No provenance written**. **No file remains** (FR-011 — STAC
        failure would have rolled back via StacService).
   4. Calls `logService.recordFileSaved(storePath, itemPath,
      parentActivityId, `assets/${filename}`, new Date().toISOString())`.
      - Produces a new LogEntry with `was_generated_by.tool =
        'debrief.fileSave'`, `used: [parentActivityId]`, `generated:
        [filename]`.
      - Provenance is appended via the existing `appendProvenance`
        path (no new persistence code).
   5. Transitions tab to `{ kind: 'saved', filename, savedActivityId }`.
   6. Calls `activityPanelView.addResultFile(title, assets/${filename})`,
      which updates `_resultFiles` and fires
      `_sendLayersUpdate({ resultsChanged: true })` to the activity
      panel webview — the Associated Files dropdown now shows the new
      file (FR-013 / FR-014).
   7. Broadcasts `results:setTabs` so the Results panel webview
      re-renders the tab without the unsaved dot and with the Save
      button disabled.
5. A "Saved <filename>" information toast is shown.

### Post-save: user re-opens the file

1. User clicks **Open** on the Associated Files dropdown entry.
2. `ActivityPanel` dispatches `file:action { file, action: 'open' }`.
3. `ActivityPanelViewProvider._handleFileAction` extracts the `plotKey`
   (from MapPanel's `getCurrentStore` / `getCurrentPlot`) and the filename.
4. It calls `resultsPanelService.openSavedFile({ plotKey, assetFilename })`.
5. The service reads the CSV via `vscode.workspace.fs.readFile`, parses
   via `parseCsvToTableDataset`, and pushes a new tab in
   `{ kind: 'saved' }` state.
6. The tab appears in the Results panel with the parsed data.

## R5 in action (host = single source of truth)

- `ResultsPanelService` owns `_tabs` and `_panelVisible`.
- The webview is **stateless** — its React state is a cache of the last
  `results:setTabs` payload.  If VS Code disposes and re-creates the
  webview (panel collapse / expand), the service re-sends the full state
  on `results:webviewReady`.
- This means every save/retry/close mutation is atomic at the service
  layer; the webview cannot drift out of sync.

## R7 in action (provenance link)

Before save (after `recordToolResult`):
```
timeline = [
  ToolRunEvent { activity_id: 'act-1', tool: 'track-stats', ... }
]
```

After `handleSave` completes:
```
timeline = [
  ToolRunEvent  { activity_id: 'act-1', tool: 'track-stats', ... },
  FileSavedEvent{
    activity_id: 'act-2',
    was_generated_by: { tool: 'debrief.fileSave', parameters: {
      parent_activity_id: { value: 'act-1' },
      filename:           { value: 'assets/track-stats--2026-04-07.csv' }
    } },
    used:      ['act-1'],
    generated: ['assets/track-stats--2026-04-07.csv']
  }
]
```

The cleanup-on-close routine can now find orphan ToolRunEvents by walking
the timeline and identifying any ToolRunEvent whose `activity_id` is not
present in `used[0]` of any `FileSavedEvent` entry (FR-021).

## Cross-reference

- Spec: `specs/178-vscode-tabular-results/spec.md` FR-001 … FR-025
- Research: `specs/178-vscode-tabular-results/research.md` R1 (panel placement), R3 (CSV round-trip), R5 (host state of truth), R6 (synthesizer extraction), R7 (FileSavedEvent)
- Contracts: `specs/178-vscode-tabular-results/contracts/`
- Sequence diagram: `specs/178-vscode-tabular-results/evidence/sequence.mermaid`
