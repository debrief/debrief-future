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
  type RowOrColumnItemConfig,
} from 'golden-layout';
import { createRoot, type Root } from 'react-dom/client';
import { MapContainer, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LeafletMouseEvent } from 'leaflet';

import { readThumbnailSize, writeThumbnailSize } from './thumbnailSizePreference';
import type { StacBrowserProps } from './types';
import type { StacBrowserItem } from '../filter-engine/types';
import type { ViewportPolygon, TimeFilter } from '@debrief/schemas';
import type { TemporalFilter } from '../TimelineView/types';
import { useBrowserFilter } from './useBrowserFilter';
import { FilterBar } from '../FilterBar';
import { ExerciseListView } from '../ExerciseListView';
import type { ExerciseListItem, SortConfiguration, SortDimension, SortDirection, ThumbnailSize } from '../ExerciseListView/types';
import { ThumbnailPreview } from './ThumbnailPreview';
import { ThumbnailSizeToggle } from './ThumbnailSizeToggle';
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

/** Auto-fit map to bounds, re-fitting when the bounds change significantly
 *  (e.g. when the full catalog finishes loading and replaces the seeded items). */
function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }): null {
  const map = useMap();
  const prevBoundsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!bounds) return;
    const key = JSON.stringify(bounds);
    if (key !== prevBoundsRef.current) {
      prevBoundsRef.current = key;
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [20, 20], animate: false });
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
const BROWSER_LAYOUT_VERSION = 8;

/** Shared header config for all generated layouts. */
const BROWSER_HEADER_CONFIG = {
  close: false,
  popout: false,
  maximise: 'maximise',
  minimise: 'restore',
} as const;

const BROWSER_DEFAULT_LAYOUT: LayoutConfig = {
  settings: { popoutWholeStack: false },
  header: BROWSER_HEADER_CONFIG,
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
            isClosable: false,
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
                isClosable: false,
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
                isClosable: false,
              },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Build a LayoutConfig with only the visible panels.
 * Exercises is always visible. Timeline and Map can be hidden independently.
 * When both bottom panels are hidden, Exercises fills the full height.
 */
function buildLayoutForVisiblePanels(hidden: Set<string>): LayoutConfig {
  const exercises = { type: 'component' as const, componentType: PANEL_LIST, title: 'Exercises', isClosable: false };
  const timeline = { type: 'component' as const, componentType: PANEL_TIMELINE, title: 'Timeline', isClosable: false };
  const map = { type: 'component' as const, componentType: PANEL_MAP, title: 'Map', isClosable: false };

  const showTimeline = !hidden.has(PANEL_TIMELINE);
  const showMap = !hidden.has(PANEL_MAP);
  const hasBottom = showTimeline || showMap;

  const content: RowOrColumnItemConfig.ChildItemConfig[] = [
    { type: 'stack', height: hasBottom ? 55 : 100, content: [exercises] },
  ];

  if (showTimeline && showMap) {
    content.push({
      type: 'row', height: 45, content: [
        { type: 'stack', width: 50, content: [timeline] },
        { type: 'stack', width: 50, content: [map] },
      ],
    });
  } else if (showTimeline) {
    content.push({ type: 'stack', height: 45, content: [timeline] });
  } else if (showMap) {
    content.push({ type: 'stack', height: 45, content: [map] });
  }

  return {
    settings: { popoutWholeStack: false },
    header: BROWSER_HEADER_CONFIG,
    root: { type: 'column', content },
  };
}

/**
 * Recursively collect every `componentType` present in a (resolved or
 * unresolved) GoldenLayout config tree. Used on mount to reconcile the
 * `hiddenPanels` React state with the panels actually present in the
 * restored layout (FR-016 — so the restore affordance survives a reload).
 */
function collectComponentTypes(node: unknown, acc: Set<string> = new Set()): Set<string> {
  if (node === null || node === undefined || typeof node !== 'object') return acc;
  if ('componentType' in node) {
    const ct = (node as { componentType: unknown }).componentType;
    if (typeof ct === 'string') acc.add(ct);
  }
  if (Array.isArray(node)) {
    for (const child of node) collectComponentTypes(child, acc);
  } else {
    for (const value of Object.values(node)) collectComponentTypes(value, acc);
  }
  return acc;
}

/** Clean up injected header controls before rebuilding the layout. */
function cleanupInjectedControls(): void {
  if (sortHeaderRoot) { sortHeaderRoot.unmount(); sortHeaderRoot = null; }
  sortHeaderContainer = null;
  if (thumbnailSizeRoot) { thumbnailSizeRoot.unmount(); thumbnailSizeRoot = null; }
  thumbnailSizeContainer = null;
  for (const [, entry] of hideBtnRoots) { entry.root.unmount(); }
  hideBtnRoots.clear();
}

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
      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }} data-testid="stac-browser-preview">
        {right}
      </div>
    </div>
  );
};

// ─── Context for passing props to panels ──────────────────────────────────────
interface BrowserPanelContext {
  allItems: readonly StacBrowserItem[];
  filteredItems: readonly StacBrowserItem[];
  spatialFilteredItems: readonly StacBrowserItem[];
  onItemSelect?: (itemPath: string) => void;
  onItemHighlight?: (itemId: string) => void;
  highlightedItemId: string | null;
  colorMap?: ReadonlyMap<string, string>;
  onViewportChange: (bounds: Bounds | null) => void;
  onTemporalFilterChange: (filter: TemporalFilter | null) => void;
  timelineResetKey: number;
  colourFn?: (item: StacBrowserItem) => string | null;
  sort: SortConfiguration;
  onSortChange: (sort: SortConfiguration) => void;
  thumbnailSize: ThumbnailSize;
  onThumbnailSizeChange: (size: ThumbnailSize) => void;
  /** Optional Properties slot rendered under ThumbnailPreview in the right pane of the list panel (#193). */
  propertiesSlot?: React.ReactNode;
}

// Use a module-level ref so panel renderers can access it
let currentBrowserContext: BrowserPanelContext | null = null;
const mountedBrowserPanels = new Map<ComponentContainer, { root: Root; type: string }>();

// Sort dropdown injected into the Exercises GoldenLayout header
let sortHeaderRoot: Root | null = null;
let sortHeaderContainer: HTMLElement | null = null;

// Thumbnail size toggle injected into the Exercises GoldenLayout header
let thumbnailSizeRoot: Root | null = null;
let thumbnailSizeContainer: HTMLElement | null = null;

// ─── Panel hide/show ────────────────────────────────────────────────────────
// When a panel is hidden, we rebuild the GoldenLayout with a config that
// excludes it. This guarantees correct positioning when panels are restored.
// Restore buttons appear in the filter bar row.

/** Title labels for restore buttons. */
const PANEL_TITLES: Record<string, string> = {
  [PANEL_TIMELINE]: 'Timeline',
  [PANEL_MAP]: 'Map',
};

const hideBtnRoots = new Map<string, { root: Root; container: HTMLElement }>();

/** Sort dimension labels for the dropdown. */
const SORT_LABELS: Record<SortDimension, string> = {
  recency: 'Recency',
  title: 'Title',
  duration: 'Duration',
};
const DEFAULT_DIRECTIONS: Record<SortDimension, SortDirection> = {
  recency: 'desc',
  title: 'asc',
  duration: 'desc',
};

/** Render sort dropdown into the GoldenLayout header. */
function renderSortHeader(): void {
  const ctx = currentBrowserContext;
  if (!sortHeaderRoot || !ctx) return;

  sortHeaderRoot.render(
    <SortHeaderDropdown sort={ctx.sort} onSortChange={ctx.onSortChange} />,
  );
}

/** Render thumbnail size toggle into the GoldenLayout header. */
function renderThumbnailSizeToggle(): void {
  const ctx = currentBrowserContext;
  if (!thumbnailSizeRoot || !ctx) return;

  thumbnailSizeRoot.render(
    <ThumbnailSizeToggle size={ctx.thumbnailSize} onSizeChange={ctx.onThumbnailSizeChange} />,
  );
}

/** Inline sort dropdown component for the GoldenLayout header. */
const SortHeaderDropdown: React.FC<{
  sort: SortConfiguration;
  onSortChange: (sort: SortConfiguration) => void;
}> = ({ sort, onSortChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const arrow = sort.direction === 'asc' ? '\u2191' : '\u2193';

  return (
    <div ref={ref} className="stac-browser__sort-header" data-testid="sort-header-dropdown">
      <button
        type="button"
        className="stac-browser__sort-header-btn"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title={`Sort: ${SORT_LABELS[sort.dimension]} ${sort.direction === 'asc' ? 'ascending' : 'descending'}`}
      >
        {SORT_LABELS[sort.dimension]} {arrow}
      </button>
      {open && (
        <div className="stac-browser__sort-header-menu">
          {(Object.keys(SORT_LABELS) as SortDimension[]).map((dim) => {
            const isActive = sort.dimension === dim;
            return (
              <button
                key={dim}
                type="button"
                className={`stac-browser__sort-header-option${isActive ? ' stac-browser__sort-header-option--active' : ''}`}
                data-testid={`sort-header-${dim}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const next: SortConfiguration = isActive
                    ? { dimension: dim, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
                    : { dimension: dim, direction: DEFAULT_DIRECTIONS[dim] };
                  onSortChange(next);
                  setOpen(false);
                }}
              >
                {SORT_LABELS[dim]}
                {isActive && <span className="stac-browser__sort-header-arrow">{arrow}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
          sort={ctx.sort}
          onSortChange={ctx.onSortChange}
          hideSortBar
          thumbnailSize={ctx.thumbnailSize}
        />
      );
      if (!previewItem) {
        return (
          <div style={{ height: '100%', overflow: 'auto' }} data-testid="stac-browser-list">
            {listView}
          </div>
        );
      }
      const previewContent = ctx.propertiesSlot ? (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            minWidth: 0,
          }}
        >
          <div style={{ flex: '0 0 40%', minWidth: 0, overflow: 'auto' }}>
            <ThumbnailPreview
              item={previewItem}
              items={ctx.filteredItems}
              onOpen={ctx.onItemSelect}
            />
          </div>
          <div
            style={{
              flex: '1 1 60%',
              minWidth: 0,
              overflow: 'auto',
              borderLeft: '1px solid var(--vscode-panel-border, #3c3c3c)',
            }}
            data-testid="stac-browser-properties-slot"
          >
            {ctx.propertiesSlot}
          </div>
        </div>
      ) : (
        <ThumbnailPreview
          item={previewItem}
          items={ctx.filteredItems}
          onOpen={ctx.onItemSelect}
        />
      );
      return (
        <div style={{ height: '100%' }} data-testid="stac-browser-list">
          <ResizableSplitPane left={listView} right={previewContent} />
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
            resetKey={ctx.timelineResetKey}
          />
        </div>
      );
    case PANEL_MAP: {
      const mapItems = (ctx.filteredItems as StacBrowserItem[]).filter(i => i.bbox !== null);
      // Use ALL items for initial fit so the map shows everything when the catalog loads,
      // not just the filtered subset (which may be empty before FitBounds runs).
      const allMapItems = (ctx.allItems as StacBrowserItem[]).filter(i => i.bbox !== null);
      const bounds = combinedBounds(allMapItems);
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
  onItemHighlight,
  propertiesSlot,
  className,
  colorMap,
  // #191 T049 — NL-search client plumbed through to FilterBar.
  llmClient,
  nlEnums,
  liveModeLabel,
  onNlBannerAction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<GoldenLayout | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  // ─── Preview highlight state (#174) ────────────────────────────────────────
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  const handleItemHighlight = useCallback(
    (itemId: string) => {
      setHighlightedItemId(itemId);
      if (onItemHighlight) {
        // Look up the itemPath from the items list. We pass a path (the
        // host-facing identifier), not the internal id.
        const match = items.find((i) => i.id === itemId) ?? null;
        onItemHighlight(match?.itemPath ?? null);
      }
    },
    [items, onItemHighlight],
  );

  // ─── Sort state (lifted from ExerciseListView for header injection) ────────
  const DEFAULT_SORT: SortConfiguration = { dimension: 'recency', direction: 'desc' };
  const [sort, setSort] = useState<SortConfiguration>(DEFAULT_SORT);
  const handleSortChange = useCallback((s: SortConfiguration) => setSort(s), []);

  // ─── Thumbnail size — hydrated from localStorage on mount (T033) ─────────────
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>(readThumbnailSize);
  const handleThumbnailSizeChange = useCallback((s: ThumbnailSize) => {
    writeThumbnailSize(s);
    setThumbnailSize(s);
  }, []);

  // ─── Hidden panels (removed from GL, restore via filter bar buttons) ──────
  const [hiddenPanels, setHiddenPanels] = useState<Set<string>>(new Set());

  const restorePanel = useCallback((panelType: string) => {
    const gl = glRef.current;
    if (!gl) return;
    setHiddenPanels(prev => {
      const next = new Set(prev);
      next.delete(panelType);
      // Rebuild the entire layout so the panel appears in its correct position
      cleanupInjectedControls();
      gl.loadLayout(buildLayoutForVisiblePanels(next));
      // Persist immediately so the restored state survives a quick reload.
      try { saveBrowserLayout(gl.saveLayout()); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ─── Filter state ──────────────────────────────────────────────────────────
  const [metadataFilteredIds, setMetadataFilteredIds] = useState<ReadonlySet<string> | null>(null);
  const [viewport, setViewport] = useState<ViewportPolygon | null>(null);
  const [spatialFilterActive, setSpatialFilterActive] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null);
  const [temporalFilterActive, setTemporalFilterActive] = useState(false);
  const [timelineResetKey, setTimelineResetKey] = useState(0);

  const clearAllFilters = useCallback(() => {
    setMetadataFilteredIds(null);
    setSpatialFilterActive(false);
    setTemporalFilterActive(false);
    setTimelineResetKey(k => k + 1);
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
      // Track the viewport so spatial filtering works if enabled,
      // but don't auto-activate it — the map is for overview, not filtering.
      // Auto-activation caused a boot-order race: the initial FitBounds for
      // seeded items locked the viewport before the full catalog loaded,
      // filtering out all items whose bboxes were outside that small area.
      const [west, south, east, north] = bounds;
      setViewport({
        coordinates: [
          { longitude: west, latitude: north },   // NW
          { longitude: east, latitude: north },   // NE
          { longitude: east, latitude: south },   // SE
          { longitude: west, latitude: south },   // SW
        ],
      });
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
    allItems: items,
    filteredItems,
    spatialFilteredItems,
    onItemSelect,
    onItemHighlight: handleItemHighlight,
    highlightedItemId,
    colorMap,
    onViewportChange: handleViewportChange,
    onTemporalFilterChange: handleTemporalFilterChange,
    timelineResetKey,
    colourFn,
    sort,
    onSortChange: handleSortChange,
    thumbnailSize,
    onThumbnailSizeChange: handleThumbnailSizeChange,
    propertiesSlot,
  }), [items, filteredItems, spatialFilteredItems, onItemSelect, handleItemHighlight, highlightedItemId, colorMap, handleViewportChange, handleTemporalFilterChange, timelineResetKey, colourFn, sort, handleSortChange, thumbnailSize, handleThumbnailSizeChange, propertiesSlot]);

  // Update module-level context and re-render panels + sort header
  useEffect(() => {
    currentBrowserContext = contextValue;
    // Re-render all mounted panels with new context
    for (const [, panel] of mountedBrowserPanels) {
      panel.root.render(renderPanel(panel.type));
    }
    renderSortHeader();
    renderThumbnailSizeToggle();
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

      // Inject header controls (sort dropdown for Exercises, hide button for Timeline/Map)
      const injectHeaderControls = () => {
        try {
          const headerEl = container.tab?.element?.closest('.lm_header');
          const controlsEl = headerEl?.querySelector('.lm_controls');
          if (!controlsEl) {
            requestAnimationFrame(injectHeaderControls);
            return;
          }

          // Sort dropdown — only for Exercises panel
          if (componentType === PANEL_LIST && !sortHeaderContainer) {
            sortHeaderContainer = document.createElement('li');
            sortHeaderContainer.className = 'stac-browser__sort-header-li';
            controlsEl.insertBefore(sortHeaderContainer, controlsEl.firstChild);
            sortHeaderRoot = createRoot(sortHeaderContainer);
            renderSortHeader();
          }

          // Thumbnail size toggle — only for Exercises panel
          if (componentType === PANEL_LIST && !thumbnailSizeContainer) {
            thumbnailSizeContainer = document.createElement('li');
            thumbnailSizeContainer.className = 'stac-browser__thumbnail-size-li';
            controlsEl.insertBefore(thumbnailSizeContainer, sortHeaderContainer?.nextSibling ?? controlsEl.firstChild);
            thumbnailSizeRoot = createRoot(thumbnailSizeContainer);
            renderThumbnailSizeToggle();
          }

          // Collapse button — only for Timeline and Map panels.
          // Uses a chevron-down glyph + "Collapse" label so the affordance is
          // discoverable (FR-014). The data-testid enables reliable E2E selection.
          if ((componentType === PANEL_TIMELINE || componentType === PANEL_MAP) && !hideBtnRoots.has(componentType)) {
            const btnLi = document.createElement('li');
            btnLi.className = 'stac-browser__hide-btn-li';
            btnLi.addEventListener('click', (e) => {
              e.stopPropagation();
              // Rebuild layout without this panel so siblings fill the freed space
              setHiddenPanels(prev => {
                const next = new Set(prev);
                next.add(componentType);
                const glInst = glRef.current;
                if (glInst) {
                  cleanupInjectedControls();
                  glInst.loadLayout(buildLayoutForVisiblePanels(next));
                  // Persist immediately (not just via the debounced autosave) so
                  // the collapsed state survives a reload that races the debounce.
                  try { saveBrowserLayout(glInst.saveLayout()); } catch { /* ignore */ }
                }
                return next;
              });
            });
            controlsEl.insertBefore(btnLi, controlsEl.firstChild);
            const btnRoot = createRoot(btnLi);
            hideBtnRoots.set(componentType, { root: btnRoot, container: btnLi });
            const panelTitle = PANEL_TITLES[componentType] ?? componentType;
            const testId = componentType === PANEL_TIMELINE
              ? 'catalog-collapse-timeline'
              : 'catalog-collapse-map';
            btnRoot.render(
              <button
                type="button"
                className="stac-browser__hide-btn"
                title={`Collapse ${panelTitle} preview row`}
                aria-label={`Collapse ${panelTitle} preview row`}
                data-testid={testId}
              >
                {/* chevron-down ▾ + label for discoverability (FR-014) */}
                <span aria-hidden="true">&#x25BE;</span>
                {' '}Collapse
              </button>,
            );
          }
        } catch { /* tab not ready yet */ }
      };
      requestAnimationFrame(injectHeaderControls);

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

    // Reconcile hiddenPanels with the panels actually present in the restored
    // layout, so the restore affordance reflects the persisted state after a
    // reload (FR-016). Without this, hiddenPanels resets to empty and the
    // "Show Timeline/Map" controls vanish even though the panels are absent.
    const presentTypes = collectComponentTypes(layoutConfig.root);
    const initialHidden = new Set<string>();
    if (!presentTypes.has(PANEL_TIMELINE)) initialHidden.add(PANEL_TIMELINE);
    if (!presentTypes.has(PANEL_MAP)) initialHidden.add(PANEL_MAP);
    if (initialHidden.size > 0) setHiddenPanels(initialHidden);

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
      cleanupInjectedControls();
      gl.destroy();
      glRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reset layout handler ─────────────────────────────────────────────────
  const handleResetLayout = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;
    clearBrowserLayout();
    cleanupInjectedControls();
    setHiddenPanels(new Set());
    gl.loadLayout(BROWSER_DEFAULT_LAYOUT);
  }, []);

  return (
    <div className={`stac-browser ${className ?? ''}`} data-testid="stac-browser">
      {/* Filter bar row — FilterBar + active count + Reset Layout in one line */}
      <div className="stac-browser__filter-row" data-testid="stac-browser-filter-bar">
        <div className="stac-browser__filter-bar">
          <FilterBar
            items={items as StacBrowserItem[]}
            taxonomy={taxonomy}
            onFilteredItems={handleFilteredItems}
            llmClient={llmClient}
            nlEnums={nlEnums}
            liveModeLabel={liveModeLabel}
            onBannerAction={onNlBannerAction}
          />
        </div>
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
        {hiddenPanels.has(PANEL_TIMELINE) && (
          <button
            type="button"
            className="stac-browser__restore-btn"
            onClick={() => restorePanel(PANEL_TIMELINE)}
            title="Show Timeline preview row"
            aria-label="Show Timeline preview row"
            data-testid="restore-timeline"
          >
            &#x25B4; Show Timeline
          </button>
        )}
        {hiddenPanels.has(PANEL_MAP) && (
          <button
            type="button"
            className="stac-browser__restore-btn"
            onClick={() => restorePanel(PANEL_MAP)}
            title="Show Map preview row"
            aria-label="Show Map preview row"
            data-testid="restore-map"
          >
            &#x25B4; Show Map
          </button>
        )}
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
