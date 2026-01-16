/**
 * Layers Tree Provider - Sidebar tree view for layer management
 *
 * Displays source tracks, reference locations, and result layers
 * with visibility controls.
 */

import * as vscode from 'vscode';
import type { Track, ReferenceLocation } from '../types/plot';
import type { ResultLayer } from '../types/tool';

type LayerItem =
  | { type: 'header'; label: string; id: string }
  | { type: 'track'; track: Track }
  | { type: 'location'; location: ReferenceLocation }
  | { type: 'result'; layer: ResultLayer };

export class LayersTreeProvider implements vscode.TreeDataProvider<LayerItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    LayerItem | undefined | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tracks: Track[] = [];
  private locations: ReferenceLocation[] = [];
  private resultLayers: ResultLayer[] = [];

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
      case 'result':
        return this.createResultItem(element.layer);
    }
  }

  /**
   * Get children for an element
   */
  async getChildren(element?: LayerItem): Promise<LayerItem[]> {
    if (!element) {
      // Root level: return headers
      const items: LayerItem[] = [];

      if (this.tracks.length > 0 || this.locations.length > 0) {
        items.push({ type: 'header', label: 'Source Data', id: 'source' });
      }

      if (this.resultLayers.length > 0) {
        items.push({ type: 'header', label: 'Results', id: 'results' });
      }

      return items;
    }

    if (element.type === 'header') {
      if (element.id === 'source') {
        return [
          ...this.tracks.map(
            (track): LayerItem => ({ type: 'track', track })
          ),
          ...this.locations.map(
            (location): LayerItem => ({ type: 'location', location })
          ),
        ];
      }

      if (element.id === 'results') {
        return this.resultLayers.map(
          (layer): LayerItem => ({ type: 'result', layer })
        );
      }
    }

    return [];
  }

  /**
   * Get parent of an element
   */
  getParent(element: LayerItem): vscode.ProviderResult<LayerItem> {
    if (element.type === 'header') {
      return undefined;
    }

    if (element.type === 'track' || element.type === 'location') {
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
    item.tooltip = `${track.name}\nPlatform: ${track.platformType ?? 'Unknown'}\nPoints: ${track.geometry.coordinates.length}`;

    // Checkbox icon based on visibility
    item.iconPath = new vscode.ThemeIcon(
      track.visible ? 'eye' : 'eye-closed'
    );

    // Color indicator
    if (track.color) {
      item.resourceUri = vscode.Uri.parse(`color:${track.color}`);
    }

    // Command to toggle visibility
    item.command = {
      command: 'debrief.toggleLayerVisibility',
      title: 'Toggle Visibility',
      arguments: [{ layerId: `track-${track.id}` }],
    };

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

    item.iconPath = new vscode.ThemeIcon(
      location.visible ? 'location' : 'circle-outline'
    );

    item.command = {
      command: 'debrief.toggleLayerVisibility',
      title: 'Toggle Visibility',
      arguments: [{ layerId: `location-${location.id}` }],
    };

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

    item.iconPath = new vscode.ThemeIcon(
      layer.visible ? 'symbol-misc' : 'circle-outline'
    );

    item.command = {
      command: 'debrief.toggleLayerVisibility',
      title: 'Toggle Visibility',
      arguments: [{ layerId: layer.id }],
    };

    return item;
  }
}
