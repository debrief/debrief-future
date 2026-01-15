/**
 * Location Renderer - Renders reference locations on the Leaflet map
 */

import * as L from 'leaflet';
import type { ReferenceLocation } from '../messages';

export class LocationRenderer {
  private map: L.Map;
  private locationLayers: Map<string, L.CircleMarker> = new Map();
  private locations: ReferenceLocation[] = [];
  private selectedIds: Set<string> = new Set();

  constructor(map: L.Map) {
    this.map = map;
  }

  /**
   * Render locations on the map
   */
  renderLocations(locations: ReferenceLocation[]): void {
    // Clear existing
    this.clear();
    this.locations = locations;

    for (const location of locations) {
      this.renderLocation(location);
    }
  }

  /**
   * Clear all locations
   */
  clear(): void {
    for (const layer of this.locationLayers.values()) {
      this.map.removeLayer(layer);
    }
    this.locationLayers.clear();
    this.locations = [];
  }

  /**
   * Set selected locations
   */
  setSelectedLocations(selectedIds: Set<string>): void {
    this.selectedIds = selectedIds;

    for (const [locationId, marker] of this.locationLayers) {
      const isSelected = selectedIds.has(locationId);
      this.updateLocationStyle(marker, isSelected);
    }
  }

  /**
   * Set location visibility
   */
  setLocationVisibility(locationId: string, visible: boolean): void {
    const layer = this.locationLayers.get(locationId);

    if (visible) {
      if (layer && !this.map.hasLayer(layer)) {
        this.map.addLayer(layer);
      }
    } else {
      if (layer) {
        this.map.removeLayer(layer);
      }
    }

    // Update location state
    const location = this.locations.find((l) => l.id === locationId);
    if (location) {
      location.visible = visible;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private renderLocation(location: ReferenceLocation): void {
    const [lng, lat] = location.geometry.coordinates;
    const latLng = L.latLng(lat, lng);

    // Create circle marker
    const marker = L.circleMarker(latLng, {
      radius: 6,
      fillColor: '#ffffff',
      fillOpacity: 1,
      color: '#333333',
      weight: 2,
      className: `location-${location.id}`,
    });

    // Add click handler
    marker.on('click', (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();

      // Dispatch custom event for selection manager
      const event = new CustomEvent('locationClick', {
        detail: { locationId: location.id, originalEvent: e.originalEvent },
      });
      document.dispatchEvent(event);
    });

    // Add tooltip
    marker.bindTooltip(
      `<div class="location-tooltip">
        <strong>${location.name}</strong>
        ${location.locationType ? `<br/>${location.locationType}` : ''}
      </div>`,
      {
        permanent: false,
        className: 'location-tooltip-container',
      }
    );

    // Add to map
    if (location.visible) {
      marker.addTo(this.map);
    }

    this.locationLayers.set(location.id, marker);
  }

  private updateLocationStyle(marker: L.CircleMarker, isSelected: boolean): void {
    if (isSelected) {
      marker.setStyle({
        fillColor: '#0078d4',
        color: '#0078d4',
        radius: 8,
        weight: 3,
      });
    } else {
      marker.setStyle({
        fillColor: '#ffffff',
        color: '#333333',
        radius: 6,
        weight: 2,
      });
    }
  }
}
