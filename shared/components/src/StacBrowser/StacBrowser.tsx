/**
 * StacBrowser — top-level orchestrator for synchronized STAC catalog browsing.
 * Feature: 132-three-view-sync
 *
 * Composes FilterBar, ExerciseListView, MapView, and TimelineView
 * with shared filter state via BrowserFilterSlice.
 *
 * Uses GoldenLayout for a user-configurable panel layout with persistence.
 * Default layout: FilterBar at top (fixed), then a quadrant with
 * exercise list (top, full width), timeline (bottom-left), map (bottom-right).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  GoldenLayout,
  LayoutConfig,
  ResolvedLayoutConfig,
  type ComponentContainer,
} from 'golden-layout';
import { createRoot, type Root } from 'react-dom/client';
import { MapContainer, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LeafletMouseEvent } from 'leaflet';

import type { StacBrowserProps } from './types';
import type { StacBrowserItem } from '../filter-engine/types';
import type { ViewportPolygon } from '../utils/spatial-types';
import type { TemporalFilter } from '../TimelineView/types';
import { useBrowserFilter } from './useBrowserFilter';
import { FilterBar } from '../FilterBar';
import { ExerciseListView } from '../ExerciseListView';
import type { ExerciseListItem } from '../ExerciseListView/types';
import { ThumbnailPreview } from './ThumbnailPreview';
import { TimelineView } from '../TimelineView';
import { formatDateRange } from '../utils/timeline-helpers';
import type { Bounds } from '../utils/types';
import 'golden-layout/dist/css/goldenlayout-base.css';
import 'golden-layout/dist/css/themes/goldenlayout-light-theme.css';
import './StacBrowser.css';

// ─── Map helpers ──────────────────────────────────────────────────────────────

/** Convert [west, south, east, north] to Leaflet bounds. */
function bboxToBounds(bbox: [number, number, number, number]): LatLngBoundsExpression {
  const [west, south, east, north] = bbox;
  return [[south, west], [north, east]];
}

/** Compute combined Leaflet bounds for items with bbox. */
function combinedBounds(items: StacBrowserItem[]): LatLngBoundsExpression | null {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const item of items) {
    if (!item.bbox) continue;
    const [west, south, east, north] = item.bbox;
    minLng = Math.min(minLng, west);
    minLat = Math.min(minLat, south);
    maxLng = Math.max(maxLng, east);
    maxLat = Math.max(maxLat, north);
  }
  if (minLat === Infinity) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

/** Auto-fit map to bounds once on initial mount only. */
function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }): null {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (bounds && !fittedRef.current) {
      fittedRef.current = true;
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [20, 20] });
    }
  }, [map, bounds]);
  return null;
}

/** Debounced viewport change tracker. */
const VIEWPORT_DEBOUNCE_MS = 150;

function ViewportTracker({ onViewportChange }: { onViewportChange: (bounds: Bounds | null) => void }): null {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const emitViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const b = map.getBounds();
      if (!b || !b.isValid()) return;
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      onViewportChange([sw.lng, sw.lat, ne.lng, ne.lat]);
    } catch { /* map not ready */ }
  }, [onViewportChange]);

  const map = useMapEvents({
    moveend: () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(emitViewport, VIEWPORT_DEBOUNCE_MS);
    },
  });
  mapRef.current = map;

  useEffect(() => {
    timerRef.current = setTimeout(emitViewport, 50);
    return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── GoldenLayout panel type constants ────────────────────────────────────────
const PANEL_LIST = 'browser-list';
const PANEL_TIMELINE = 'browser-timeline';
const PANEL_MAP = 'browser-map';

// ─── Layout persistence ──────────────────────────────────────────────────────
const BROWSER_LAYOUT_KEY = 'debrief-browser-layout';
const BROWSER_LAYOUT_VERSION = 5;

const BROWSER_DEFAULT_LAYOUT: LayoutConfig = {
  settings: { popoutWholeStack: false },
  header: {
    // Analysts can collapse/resize panels but not close them
    close: false,
    popout: false,
  },
  root: {
    type: 'column',
    content: [
      // Top: Exercise list (preview is inline when an item is selected)
      {
        type: 'stack',
        height: 55,
        content: [
          {
            type: 'component',
            componentType: PANEL_LIST,
            title: 'Exercises',
          },
        ],
      },
      // Bottom row: Timeline + Map
      {
        type: 'row',
        height: 45,
        content: [
          {
            type: 'stack',
            width: 50,
            content: [
              {
                type: 'component',
                componentType: PANEL_TIMELINE,
                title: 'Timeline',
              },
            ],
          },
          {
            type: 'stack',
            width: 50,
            content: [
              {
                type: 'component',
                componentType: PANEL_MAP,
                title: 'Map',
              },
            ],
          },
        ],
      },
    ],
  },
};

function saveBrowserLayout(config: unknown): void {
  try {
    localStorage.setItem(BROWSER_LAYOUT_KEY, JSON.stringify({
      version: BROWSER_LAYOUT_VERSION,
      config,
    }));
  } catch { /* ignore */ }
}

function loadBrowserLayout(): unknown | null {
  try {
    const raw = localStorage.getItem(BROWSER_LAYOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; config?: unknown };
    if (parsed.version !== BROWSER_LAYOUT_VERSION) return null;
    return parsed.config;
  } catch {
    return null;
  }
}

function clearBrowserLayout(): void {
  try {
    localStorage.removeItem(BROWSER_LAYOUT_KEY);
  } catch { /* ignore */ }
}

// ─── Resizable split pane ───────────────────────────────────────────────────
const SPLIT_MIN_PCT = 20;
const SPLIT_MAX_PCT = 80;
const SPLIT_DEFAULT_PCT = 50;
const SPLIT_STORAGE_KEY = 'debrief-browser-split-pct';

function loadSplitPct(): number {
  try {
    const v = localStorage.getItem(SPLIT_STORAGE_KEY);
    if (v) { const n = Number(v); if (n >= SPLIT_MIN_PCT && n <= SPLIT_MAX_PCT) return n; }
  } catch { /* ignore */ }
  return SPLIT_DEFAULT_PCT;
}

function saveSplitPct(pct: number): void {
  try { localStorage.setItem(SPLIT_STORAGE_KEY, String(Math.round(pct))); } catch { /* ignore */ }
}

/** Horizontal resizable split pane for exercise list + preview. */
const ResizableSplitPane: React.FC<{ left: React.ReactNode; right: React.ReactNode }> = ({ left, right }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(loadSplitPct);

  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(SPLIT_MAX_PCT, Math.max(SPLIT_MIN_PCT, pct));
      setLeftPct(clamped);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Save after drag ends
      setLeftPct(prev => { saveSplitPct(prev); return prev; });
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ flex: `0 0 ${leftPct}%`, overflow: 'auto', minWidth: 0 }}>
        {left}
      </div>
      <div
        style={{
          flex: '0 0 4px',
          cursor: 'col-resize',
          background: 'var(--vscode-panel-border, #e0e0e0)',
        }}
        className="stac-browser__splitter"
        onMouseDown={onMouseDown}
        data-testid="stac-browser-splitter"
      />
      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {right}
      </div>
    </div>
  );
};

// ─── Context for passing props to panels ──────────────────────────────────────
interface BrowserPanelContext {
  filteredItems: readonly StacBrowserItem[];
  spatialFilteredItems: readonly StacBrowserItem[];
  onItemSelect?: (itemPath: string) => void;
  onItemHighlight?: (itemId: string) => void;
  highlightedItemId: string | null;
  colorMap?: ReadonlyMap<string, string>;
  onViewportChange: (bounds: Bounds | null) => void;
  onTemporalFilterChange: (filter: TemporalFilter | null) => void;
  colourFn?: (item: StacBrowserItem) => string | null;
}

// Use a module-level ref so panel renderers can access it
let currentBrowserContext: BrowserPanelContext | null = null;
const mountedBrowserPanels = new Map<ComponentContainer, { root: Root; type: string }>();

// ─── Panel renderers ─────────────────────────────────────────────────────────
// GoldenLayout bind handler passes container element; renderers use module-level
// currentBrowserContext instead, so container is not referenced directly.

function renderPanel(type: string): React.ReactElement {
  const ctx = currentBrowserContext;
  if (!ctx) return <div>Loading...</div>;

  switch (type) {
    case PANEL_LIST: {
      const previewItem = ctx.highlightedItemId
        ? ctx.filteredItems.find(i => i.id === ctx.highlightedItemId) ?? null
        : null;
      const listView = (
        <ExerciseListView
          items={ctx.filteredItems.map(item => ({ ...item, trackDataHref: null })) as ExerciseListItem[]}
          onItemSelect={ctx.onItemSelect}
          onItemHighlight={ctx.onItemHighlight}
          highlightedItemId={ctx.highlightedItemId}
        />
      );
      if (!previewItem) {
        return (
          <div style={{ height: '100%', overflow: 'auto' }} data-testid="stac-browser-list">
            {listView}
          </div>
        );
      }
      return (
        <div style={{ height: '100%' }} data-testid="stac-browser-list">
          <ResizableSplitPane
            left={listView}
            right={
              <ThumbnailPreview
                item={previewItem}
                items={ctx.filteredItems}
                onOpen={ctx.onItemSelect}
              />
            }
          />
        </div>
      );
    }
    case PANEL_TIMELINE:
      return (
        <div style={{ height: '100%', overflow: 'hidden' }} data-testid="stac-browser-timeline">
          <TimelineView
            items={ctx.spatialFilteredItems as StacBrowserItem[]}
            onTemporalFilterChange={ctx.onTemporalFilterChange}
            onItemSelect={ctx.onItemSelect}
            colourFn={ctx.colourFn}
          />
        </div>
      );
    case PANEL_MAP: {
      const mapItems = (ctx.filteredItems as StacBrowserItem[]).filter(i => i.bbox !== null);
      const bounds = combinedBounds(mapItems);
      const rectangles = mapItems.map(item => ({
        id: item.id,
        bounds: bboxToBounds(item.bbox!),
        colour: ctx.colorMap?.get(item.id) ?? 'var(--co-accent, #007fd4)',
        itemPath: item.itemPath,
        title: item.title,
        startDatetime: item.startDatetime,
        endDatetime: item.endDatetime,
        datetime: item.datetime,
      }));

      return (
        <div style={{ height: '100%', overflow: 'hidden' }} data-testid="stac-browser-map">
          <MapContainer
            center={[0, 0]}
            zoom={2}
            scrollWheelZoom={true}
            doubleClickZoom={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              crossOrigin="anonymous"
            />
            {bounds && <FitBounds bounds={bounds} />}
            <ViewportTracker onViewportChange={ctx.onViewportChange} />
            {rectangles.map(r => (
              <Rectangle
                key={r.id}
                bounds={r.bounds}
                pathOptions={{ color: r.colour, weight: 2, fillOpacity: 0.15 }}
                eventHandlers={{
                  dblclick: (e: LeafletMouseEvent) => {
                    e.originalEvent.preventDefault();
                    e.originalEvent.stopPropagation();
                    ctx.onItemSelect?.(r.itemPath);
                  },
                }}
              >
                <Tooltip>
                  <strong>{r.title}</strong>
                  <br />
                  {formatDateRange(r.startDatetime, r.endDatetime, r.datetime)}
                </Tooltip>
              </Rectangle>
            ))}
          </MapContainer>
        </div>
      );
    }
    default:
      return <div style={{ padding: 16 }}>Unknown panel: {type}</div>;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const StacBrowser: React.FC<StacBrowserProps> = ({
  items,
  taxonomy,
  onItemSelect,
  className,
  colorMap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<GoldenLayout | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  // ─── Preview highlight state (#174) ────────────────────────────────────────
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  const handleItemHighlight = useCallback((itemId: string) => {
    setHighlightedItemId(itemId);
  }, []);

  // ─── Filter state ──────────────────────────────────────────────────────────
  const [metadataFilteredIds, setMetadataFilteredIds] = useState<ReadonlySet<string> | null>(null);
  const [viewport, setViewport] = useState<ViewportPolygon | null>(null);
  const [spatialFilterActive, setSpatialFilterActive] = useState(false);
  const [timeFilter, setTimeFilter] = useState<{ start: number | null; end: number | null } | null>(null);
  const [temporalFilterActive, setTemporalFilterActive] = useState(false);

  const clearAllFilters = useCallback(() => {
    setMetadataFilteredIds(null);
    setSpatialFilterActive(false);
    setTemporalFilterActive(false);
  }, []);

  const { filteredItems, spatialFilteredItems, activeFilterCount, hasNoResults } = useBrowserFilter({
    items,
    metadataFilteredIds,
    viewport,
    spatialFilterActive,
    timeFilter,
    temporalFilterActive,
    clearAllFilters,
  });

  // ─── FilterBar callbacks ───────────────────────────────────────────────────
  const handleFilteredItems = useCallback((filtered: StacBrowserItem[]) => {
    if (filtered.length === items.length) {
      setMetadataFilteredIds(null);
    } else {
      setMetadataFilteredIds(new Set(filtered.map(i => i.id)));
    }
  }, [items.length]);

  // ─── Viewport callback (from map panel) ────────────────────────────────────
  const handleViewportChange = useCallback((bounds: Bounds | null) => {
    if (bounds) {
      // Convert Bounds to ViewportPolygon for the filter
      const [west, south, east, north] = bounds;
      setViewport({
        coordinates: [
          [west, north],   // NW
          [east, north],   // NE
          [east, south],   // SE
          [west, south],   // SW
        ],
      });
      setSpatialFilterActive(true);
    }
  }, []);

  // ─── Temporal filter callback (from timeline panel) ────────────────────────
  const handleTemporalFilterChange = useCallback((filter: TemporalFilter | null) => {
    if (filter) {
      setTimeFilter({ start: filter.start, end: filter.end });
      setTemporalFilterActive(true);
    } else {
      setTemporalFilterActive(false);
    }
  }, []);

  // ─── Colour function (derived from colorMap) ──────────────────────────────
  const colourFn = useMemo(() => {
    if (!colorMap) return undefined;
    return (item: StacBrowserItem) => colorMap.get(item.id) ?? null;
  }, [colorMap]);

  // ─── Update browser panel context ─────────────────────────────────────────
  const contextValue: BrowserPanelContext = useMemo(() => ({
    filteredItems,
    spatialFilteredItems,
    onItemSelect,
    onItemHighlight: handleItemHighlight,
    highlightedItemId,
    colorMap,
    onViewportChange: handleViewportChange,
    onTemporalFilterChange: handleTemporalFilterChange,
    colourFn,
  }), [filteredItems, spatialFilteredItems, onItemSelect, handleItemHighlight, highlightedItemId, colorMap, handleViewportChange, handleTemporalFilterChange, colourFn]);

  // Update module-level context and re-render panels
  useEffect(() => {
    currentBrowserContext = contextValue;
    // Re-render all mounted panels with new context
    for (const [, panel] of mountedBrowserPanels) {
      panel.root.render(renderPanel(panel.type));
    }
  }, [contextValue]);

  // ─── Debounced layout save ────────────────────────────────────────────────
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const gl = glRef.current;
      if (!gl || !gl.isInitialised) return;
      try {
        saveBrowserLayout(gl.saveLayout());
      } catch { /* ignore */ }
    }, 500);
  }, []);

  // ─── Initialize GoldenLayout ──────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const bindHandler = (
      container: ComponentContainer,
      itemConfig: { componentType?: string | unknown },
    ) => {
      const componentType = String(itemConfig.componentType ?? '');
      const root = createRoot(container.element);

      mountedBrowserPanels.set(container, { root, type: componentType });
      root.render(renderPanel(componentType));

      return { component: undefined, virtual: false };
    };

    const unbindHandler = (container: ComponentContainer) => {
      const panel = mountedBrowserPanels.get(container);
      if (panel) {
        panel.root.unmount();
        mountedBrowserPanels.delete(container);
      }
    };

    const gl = new GoldenLayout(el, bindHandler, unbindHandler);
    glRef.current = gl;

    // Load saved or default layout
    const saved = loadBrowserLayout();
    let layoutConfig: LayoutConfig;
    if (saved) {
      try {
        layoutConfig = LayoutConfig.fromResolved(saved as ResolvedLayoutConfig);
      } catch {
        layoutConfig = BROWSER_DEFAULT_LAYOUT;
      }
    } else {
      layoutConfig = BROWSER_DEFAULT_LAYOUT;
    }

    gl.loadLayout(layoutConfig);

    gl.on('stateChanged', () => {
      debouncedSave();
      setIsEmpty(!gl.rootItem || gl.rootItem.contentItems.length === 0);
    });

    return () => {
      if (gl.isInitialised) {
        try { saveBrowserLayout(gl.saveLayout()); } catch { /* ignore */ }
      }
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      for (const [, panel] of mountedBrowserPanels) {
        panel.root.unmount();
      }
      mountedBrowserPanels.clear();
      gl.destroy();
      glRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reset layout handler ─────────────────────────────────────────────────
  const handleResetLayout = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;
    clearBrowserLayout();
    gl.loadLayout(BROWSER_DEFAULT_LAYOUT);
  }, []);

  return (
    <div className={`stac-browser ${className ?? ''}`} data-testid="stac-browser">
      {/* Filter bar — always visible, outside GoldenLayout */}
      <div className="stac-browser__filter-bar" data-testid="stac-browser-filter-bar">
        <FilterBar
          items={items as StacBrowserItem[]}
          taxonomy={taxonomy}
          onFilteredItems={handleFilteredItems}
        />
      </div>

      {/* Active filter indicator + reset layout button */}
      <div className="stac-browser__toolbar">
        {activeFilterCount > 0 && (
          <span className="stac-browser__filter-count" data-testid="stac-browser-filter-count">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </span>
        )}
        <button
          type="button"
          className="stac-browser__reset-layout-btn"
          onClick={handleResetLayout}
          title="Reset panel layout to default"
          data-testid="stac-browser-reset-layout"
        >
          Reset Layout
        </button>
      </div>

      {/* GoldenLayout container for the 3 panels */}
      <div
        ref={containerRef}
        className="stac-browser__panels"
        data-testid="stac-browser-panels"
      >
        {isEmpty && (
          <div className="stac-browser__empty">
            <p>All panels have been closed.</p>
            <button type="button" onClick={handleResetLayout}>
              Reset Layout
            </button>
          </div>
        )}

        {/* Zero-results overlay — inside panels so filter bar stays accessible */}
        {hasNoResults && (
          <div className="stac-browser__no-results" data-testid="stac-browser-no-results">
            <div className="stac-browser__no-results-message">
              No matching exercises. Adjust or clear filters to see results.
            </div>
            <button
              type="button"
              className="stac-browser__clear-filters-btn"
              onClick={clearAllFilters}
              data-testid="stac-browser-clear-filters"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
