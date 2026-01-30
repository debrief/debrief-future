/**
 * Result Renderer - Renders analysis result layers on the Leaflet map
 */

import * as L from 'leaflet';
import type { LayerStyle } from '../messages';

// Self-contained GeoJSON types to avoid external dependency
interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown> | null;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

interface ResultLayerData {
  layer: L.GeoJSON;
  name: string;
  visible: boolean;
  baseWeight: number;
}

export class ResultRenderer {
  private map: L.Map;
  private resultLayers: Map<string, ResultLayerData> = new Map();
  private selectedLayerIds: Set<string> = new Set();

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

    const baseWeight = style.strokeWidth;

    // Create GeoJSON layer with styling
    const geoJsonLayer = L.geoJSON(features, {
      style: () => ({
        color: style.strokeColor,
        weight: baseWeight,
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
      onEachFeature: (feature, layer) => {
        const props = feature.properties ?? {};
        const label = (props.label as string)
          ?? (props.name as string)
          ?? (props.measurement_type as string)
          ?? name;
        layer.bindTooltip(label);
      },
    });

    // Add to map
    geoJsonLayer.addTo(this.map);

    // Store layer data
    this.resultLayers.set(id, {
      layer: geoJsonLayer,
      name,
      visible: true,
      baseWeight,
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
   * Update selection styling for result layers
   */
  setSelectedLayers(selectedIds: Set<string>): void {
    this.selectedLayerIds = selectedIds;
    for (const [id, data] of this.resultLayers) {
      const isSelected = selectedIds.has(id);
      data.layer.eachLayer((sub) => {
        if ('setStyle' in sub && typeof (sub as L.Path).setStyle === 'function') {
          (sub as L.Path).setStyle({
            weight: isSelected ? data.baseWeight + 3 : data.baseWeight,
            opacity: isSelected ? 1 : 0.8,
          });
        }
        // For circle markers, also increase radius
        if (sub instanceof L.CircleMarker) {
          sub.setRadius(isSelected ? 8 : 5);
        }
      });
    }
  }

  /**
   * Get layer IDs
   */
  getLayerIds(): string[] {
    return Array.from(this.resultLayers.keys());
  }
}
