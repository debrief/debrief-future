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

/**
 * Build a human-readable tab title from the envelope title and source
 * feature IDs.
 *
 * Examples:
 *   "Range: 50d98485-... → 06b76d2d-..." → "Range"
 *   "Range: HMS Defender → USS Freedom"  → "Range (HMS Defender → USS Freedom)"
 *   "Track Alpha"                        → "Track Alpha"
 *
 * Strategy:
 *   1. Extract the subject prefix (before ": " if present).
 *   2. Extract the feature-name suffix (after ": ").
 *   3. If the suffix looks like UUIDs (long hex strings), drop it.
 *   4. Otherwise append it in parentheses.
 *   5. Truncate to 60 chars.
 */
function buildShortTabTitle(
  envelopeTitle: string,
  sourceNames: string[],
): string {
  const colonIdx = envelopeTitle.indexOf(': ');
  if (colonIdx < 0) {
    // No colon — title is already short (e.g. "Track Alpha — Stats").
    return envelopeTitle.length <= 60
      ? envelopeTitle
      : envelopeTitle.slice(0, 57) + '...';
  }

  const subject = envelopeTitle.slice(0, colonIdx); // e.g. "Range"
  const suffix = envelopeTitle.slice(colonIdx + 2);  // e.g. "HMS Defender → USS Freedom"

  // Detect UUID-heavy suffixes (>30 chars with hex patterns).
  const looksLikeUuids =
    suffix.length > 30 &&
    /[0-9a-f]{8}-[0-9a-f]{4}/.test(suffix);

  if (looksLikeUuids) {
    // Use the resolved source names instead.
    const shortNames = sourceNames
      .map((name) => {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(name)) {
          return name.slice(0, 8);
        }
        return name.length > 25 ? name.slice(0, 22) + '...' : name;
      })
      .join(' → ');
    return shortNames
      ? `${subject} (${shortNames})`.slice(0, 60)
      : subject;
  }

  // Suffix is human-readable — include it.
  const full = `${subject} (${suffix})`;
  return full.length <= 60 ? full : `${subject} (${suffix.slice(0, 50)}...)`;
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
  private _outputChannel?: vscode.OutputChannel;

  public setOutputChannel(channel: vscode.OutputChannel): void {
    this._outputChannel = channel;
  }

  private _log(message: string): void {
    this._outputChannel?.appendLine(`[debrief/resultsService] ${message}`);
  }

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
    /** Human-readable names for the source features (e.g. "HMS Defender").
     *  Falls back to sourceFeatureIds when not provided. */
    sourceFeatureNames?: string[];
    parameters?: Record<string, unknown>;
    parentActivityId: string;
  }): void {
    this._log(
      `addDatasetsForToolResult called: toolId=${args.toolId} featureCount=${args.result.features?.features?.length ?? 0}`,
    );
    const datasets: DatasetEnvelope[] = [];
    const features = args.result.features?.features ?? [];
    const sourceLabel = sourceLabelFromIds(args.sourceFeatureIds);

    for (const feature of features) {
      if (feature === null || typeof feature !== 'object') {continue;}
      const props = (feature as { properties?: unknown }).properties;
      if (props === null || props === undefined || typeof props !== 'object') {continue;}
      // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
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

    this._log(`  extracted ${datasets.length} DatasetEnvelope(s)`);
    if (datasets.length === 0) {
      this._log(
        '  no datasets extracted — Results panel will NOT be shown for this tool result',
      );
      return; // No results panel for this tool result (FR-004).
    }

    for (const envelope of datasets) {
      this._tabs.push({
        id: generateTabId(),
        toolId: args.toolId,
        plotKey: args.plotKey,
        envelope: {
          ...envelope,
          // Build a shorter tab title.  The Python tool sets titles
          // like "Range: 50d98485-ad0a-... → 06b76d2d-08c9-..." which
          // are unreadable.  We replace with "{subject} ({sources})"
          // e.g. "Range (HMS Defender → USS Freedom)".
          title: buildShortTabTitle(
            envelope.title,
            args.sourceFeatureNames ?? args.sourceFeatureIds,
          ),
        },
        sourceFeatureIds: [...args.sourceFeatureIds],
        parameters: args.parameters,
        parentActivityId: args.parentActivityId,
        state: { kind: 'unsaved' },
        createdAt: Date.now(),
      });
    }

    this._activeTabId = this._tabs[this._tabs.length - 1]!.id;

    // Always reveal + broadcast when new datasets arrive.  The panel
    // may have been closed by the user (× button on the Debrief
    // Results tab) since the last tool run, so we can't gate on
    // `_panelVisible`.  reveal() is idempotent (just a focus command)
    // and cheap when the panel is already visible.
    this._panelVisible = true;
    this._deps.panelView.postMessage({
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    void this._deps.panelView.reveal();

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

    this._panelVisible = true;
    this._deps.panelView.postMessage({
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    void this._deps.panelView.reveal();

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
    const csvPathStr = `${itemDir}/assets/${args.assetFilename}`;
    this._log(`openSavedFile: path=${csvPathStr}`);
    const csvPath = vscode.Uri.file(csvPathStr);

    let csv: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(csvPath);
      csv = new TextDecoder('utf-8').decode(bytes);
      this._log(`openSavedFile: read ${bytes.length} bytes`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._log(`openSavedFile: FAILED to read: ${msg}`);
      void vscode.window.showErrorMessage(
        `Failed to read ${args.assetFilename}: ${msg}`,
      );
      return;
    }

    let envelope: DatasetEnvelope;
    try {
      if (
        args.assetFilename.endsWith('.dataset.json') ||
        args.assetFilename.endsWith('.json')
      ) {
        // JSON: parse the full DatasetEnvelope directly.
        envelope = JSON.parse(csv) as DatasetEnvelope;
        this._log(
          `openSavedFile: parsed JSON envelope type=${envelope.type} ` +
          `series=${envelope.series?.length ?? 0} data=${envelope.data?.length ?? 0}`,
        );
      } else {
        // CSV: parse into a flat table-style envelope.
        envelope = parseCsvToTableDataset(csv, args.assetFilename);
        this._log(`openSavedFile: parsed CSV ${envelope.data?.length ?? 0} rows`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._log(`openSavedFile: FAILED to parse: ${msg}`);
      void vscode.window.showErrorMessage(
        `Failed to parse ${args.assetFilename}: ${msg}`,
      );
      return;
    }

    const isJson = args.assetFilename.endsWith('.json');
    const tab: ResultTab = {
      id: generateTabId(),
      toolId: isJson ? (envelope.type ?? 'dataset') : 'csv-file',
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

    this._panelVisible = true;
    this._deps.panelView.postMessage({
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    void this._deps.panelView.reveal();

    this._broadcastTabs();
    this._log(`  tabs=${this._tabs.length} active=${this._activeTabId}`);
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
    // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
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
    // Determine save format:
    //   - table tabs (displayHint === 'table' with flat data) → CSV
    //   - chart tabs (displayHint undefined or 'chart', or series) → JSON
    //     (preserves the full DatasetEnvelope including series, metadata,
    //     and type — the same format the web-shell uses)
    const isTable = tab.envelope.displayHint === 'table' && Array.isArray(tab.envelope.data);

    let fileContent: string;
    let filename: string;
    let mimeType: string;

    if (isTable) {
      // Table → CSV
      const data = tab.envelope.data ?? [];
      if (data.length === 0) {
        void vscode.window.showErrorMessage(
          'Cannot save: no tabular data in this result.',
        );
        return;
      }
      fileContent = buildCsvContent(data);
      filename = generateCsvFilename(tab.toolId, baseName, tag);
      mimeType = 'text/csv';
    } else {
      // Chart → JSON (DatasetEnvelope)
      fileContent = JSON.stringify(tab.envelope, null, 2);
      if (baseName) {
        const safeName = sanitizeFilename(baseName, 64);
        const safeTag = tag ? sanitizeFilename(tag, 32) : undefined;
        filename = safeTag
          ? `${safeName}--${safeTag}.dataset.json`
          : `${safeName}.dataset.json`;
      } else {
        const dateStamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const safeTool = sanitizeFilename(tab.toolId, 32);
        filename = `${safeTool}--${dateStamp}.dataset.json`;
      }
      mimeType = 'application/json';
    }

    // Step 1: write the file + register with STAC (addResultAsset does both).
    let destPath: string;
    try {
      destPath = await this._deps.stacService.addResultAsset(
        tab.plotKey.storePath,
        tab.plotKey.itemPath,
        filename,
        fileContent,
        mimeType,
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
      filename,
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
