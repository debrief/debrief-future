/**
 * Map Panel - Webview panel controller for the Leaflet map
 *
 * This controller manages the webview lifecycle, message passing,
 * and state persistence for the map panel.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { Plot, Track, ReferenceLocation, Selection } from '../types/plot';
import type { ResultLayer } from '../types/tool';
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from './messages';

export class MapPanel {
  public static currentPanel: MapPanel | undefined;
  public static readonly viewType = 'debrief.mapPanel';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  // Current state
  private currentPlot: Plot | null = null;
  private currentTracks: Track[] = [];
  private currentLocations: ReferenceLocation[] = [];
  private resultLayers: ResultLayer[] = [];
  private isWebviewReady = false;
  private pendingMessages: ExtensionToWebviewMessage[] = [];

  // Event handlers
  private onSelectionChangedCallback:
    | ((selection: Selection) => void)
    | undefined;
  private onExportPngCallback:
    | ((requestId: string) => Promise<void>)
    | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    // Set up webview
    this.panel.webview.html = this.getHtmlForWebview();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        this.handleWebviewMessage(message);
      },
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle visibility changes
    this.panel.onDidChangeViewState(
      () => {
        if (this.panel.visible) {
          void vscode.commands.executeCommand(
            'setContext',
            'debrief.mapFocused',
            true
          );
        } else {
          void vscode.commands.executeCommand(
            'setContext',
            'debrief.mapFocused',
            false
          );
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Create or show a map panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    title: string
  ): MapPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      MapPanel.viewType,
      title,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'node_modules'),
        ],
      }
    );

    MapPanel.currentPanel = new MapPanel(panel, extensionUri);
    return MapPanel.currentPanel;
  }

  /**
   * Revive panel from serialization
   */
  public static revive(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri
  ): MapPanel {
    MapPanel.currentPanel = new MapPanel(panel, extensionUri);
    return MapPanel.currentPanel;
  }

  /**
   * Get the webview panel
   */
  public getPanel(): vscode.WebviewPanel {
    return this.panel;
  }

  /**
   * Load a plot into the panel
   */
  public loadPlot(
    plot: Plot,
    tracks: Track[],
    locations: ReferenceLocation[]
  ): void {
    this.currentPlot = plot;
    this.currentTracks = tracks;
    this.currentLocations = locations;
    this.resultLayers = [];

    // Update panel title
    this.panel.title = plot.title;

    // Send to webview
    this.postMessage({
      type: 'loadPlot',
      plot: {
        id: plot.id,
        title: plot.title,
        tracks,
        locations,
        bbox: plot.bbox,
        timeExtent: plot.timeExtent,
      },
    });

    // Update context
    void vscode.commands.executeCommand('setContext', 'debrief.plotOpen', true);
  }

  /**
   * Update tracks (e.g., after time filter change)
   */
  public updateTracks(tracks: Track[]): void {
    this.currentTracks = tracks;
    this.postMessage({
      type: 'updateTracks',
      tracks,
    });
  }

  /**
   * Set selection
   */
  public setSelection(trackIds: string[], locationIds: string[]): void {
    this.postMessage({
      type: 'setSelection',
      selection: { trackIds, locationIds },
    });
  }

  /**
   * Clear selection
   */
  public clearSelection(): void {
    this.postMessage({ type: 'clearSelection' });
  }

  /**
   * Add a result layer
   */
  public addResultLayer(layer: ResultLayer): void {
    this.resultLayers.push(layer);
    this.postMessage({
      type: 'addResultLayer',
      layer: {
        id: layer.id,
        name: layer.name,
        features: layer.features,
        style: layer.style,
      },
    });

    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasResultLayers',
      true
    );
  }

  /**
   * Remove a result layer
   */
  public removeResultLayer(layerId: string): void {
    const index = this.resultLayers.findIndex((l) => l.id === layerId);
    if (index !== -1) {
      this.resultLayers.splice(index, 1);
      this.postMessage({
        type: 'removeResultLayer',
        layerId,
      });

      if (this.resultLayers.length === 0) {
        void vscode.commands.executeCommand(
          'setContext',
          'debrief.hasResultLayers',
          false
        );
      }
    }
  }

  /**
   * Clear all result layers
   */
  public clearResultLayers(): void {
    for (const layer of this.resultLayers) {
      this.postMessage({
        type: 'removeResultLayer',
        layerId: layer.id,
      });
    }
    this.resultLayers = [];
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasResultLayers',
      false
    );
  }

  /**
   * Set layer visibility
   */
  public setLayerVisibility(layerId: string, visible: boolean): void {
    this.postMessage({
      type: 'setLayerVisibility',
      layerId,
      visible,
    });
  }

  /**
   * Fit bounds
   */
  public fitBounds(bounds: [[number, number], [number, number]]): void {
    this.postMessage({
      type: 'fitBounds',
      bounds,
    });
  }

  /**
   * Fit to all tracks
   */
  public fitToAllTracks(): void {
    if (!this.currentPlot) {
      return;
    }

    const [west, south, east, north] = this.currentPlot.bbox;
    this.fitBounds([
      [south, west],
      [north, east],
    ]);
  }

  /**
   * Fit to selection
   */
  public fitToSelection(): void {
    const selectedTracks = this.currentTracks.filter((t) => t.selected);
    if (selectedTracks.length === 0) {
      return;
    }

    // Calculate bounds from selected tracks
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const track of selectedTracks) {
      for (const coord of track.geometry.coordinates) {
        const [lng, lat] = coord;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    }

    this.fitBounds([
      [minLat, minLng],
      [maxLat, maxLng],
    ]);
  }

  /**
   * Set time range
   */
  public setTimeRange(start: string, end: string): void {
    this.postMessage({
      type: 'setTimeRange',
      timeRange: { start, end },
    });
  }

  /**
   * Set track color
   */
  public setTrackColor(trackId: string, color: string): void {
    this.postMessage({
      type: 'setTrackColor',
      trackId,
      color,
    });

    // Update local state
    const track = this.currentTracks.find((t) => t.id === trackId);
    if (track) {
      track.color = color;
    }
  }

  /**
   * Register selection change callback
   */
  public onSelectionChanged(callback: (selection: Selection) => void): void {
    this.onSelectionChangedCallback = callback;
  }

  /**
   * Register export PNG callback
   */
  public onExportPng(callback: (requestId: string) => Promise<void>): void {
    this.onExportPngCallback = callback;
  }

  /**
   * Get current tracks
   */
  public getTracks(): Track[] {
    return this.currentTracks;
  }

  /**
   * Get current locations
   */
  public getLocations(): ReferenceLocation[] {
    return this.currentLocations;
  }

  /**
   * Get result layers
   */
  public getResultLayers(): ResultLayer[] {
    return this.resultLayers;
  }

  /**
   * Dispose the panel
   */
  public dispose(): void {
    MapPanel.currentPanel = undefined;

    // Clean up resources
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    // Update context
    void vscode.commands.executeCommand('setContext', 'debrief.plotOpen', false);
    void vscode.commands.executeCommand('setContext', 'debrief.mapFocused', false);
    void vscode.commands.executeCommand('setContext', 'debrief.hasSelection', false);
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasResultLayers',
      false
    );
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private postMessage(message: ExtensionToWebviewMessage): void {
    if (this.isWebviewReady) {
      void this.panel.webview.postMessage(message);
    } else {
      this.pendingMessages.push(message);
    }
  }

  private handleWebviewMessage(message: WebviewToExtensionMessage): void {
    switch (message.type) {
      case 'webviewReady':
        this.isWebviewReady = true;
        // Send any pending messages
        for (const pending of this.pendingMessages) {
          void this.panel.webview.postMessage(pending);
        }
        this.pendingMessages = [];
        break;

      case 'selectionChanged':
        this.handleSelectionChanged(message);
        break;

      case 'viewStateChanged':
        // View state changes are handled automatically by webview persistence
        break;

      case 'requestExportPng':
        void this.handleExportPngRequest(message.requestId);
        break;

      case 'requestTrackColorChange':
        void this.handleTrackColorChangeRequest(
          message.trackId,
          message.trackName
        );
        break;

      case 'requestTrackDetails':
        this.handleTrackDetailsRequest(message.requestId, message.trackId);
        break;
    }
  }

  private handleSelectionChanged(
    message: Extract<WebviewToExtensionMessage, { type: 'selectionChanged' }>
  ): void {
    // Update local track state
    for (const track of this.currentTracks) {
      track.selected = message.selection.trackIds.includes(track.id);
    }
    for (const location of this.currentLocations) {
      location.selected = message.selection.locationIds.includes(location.id);
    }

    // Update context
    const hasSelection =
      message.selection.trackIds.length > 0 ||
      message.selection.locationIds.length > 0;
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasSelection',
      hasSelection
    );

    // Notify callback
    if (this.onSelectionChangedCallback) {
      const featureKinds: Array<'track' | 'location'> = [];
      if (message.selection.trackIds.length > 0) {
        featureKinds.push('track');
      }
      if (message.selection.locationIds.length > 0) {
        featureKinds.push('location');
      }

      this.onSelectionChangedCallback({
        trackIds: message.selection.trackIds,
        locationIds: message.selection.locationIds,
        contextType: message.selection.contextType,
        featureKinds,
      });
    }
  }

  private async handleExportPngRequest(requestId: string): Promise<void> {
    if (this.onExportPngCallback) {
      await this.onExportPngCallback(requestId);
    }
  }

  private async handleTrackColorChangeRequest(
    trackId: string,
    trackName: string
  ): Promise<void> {
    // Show color picker
    const track = this.currentTracks.find((t) => t.id === trackId);
    const currentColor = track?.color ?? '#377eb8';

    const result = await vscode.window.showInputBox({
      prompt: `Enter color for ${trackName}`,
      value: currentColor,
      validateInput: (value) => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Please enter a valid hex color (e.g., #FF0000)';
        }
        return null;
      },
    });

    if (result) {
      this.setTrackColor(trackId, result);
    }
  }

  private handleTrackDetailsRequest(
    requestId: string,
    trackId: string
  ): void {
    const track = this.currentTracks.find((t) => t.id === trackId);

    if (!track) {
      void this.panel.webview.postMessage({
        type: 'requestTrackDetailsResponse',
        requestId,
        success: false,
        error: 'Track not found',
      });
      return;
    }

    // Calculate duration
    const startDate = new Date(track.startTime);
    const endDate = new Date(track.endTime);
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    const duration =
      hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    void this.panel.webview.postMessage({
      type: 'requestTrackDetailsResponse',
      requestId,
      success: true,
      details: {
        name: track.name,
        platformType: track.platformType ?? 'Unknown',
        pointCount: track.geometry.coordinates.length,
        startTime: track.startTime,
        endTime: track.endTime,
        duration,
      },
    });
  }

  private getHtmlForWebview(): string {
    const webview = this.panel.webview;

    // Get URIs for webview resources
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'map.js')
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'styles.css')
    );
    const leafletCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'node_modules',
        'leaflet',
        'dist',
        'leaflet.css'
      )
    );

    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; img-src ${cspSource} data: https:;">
  <title>Debrief Map</title>
  <link rel="stylesheet" href="${leafletCssUri}">
  <link rel="stylesheet" href="${stylesUri}">
</head>
<body>
  <div id="map-container">
    <div id="map"></div>
    <div id="toolbar" class="floating-toolbar">
      <button id="btn-zoom-in" class="toolbar-btn" title="Zoom In">+</button>
      <button id="btn-zoom-out" class="toolbar-btn" title="Zoom Out">-</button>
      <button id="btn-fit-bounds" class="toolbar-btn" title="Fit to All">[]</button>
      <button id="btn-export" class="toolbar-btn" title="Export PNG">E</button>
    </div>
    <div id="welcome-view" class="welcome-view">
      <div class="welcome-content">
        <h1>Debrief</h1>
        <p>Open a plot to get started</p>
        <ul>
          <li>Drag a plot from Explorer onto this area</li>
          <li>Or use Ctrl+Shift+P and "Debrief: Open Plot"</li>
        </ul>
      </div>
    </div>
  </div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/**
 * Webview panel serializer for session restore
 */
export class MapPanelSerializer implements vscode.WebviewPanelSerializer {
  constructor(private extensionUri: vscode.Uri) {}

  async deserializeWebviewPanel(
    webviewPanel: vscode.WebviewPanel,
    _state: unknown
  ): Promise<void> {
    MapPanel.revive(webviewPanel, this.extensionUri);
  }
}
