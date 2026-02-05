/**
 * Track Renderer - Renders vessel tracks on the Leaflet map
 *
 * Features:
 * - Track line rendering with polylines
 * - Position symbol rendering at intervals (Feature: 048)
 * - Position label rendering (Feature: 048)
 * - Temporal state with highlight markers (Feature: 039)
 */

import * as L from 'leaflet';
import type { Track, PositionStyle } from '../messages';
import { findNearestPointIndex, sliceTrackToTime } from './temporalUtils';
import {
  computeAllPositionStyles,
  type ResolvedPositionStyle,
} from './intervalUtils';

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

// Highlight marker style
const HIGHLIGHT_MARKER_OPTS: L.CircleMarkerOptions = {
  radius: 6,
  weight: 2,
  opacity: 1,
  fillOpacity: 0.9,
};

// Position symbol marker style
const POSITION_SYMBOL_OPTS: L.CircleMarkerOptions = {
  radius: 4,
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8,
};

// Default position style when none is specified
const DEFAULT_POSITION_STYLE: PositionStyle = {
  show_symbol: false,
  symbol: 'circle',
  show_label: false,
};

export class TrackRenderer {
  private map: L.Map;
  private trackLayers: Map<string, L.Polyline> = new Map();
  private labelLayers: Map<string, L.Marker> = new Map();
  private highlightMarkers: Map<string, L.CircleMarker> = new Map();
  private tracks: Track[] = [];
  private selectedIds: Set<string> = new Set();
  private customColors: Record<string, string> = {};
  private colorIndex = 0;

  // Temporal state (Feature: 039)
  private cachedTimestamps: Map<string, number[]> = new Map();
  private cachedFullLatLngs: Map<string, L.LatLng[]> = new Map();
  private currentTime: number | null = null;
  private displayMode: 'full' | 'trail' = 'full';

  // Position symbol/label layers (Feature: 048)
  private positionSymbolLayers: Map<string, L.LayerGroup> = new Map();
  private positionLabelLayers: Map<string, L.LayerGroup> = new Map();

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

    // If temporal state is active, apply it to the newly rendered tracks
    if (this.currentTime !== null) {
      this.applyTemporalState();
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
    for (const marker of this.highlightMarkers.values()) {
      this.map.removeLayer(marker);
    }
    // Clear position symbol/label layers (Feature: 048)
    for (const layer of this.positionSymbolLayers.values()) {
      this.map.removeLayer(layer);
    }
    for (const layer of this.positionLabelLayers.values()) {
      this.map.removeLayer(layer);
    }
    this.trackLayers.clear();
    this.labelLayers.clear();
    this.highlightMarkers.clear();
    this.positionSymbolLayers.clear();
    this.positionLabelLayers.clear();
    this.cachedTimestamps.clear();
    this.cachedFullLatLngs.clear();
    this.tracks = [];
  }

  /**
   * Set current time for temporal track rendering (Feature: 039).
   * Updates all tracks to show their state at the given time.
   */
  setCurrentTime(time: number): void {
    this.currentTime = time;
    this.applyTemporalState();
  }

  /**
   * Set display mode for temporal track rendering (Feature: 039).
   * 'full' = entire track + highlight marker; 'trail' = snail-trail to current time.
   */
  setDisplayMode(mode: 'full' | 'trail'): void {
    this.displayMode = mode;
    if (this.currentTime !== null) {
      this.applyTemporalState();
    }
  }

  /**
   * Clear temporal state — restore static full-track rendering (Feature: 039).
   */
  clearTemporalState(): void {
    this.currentTime = null;

    // Remove all highlight markers
    for (const marker of this.highlightMarkers.values()) {
      this.map.removeLayer(marker);
    }
    this.highlightMarkers.clear();

    // Restore full polylines
    for (const [trackId, layer] of this.trackLayers) {
      const fullLatLngs = this.cachedFullLatLngs.get(trackId);
      if (fullLatLngs) {
        layer.setLatLngs(fullLatLngs);
      }
    }
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
    const highlight = this.highlightMarkers.get(trackId);
    const positionSymbols = this.positionSymbolLayers.get(trackId);
    const positionLabels = this.positionLabelLayers.get(trackId);

    if (visible) {
      if (layer && !this.map.hasLayer(layer)) {
        this.map.addLayer(layer);
      }
      if (label && !this.map.hasLayer(label)) {
        this.map.addLayer(label);
      }
      if (highlight && !this.map.hasLayer(highlight)) {
        this.map.addLayer(highlight);
      }
      // Feature: 048 - Position symbols/labels
      if (positionSymbols && !this.map.hasLayer(positionSymbols)) {
        this.map.addLayer(positionSymbols);
      }
      if (positionLabels && !this.map.hasLayer(positionLabels)) {
        this.map.addLayer(positionLabels);
      }
    } else {
      if (layer) {
        this.map.removeLayer(layer);
      }
      if (label) {
        this.map.removeLayer(label);
      }
      if (highlight) {
        this.map.removeLayer(highlight);
      }
      // Feature: 048 - Position symbols/labels
      if (positionSymbols) {
        this.map.removeLayer(positionSymbols);
      }
      if (positionLabels) {
        this.map.removeLayer(positionLabels);
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

    // Update highlight marker color too
    const highlight = this.highlightMarkers.get(trackId);
    if (highlight) {
      highlight.setStyle({ color, fillColor: color });
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

    // Cache full coordinates for temporal restore
    this.cachedFullLatLngs.set(track.id, latLngs);

    // Cache parsed timestamps (ISO → epoch ms) for temporal algorithms
    if (track.times && track.times.length > 0) {
      this.cachedTimestamps.set(
        track.id,
        track.times.map((t) => new Date(t).getTime())
      );
    }

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

    // Add position symbols and labels (Feature: 048)
    this.renderPositionSymbolsAndLabels(track, latLngs, color);
  }

  /**
   * Apply temporal state to all tracks (Feature: 039).
   * Called when currentTime or displayMode changes.
   */
  private applyTemporalState(): void {
    if (this.currentTime === null) return;

    for (const track of this.tracks) {
      if (!track.visible) continue;

      const timestamps = this.cachedTimestamps.get(track.id);
      const fullLatLngs = this.cachedFullLatLngs.get(track.id);
      if (!timestamps || !fullLatLngs || timestamps.length === 0) continue;

      const polyline = this.trackLayers.get(track.id);
      if (!polyline) continue;

      const color = this.getTrackColor(track);
      const nearestIdx = findNearestPointIndex(timestamps, this.currentTime);
      if (nearestIdx < 0) continue;

      if (this.displayMode === 'trail') {
        // Snail-trail: show start → currentTime
        const coords = track.geometry.coordinates as [number, number][];
        const sliced = sliceTrackToTime(coords, timestamps, this.currentTime);
        if (sliced.length > 0) {
          const trailLatLngs = sliced.map((c) => L.latLng(c[1], c[0]));
          polyline.setLatLngs(trailLatLngs);
        }
        // Remove highlight marker in trail mode
        this.removeHighlightMarker(track.id);
      } else {
        // Full mode: show entire track + highlight marker at current position
        polyline.setLatLngs(fullLatLngs);
        const pos = fullLatLngs[nearestIdx];
        if (pos) {
          this.updateHighlightMarker(track.id, pos, color);
        }
      }
    }
  }

  private updateHighlightMarker(
    trackId: string,
    position: L.LatLng,
    color: string
  ): void {
    let marker = this.highlightMarkers.get(trackId);
    if (marker) {
      marker.setLatLng(position);
      marker.setStyle({ color, fillColor: color });
    } else {
      marker = L.circleMarker(position, {
        ...HIGHLIGHT_MARKER_OPTS,
        color,
        fillColor: color,
      });
      marker.addTo(this.map);
      this.highlightMarkers.set(trackId, marker);
    }
  }

  private removeHighlightMarker(trackId: string): void {
    const marker = this.highlightMarkers.get(trackId);
    if (marker) {
      this.map.removeLayer(marker);
      this.highlightMarkers.delete(trackId);
    }
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

  // ============================================================================
  // Position Symbol & Label Rendering (Feature: 048)
  // ============================================================================

  /**
   * Render position symbols and labels based on styling configuration.
   * Implements the cascade: default_position_style → intervals → overrides
   */
  private renderPositionSymbolsAndLabels(
    track: Track,
    latLngs: L.LatLng[],
    color: string
  ): void {
    // Get position styling configuration
    const defaultStyle = track.defaultPositionStyle ?? DEFAULT_POSITION_STYLE;
    const symbolInterval = track.symbolInterval ?? null;
    const labelInterval = track.labelInterval ?? null;
    const overrides = track.positionStyleOverrides ?? null;

    // Build position array from times
    const positions = track.times.map((time) => ({ time }));

    // Compute resolved styles for all positions
    const resolvedStyles = computeAllPositionStyles(
      positions,
      defaultStyle,
      symbolInterval,
      labelInterval,
      overrides
    );

    // Create layer groups for symbols and labels
    const symbolGroup = L.layerGroup();
    const labelGroup = L.layerGroup();

    // Render each position based on resolved style
    for (let i = 0; i < latLngs.length; i++) {
      const style = resolvedStyles[i];
      if (!style) continue;

      const pos = latLngs[i];

      // Render symbol if enabled
      if (style.showSymbol) {
        const marker = this.createPositionSymbol(pos, style, color);
        symbolGroup.addLayer(marker);
      }

      // Render label if enabled
      if (style.showLabel && style.label) {
        const label = this.createPositionLabel(pos, style.label);
        labelGroup.addLayer(label);
      }
    }

    // Add to map if track is visible
    if (track.visible) {
      symbolGroup.addTo(this.map);
      labelGroup.addTo(this.map);
    }

    // Store layer groups for visibility control
    this.positionSymbolLayers.set(track.id, symbolGroup);
    this.positionLabelLayers.set(track.id, labelGroup);
  }

  /**
   * Create a position symbol marker.
   */
  private createPositionSymbol(
    position: L.LatLng,
    style: ResolvedPositionStyle,
    color: string
  ): L.CircleMarker {
    // For now, all shapes render as circle markers
    // Future: support square and triangle shapes
    return L.circleMarker(position, {
      ...POSITION_SYMBOL_OPTS,
      color,
      fillColor: color,
    });
  }

  /**
   * Create a position label marker.
   */
  private createPositionLabel(position: L.LatLng, text: string): L.Marker {
    const icon = L.divIcon({
      className: 'position-label',
      html: `<span>${text}</span>`,
      iconSize: [80, 16],
      iconAnchor: [-5, 8],
    });

    return L.marker(position, {
      icon,
      interactive: false,
    });
  }
}
