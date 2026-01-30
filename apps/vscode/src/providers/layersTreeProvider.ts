/**
 * Layers Tree Provider - Sidebar tree view for layer management
 *
 * Displays source tracks, reference locations, and result layers
 * with visibility controls.
 *
 * Feature: 029-session-state-vscode
 * - Subscribes to session manager for active session changes
 * - Uses session hiddenFeatureIds for visibility state
 * - Updates selection state in session
 */

import * as vscode from 'vscode';
import {
  subscribeToSelection,
  type SessionStoreApi,
  type SessionStoreWithUndo,
} from '@debrief/session-state';
import type { SessionManager } from '../services/sessionManager';
import type { Track, ReferenceLocation } from '../types/plot';
import type { ResultLayer } from '../types/tool';
import type { GeoJSONFeature } from '../types/import';

export type LayerItem =
  | { type: 'header'; label: string; id: string }
  | { type: 'track'; track: Track }
  | { type: 'location'; location: ReferenceLocation }
  | { type: 'shape'; feature: GeoJSONFeature }
  | { type: 'result'; layer: ResultLayer };

/**
 * Extract feature ID from any LayerItem variant.
 */
export function getFeatureId(item: LayerItem): string | undefined {
  switch (item.type) {
    case 'track':
      return item.track.id;
    case 'location':
      return item.location.id;
    case 'shape':
      return (item.feature.properties?.id as string) ?? undefined;
    case 'result':
      return item.layer.id;
    default:
      return undefined;
  }
}

export class LayersTreeProvider implements vscode.TreeDataProvider<LayerItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    LayerItem | undefined | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tracks: Track[] = [];
  private locations: ReferenceLocation[] = [];
  private shapes: GeoJSONFeature[] = [];
  private resultLayers: ResultLayer[] = [];

  // Session manager integration
  private _activeSession?: SessionStoreApi;
  private _selectionUnsubscribe?: () => void;
  private _sessionChangeDisposable?: vscode.Disposable;
  private _selectedFeatureIds: Set<string> = new Set();

  constructor(sessionManager?: SessionManager) {
    if (sessionManager) {
      this._sessionChangeDisposable = sessionManager.onActiveSessionChange(
        (session) => this._handleActiveSessionChange(session)
      );
    }
  }

  /**
   * Set session manager (for late binding after construction)
   */
  public setSessionManager(sessionManager: SessionManager): void {
    if (this._sessionChangeDisposable) {
      this._sessionChangeDisposable.dispose();
    }

    this._sessionChangeDisposable = sessionManager.onActiveSessionChange(
      (session) => this._handleActiveSessionChange(session)
    );

    const activeSession = sessionManager.getActiveSession();
    if (activeSession) {
      this._handleActiveSessionChange(activeSession);
    }
  }

  /**
   * Handle active session change from SessionManager
   */
  private _handleActiveSessionChange(session: SessionStoreApi | null): void {
    // Unsubscribe from previous session
    if (this._selectionUnsubscribe) {
      this._selectionUnsubscribe();
      this._selectionUnsubscribe = undefined;
    }
    this._activeSession = session ?? undefined;

    if (session) {
      // Subscribe to selection changes
      this._selectionUnsubscribe = subscribeToSelection(
        session,
        (selection) => {
          this._selectedFeatureIds = new Set(selection.featureIds);
          this.refresh();
        }
      );

      // Initialize from current state
      const state: SessionStoreWithUndo = session.getState();
      this._selectedFeatureIds = new Set(state.selection.featureIds);
      this.refresh();
    } else {
      // No active session - clear state
      this._selectedFeatureIds = new Set();
      this.refresh();
    }
  }

  /**
   * Toggle visibility for a feature via session state
   */
  public toggleVisibility(featureId: string): void {
    if (this._activeSession) {
      const state: SessionStoreWithUndo = this._activeSession.getState();
      state.toggleFeatureVisibility(featureId);
    }
  }

  /**
   * Check if a feature is selected
   */
  private _isFeatureSelected(featureId: string): boolean {
    return this._selectedFeatureIds.has(featureId);
  }

  /**
   * Toggle selection for a feature via session state
   */
  public toggleSelection(featureId: string): void {
    if (this._activeSession) {
      const state: SessionStoreWithUndo = this._activeSession.getState();
      if (this._selectedFeatureIds.has(featureId)) {
        state.removeFromSelection([featureId]);
      } else {
        state.addToSelection([featureId]);
      }
    }
  }

  /**
   * Update tracks
   */
  setTracks(tracks: Track[]): void {
    this.tracks = tracks;
    this.refresh();
  }

  /**
   * Update locations
   */
  setLocations(locations: ReferenceLocation[]): void {
    this.locations = locations;
    this.refresh();
  }

  /**
   * Update shapes (other features)
   */
  setShapes(shapes: GeoJSONFeature[]): void {
    this.shapes = shapes;
    this.refresh();
  }

  /**
   * Update result layers
   */
  setResultLayers(layers: ResultLayer[]): void {
    this.resultLayers = layers;
    this.refresh();
  }

  /**
   * Add a result layer
   */
  addResultLayer(layer: ResultLayer): void {
    this.resultLayers.push(layer);
    this.refresh();
  }

  /**
   * Remove a result layer
   */
  removeResultLayer(layerId: string): void {
    const index = this.resultLayers.findIndex((l) => l.id === layerId);
    if (index !== -1) {
      this.resultLayers.splice(index, 1);
      this.refresh();
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.tracks = [];
    this.locations = [];
    this.shapes = [];
    this.resultLayers = [];
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  refresh(item?: LayerItem): void {
    this._onDidChangeTreeData.fire(item ?? undefined);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this._selectionUnsubscribe) {
      this._selectionUnsubscribe();
    }
    if (this._sessionChangeDisposable) {
      this._sessionChangeDisposable.dispose();
    }
  }

  /**
   * Get tree item for an element
   */
  getTreeItem(element: LayerItem): vscode.TreeItem {
    switch (element.type) {
      case 'header':
        return this.createHeaderItem(element);
      case 'track':
        return this.createTrackItem(element.track);
      case 'location':
        return this.createLocationItem(element.location);
      case 'shape':
        return this.createShapeItem(element.feature);
      case 'result':
        return this.createResultItem(element.layer);
    }
  }

  /**
   * Get children for an element
   */
  getChildren(element?: LayerItem): Promise<LayerItem[]> {
    if (!element) {
      // Root level: return headers
      const items: LayerItem[] = [];

      if (this.tracks.length > 0 || this.locations.length > 0 || this.shapes.length > 0) {
        items.push({ type: 'header', label: 'Source Data', id: 'source' });
      }

      if (this.resultLayers.length > 0) {
        items.push({ type: 'header', label: 'Results', id: 'results' });
      }

      return Promise.resolve(items);
    }

    if (element.type === 'header') {
      if (element.id === 'source') {
        return Promise.resolve([
          ...this.tracks.map(
            (track): LayerItem => ({ type: 'track', track })
          ),
          ...this.locations.map(
            (location): LayerItem => ({ type: 'location', location })
          ),
          ...this.shapes.map(
            (feature): LayerItem => ({ type: 'shape', feature })
          ),
        ]);
      }

      if (element.id === 'results') {
        return Promise.resolve(this.resultLayers.map(
          (layer): LayerItem => ({ type: 'result', layer })
        ));
      }
    }

    return Promise.resolve([]);
  }

  /**
   * Get parent of an element
   */
  getParent(element: LayerItem): vscode.ProviderResult<LayerItem> {
    if (element.type === 'header') {
      return undefined;
    }

    if (element.type === 'track' || element.type === 'location' || element.type === 'shape') {
      return { type: 'header', label: 'Source Data', id: 'source' };
    }

    if (element.type === 'result') {
      return { type: 'header', label: 'Results', id: 'results' };
    }

    return undefined;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createHeaderItem(element: { label: string; id: string }): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      vscode.TreeItemCollapsibleState.Expanded
    );

    item.contextValue = 'layerHeader';
    return item;
  }

  private createTrackItem(track: Track): vscode.TreeItem {
    const item = new vscode.TreeItem(
      track.name,
      vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = 'track';
    item.description = track.platformType ?? '';
    const geom = track.geometry as { coordinates: number[][] };
    item.tooltip = `${track.name}\nPlatform: ${track.platformType ?? 'Unknown'}\nPoints: ${geom.coordinates.length}`;

    // Selection state
    const isSelected = this._isFeatureSelected(track.id);

    item.iconPath = new vscode.ThemeIcon(
      isSelected ? 'check' : 'circle-outline'
    );

    // Color indicator
    if (track.color) {
      item.resourceUri = vscode.Uri.parse(`color:${track.color}`);
    }

    return item;
  }

  private createLocationItem(location: ReferenceLocation): vscode.TreeItem {
    const item = new vscode.TreeItem(
      location.name,
      vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = 'location';
    item.description = location.locationType ?? '';
    item.tooltip = `${location.name}\nType: ${location.locationType ?? 'Unknown'}`;

    // Selection state
    const isSelected = this._isFeatureSelected(location.id);

    item.iconPath = new vscode.ThemeIcon(
      isSelected ? 'check' : 'circle-outline'
    );

    return item;
  }

  private createShapeItem(feature: GeoJSONFeature): vscode.TreeItem {
    const props = feature.properties ?? {};
    const kind = (props.kind as string) ?? feature.geometry.type;
    const label = (props.label as string) ?? (props.name as string) ?? kind;

    const item = new vscode.TreeItem(
      label,
      vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = 'shape';
    item.description = kind.toLowerCase();
    item.tooltip = `${label}\nType: ${kind}\nGeometry: ${feature.geometry.type}`;

    const featureId = (props.id as string) ?? '';
    const isSelected = featureId ? this._isFeatureSelected(featureId) : false;
    item.iconPath = new vscode.ThemeIcon(
      isSelected ? 'check' : 'circle-outline'
    );

    return item;
  }

  private createResultItem(layer: ResultLayer): vscode.TreeItem {
    const item = new vscode.TreeItem(
      layer.name,
      vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = 'resultLayer';
    item.description = new Date(layer.createdAt).toLocaleTimeString();
    item.tooltip = `${layer.name}\nTool: ${layer.toolName}\nCreated: ${new Date(layer.createdAt).toLocaleString()}`;

    // Selection state
    const isSelected = this._isFeatureSelected(layer.id);

    item.iconPath = new vscode.ThemeIcon(
      isSelected ? 'check' : 'circle-outline'
    );

    return item;
  }
}
