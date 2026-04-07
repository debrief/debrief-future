# SRD: Tabular Results Panel — VS Code Extension Integration

**Document**: Software Requirements Definition
**Scope**: Bring the Tabular Results Panel (#177) feature into the VS Code extension
**Related work**: Feature 177 (web-shell implementation), `docs/tabular-results-panel-srd.md` (original spec)
**Status**: Proposed
**Date**: 2026-04-07

---

## 1. Background

Feature 177 added a **Tabular Results Panel** to the **web-shell** (`apps/web-shell`). It displays `debrief-calc` tool outputs as either tables (flat statistics) or charts (Vega-Lite time-series), with Save / Save As / file actions, all rendered in a GoldenLayout panel beneath the map.

The same feature does **not** exist in the **VS Code extension** (`apps/vscode`). When an analyst runs a tool from the VS Code extension today:

1. The tool executes via Python MCP and returns GeoJSON features
2. `executeTool.ts` adds them as map layers via `MapPanel.addResultLayer()`
3. Results are persisted to STAC assets
4. **No tabular display, no Results panel, no Save UI**

This SRD specifies the work required to bring feature parity to the VS Code extension.

---

## 2. Architectural Differences vs the Web-Shell

The VS Code extension and the web-shell have very different webview architectures. Understanding this is essential to scoping the work.

| Concern | Web-Shell | VS Code Extension |
|---------|-----------|-------------------|
| Panel container | GoldenLayout in a single React app | Multiple `WebviewViewProvider` instances (one per sidebar/panel) |
| Map display | `MapPanel` inside GoldenLayout | Standalone webview (`mapPanel.ts` + `webview/web/index.html`) |
| Activity sidebar | `ActivityPanelWrapper` inside GoldenLayout | `ActivityPanelViewProvider` (separate webview) |
| Log panel | `LogPanelWrapper` inside GoldenLayout | `LogPanelViewProvider` (separate webview) |
| Tool execution | Mock `calcService` in-process | `calcService` → Python MCP server |
| State sharing | Single React tree, shared `PanelContext` | Cross-webview message passing via extension host |
| Result display | `ChartPanelWrapper` inside GoldenLayout | **does not exist** |

**Key implication**: Adding the Results panel to VS Code is *not* a matter of dropping the existing `ChartPanelWrapper` into the existing webview. The map webview is a single-purpose Leaflet view; the Results panel must be a **new webview** alongside it, communicating with the extension host like the other panels.

---

## 3. Existing Building Blocks (Already Available)

The following pieces already exist in the codebase and can be reused unchanged:

### 3.1 Shared components (`shared/components`)
- `ChartPanelWrapper` (Vega-Lite + table dispatch + Save UI + tabs)
- `TableRenderer` (HTML table for flat statistics)
- `ChartRenderer` (Vega-Lite wrapper)
- `DatasetEnvelope` type with `displayHint: 'table' | 'chart'`
- `ChartContextProps` interface (Save / SaveAs / Retry callbacks, tabs)
- `LayersToolbar` `AssociatedFilesDropdown` (Open / Open With / Reveal / Delete)

### 3.2 Shared utilities (`shared/utils`)
- `buildCsvContent` — flat data → CSV string
- `generateCsvFilename` — toolName + baseName + tag → safe filename
- `sanitizeFilename`, `formatCsvValue`

### 3.3 VS Code services (`apps/vscode/src/services`)
- `stacService.addResultAsset()` — write file + register STAC asset + log provenance
- `stacService.getResultFilesFromItem()` — list result assets for the LayersToolbar dropdown
- `stacService.assetToAssociatedFile()` — convert STAC asset → `AssociatedFile`
- `logService.recordToolResult()` — write a `LogEntry` for provenance

### 3.4 Tool result data path (Python MCP)
- `track-stats` and `area-summary` Python tools return `properties.statistics`
- `range-bearing` returns `properties.__datasets` (array of `DatasetEnvelope`)

These already produce the right shape — the missing piece is the consumer.

---

## 4. Objectives

1. **Display** tabular tool results in a dedicated panel beneath the map in the VS Code extension, matching FR-001 to FR-004 of the original spec
2. **Save** tool results as CSV files in the plot's assets folder, registered as STAC assets and linked to provenance
3. **Surface** saved results in the existing LayersToolbar Associated Files dropdown
4. **Wire** the file actions (Open / Open With / Reveal in Explorer) to do meaningful things
5. **Reuse** the shared `ChartPanelWrapper` and `TableRenderer` components — do not fork them

---

## 5. Functional Requirements

### 5.1 Result display (P1)

**FR-VS-001**: When a tool returns a result with `properties.__datasets`, the extension MUST extract each `DatasetEnvelope` and route it to the Results panel as a tab.

**FR-VS-002**: When a tool returns a result with `properties.statistics` but no `__datasets`, the extension MUST synthesize a `DatasetEnvelope` with `displayHint: 'table'` from the statistics object (matching the web-shell's `calcService.ts` behaviour).

**FR-VS-003**: The Results panel MUST appear as a VS Code webview beneath the map. Initial layout MUST allocate roughly 70% to the map and 30% to results, when a result is displayed for the first time in the session.

**FR-VS-004**: The Results panel MUST be hidden until the first result arrives in the session (no empty placeholder).

**FR-VS-005**: When multiple result tabs are open, the user MUST be able to switch between them via the tab bar and close individual tabs.

**FR-VS-006**: Tabs MUST display an unsaved indicator (dot) until the result is saved.

### 5.2 Save / Save As (P1)

**FR-VS-007**: Each result tab MUST expose Save and Save As buttons. The Save button MUST be disabled once the tab is saved.

**FR-VS-008**: Clicking Save MUST:
1. Build a CSV from the dataset using `buildCsvContent`
2. Generate a date-stamped filename using `generateCsvFilename`
3. Write the file to the plot's `assets/` directory via `vscode.workspace.fs`
4. Register the file as a STAC asset via `stacService.addResultAsset()`
5. Record a `FileSavedEvent` in the provenance log linked to the originating `ToolRunEvent`
6. Mark the tab as saved (clear unsaved indicator, disable Save button)

**FR-VS-009**: Clicking Save As MUST present an inline form (matching the web-shell) with base name + optional tag fields, sanitise inputs, and otherwise behave identically to Save.

**FR-VS-010**: If STAC asset registration fails after the file is written, the file MUST be deleted and an error MUST be shown (no partial state — matches FR-007 of the original spec).

### 5.3 LayersToolbar dropdown (P2)

**FR-VS-011**: Saved CSV files MUST appear in the existing LayersToolbar Associated Files dropdown under the **Results** section. The list MUST be derived from the STAC item's assets via `stacService.getResultFilesFromItem()`.

**FR-VS-012**: The list MUST refresh automatically after a save (no manual reload).

### 5.4 File actions (P2)

**FR-VS-013**: Clicking **Open** on a saved result file MUST load the CSV into the Results panel as a new tab, parsing the CSV back into a flat dataset.

**FR-VS-014**: Clicking **Reveal in Explorer** MUST open VS Code's built-in Explorer view, expand to the asset folder, and select the file (using `vscode.commands.executeCommand('revealInExplorer', uri)`).

**FR-VS-015**: Clicking **Open With** MUST invoke `vscode.commands.executeCommand('explorer.openWith', uri)` to surface VS Code's editor picker.

**FR-VS-016**: Clicking **Delete** on a result file MUST prompt for confirmation, then unregister the STAC asset and delete the file from disk.

### 5.5 Error / Retry (P3)

**FR-VS-017**: When a tool execution fails, the corresponding tab MUST display the error message and a Retry button. No provenance record MUST be created for the failed run.

**FR-VS-018**: Clicking Retry MUST re-invoke the tool with the same parameters and selection.

### 5.6 Multiple tool types (P3)

**FR-VS-019**: Up to two distinct tool-type panels MUST be supported side by side. Additional tool types open as tabs in the rightmost panel (matching FR-011 of the original spec). *(Optional — see §10 Open Questions.)*

---

## 6. Non-Functional Requirements

- **NFR-1**: All shared component code (`ChartPanelWrapper`, `TableRenderer`, CSV utilities) MUST be reused unchanged. No copy-paste or forks.
- **NFR-2**: All user-facing strings MUST be externalisable for i18n (matching FR-018 of original spec).
- **NFR-3**: All interactive elements MUST have accessibility attributes (aria-labels, roles, table semantics) — already provided by shared components.
- **NFR-4**: The Results panel webview MUST follow the same CSP and bundling pattern as the existing `mapPanel.ts` webview (esbuild → single bundle, CSP `default-src 'none'`).
- **NFR-5**: Coverage by Playwright E2E tests in the existing `tests/e2e/` suite (the VS Code real-webview tests, not web-shell tests).

---

## 7. Architecture

### 7.1 New webview: `resultsPanelView.ts`

A new `WebviewViewProvider` (or full `WebviewPanel` if appropriate) that:
- Bundles a small React app containing only `ChartPanelWrapper` + `PanelContext`
- Receives `addResultDataset`, `removeResultDataset`, `markResultSaved`, `markResultError` messages from the extension host
- Sends `saveResult`, `saveResultAs`, `retryResult`, `closeResult` messages back

Pattern reference: `apps/vscode/src/views/activityPanelView.ts`.

### 7.2 New extension host coordinator: `resultsPanelService.ts`

Service responsible for:
- Maintaining the in-memory list of active result tabs (per plot)
- Routing tool execution outputs from `executeTool.ts` to the Results panel
- Handling save requests: CSV build → write → STAC register → provenance record
- Handling retry requests: re-invoke `calcService.executeTool` with the original args
- Cleaning up unsaved tabs on plot close (matching FR-012 of original spec)

### 7.3 Modifications to `executeTool.ts`

After `calcService.executeTool` returns, in addition to `panel.addResultLayer`:

```ts
// Extract datasets from result features
const datasets: DatasetEnvelope[] = [];
for (const feature of result.features ?? []) {
  const props = feature.properties ?? {};
  if (Array.isArray(props.__datasets)) {
    datasets.push(...props.__datasets);
  } else if (props.statistics && typeof props.statistics === 'object') {
    datasets.push(synthesizeTableDataset(props));
  }
}
if (datasets.length > 0) {
  resultsPanelService.addDatasets(toolId, datasets, {
    activityId: logEntry.activity_id,
    sourceFeatureIds: selectedFeatureIds,
    parameters: toolParams,
  });
}
```

The `synthesizeTableDataset` helper should be **extracted from the web-shell `calcService.ts`** into a shared utility (`shared/utils/src/datasetSynthesis.ts`) so both consumers use the same logic.

### 7.4 Modifications to `activityPanelView.ts`

- Inject `resultFiles` into the Activity panel props by calling `stacService.getResultFilesFromItem(currentItem)`
- Refresh the list when notified by `resultsPanelService` after a save
- Handle the existing `file:action` `ActivityPanelMessage` (already wired by feature 177) by routing to the new file action handlers in the extension host

### 7.5 New message types

In `apps/vscode/src/webview/messages.ts`, add:

**Extension → Webview** (for the new Results panel webview):
- `addResultDataset`
- `removeResultDataset`
- `markResultSaved`
- `markResultError`

**Webview → Extension** (from the new Results panel webview):
- `saveResult` `{ tabId, baseName?, tag? }`
- `retryResult` `{ tabId }`
- `closeResult` `{ tabId }`

These are independent of the existing map webview message protocol.

### 7.6 Provenance integration

Saving a result MUST:
1. Look up the originating `ToolRunEvent` (`LogEntry.activity_id`) recorded by `executeTool.ts`
2. Create a `FileSavedEvent` referencing that activity_id, the saved filename, and the timestamp
3. Append it to the analysis log via `logService.recordFileSaved` (new method to add)

This enables the cleanup-on-plot-close behaviour from FR-012 of the original spec: tool runs without a corresponding `FileSavedEvent` get deleted.

---

## 8. Out of Scope

- **GoldenLayout in VS Code** — the web-shell uses GoldenLayout for dynamic panel arrangement. The VS Code extension uses VS Code's native panel system (`WebviewViewProvider`). This SRD does **not** propose introducing GoldenLayout to VS Code.
- **Multi-panel side-by-side layout (P3)** — the spec calls for up to two distinct tool-type panels side by side. In VS Code's native panel system this would mean multiple sibling webview views, which adds significant complexity. Defer to a follow-up task unless trivially achievable.
- **Filter / search within tables** — not in the original spec; not in scope here.
- **CSV reading for the Open action** — could initially open the file in VS Code's text editor instead of parsing it back into the Results panel. Decision deferred (see §10).

---

## 9. Acceptance Criteria

The feature is complete when:

1. Running `track-stats` (or any tool with `properties.statistics`) in the VS Code extension shows a table in a Results panel beneath the map.
2. Running `range-bearing` shows two chart tabs (Range / Bearing) in the Results panel.
3. Each result tab displays an unsaved indicator and a Save / Save As button.
4. Clicking Save writes a CSV to `assets/`, registers it as a STAC asset, records a `FileSavedEvent`, and clears the unsaved indicator.
5. The saved CSV appears in the LayersToolbar Associated Files dropdown under "Results" without manual refresh.
6. Clicking Open in the dropdown either reopens the result or opens the CSV in VS Code's text editor (whichever is decided in §10).
7. Clicking Reveal in Explorer reveals the file in VS Code's Explorer.
8. Clicking Open With shows VS Code's editor picker.
9. Closing a plot with unsaved results deletes the corresponding `ToolRunEvent` records from provenance.
10. Playwright E2E tests in `tests/e2e/` cover steps 1, 4, 5, 6, 7 against a real VS Code webview, mirroring the web-shell tests in `apps/web-shell/playwright/tests/result-file-actions.spec.ts` and `tabular-results-save.spec.ts`.

---

## 10. Open Questions

1. **Open action behaviour**: Should clicking Open in the LayersToolbar dropdown for a saved CSV (a) reopen it as a tab in the Results panel (parsing the CSV back into rows), or (b) open the file in VS Code's built-in text/CSV editor? Option (b) is simpler and gives better tooling but breaks the symmetry with the web-shell.
2. **Multi-panel support (FR-VS-019)**: Worth doing in this task or deferred? VS Code's native sidebar/panel system doesn't support arbitrary side-by-side layouts the way GoldenLayout does.
3. **Results panel placement**: Should the Results panel be a `WebviewView` in the VS Code panel area (next to Terminal/Output), or a separate editor-area webview alongside the map? The first feels more natural; the second matches the web-shell's spatial layout.
4. **Webview bundling**: Reuse the existing `apps/vscode/src/webview/web/` bundle pipeline, or create a new one for the Results panel?
5. **Cross-webview state**: How does the Results panel know about plot lifecycle (open/close)? Either subscribe to a shared event bus in the extension host or be told by the host directly. The latter is simpler.

These should be resolved during `/speckit.clarify` before planning.

---

## 11. Estimated Complexity

**High**. The work is mostly *integration* rather than novel design — the shared components, CSV utilities, STAC asset registration, and provenance services all exist. The complexity comes from:

- Setting up a brand-new VS Code webview view (boilerplate, bundling, CSP, message protocol)
- Cross-webview coordination (extension host as the source of truth)
- Provenance integration with existing `logService`
- Real-webview Playwright tests (slower and more fragile than web-shell tests)

Estimated phases:
1. Setup: new webview view + bundle + message protocol skeleton
2. Foundation: `resultsPanelService` + `executeTool.ts` integration + `synthesizeTableDataset` utility extraction
3. User Story 1: result display (FR-VS-001 to FR-VS-006)
4. User Story 2: save flow (FR-VS-007 to FR-VS-010)
5. User Story 3: LayersToolbar dropdown integration (FR-VS-011, FR-VS-012)
6. User Story 4: file actions (FR-VS-013 to FR-VS-016)
7. User Story 5: error / retry (FR-VS-017, FR-VS-018)
8. Polish: i18n, accessibility audit, evidence collection
9. E2E tests in `tests/e2e/`

---

## 12. Related Documents

- `docs/tabular-results-panel-srd.md` — original feature spec (analyst-facing requirements)
- `specs/177-tabular-results-panel/spec.md` — feature 177 spec
- `specs/177-tabular-results-panel/plan.md` — feature 177 implementation plan (web-shell)
- `apps/web-shell/playwright/tests/tabular-results-save.spec.ts` — web-shell save flow E2E tests (template for VS Code tests)
- `apps/web-shell/playwright/tests/result-file-actions.spec.ts` — web-shell file action E2E tests (template)
