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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoldenLayout,
  LayoutConfig,
  ResolvedLayoutConfig,
  type ComponentContainer,
} from 'golden-layout';
import { createRoot, type Root } from 'react-dom/client';

import type { StacBrowserProps } from './types';
import type { StacBrowserItem } from '../filter-engine/types';
import type { ViewportPolygon } from '../utils/spatial-types';
import type { TemporalFilter } from '../TimelineView/types';
import { useBrowserFilter } from './useBrowserFilter';
import { FilterBar } from '../FilterBar';
import { ExerciseListView } from '../ExerciseListView';
import type { ExerciseListItem } from '../ExerciseListView/types';
import { TimelineView } from '../TimelineView';
import { CatalogOverview } from '../CatalogOverview';
import type { Bounds } from '../utils/types';
import 'golden-layout/dist/css/goldenlayout-base.css';
import 'golden-layout/dist/css/themes/goldenlayout-light-theme.css';
import './StacBrowser.css';

// ─── GoldenLayout panel type constants ────────────────────────────────────────
const PANEL_LIST = 'browser-list';
const PANEL_TIMELINE = 'browser-timeline';
const PANEL_MAP = 'browser-map';

// ─── Layout persistence ──────────────────────────────────────────────────────
const BROWSER_LAYOUT_KEY = 'debrief-browser-layout';
const BROWSER_LAYOUT_VERSION = 1;

const BROWSER_DEFAULT_LAYOUT: LayoutConfig = {
  settings: { popoutWholeStack: false },
  root: {
    type: 'column',
    content: [
      // Top row: Exercise list (full width)
      {
        type: 'stack',
        height: 50,
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
        height: 50,
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

// ─── Context for passing props to panels ──────────────────────────────────────
interface BrowserPanelContext {
  filteredItems: readonly StacBrowserItem[];
  allItems: readonly StacBrowserItem[];
  onItemSelect?: (itemPath: string) => void;
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
    case PANEL_LIST:
      return (
        <div style={{ height: '100%', overflow: 'auto' }} data-testid="stac-browser-list">
          <ExerciseListView
            items={ctx.filteredItems.map(item => ({ ...item, trackDataHref: null })) as ExerciseListItem[]}
            onItemSelect={ctx.onItemSelect}
          />
        </div>
      );
    case PANEL_TIMELINE:
      return (
        <div style={{ height: '100%', overflow: 'hidden' }} data-testid="stac-browser-timeline">
          <TimelineView
            items={ctx.filteredItems as StacBrowserItem[]}
            onTemporalFilterChange={ctx.onTemporalFilterChange}
            onItemSelect={ctx.onItemSelect}
            colourFn={ctx.colourFn}
          />
        </div>
      );
    case PANEL_MAP:
      return (
        <div style={{ height: '100%', overflow: 'hidden' }} data-testid="stac-browser-map">
          <CatalogOverview
            items={ctx.filteredItems as StacBrowserItem[]}
            onItemSelect={ctx.onItemSelect}
            onViewportChange={ctx.onViewportChange}
            colorMap={ctx.colorMap}
            hideTimeline
          />
        </div>
      );
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

  const { filteredItems, activeFilterCount, hasNoResults } = useBrowserFilter({
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
    allItems: items,
    onItemSelect,
    colorMap,
    onViewportChange: handleViewportChange,
    onTemporalFilterChange: handleTemporalFilterChange,
    colourFn,
  }), [filteredItems, items, onItemSelect, colorMap, handleViewportChange, handleTemporalFilterChange, colourFn]);

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
      </div>

      {/* Zero-results overlay */}
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
  );
};
