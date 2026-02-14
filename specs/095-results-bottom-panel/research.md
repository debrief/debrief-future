# Research: Results Bottom Panel with Tabbed Layout

**Feature**: 095-results-bottom-panel
**Date**: 2026-02-14

## R1: VS Code Bottom Panel Registration

**Decision**: Use `WebviewViewProvider` registered in a `panel` view container.

**Rationale**: VS Code's `contributes.viewsContainers` supports a `"panel"` location that places views in the bottom panel area alongside Terminal, Output, and Problems. This is the same mechanism used for `WebviewViewProvider`-based views in the sidebar — the only difference is the container location. The existing `ActivityPanelViewProvider` and `LogPanelViewProvider` patterns in the codebase provide a proven implementation template.

The alternative — `createWebviewPanel()` as used by `MapPanel` and `CatalogOverviewPanel` — creates editor-area panels, not bottom panels. It also requires manual lifecycle management that `WebviewViewProvider` handles automatically.

**Alternatives considered**:
- `createWebviewPanel()` — wrong location (opens in editor area, not bottom panel); requires manual singleton management
- Custom Editor Provider — designed for file-backed editors, not result viewers; overkill for this use case
- Native TreeView — cannot host React components or render charts

**Implementation detail**: Register a new view container `"debrief-results"` in the `"panel"` location, then add a single webview view within it.

```jsonc
// package.json (contributes)
"viewsContainers": {
  "panel": [
    {
      "id": "debrief-results",
      "title": "Results",
      "icon": "resources/results-icon.svg"
    }
  ]
},
"views": {
  "debrief-results": [
    {
      "id": "debrief.resultsPanel",
      "name": "Results",
      "type": "webview"
    }
  ]
}
```

## R2: Tab Management Architecture

**Decision**: Manage tab state in the extension host (`ResultsPanelViewProvider`), render tabs in the webview React component.

**Rationale**: The extension host owns the tab list because it is the only process that can:
1. Receive commands from multiple entry points (tool completion, STAC browser, attachments menu)
2. Create file system watchers (`vscode.workspace.createFileSystemWatcher`)
3. Read result files from disk (`fs/promises`)
4. Survive webview visibility changes (webview is disposed when panel is hidden in VS Code)

The webview React component receives tab data via `postMessage` and handles rendering — tab bar, content area, switching. This follows the same host-owns-state / webview-renders pattern used by `ActivityPanelViewProvider` and `LogPanelViewProvider`.

**Tab identity**: `plotItemPath + resultFilePath` — the combination of the STAC item path and the result file's relative path within the item. This ensures the same filename in different plots produces separate tabs, matching FR-016.

**Alternatives considered**:
- Webview-only state — cannot survive webview disposal; cannot receive commands from extension host
- Zustand store in session-state — overcomplicates for session-scoped UI state that doesn't need undo/redo or persistence
- VS Code's native tab API — only for editor tabs, not webview view tabs

## R3: File Watching for Live Update

**Decision**: Use `vscode.workspace.createFileSystemWatcher` with a debounced reload.

**Rationale**: When a result file is overwritten by a tool re-run, the extension host detects the change and sends updated content to the webview. VS Code's built-in `FileSystemWatcher` is the standard mechanism — it works cross-platform, respects VS Code's file system abstraction, and integrates with the extension disposal pattern.

The watcher is created per-tab when a tab is opened and disposed when the tab is closed. This avoids watching directories that have no open tabs.

**Debounce strategy**: Wait 200ms after the last `onDidChange` event before reading the file. This handles the case where a tool writes the file in multiple chunks (the "mid-write" edge case from the spec). If the file cannot be read after the debounce, the tab shows a transient error that auto-clears on the next successful read.

**Alternatives considered**:
- Polling (fs.stat every N seconds) — wasteful, slower to react, doesn't leverage VS Code's native watcher
- Result ID registry (#087) notification — not yet implemented; this feature uses direct file watching as a simpler first step
- Node.js `fs.watch` — platform-inconsistent; VS Code's abstraction is more reliable

## R4: Content Routing by Artifact Type

**Decision**: Determine display type from the STAC asset's MIME type (`type` field in item.json) and file extension.

**Rationale**: STAC assets already declare a `type` field (MIME type) in `item.json`. The panel uses this as the primary signal:

| MIME type pattern | Display | Component |
|------------------|---------|-----------|
| `application/json` with DatasetEnvelope structure | Chart | `ChartRenderer` (#085) |
| `image/png`, `image/jpeg`, `image/svg+xml` | Inline image | `ImageViewer` |
| Everything else | Fallback summary | `FallbackViewer` |

For JSON files, the panel attempts to parse as `DatasetEnvelope`. If parsing succeeds (has `type`, `title`, `metadata` fields), it runs through `transformDataset()` to produce a Vega-Lite spec. If parsing fails or the transformer returns an error, the tab falls back to the error state (showing the transformer's error message).

**Alternatives considered**:
- File extension only — unreliable; `.json` could be a dataset or a raw config
- Separate result type field in STAC metadata — not yet standardised in the project; MIME type is already present
- Content sniffing (read first bytes) — unnecessary complexity when MIME type and structure validation are sufficient

## R5: Webview Bundling

**Decision**: Add a new esbuild entry point `src/webview/web/resultsPanel.tsx` alongside the existing map, activity, log, and catalog overview entries.

**Rationale**: The existing codebase uses per-webview entry points, each bundled as IIFE for browser execution. The results panel follows the same pattern — a React entry point that imports from `@debrief/components`, mounts the `ResultsPanel` component, and communicates with the extension host via `postMessage`.

The bundle will include:
- `ResultsPanel` component (tab bar + content area)
- `ChartRenderer` component (already used in map webview — but webviews are isolated, so each must bundle its own copy)
- Vega-Lite + vega-embed (pulled in by ChartRenderer)

**Bundle size concern**: Vega-Lite adds ~300KB minified+gzipped. This is unavoidable since the results panel must render charts. The same cost is already paid by any webview that hosts ChartRenderer. This is within the < 500KB Storybook bundle target.

**Alternatives considered**:
- Shared webview bundle — VS Code webviews are isolated iframes; no mechanism to share bundles between them
- Lazy-load Vega-Lite — possible but adds complexity; defer to optimisation if bundle size becomes a problem

## R6: Existing openResultArtifact Command

**Decision**: Redirect the existing `debrief.openResultArtifact` command to open results in the panel instead of as raw JSON in a text editor.

**Rationale**: The command already exists in `commands/index.ts` (line 232) and is wired to the attachments context menu (`viewItem == artifactResultLayer`). Currently it opens the raw JSON file in a text editor via `vscode.workspace.openTextDocument()`. This feature replaces that behaviour — the command will send the file to `ResultsPanelViewProvider` which opens it as a rendered tab.

This gives us the attachments context menu entry point (FR-015) for free — no new command or menu registration needed.

**Alternatives considered**:
- New separate command — would duplicate the existing menu entry; unnecessary
- Keep both (raw JSON + panel) — adds UX confusion; the panel view is strictly better for result viewing

## R7: STAC Browser Entry Point

**Decision**: Add a context menu action to the STAC tree view for result files, calling the existing `openResultArtifact` command.

**Rationale**: The `StacTreeProvider` already renders STAC items and their children. Result files appear as children of STAC items (under `assets/`). Adding a context menu command (`view/item/context` in package.json) for items with `viewItem == stacResultAsset` allows the analyst to right-click a result file and open it in the panel.

The tree provider already identifies result assets via `stacService.isResultAsset()`. The context menu action calls the same `debrief.openResultArtifact` command, ensuring consistent behaviour across all entry points.

**Alternatives considered**:
- Double-click to open — could conflict with existing tree item expand behaviour; context menu is safer
- Separate command — unnecessary; reusing the existing command keeps the codebase simpler

## R8: Tab Title Derivation

**Decision**: Use the DatasetEnvelope `title` field for datasets, filename without extension for other types. Prepend plot name when multiple plots have open tabs.

**Rationale**: The DatasetEnvelope type already has a `title` field (e.g., "Zone Histogram — Track Alpha"). For non-dataset artifacts (images, reports), the filename is the most meaningful identifier available. When tabs from multiple plots are open, prepending the plot name disambiguates (e.g., "Zone Histogram — Plot Alpha").

The extension host determines the title when creating the tab — it reads the file, attempts DatasetEnvelope parsing, and extracts the title. The title is sent to the webview as part of the tab data message.

**Alternatives considered**:
- Always use filename — loses the rich dataset title metadata
- Use STAC asset title — not consistently populated in current STAC items
- Let webview determine title — would require the webview to parse files, violating the host-owns-state pattern

## R9: Auto-Open on Tool Completion

**Decision**: Hook into the existing tool execution flow in `executeTool.ts` — after the result is persisted, call `resultsPanelView.openResult()`.

**Rationale**: The `executeTool` command in `commands/index.ts` already handles tool execution via `calcService`. After the tool result is received and persisted to STAC (via `stacService.addResultAsset()`), the command calls `resultsPanelView.openResult(plotPath, resultPath)` to open the result in the panel. This is the simplest integration point — no new event system needed.

**Alternatives considered**:
- EventEmitter from stacService — adds indirection; the command already knows when persistence completes
- File watcher on results directory — would fire for all file changes, not just new results; requires filtering
- Session state event — results panel is UI-only; session state is for domain data
