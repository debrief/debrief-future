/**
 * Track Renderer - Renders vessel tracks on the Leaflet map
 */

import * as L from 'leaflet';
import type { Track } from '../messages';

// Default color palette
const DEFAULT_COLORS = [
  '#e41a1c',
  '#377eb8',
  '#4daf4a',
  '#984ea3',
  '#ff7f00',
  '#ffff33',
  '#a65628',
  '#f781bf',
];

export class TrackRenderer {
  private map: L.Map;
  private trackLayers: Map<string, L.Polyline> = new Map();
  private labelLayers: Map<string, L.Marker> = new Map();
  private tracks: Track[] = [];
  private selectedIds: Set<string> = new Set();
  private customColors: Record<string, string> = {};
  private colorIndex = 0;

  constructor(map: L.Map) {
    this.map = map;
  }

  /**
   * Render tracks on the map
   */
  renderTracks(tracks: Track[]): void {
    // Clear existing
    this.clear();
    this.tracks = tracks;
    this.colorIndex = 0;

    for (const track of tracks) {
      this.renderTrack(track);
    }
  }

  /**
   * Clear all tracks
   */
  clear(): void {
    for (const layer of this.trackLayers.values()) {
      this.map.removeLayer(layer);
    }
    for (const layer of this.labelLayers.values()) {
      this.map.removeLayer(layer);
    }
    this.trackLayers.clear();
    this.labelLayers.clear();
    this.tracks = [];
  }

  /**
   * Set selected tracks
   */
  setSelectedTracks(selectedIds: Set<string>): void {
    this.selectedIds = selectedIds;

    for (const [trackId, layer] of this.trackLayers) {
      const isSelected = selectedIds.has(trackId);
      this.updateTrackStyle(trackId, layer, isSelected);
    }
  }

  /**
   * Set track visibility
   */
  setTrackVisibility(trackId: string, visible: boolean): void {
    const layer = this.trackLayers.get(trackId);
    const label = this.labelLayers.get(trackId);

    if (visible) {
      if (layer && !this.map.hasLayer(layer)) {
        this.map.addLayer(layer);
      }
      if (label && !this.map.hasLayer(label)) {
        this.map.addLayer(label);
      }
    } else {
      if (layer) {
        this.map.removeLayer(layer);
      }
      if (label) {
        this.map.removeLayer(label);
      }
    }

    // Update track state
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.visible = visible;
    }
  }

  /**
   * Set track color
   */
  setTrackColor(trackId: string, color: string): void {
    this.customColors[trackId] = color;
    const layer = this.trackLayers.get(trackId);

    if (layer) {
      layer.setStyle({ color });
    }

    // Update track state
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.color = color;
    }
  }

  /**
   * Get custom track colors
   */
  getTrackColors(): Record<string, string> {
    return { ...this.customColors };
  }

  /**
   * Set track colors (from saved state)
   */
  setTrackColors(colors: Record<string, string>): void {
    this.customColors = { ...colors };
  }

  /**
   * Get track at a given point
   */
  getTrackAtPoint(_latlng: L.LatLng): Track | null {
    // This would need hit testing - simplified for now
    return null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private renderTrack(track: Track): void {
    // Convert coordinates to LatLng
    const latLngs = track.geometry.coordinates.map(
      (coord) => L.latLng(coord[1], coord[0])
    );

    // Get color
    const color = this.getTrackColor(track);

    // Create polyline
    const polyline = L.polyline(latLngs, {
      color,
      weight: 2,
      opacity: 0.8,
      className: `track-${track.id}`,
    });

    // Add click handler
    polyline.on('click', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();

      // Dispatch custom event for selection manager
      const event = new CustomEvent('trackClick', {
        detail: { trackId: track.id, originalEvent: e.originalEvent },
      });
      document.dispatchEvent(event);
    });

    // Add hover handlers
    polyline.on('mouseover', () => {
      if (!this.selectedIds.has(track.id)) {
        polyline.setStyle({ weight: 3, opacity: 1 });
      }
      this.showTooltip(track, polyline);
    });

    polyline.on('mouseout', () => {
      if (!this.selectedIds.has(track.id)) {
        polyline.setStyle({ weight: 2, opacity: 0.8 });
      }
      polyline.closeTooltip();
    });

    // Add to map
    if (track.visible) {
      polyline.addTo(this.map);
    }

    this.trackLayers.set(track.id, polyline);

    // Add label at start point
    this.addTrackLabel(track, latLngs);
  }

  private addTrackLabel(track: Track, latLngs: L.LatLng[]): void {
    if (latLngs.length === 0) {
      return;
    }

    const startPoint = latLngs[0];

    const icon = L.divIcon({
      className: 'track-label',
      html: `<span>${track.name}</span>`,
      iconSize: [100, 20],
      iconAnchor: [-5, 10],
    });

    const marker = L.marker(startPoint, {
      icon,
      interactive: false,
    });

    if (track.visible) {
      marker.addTo(this.map);
    }

    this.labelLayers.set(track.id, marker);
  }

  private showTooltip(track: Track, layer: L.Polyline): void {
    const content = `
      <div class="track-tooltip">
        <div class="tooltip-title">${track.name}</div>
        <div class="tooltip-row">
          <span class="tooltip-label">Platform:</span>
          <span class="tooltip-value">${track.platformType ?? 'Unknown'}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Points:</span>
          <span class="tooltip-value">${track.geometry.coordinates.length.toLocaleString()}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Time:</span>
          <span class="tooltip-value">${this.formatTimeRange(track.startTime, track.endTime)}</span>
        </div>
      </div>
    `;

    layer.bindTooltip(content, {
      className: 'track-tooltip-container',
      permanent: false,
      sticky: true,
    });

    layer.openTooltip();
  }

  private formatTimeRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startTime = startDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endTime = endDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${startTime} - ${endTime}`;
  }

  private getTrackColor(track: Track): string {
    // Priority: custom color > track color > default palette
    if (this.customColors[track.id]) {
      return this.customColors[track.id];
    }

    if (track.color) {
      return track.color;
    }

    const color = DEFAULT_COLORS[this.colorIndex % DEFAULT_COLORS.length];
    this.colorIndex++;
    return color;
  }

  private updateTrackStyle(
    trackId: string,
    layer: L.Polyline,
    isSelected: boolean
  ): void {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) {
      return;
    }

    const color = this.getTrackColor(track);

    if (isSelected) {
      layer.setStyle({
        weight: 4,
        opacity: 1,
        color,
      });

      // Add glow class
      const element = layer.getElement();
      if (element) {
        element.classList.add('track-selected');
      }
    } else {
      layer.setStyle({
        weight: 2,
        opacity: 0.8,
        color,
      });

      // Remove glow class
      const element = layer.getElement();
      if (element) {
        element.classList.remove('track-selected');
      }
    }
  }
}
