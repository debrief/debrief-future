/**
 * SensorBearingLayer - Leaflet custom canvas layer for sensor rendering.
 *
 * Renders sensor bearing lines, ambiguous bearings, sensor arcs,
 * snail mode time-trail fading, and contact labels on the map.
 *
 * Uses Leaflet's Canvas renderer directly for performance with
 * large contact datasets (1000+ bearing lines).
 *
 * @see research.md RQ-1 (Canvas vs SVG decision)
 * @see research.md RQ-2 (React integration pattern)
 */

import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SensorData } from '@debrief/schemas';
import type { DisplayMode } from '../utils/types';
import {
  prepareSensorContacts,
  calculateLabelPosition,
  labelLocationToTextAlign,
  applySnailFade,
  calculateSnailProportion,
  LINE_STYLE_DASH_ARRAYS,
  computeArcPath,
  type SensorRenderContact,
  type SensorArcRenderData,
  type SensorBearingLayerProps,
} from './sensor-utils';

// ── Internal layer type ─────────────────────────────────────────────

interface SensorCanvasLayerInstance extends L.Layer {
  _canvas: HTMLCanvasElement | null;
  _ctx: CanvasRenderingContext2D | null;
  _contacts: SensorRenderContact[];
  _arcs: SensorArcRenderData[];
  _currentTime: number | undefined;
  _displayMode: DisplayMode;
  _trailLengthMs: number;
  _update(): void;
  _draw(map: L.Map, ctx: CanvasRenderingContext2D): void;
  setData(
    contacts: SensorRenderContact[],
    arcs: SensorArcRenderData[],
    currentTime: number | undefined,
    displayMode: DisplayMode,
    trailLengthMs: number,
  ): void;
}

// ── Custom Leaflet Canvas Layer ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const SensorCanvasLayer: new () => SensorCanvasLayerInstance = L.Layer.extend({
  initialize(this: SensorCanvasLayerInstance) {
    L.Util.setOptions(this, {});
    this._contacts = [];
    this._arcs = [];
    this._canvas = null;
    this._ctx = null;
    this._currentTime = undefined;
    this._displayMode = 'full';
    this._trailLengthMs = 0;
  },

  onAdd(this: SensorCanvasLayerInstance, map: L.Map) {
    const size = map.getSize();
    const canvas = L.DomUtil.create('canvas', 'sensor-bearing-canvas') as HTMLCanvasElement;
    canvas.width = size.x;
    canvas.height = size.y;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.setAttribute('data-testid', 'sensor-bearing-layer');

    const pane = map.getPane('overlayPane');
    if (pane) pane.appendChild(canvas);
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');

    // eslint-disable-next-line no-restricted-syntax
    map.on('moveend zoomend resize', this._update as L.LeafletEventHandlerFn, this);
    this._update();
    return this;
  },

  onRemove(this: SensorCanvasLayerInstance, map: L.Map) {
    // eslint-disable-next-line no-restricted-syntax
    map.off('moveend zoomend resize', this._update as L.LeafletEventHandlerFn, this);
    if (this._canvas?.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;
  },

  _update(this: SensorCanvasLayerInstance) {
    // eslint-disable-next-line no-restricted-syntax
    const map = (this as unknown as { _map: L.Map | undefined })._map;
    if (!map || !this._canvas || !this._ctx) return;

    const size = map.getSize();
    const canvas = this._canvas;
    const ctx = this._ctx;

    // Resize canvas if needed
    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
    }

    // Position canvas to match the map's pixel origin
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    // Clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._draw(map, ctx);
  },

  _draw(
    this: SensorCanvasLayerInstance,
    map: L.Map,
    ctx: CanvasRenderingContext2D,
  ) {
    const contacts = this._contacts;
    const arcs = this._arcs;
    const currentTime = this._currentTime;
    const displayMode = this._displayMode;
    const trailLengthMs = this._trailLengthMs;
    const bounds = map.getBounds();

    // Helper to project [lon, lat] to pixel [x, y] relative to canvas
    const project = (lonLat: [number, number]): [number, number] => {
      const pt = map.latLngToContainerPoint([lonLat[1], lonLat[0]]);
      return [pt.x, pt.y];
    };

    // ── Draw sensor arcs ──────────────────────────────────────────
    for (const arc of arcs) {
      // Time filter for arcs
      if (currentTime !== undefined) {
        if (currentTime < arc.startTimeMs || currentTime > arc.endTimeMs) continue;
      }

      const pathPoints = computeArcPath(
        arc.origin,
        arc.leftAngle,
        arc.rightAngle,
        arc.innerRange,
        arc.outerRange,
        project,
      );

      if (pathPoints.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(pathPoints[0]![0], pathPoints[0]![1]);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i]![0], pathPoints[i]![1]);
      }
      ctx.closePath();

      // Semi-transparent fill
      ctx.fillStyle = arc.color;
      ctx.globalAlpha = arc.fillOpacity;
      ctx.fill();

      // Outline
      ctx.globalAlpha = 1;
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();
    }

    // ── Draw bearing lines ────────────────────────────────────────
    for (const contact of contacts) {
      // Viewport culling: skip contacts whose origin is outside map bounds
      if (!bounds.contains([contact.origin[1], contact.origin[0]])) continue;

      // Calculate snail mode colour
      let primaryColor = contact.color;
      let ambiguousColor = contact.darkenedColor;

      if (displayMode === 'trail' && currentTime !== undefined && trailLengthMs > 0) {
        const proportion = calculateSnailProportion(contact.timeMs, currentTime, trailLengthMs);
        if (proportion === null) continue;
        primaryColor = applySnailFade(contact.color, proportion);
        ambiguousColor = applySnailFade(contact.darkenedColor, proportion);
      }

      const originPx = project(contact.origin);
      const farEndPx = project(contact.farEnd);

      // Set line style
      const dashArray = LINE_STYLE_DASH_ARRAYS[contact.lineStyle] ?? null;
      ctx.setLineDash(dashArray ?? []);
      ctx.lineWidth = contact.lineThickness;

      // Draw primary bearing line
      ctx.beginPath();
      ctx.moveTo(originPx[0], originPx[1]);
      ctx.lineTo(farEndPx[0], farEndPx[1]);
      ctx.strokeStyle = primaryColor;
      ctx.globalAlpha = 1;
      ctx.stroke();

      // Draw ambiguous bearing line (darker shade)
      if (contact.hasAmbiguous && contact.ambiguousFarEnd) {
        const ambiguousPx = project(contact.ambiguousFarEnd);
        ctx.beginPath();
        ctx.moveTo(originPx[0], originPx[1]);
        ctx.lineTo(ambiguousPx[0], ambiguousPx[1]);
        ctx.strokeStyle = ambiguousColor;
        ctx.stroke();
      }

      // Draw label
      if (contact.showLabel && contact.label) {
        const labelPos = calculateLabelPosition(originPx, farEndPx, contact.putLabelAt);
        const textAlign = labelLocationToTextAlign(contact.labelLocation);

        ctx.font = '11px sans-serif';
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = primaryColor;

        // Small offset to avoid overlapping the line
        const offsetX = textAlign === 'left' ? 4 : textAlign === 'right' ? -4 : 0;
        ctx.fillText(contact.label, labelPos[0] + offsetX, labelPos[1]);
      }
    }

    // Reset canvas state
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  },

  setData(
    this: SensorCanvasLayerInstance,
    contacts: SensorRenderContact[],
    arcs: SensorArcRenderData[],
    currentTime: number | undefined,
    displayMode: DisplayMode,
    trailLengthMs: number,
  ) {
    this._contacts = contacts;
    this._arcs = arcs;
    this._currentTime = currentTime;
    this._displayMode = displayMode;
    this._trailLengthMs = trailLengthMs;
    this._update();
  },
// eslint-disable-next-line no-restricted-syntax
}) as unknown as new () => SensorCanvasLayerInstance;

// ── React Component ─────────────────────────────────────────────────

export function SensorBearingLayer({
  feature,
  currentTime,
  displayMode = 'full',
  hiddenIds,
}: SensorBearingLayerProps) {
  const map = useMap();
  const layerRef = useRef<SensorCanvasLayerInstance | null>(null);

  // Get sensors from feature
  const sensors = useMemo(() => {
    // eslint-disable-next-line no-restricted-syntax
    const props = feature.properties as unknown as Record<string, unknown>;
    const sensorArray = props.sensors as SensorData[] | undefined;
    if (!sensorArray || sensorArray.length === 0) return [];

    const featureId = String(feature.id ?? '');

    return sensorArray.filter((s) => {
      // Skip hidden sensors
      if (hiddenIds?.has(`${featureId}/sensors/${s.name}`)) return false;
      // Skip invisible sensors
      if (s.visible === false) return false;
      return true;
    });
  }, [feature, hiddenIds]);

  // Compute trail length from feature time extent
  const trailLengthMs = useMemo(() => {
    // eslint-disable-next-line no-restricted-syntax
    const props = feature.properties as unknown as Record<string, unknown>;
    const positions = props.positions as Array<{ time: string }> | undefined;
    if (!positions || positions.length < 2) return 0;
    const start = Date.parse(positions[0]!.time);
    const end = Date.parse(positions[positions.length - 1]!.time);
    // Trail length = 1/4 of total track duration (reasonable default)
    return (end - start) / 4;
  }, [feature]);

  // Prepare all contacts for rendering
  const renderContacts = useMemo(() => {
    const allContacts: SensorRenderContact[] = [];
    for (const sensor of sensors) {
      const prepared = prepareSensorContacts(
        sensor,
        feature,
        currentTime,
        displayMode,
        trailLengthMs,
      );
      allContacts.push(...prepared);
    }
    return allContacts;
  }, [sensors, feature, currentTime, displayMode, trailLengthMs]);

  // Prepare arc data (placeholder — arcs come from a different data source)
  const renderArcs = useMemo<SensorArcRenderData[]>(() => [], []);

  // Create and manage the Leaflet canvas layer
  useEffect(() => {
    const layer = new SensorCanvasLayer();
    layerRef.current = layer;
    layer.addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  // Update layer data when inputs change
  useEffect(() => {
    layerRef.current?.setData(
      renderContacts,
      renderArcs,
      currentTime,
      displayMode,
      trailLengthMs,
    );
  }, [renderContacts, renderArcs, currentTime, displayMode, trailLengthMs]);

  return null;
}
