/**
 * Result Renderer - Renders analysis result layers on the Leaflet map
 */

import * as L from 'leaflet';
import type { FeatureCollection } from 'geojson';
import type { LayerStyle } from '../messages';

interface ResultLayerData {
  layer: L.GeoJSON;
  name: string;
  visible: boolean;
}

export class ResultRenderer {
  private map: L.Map;
  private resultLayers: Map<string, ResultLayerData> = new Map();

  constructor(map: L.Map) {
    this.map = map;
  }

  /**
   * Add a result layer
   */
  addLayer(
    id: string,
    name: string,
    features: FeatureCollection,
    style: LayerStyle
  ): void {
    // Remove existing layer with same ID
    this.removeLayer(id);

    // Create GeoJSON layer with styling
    const geoJsonLayer = L.geoJSON(features, {
      style: () => ({
        color: style.strokeColor,
        weight: style.strokeWidth,
        dashArray: style.dashArray?.join(','),
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity ?? 0.2,
        opacity: 0.8,
      }),
      pointToLayer: (_feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 5,
          fillColor: style.fillColor ?? style.strokeColor,
          fillOpacity: style.fillOpacity ?? 0.8,
          color: style.strokeColor,
          weight: 1,
        });
      },
    });

    // Add to map
    geoJsonLayer.addTo(this.map);

    // Store layer data
    this.resultLayers.set(id, {
      layer: geoJsonLayer,
      name,
      visible: true,
    });
  }

  /**
   * Remove a result layer
   */
  removeLayer(id: string): void {
    const data = this.resultLayers.get(id);
    if (data) {
      this.map.removeLayer(data.layer);
      this.resultLayers.delete(id);
    }
  }

  /**
   * Clear all result layers
   */
  clear(): void {
    for (const [id] of this.resultLayers) {
      this.removeLayer(id);
    }
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(id: string, visible: boolean): void {
    const data = this.resultLayers.get(id);
    if (!data) {
      return;
    }

    if (visible && !this.map.hasLayer(data.layer)) {
      this.map.addLayer(data.layer);
    } else if (!visible && this.map.hasLayer(data.layer)) {
      this.map.removeLayer(data.layer);
    }

    data.visible = visible;
  }

  /**
   * Get layer IDs
   */
  getLayerIds(): string[] {
    return Array.from(this.resultLayers.keys());
  }
}
