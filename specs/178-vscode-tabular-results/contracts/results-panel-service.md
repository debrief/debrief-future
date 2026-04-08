# Contract: ResultsPanelService (extension host)

**Feature**: 178-vscode-tabular-results
**Location**: `apps/vscode/src/services/resultsPanelService.ts` (NEW)

This is the singleton coordinator that owns the in-memory tab list, routes tool outputs into the Results panel, and handles save / retry / close on behalf of the webview. It is the **single source of truth** (R5).

---

## Public interface

```ts
export interface ResultsPanelServiceDeps {
  stacService: StacService;
  logService: LogService;
  calcService: CalcService;
  panelView: ResultsPanelViewProvider;        // for webview postMessage
  activityPanelView: ActivityPanelViewProvider; // for AssociatedFiles dropdown refresh
  sessionManager: SessionManager;             // for plot lifecycle
}

export class ResultsPanelService {
  constructor(deps: ResultsPanelServiceDeps);

  /**
   * Called by executeTool.ts after a successful tool run.
   * Extracts datasets from result.features and creates one tab per envelope.
   * If no datasets present, this is a no-op.
   */
  addDatasetsForToolResult(args: {
    plotKey: PlotKey;
    toolId: string;
    result: ToolResult;                       // shape from CalcService
    sourceFeatureIds: string[];
    parameters?: Record<string, unknown>;
    parentActivityId: string;                 // from logService.recordToolResult
  }): void;

  /**
   * Called by executeTool.ts when a tool run fails.
   * Creates an error tab so the user can retry.
   */
  addErrorTab(args: {
    plotKey: PlotKey;
    toolId: string;
    errorMessage: string;
    sourceFeatureIds: string[];
    parameters?: Record<string, unknown>;
  }): void;

  /**
   * Called by the Open action on the LayersToolbar AssociatedFiles dropdown.
   * Reads the saved CSV, parses it back into a DatasetEnvelope, and creates a saved tab.
   */
  openSavedFile(args: { plotKey: PlotKey; assetFilename: string }): Promise<void>;

  /** Webview message handlers (wired by ResultsPanelViewProvider). */
  handleSave(tabId: string): Promise<void>;
  handleSaveAs(tabId: string, baseName: string, tag?: string): Promise<void>;
  handleRetry(tabId: string): Promise<void>;
  handleCloseTab(tabId: string): void;

  /** Lifecycle. */
  dispose(): void;
}
```

---

## Behavioural contract

### `addDatasetsForToolResult`

Pseudo-code:

```text
1. Initialise `datasets: DatasetEnvelope[] = []`.
2. For each feature in result.features:
     props := feature.properties ?? {}
     if Array.isArray(props.__datasets):
        datasets.push(...props.__datasets)
     else if props.statistics is object:
        ds := synthesizeTableDataset(toolId, props, sourceLabelFromIds(sourceFeatureIds))
        if ds: datasets.push(ds)
3. If datasets.length === 0: return (no panel for this tool result).
4. For each envelope:
     tab := { id: ulid(), toolId, plotKey, envelope, sourceFeatureIds, parameters,
              parentActivityId, state: { kind: 'unsaved' }, createdAt: Date.now() }
     this._tabs.push(tab)
5. If !this._panelVisible:
     postMessage(results:setVisibility, { visible: true })
     this._panelVisible = true
     // VS Code automatically focuses the new view
6. postMessage(results:setTabs, { tabs: this._toChartTabData(), activeTabId: lastTab.id })
```

### `handleSave` / `handleSaveAs`

Pseudo-code (FR-008–FR-012, FR-008-step list from spec):

```text
1. tab := find(tabId); if !tab or tab.state.kind === 'saved': return.
2. csv := buildCsvContent(tab.envelope.data)
3. filename := generateCsvFilename(tab.toolId, baseName?, tag?)
4. assetUri := <storePath>/<itemDir>/assets/<filename>
5. try:
     await vscode.workspace.fs.writeFile(assetUri, encode(csv))
6. catch (writeErr):
     setTabError(tab, writeErr.message); return.
7. try:
     await stacService.addResultAsset(plotKey.storePath, plotKey.itemPath, filename,
                                      csv, 'text/csv',
                                      { 'debrief:toolId': tab.toolId,
                                        'debrief:sourceFeatures': tab.sourceFeatureIds,
                                        'debrief:parentActivityId': tab.parentActivityId })
8. catch (stacErr):
     await vscode.workspace.fs.delete(assetUri)        // FR-011 no partial state
     setTabError(tab, stacErr.message); return.
9. saved := await logService.recordFileSaved(plotKey.storePath, plotKey.itemPath,
                                             tab.parentActivityId,
                                             `assets/${filename}`,
                                             new Date().toISOString())
10. tab.state := { kind: 'saved', filename, savedActivityId: saved.activity_id }
11. activityPanelView.addResultFile(tab.envelope.title ?? tab.toolId, `assets/${filename}`)
12. postMessage(results:setTabs, { tabs: this._toChartTabData(), activeTabId: tab.id })
```

### `handleRetry`

Pseudo-code (FR-019–FR-020):

```text
1. tab := find(tabId); if !tab: return.
2. postMessage(results:setLoading, { tabId, isLoading: true })
3. try:
     result := await calcService.executeTool({ toolId: tab.toolId,
                                               featureIds: tab.sourceFeatureIds,
                                               params: tab.parameters })
4. catch (err):
     tab.state := { kind: 'error', message: err.message }
     postMessage(results:setTabs, ...); return.
5. If !result.success:
     tab.state := { kind: 'error', message: result.error }
     postMessage(results:setTabs, ...); return.
6. // Successful retry: replace tab.envelope with new dataset(s) (1:1 mapping by index)
   // and re-record provenance via the existing executeTool path.
   //
   // To avoid duplicating logic, retry actually calls the existing
   // `vscode.commands.executeCommand('debrief.executeTool', ...)` and lets
   // executeTool.ts call back into addDatasetsForToolResult on success.
   // The original failed tab is removed.
```

### `handleCloseTab`

Pseudo-code (FR-006):

```text
1. tab := find(tabId); if !tab: return.
2. this._tabs := this._tabs.filter(t => t.id !== tabId)
3. If this._tabs.length === 0:
     postMessage(results:setVisibility, { visible: false })
     this._panelVisible := false
4. postMessage(results:setTabs, ...)
```

### Plot close (subscribed to `SessionManager.onActiveSessionChange`)

Pseudo-code (FR-021):

```text
On plot close (closingPlotKey):
  1. orphanIds := this._tabs.filter(t => t.plotKey === closingPlotKey
                                     && t.state.kind === 'unsaved')
                            .map(t => t.parentActivityId)
  2. For each id in orphanIds:
       await logService.deleteEntry(closingPlotKey.storePath,
                                    closingPlotKey.itemPath, id)
  3. this._tabs := this._tabs.filter(t => t.plotKey !== closingPlotKey)
  4. postMessage(results:setTabs, ...) for the new active plot (if any)
```

---

## Test contract

| Test | What it verifies | Spec ref |
|------|------------------|----------|
| `addDatasetsForToolResult` adds tabs for `__datasets` | Multiple chart tabs created | FR-002 |
| `addDatasetsForToolResult` synthesises from `statistics` | One table tab created | FR-003 |
| First tab triggers `results:setVisibility { visible: true }` | Panel hidden until first result | FR-004 |
| `handleSave` writes CSV, registers asset, records FileSavedEvent | Provenance link present | FR-009 |
| `handleSave` STAC failure deletes the file | No partial state | FR-011 |
| `handleSave` updates `ActivityPanelViewProvider._resultFiles` | Dropdown refresh | FR-013, FR-014 |
| Plot close deletes orphan ToolRunEvent entries | Cleanup | FR-021 |
| `openSavedFile` parses CSV and adds saved tab | FR-015 | FR-015 |

All listed tests are vitest unit tests against `ResultsPanelService` with mocked deps. End-to-end coverage is in the Playwright suite (R9).
