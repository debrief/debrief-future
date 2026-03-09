/**
 * Layers Tree Provider - Sidebar tree view for layer management
 *
 * Displays source features (tracks, reference locations, annotations) and result layers
 * with visibility controls.
 *
 * Feature: 029-session-state-vscode
 * - Subscribes to session manager for active session changes
 * - Uses session hiddenFeatureIds for visibility state
 * - Updates selection state in session
 *
 * Feature: 100-unify-feature-pipeline
 * - Single setFeatures() method replaces setTracks/setLocations/setShapes
 * - Classifies features by properties.kind for tree grouping
 */

import * as vscode from 'vscode';
import {
  subscribeToSelection,
  type SessionStoreApi,
  type SessionStoreWithUndo,
} from '@debrief/session-state';
import type { SessionManager } from '../services/sessionManager';
import type { ResultLayer } from '../types/tool';
import type { DebriefFeature } from '@debrief/components';
import { isTrackFeature, isReferenceLocation } from '@debrief/components';

// ---------------------------------------------------------------------------
// Local type helpers — @debrief/components dist may not exist at lint time,
// causing all imports to resolve as `any`. These interfaces provide the
// concrete shapes ESLint needs for safe member access.
// ---------------------------------------------------------------------------

/** Minimal shape shared by every DebriefFeature variant. */
interface FeatureBase {
  type: string;
  id: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

/** Properties present after the isTrackFeature type-guard narrows. */
interface TrackLike extends FeatureBase {
  properties: {
    kind: 'TRACK';
    platform_name?: string;
    platform_id?: string;
    track_type?: string;
    style?: { line?: { color?: string } };
    [key: string]: unknown;
  };
  geometry: { type: string; coordinates: number[][] };
}

/** Properties present after the isReferenceLocation type-guard narrows. */
interface RefLocLike extends FeatureBase {
  properties: {
    kind: 'POINT';
    name: string;
    location_type?: string;
    [key: string]: unknown;
  };
}

/**
 * Typed wrapper for isTrackFeature — avoids unsafe-call when the import
 * resolves as `any`.
 */
function isTrack(feature: FeatureBase): feature is TrackLike {
  return (isTrackFeature as (f: FeatureBase) => boolean)(feature);
}

/**
 * Typed wrapper for isReferenceLocation.
 */
function isRefLoc(feature: FeatureBase): feature is RefLocLike {
  return (isReferenceLocation as (f: FeatureBase) => boolean)(feature);
}

export type LayerItem =
  | { type: 'header'; label: string; id: string }
  | { type: 'feature'; feature: DebriefFeature }
  | { type: 'result'; layer: ResultLayer };

/**
 * Extract feature ID from any LayerItem variant.
 */
export function getFeatureId(item: LayerItem): string | undefined {
  switch (item.type) {
    case 'feature':
      return String((item.feature as FeatureBase).id);
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

  private features: DebriefFeature[] = [];
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
   * Update all source features (unified)
   */
  setFeatures(features: DebriefFeature[]): void {
    this.features = features;
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
    this.features = [];
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
      case 'feature':
        return this.createFeatureItem(element.feature);
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

      if (this.features.length > 0) {
        items.push({ type: 'header', label: 'Source Data', id: 'source' });
      }

      if (this.resultLayers.length > 0) {
        items.push({ type: 'header', label: 'Results', id: 'results' });
      }

      return Promise.resolve(items);
    }

    if (element.type === 'header') {
      if (element.id === 'source') {
        return Promise.resolve(
          (this.features as unknown as FeatureBase[]).map(
            (feature): LayerItem => ({ type: 'feature', feature: feature as DebriefFeature })
          )
        );
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

    if (element.type === 'feature') {
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

  private createFeatureItem(feature: DebriefFeature): vscode.TreeItem {
    const f = feature as unknown as FeatureBase;
    const props = f.properties;
    const kind = (props.kind as string) ?? 'UNKNOWN';
    const featureId = String(f.id);
    const isSelected = this._isFeatureSelected(featureId);

    if (isTrack(f)) {
      const name: string = f.properties.platform_name ?? f.properties.platform_id ?? 'Unknown';
      const trackType: string = f.properties.track_type ?? '';
      const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'track';
      item.description = trackType;
      const geom = f.geometry;
      item.tooltip = `${name}\nPlatform: ${trackType || 'Unknown'}\nPoints: ${geom.coordinates.length}`;
      item.iconPath = new vscode.ThemeIcon(isSelected ? 'check' : 'circle-outline');

      // Color indicator
      const style = f.properties.style;
      const color = style?.line?.color;
      if (color) {
        item.resourceUri = vscode.Uri.parse(`color:${color}`);
      }

      return item;
    }

    if (isRefLoc(f)) {
      const name: string = f.properties.name;
      const locType: string = f.properties.location_type ?? '';
      const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'location';
      item.description = locType;
      item.tooltip = `${name}\nType: ${locType || 'Unknown'}`;
      item.iconPath = new vscode.ThemeIcon(isSelected ? 'check' : 'circle-outline');
      return item;
    }

    // Annotation/shape feature
    const label = (props.label as string) ?? (props.name as string) ?? kind;
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'shape';
    item.description = kind.toLowerCase();
    const geomType: string = f.geometry.type;
    item.tooltip = `${label}\nType: ${kind}\nGeometry: ${geomType}`;
    item.iconPath = new vscode.ThemeIcon(isSelected ? 'check' : 'circle-outline');
    return item;
  }

  private createResultItem(layer: ResultLayer): vscode.TreeItem {
    const item = new vscode.TreeItem(
      layer.name,
      vscode.TreeItemCollapsibleState.None
    );

    item.description = new Date(layer.createdAt).toLocaleTimeString();
    item.tooltip = `${layer.name}\nTool: ${layer.toolName}\nCreated: ${new Date(layer.createdAt).toLocaleString()}`;

    // Artifact results: click opens in text editor
    if (layer.artifactHref) {
      item.contextValue = 'artifactResultLayer';
      item.command = {
        command: 'debrief.openResultArtifact',
        title: 'Open Result',
        arguments: [layer],
      };
      item.iconPath = new vscode.ThemeIcon('file');
    } else {
      item.contextValue = 'resultLayer';
      // Selection state
      const isSelected = this._isFeatureSelected(layer.id);
      item.iconPath = new vscode.ThemeIcon(
        isSelected ? 'check' : 'circle-outline'
      );
    }

    return item;
  }
}
