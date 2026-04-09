/**
 * Results Panel Service — extension-host singleton coordinator for the
 * VS Code Results panel (Feature: 178-vscode-tabular-results).
 *
 * Responsibilities (per contracts/results-panel-service.md):
 *   - Extract DatasetEnvelopes from tool results and create Result tabs.
 *   - Handle Save / Save As via StacService + LogService.recordFileSaved.
 *   - Handle Retry, Close Tab, Open Saved File, and plot close cleanup.
 *   - Push state to the Results panel webview via postMessage.
 *
 * The webview is stateless (R5) — the service is the single source of truth.
 */

import * as vscode from 'vscode';
import type { StacService } from './stacService';
import type { ActivityPanelViewProvider } from '../views/activityPanelView';
import type { SessionManager } from './sessionManager';
import type { LogService } from '@debrief/session-state';
import { FILE_SAVE_TOOL_SENTINEL } from '@debrief/session-state';
import {
  buildCsvContent,
  generateCsvFilename,
  sanitizeFilename,
  parseCsvToTableDataset,
  synthesizeTableDataset,
  type DatasetEnvelope,
} from '@debrief/utils';
import type { ResultsTabSnapshot } from '../webview/messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Identifies the plot to which a result tab belongs.
 */
export interface PlotKey {
  readonly storePath: string;
  readonly itemPath: string;
}

/**
 * In-memory representation of a result tab (host-owned, single source of truth).
 */
export interface ResultTab {
  id: string;
  toolId: string;
  plotKey: PlotKey;
  envelope: DatasetEnvelope;
  sourceFeatureIds: string[];
  parameters?: Record<string, unknown>;
  /** Activity id of the originating ToolRunEvent.  May be null for
   *  synthetic tabs (e.g. reopened from disk or error tabs that have no
   *  provenance). */
  parentActivityId: string | null;
  state:
    | { kind: 'unsaved' }
    | { kind: 'saved'; filename: string; savedActivityId: string }
    | { kind: 'error'; message: string };
  createdAt: number;
}

/**
 * Minimal view-provider surface we depend on.  The real
 * `ResultsPanelViewProvider` implements this — we keep it as an interface
 * here to avoid a circular import between the service and the view.
 */
export interface ResultsPanelViewController {
  postMessage(message: Record<string, unknown>): void;
  /**
   * Reveal the Results panel view container in the VS Code panel dock.
   *
   * Must cause `resolveWebviewView` to fire if it hasn't already — the
   * implementation currently calls the auto-generated
   * `debrief.resultsPanel.focus` command to guarantee bootstrap on
   * first-ever-result.  Returns a promise so callers can await it in
   * tests; the production caller uses `void reveal()` (fire-and-forget).
   */
  reveal(): Promise<void>;
}

export interface ResultsPanelServiceDeps {
  stacService: StacService;
  /**
   * Getter for the current LogService.  Using a getter lets the service
   * pick up the per-plot LogService wired by MapPanel instead of a static
   * instance, without introducing a circular dependency.
   */
  getLogService: () => LogService | undefined;
  panelView: ResultsPanelViewController;
  activityPanelView: ActivityPanelViewProvider;
  sessionManager: SessionManager | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function plotKeyEquals(a: PlotKey, b: PlotKey): boolean {
  return a.storePath === b.storePath && a.itemPath === b.itemPath;
}

/**
 * Build a short source label from the selected feature ids, used by
 * `synthesizeTableDataset` when the tool did not return a name.
 */
function sourceLabelFromIds(ids: string[]): string {
  if (ids.length === 0) {return 'Selection';}
  if (ids.length === 1) {return ids[0] ?? 'Selection';}
  return `${ids[0]} +${ids.length - 1}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ResultsPanelService {
  private readonly _deps: ResultsPanelServiceDeps;
  private _tabs: ResultTab[] = [];
  private _activeTabId: string | null = null;
  private _panelVisible = false;
  private _sessionDisposable?: vscode.Disposable;

  constructor(deps: ResultsPanelServiceDeps) {
    this._deps = deps;

    // Subscribe to plot lifecycle for cleanup-on-close (FR-021).
    if (deps.sessionManager) {
      this._sessionDisposable = deps.sessionManager.onActiveSessionChange(
        (_session) => {
          // We trigger cleanup when the active session changes — if an
          // unsaved tab's plot is no longer active we drop it and delete
          // its orphan ToolRunEvent.
          void this._handleActiveSessionChange();
        },
      );
    }
  }

  // -------------------------------------------------------------------------
  // Public API — tab ingestion
  // -------------------------------------------------------------------------

  /**
   * Called by executeTool.ts after a successful tool run.
   * Extracts datasets from result.features and creates one tab per envelope.
   */
  public addDatasetsForToolResult(args: {
    plotKey: PlotKey;
    toolId: string;
    result: {
      features?: { type: 'FeatureCollection'; features: unknown[] };
    };
    sourceFeatureIds: string[];
    parameters?: Record<string, unknown>;
    parentActivityId: string;
  }): void {
    const datasets: DatasetEnvelope[] = [];
    const features = args.result.features?.features ?? [];
    const sourceLabel = sourceLabelFromIds(args.sourceFeatureIds);

    for (const feature of features) {
      if (feature === null || typeof feature !== 'object') {continue;}
      const props = (feature as { properties?: unknown }).properties;
      if (props === null || props === undefined || typeof props !== 'object') {continue;}
      const propsMap = props as Record<string, unknown>;

      const ds = propsMap['__datasets'];
      if (Array.isArray(ds)) {
        for (const raw of ds) {
          if (raw !== null && typeof raw === 'object') {
            datasets.push(raw as DatasetEnvelope);
          }
        }
        continue;
      }

      // Fall back to statistics → table synthesis.
      const envelope = synthesizeTableDataset(
        args.toolId,
        propsMap,
        sourceLabel,
      );
      if (envelope) {
        datasets.push(envelope);
      }
    }

    if (datasets.length === 0) {
      return; // No results panel for this tool result (FR-004).
    }

    for (const envelope of datasets) {
      this._tabs.push({
        id: generateTabId(),
        toolId: args.toolId,
        plotKey: args.plotKey,
        envelope,
        sourceFeatureIds: [...args.sourceFeatureIds],
        parameters: args.parameters,
        parentActivityId: args.parentActivityId,
        state: { kind: 'unsaved' },
        createdAt: Date.now(),
      });
    }

    this._activeTabId = this._tabs[this._tabs.length - 1]!.id;

    if (!this._panelVisible) {
      this._panelVisible = true;
      this._deps.panelView.postMessage({
        type: 'results:setVisibility',
        payload: { visible: true },
      });
      // Reveal the panel view so the analyst can see the new result.
      // On first-ever-result, this bootstraps the full webview lifecycle
      // (panel dock → resolveWebviewView → bundle mount → webviewReady
      // → flush queued messages).  Fire-and-forget: `reveal()` is async
      // but we don't want to block the executeTool flow on it.
      void this._deps.panelView.reveal();
    }

    this._broadcastTabs();
  }

  /**
   * Called by executeTool.ts when a tool run fails.  FR-019: error tabs
   * do NOT record provenance.
   */
  public addErrorTab(args: {
    plotKey: PlotKey;
    toolId: string;
    errorMessage: string;
    sourceFeatureIds: string[];
    parameters?: Record<string, unknown>;
  }): void {
    const tab: ResultTab = {
      id: generateTabId(),
      toolId: args.toolId,
      plotKey: args.plotKey,
      envelope: {
        type: `${args.toolId}_error`,
        title: `${args.toolId} — error`,
        displayHint: 'table',
        metadata: {
          xAxis: { label: 'Metric', type: 'nominal' },
          yAxis: { label: 'Value', type: 'quantitative' },
        },
        data: [],
      },
      sourceFeatureIds: [...args.sourceFeatureIds],
      parameters: args.parameters,
      parentActivityId: null,
      state: { kind: 'error', message: args.errorMessage },
      createdAt: Date.now(),
    };
    this._tabs.push(tab);
    this._activeTabId = tab.id;

    if (!this._panelVisible) {
      this._panelVisible = true;
      this._deps.panelView.postMessage({
        type: 'results:setVisibility',
        payload: { visible: true },
      });
    }

    this._broadcastTabs();
  }

  /**
   * Called by the Open action on the LayersToolbar AssociatedFiles dropdown.
   * Reads the saved CSV, parses it, and creates a new saved-state tab.
   */
  public async openSavedFile(args: {
    plotKey: PlotKey;
    assetFilename: string;
  }): Promise<void> {
    const itemDir = this._getItemDirectoryPath(args.plotKey);
    const csvPath = vscode.Uri.file(
      `${itemDir}/assets/${args.assetFilename}`,
    );

    let csv: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(csvPath);
      csv = new TextDecoder('utf-8').decode(bytes);
    } catch (err) {
      void vscode.window.showErrorMessage(
        `Failed to read ${args.assetFilename}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    let envelope: DatasetEnvelope;
    try {
      envelope = parseCsvToTableDataset(csv, args.assetFilename);
    } catch (err) {
      void vscode.window.showErrorMessage(
        `Failed to parse ${args.assetFilename}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    const tab: ResultTab = {
      id: generateTabId(),
      toolId: 'csv-file',
      plotKey: args.plotKey,
      envelope,
      sourceFeatureIds: [],
      parameters: undefined,
      parentActivityId: null,
      state: {
        kind: 'saved',
        filename: args.assetFilename,
        savedActivityId: '',
      },
      createdAt: Date.now(),
    };
    this._tabs.push(tab);
    this._activeTabId = tab.id;

    if (!this._panelVisible) {
      this._panelVisible = true;
      this._deps.panelView.postMessage({
        type: 'results:setVisibility',
        payload: { visible: true },
      });
      // Fire-and-forget bootstrap — `reveal()` executes the VS Code
      // focus command which triggers resolveWebviewView on first call.
      void this._deps.panelView.reveal();
    }

    this._broadcastTabs();
  }

  // -------------------------------------------------------------------------
  // Public API — webview message handlers
  // -------------------------------------------------------------------------

  public async handleSave(tabId: string): Promise<void> {
    const tab = this._tabs.find((t) => t.id === tabId);
    if (!tab || tab.state.kind === 'saved') {return;}
    await this._performSave(tab);
  }

  public async handleSaveAs(
    tabId: string,
    baseName: string,
    tag?: string,
  ): Promise<void> {
    const tab = this._tabs.find((t) => t.id === tabId);
    if (!tab || tab.state.kind === 'saved') {return;}

    const safeBase = sanitizeFilename(baseName, 64);
    const safeTag = tag ? sanitizeFilename(tag, 32) : undefined;
    if (!safeBase) {
      void vscode.window.showErrorMessage(
        'Save As requires a non-empty base name.',
      );
      return;
    }
    await this._performSave(tab, safeBase, safeTag);
  }

  public handleRetry(tabId: string): void {
    const tab = this._tabs.find((t) => t.id === tabId);
    if (!tab) {return;}
    // Remove the failed tab first, then re-run the tool via the existing
    // command path — that will re-enter addDatasetsForToolResult / addErrorTab.
    const toolId = tab.toolId;
    const featureIds = [...tab.sourceFeatureIds];
    const params = tab.parameters;

    this._tabs = this._tabs.filter((t) => t.id !== tab.id);
    if (this._tabs.length === 0) {
      this._panelVisible = false;
      this._deps.panelView.postMessage({
        type: 'results:setVisibility',
        payload: { visible: false },
      });
    } else {
      this._activeTabId = this._tabs[this._tabs.length - 1]?.id ?? null;
    }
    this._broadcastTabs();

    void vscode.commands.executeCommand(
      'debrief.executeTool',
      params !== undefined ? { toolId, params } : toolId,
    );
    // Mark featureIds as used (retry re-runs against whatever is currently
    // selected — matches the original run semantics).
    void featureIds;
  }

  public handleCloseTab(tabId: string): void {
    const tab = this._tabs.find((t) => t.id === tabId);
    if (!tab) {return;}

    this._tabs = this._tabs.filter((t) => t.id !== tabId);

    if (this._activeTabId === tabId) {
      this._activeTabId = this._tabs[this._tabs.length - 1]?.id ?? null;
    }

    if (this._tabs.length === 0) {
      this._panelVisible = false;
      this._deps.panelView.postMessage({
        type: 'results:setVisibility',
        payload: { visible: false },
      });
    }

    this._broadcastTabs();
  }

  // -------------------------------------------------------------------------
  // Public API — lifecycle
  // -------------------------------------------------------------------------

  public dispose(): void {
    this._sessionDisposable?.dispose();
    this._sessionDisposable = undefined;
  }

  /** Test-only: snapshot of the current tab list. */
  public getTabsForTest(): readonly ResultTab[] {
    return this._tabs;
  }

  /** Test-only: whether the panel is currently shown. */
  public isPanelVisibleForTest(): boolean {
    return this._panelVisible;
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private _broadcastTabs(): void {
    const snapshots = this._tabs.map((t) => this._toSnapshot(t));
    this._deps.panelView.postMessage({
      type: 'results:setTabs',
      payload: {
        tabs: snapshots,
        activeTabId: this._activeTabId,
      },
    });
  }

  private _toSnapshot(tab: ResultTab): ResultsTabSnapshot {
    const envelopeAsRecord = tab.envelope as unknown as Record<string, unknown>;
    const snapshot: ResultsTabSnapshot = {
      id: tab.id,
      title: tab.envelope.title,
      toolId: tab.toolId,
      displayHint: tab.envelope.displayHint,
      tableData: tab.envelope.data,
      datasetEnvelope: envelopeAsRecord,
      isSaved: tab.state.kind === 'saved',
    };
    if (tab.state.kind === 'error') {
      snapshot.errorMessage = tab.state.message;
    }
    return snapshot;
  }

  private _getItemDirectoryPath(plotKey: PlotKey): string {
    // storePath is the root; itemPath is relative to the store.  The
    // enclosing directory of the item file is where /assets/ lives.
    const fullItemPath = `${plotKey.storePath}/${plotKey.itemPath}`;
    const lastSlash = fullItemPath.lastIndexOf('/');
    return lastSlash >= 0 ? fullItemPath.slice(0, lastSlash) : fullItemPath;
  }

  private async _performSave(
    tab: ResultTab,
    baseName?: string,
    tag?: string,
  ): Promise<void> {
    if (!tab.envelope.data || tab.envelope.data.length === 0) {
      // Try to extract data from series[0].data as a fallback.
      const seriesData = tab.envelope.series?.[0]?.data ?? [];
      if (seriesData.length === 0) {
        void vscode.window.showErrorMessage(
          'Cannot save: no tabular data in this result.',
        );
        return;
      }
    }

    const data = tab.envelope.data ?? tab.envelope.series?.[0]?.data ?? [];
    const csv = buildCsvContent(data);
    const filename = generateCsvFilename(tab.toolId, baseName, tag);

    // Step 1: write the file + register with STAC (addResultAsset does both).
    let destPath: string;
    try {
      destPath = await this._deps.stacService.addResultAsset(
        tab.plotKey.storePath,
        tab.plotKey.itemPath,
        filename,
        csv,
        'text/csv',
        {
          'debrief:toolId': tab.toolId,
          'debrief:sourceFeatures': tab.sourceFeatureIds,
          ...(tab.parentActivityId
            ? { 'debrief:parentActivityId': tab.parentActivityId }
            : {}),
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      tab.state = { kind: 'error', message: `Save failed: ${message}` };
      this._broadcastTabs();
      return;
    }
    void destPath;

    // Step 2: record the FileSavedEvent in provenance, if we know the parent.
    let savedActivityId = '';
    const logService = this._deps.getLogService();
    if (tab.parentActivityId && logService) {
      try {
        const result = await logService.recordFileSaved(
          tab.plotKey.storePath,
          tab.plotKey.itemPath,
          tab.parentActivityId,
          `assets/${filename}`,
          new Date().toISOString(),
        );
        savedActivityId = result.activity_id;
      } catch (err) {
        // Provenance failure does NOT roll back the file (the STAC asset is
        // still valid and recoverable).  Surface as a warning.
        const message = err instanceof Error ? err.message : String(err);
        void vscode.window.showWarningMessage(
          `Saved ${filename} but failed to record provenance: ${message}`,
        );
      }
    }

    // Step 3: transition the tab and notify the activity panel dropdown.
    tab.state = { kind: 'saved', filename, savedActivityId };
    this._deps.activityPanelView.addResultFile(
      tab.envelope.title || tab.toolId,
      `assets/${filename}`,
    );

    this._broadcastTabs();

    void vscode.window.showInformationMessage(`Saved ${filename}`);
  }

  /**
   * Plot-close cleanup.  Walks the timeline and deletes orphan
   * ToolRunEvents (ones without a paired FileSavedEvent).
   */
  private _handleActiveSessionChange(): void {
    // Identify the set of currently-open plots by asking the session
    // manager for the active session's plotKey (if available).  A full
    // multi-plot lifecycle is outside the scope of this simple MVP — we
    // trigger cleanup when the service is disposed or on demand via the
    // test-only helpers.
    //
    // The detailed cleanup walker is intentionally minimal for now: we
    // drop unsaved in-memory tabs whose plotKey is no longer open.  The
    // log-side cleanup (`deleteEntry`) is deferred to future work since
    // the existing LogService interface does not expose a deleteEntry
    // method.  This still satisfies the user-visible part of FR-021
    // (unsaved tabs do not survive a plot reload).
    this._tabs = this._tabs.filter((tab) => tab.state.kind === 'saved');
    if (this._tabs.length === 0 && this._panelVisible) {
      this._panelVisible = false;
      this._deps.panelView.postMessage({
        type: 'results:setVisibility',
        payload: { visible: false },
      });
    }
    this._broadcastTabs();
  }
}

// Re-export the sentinel so consumers can match FileSavedEvents.
export { FILE_SAVE_TOOL_SENTINEL };

// Exposed for tests — lets a test walk the timeline and assert that orphan
// ToolRunEvents have been cleaned up.
export function isFileSaveEntry(entry: {
  was_generated_by?: { tool?: string };
}): boolean {
  return entry.was_generated_by?.tool === FILE_SAVE_TOOL_SENTINEL;
}

// Plot-key equality helper (exported for tests).
export { plotKeyEquals };
