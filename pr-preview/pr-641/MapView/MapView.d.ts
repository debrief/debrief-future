import { Map as LeafletMap } from 'leaflet';
import { DebriefFeature, DebriefFeatureCollection, Bounds, DisplayMode } from '../utils/types';
import { DrawingMode } from './LeafletToolbar';
import { SceneRectangleLayerProps } from './SceneRectangleLayer';
import { SelectionClickEvent } from '../utils/applyClickToSelection';

export interface MapViewProps {
    /** GeoJSON features to display */
    features: DebriefFeatureCollection | DebriefFeature[];
    /** Set of selected feature IDs */
    selectedIds?: Set<string>;
    /**
     * Callback when a feature is clicked.
     *
     * **Breaking change (#192 Phase 5)**: the payload is now a
     * `SelectionClickEvent` (`{ target, modifier, shift }`) rather than
     * `(featureId, event)`. Pair with `applyClickToSelection` from
     * `@debrief/components` to derive the next selection set.
     */
    onSelect?: (event: SelectionClickEvent) => void;
    /** Callback when clicking empty space (for clearing selection) */
    onBackgroundClick?: () => void;
    /** Callback when zoom level changes */
    onZoomChange?: (zoom: number) => void;
    /** Callback when map bounds change */
    onBoundsChange?: (bounds: Bounds) => void;
    /** Initial zoom level */
    initialZoom?: number;
    /** Initial center [lat, lon] */
    initialCenter?: [number, number];
    /** Whether to auto-fit bounds to features */
    autoFitBounds?: boolean;
    /** Controlled viewport - when provided, map will update to this center/zoom.
     *  Use for programmatic viewport changes (e.g., setViewport messages from VS Code). */
    viewport?: {
        center: [number, number];
        zoom: number;
    };
    /** Programmatically trigger fit bounds. Increment to trigger a new fit. */
    fitBoundsTrigger?: number;
    /** Tile layer URL (default: OpenStreetMap) */
    tileLayerUrl?: string;
    /** Tile layer attribution */
    tileLayerAttribution?: string;
    /**
     * URL of the tile served when an XYZ slot is missing or unreachable
     * (Leaflet `TileLayer.options.errorTileUrl`). Set by the briefing
     * renderer SPA (spec #264) to `./tiles/placeholder.png` so that
     * out-of-bundle Scene viewports show a neutral placeholder rather
     * than triggering a network fallback. Defaults to undefined — Leaflet
     * shows a transparent tile, matching today's behaviour.
     */
    errorTileUrl?: string;
    /**
     * Maximum zoom level for the tile layer (`TileLayer.options.maxZoom`).
     * The briefing renderer passes its bundled-zoom cap so users can't
     * zoom past the cache. Defaults to undefined — Leaflet picks the
     * library default (18), matching today's behaviour.
     */
    maxZoom?: number;
    /**
     * When true, tiles are not repeated horizontally across the
     * antimeridian (`TileLayer.options.noWrap`). The briefing renderer
     * sets this to keep playback bounded to the captured tile set.
     * Defaults to false (Leaflet's default — tiles wrap), matching
     * today's behaviour.
     */
    noWrap?: boolean;
    /**
     * Value passed through as the `crossOrigin` attribute on the
     * underlying `<TileLayer>`. Pass `false` to omit the attribute
     * entirely (required under `file://` origin in current Chrome /
     * Edge — the attribute is meaningless there and CAUSES the tile
     * to fail to load if set). Defaults to `'anonymous'` (today's
     * behaviour, unchanged for non-briefing consumers).
     */
    tileLayerCrossOrigin?: 'anonymous' | 'use-credentials' | false;
    /** CSS class name */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
    /** Height of the map (default: 400px) */
    height?: number | string;
    /** Current time position for temporal rendering (epoch ms). Enables temporal track rendering when provided. */
    currentTime?: number;
    /** Track display mode: 'full' (entire track + marker) or 'trail' (snail-trail up to current time). */
    displayMode?: DisplayMode;
    /** Set of visible feature IDs. When provided, fit-to-window only considers these features. */
    visibleIds?: Set<string>;
    /** Whether to show the custom toolbar with zoom and fit buttons (default: true) */
    showToolbar?: boolean;
    /** Position of the toolbar (default: 'topleft') */
    toolbarPosition?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
    /** Current drawing mode (null = no drawing active) (FR-009) */
    drawingMode?: DrawingMode;
    /** Callback when drawing mode changes (FR-004, FR-006, FR-007, FR-008) */
    onDrawingModeChange?: (mode: DrawingMode) => void;
    /** Callback when a shape is drawn via Geoman. Called with raw GeoJSON and the active drawing mode. */
    onShapeCreated?: (geojson: GeoJSON.Feature, mode: DrawingMode) => void;
    /**
     * Animated viewport target. When set, the MapView animates to this
     * viewport's centre + zoom via Leaflet `L.Map.flyTo`. `null` means
     * "no pending animation" (the typical idle state).
     *
     * Each time this prop transitions to a new `token`, the MapView
     * kicks off a new animation. The caller is responsible for generating
     * a fresh token per transition.
     */
    flyToTarget?: FlyToTarget | null;
    /** Fires when an in-flight flyTo animation completes (Leaflet `moveend`). */
    onFlyToComplete?: (token: number) => void;
    /**
     * PR #627 — callback invoked once with the Leaflet `Map` instance after the
     * `MapContainer` has mounted. Hosts can store this in a ref and read the
     * live viewport synchronously via `map.getCenter()` / `map.getZoom()` /
     * `map.getBounds()` at capture time, bypassing every async queue between
     * Leaflet and `session-state.viewport`. The MapView never owns the
     * resulting reference — it's the consumer's responsibility to drop it on
     * unmount.
     */
    onMapReady?: (map: LeafletMap) => void;
    /**
     * The Scene Features to render as faint rectangles on the map. When
     * provided, a `SceneRectangleLayer` is rendered inside the `MapContainer`.
     */
    sceneRectangles?: SceneRectangleLayerProps;
    /** Fires when a Scene rectangle is clicked. Convenience re-export of
     *  `SceneRectangleLayerProps.onSceneRectangleClick`. */
    onSceneRectangleClick?: (sceneId: string) => void;
    /**
     * Predicate invoked for each feature before it is rendered in the
     * base GeoJSON layer. Return `false` to exclude the feature. Defaults
     * to excluding `STORYBOARD` and `STORYBOARD_SCENE` features (which
     * are either invisible or rendered by the dedicated
     * `SceneRectangleLayer`). See `map-view-flyto.md` §5 / FR-PLAY-015.
     */
    shouldRenderInBaseLayer?: (feature: GeoJSON.Feature) => boolean;
    /**
     * When `true`, every Leaflet gesture handler that can change the map's
     * centre or zoom (drag, scroll-wheel, double-click, pinch/touch, box,
     * keyboard) is disabled and the on-map `ViewportLockBanner` is shown.
     * Restoring to `false` re-enables only the handlers that were enabled
     * BEFORE the lock — a host-disabled handler stays disabled (spec FR-006).
     */
    viewportLocked?: boolean;
    /**
     * Toggle callback — fires from the on-map banner (click-to-unlock) and
     * from the `L` keyboard shortcut. The host owns the lock state.
     */
    onViewportLockChange?: (locked: boolean) => void;
}
/**
 * Animated viewport target for the {@link MapView.flyToTarget} prop.
 */
export interface FlyToTarget {
    /** Monotonically-increasing identifier — each new transition gets a
     *  new token; repeated values are idempotent. */
    readonly token: number;
    /** Centre + zoom. Typically resolved from a Scene's `viewport`. */
    readonly center: readonly [number, number];
    readonly zoom: number;
    /** Animation duration in ms. `0` means "jump without animation". */
    readonly durationMs: number;
}
/**
 * MapView component for displaying GeoJSON features on an interactive map.
 *
 * @example
 * ```tsx
 * import { MapView } from '@debrief/components/MapView';
 *
 * <MapView
 *   features={plotData}
 *   selectedIds={selection.selectedIds}
 *   onSelect={(id) => selection.toggle(id)}
 * />
 * ```
 */
export declare function MapView({ features, selectedIds, onSelect, onBackgroundClick, onZoomChange, onBoundsChange, initialZoom, initialCenter, viewport, autoFitBounds, fitBoundsTrigger, tileLayerUrl, tileLayerAttribution, errorTileUrl, maxZoom, noWrap, tileLayerCrossOrigin, className, style, height, currentTime, displayMode, visibleIds, showToolbar, toolbarPosition, drawingMode, onDrawingModeChange, onShapeCreated, flyToTarget, onFlyToComplete, onMapReady, sceneRectangles, onSceneRectangleClick, shouldRenderInBaseLayer, viewportLocked, onViewportLockChange, }: MapViewProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MapView.d.ts.map