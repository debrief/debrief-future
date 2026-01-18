/**
 * @debrief/components - Shared React Component Library
 * TypeScript Type Definitions
 *
 * This file defines the public API contract for the component library.
 * All types here are exported and available to consumers.
 */

import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { CSSProperties, ReactNode } from 'react';

// =============================================================================
// Core Data Types
// =============================================================================

/**
 * Feature type classification for rendering and filtering
 */
export type FeatureType = 'track' | 'reference' | 'analysis' | 'unknown';

/**
 * Properties attached to Debrief features.
 * Derived from LinkML schema definitions in /shared/schemas/
 */
export interface DebriefFeatureProperties {
  /** Display name for the feature */
  name?: string;

  /** Feature classification */
  type?: FeatureType;

  /** ISO 8601 start time (for temporal features) */
  startTime?: string;

  /** ISO 8601 end time (for temporal features) */
  endTime?: string;

  /** Platform identifier (for tracks) */
  platform?: string;

  /** Source file provenance */
  source?: string;

  /** Additional metadata (schema-extensible) */
  [key: string]: unknown;
}

/**
 * A GeoJSON Feature with Debrief-specific properties
 */
export type DebriefFeature = Feature<Geometry, DebriefFeatureProperties>;

/**
 * A collection of Debrief features - the primary data input for all components
 */
export type DebriefFeatureCollection = FeatureCollection<Geometry, DebriefFeatureProperties>;

// =============================================================================
// Selection
// =============================================================================

/**
 * Set of selected feature IDs.
 * Components receive this as a prop and call onSelect to request changes.
 */
export type SelectionState = Set<string>;

/**
 * Selection change handler signature
 */
export type SelectionHandler = (selectedIds: Set<string>) => void;

// =============================================================================
// Theme
// =============================================================================

/**
 * Theme token values that can be customized.
 * Maps to CSS custom properties: --debrief-{token-name}
 */
export interface ThemeTokens {
  /** Primary brand color */
  primary: string;

  /** Background surface color */
  surface: string;

  /** Primary text color */
  text: string;

  /** Secondary/muted text color */
  textMuted: string;

  /** Border color */
  border: string;

  /** Default track color */
  trackColor: string;

  /** Reference point color */
  referenceColor: string;

  /** Analysis result color */
  analysisColor: string;

  /** Selection highlight color */
  selectionColor: string;

  /** Error state color */
  error: string;

  /** Base spacing unit (px) */
  spacingUnit: number;

  /** Border radius (px) */
  borderRadius: number;

  /** Font family */
  fontFamily: string;
}

/**
 * Default theme values used when no override is provided
 */
export declare const defaultTheme: ThemeTokens;

// =============================================================================
// MapView Component
// =============================================================================

/**
 * Map viewport state
 */
export interface MapViewport {
  /** Center coordinates [lat, lng] */
  center: [number, number];

  /** Zoom level (0-18) */
  zoom: number;

  /** Visible bounds [[south, west], [north, east]] */
  bounds: [[number, number], [number, number]];
}

/**
 * MapView component props
 */
export interface MapViewProps {
  /** GeoJSON features to display */
  features: DebriefFeatureCollection;

  /** Currently selected feature IDs */
  selectedIds?: Set<string>;

  /** Called when user selects/deselects features */
  onSelect?: SelectionHandler;

  /** Called when map viewport changes (pan, zoom) */
  onViewportChange?: (viewport: MapViewport) => void;

  /** Initial map center [lat, lng]. Default: [50.8, -1.1] (UK south coast) */
  initialCenter?: [number, number];

  /** Initial zoom level (0-18). Default: 10 */
  initialZoom?: number;

  /** Whether selection is enabled. Default: true */
  selectionEnabled?: boolean;

  /** Tile layer URL template. Default: OpenStreetMap */
  tileUrl?: string;

  /** Tile layer attribution text */
  tileAttribution?: string;

  /** Custom className for container */
  className?: string;

  /** Inline styles for container */
  style?: CSSProperties;

  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * MapView component - interactive map display for GeoJSON features
 *
 * @example
 * ```tsx
 * <MapView
 *   features={featureCollection}
 *   selectedIds={selected}
 *   onSelect={setSelected}
 *   initialZoom={12}
 * />
 * ```
 */
export declare function MapView(props: MapViewProps): JSX.Element;

// =============================================================================
// Timeline Component
// =============================================================================

/**
 * Time range for timeline visibility
 */
export interface TimeRange {
  /** Start of visible range (ISO 8601 string or Date) */
  start: string | Date;

  /** End of visible range (ISO 8601 string or Date) */
  end: string | Date;
}

/**
 * Timeline component props
 */
export interface TimelineProps {
  /** GeoJSON features with temporal data (startTime/endTime properties) */
  features: DebriefFeatureCollection;

  /** Currently selected feature IDs */
  selectedIds?: Set<string>;

  /** Called when user selects/deselects features */
  onSelect?: SelectionHandler;

  /** Called when visible time range changes */
  onTimeRangeChange?: (range: TimeRange) => void;

  /** Initial visible time range. Default: auto-fit to data */
  initialTimeRange?: TimeRange;

  /** Whether selection is enabled. Default: true */
  selectionEnabled?: boolean;

  /** Orientation of the timeline. Default: 'horizontal' */
  orientation?: 'horizontal' | 'vertical';

  /** Height in pixels (for horizontal). Default: 150 */
  height?: number;

  /** Width in pixels (for vertical). Default: 200 */
  width?: number;

  /** Custom className for container */
  className?: string;

  /** Inline styles for container */
  style?: CSSProperties;

  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * Timeline component - temporal visualization of features
 *
 * @example
 * ```tsx
 * <Timeline
 *   features={featureCollection}
 *   selectedIds={selected}
 *   onSelect={setSelected}
 *   height={200}
 * />
 * ```
 */
export declare function Timeline(props: TimelineProps): JSX.Element;

// =============================================================================
// FeatureList Component
// =============================================================================

/**
 * FeatureList component props
 */
export interface FeatureListProps {
  /** GeoJSON features to display */
  features: DebriefFeatureCollection;

  /** Currently selected feature IDs */
  selectedIds?: Set<string>;

  /** Called when user selects/deselects features */
  onSelect?: SelectionHandler;

  /** Called when user double-clicks a feature (e.g., zoom to) */
  onFeatureDoubleClick?: (featureId: string) => void;

  /** Whether selection is enabled. Default: true */
  selectionEnabled?: boolean;

  /** Whether multi-select is allowed. Default: true */
  multiSelect?: boolean;

  /** Sort order for features. Default: 'name' */
  sortBy?: 'name' | 'type' | 'startTime';

  /** Sort direction. Default: 'asc' */
  sortDirection?: 'asc' | 'desc';

  /** Filter predicate to show subset of features */
  filter?: (feature: DebriefFeature) => boolean;

  /** Custom row renderer for advanced customization */
  renderRow?: (feature: DebriefFeature, isSelected: boolean) => ReactNode;

  /** Placeholder when no features match filter */
  emptyMessage?: string;

  /** Custom className for container */
  className?: string;

  /** Inline styles for container */
  style?: CSSProperties;

  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * FeatureList component - scrollable list of features
 *
 * @example
 * ```tsx
 * <FeatureList
 *   features={featureCollection}
 *   selectedIds={selected}
 *   onSelect={setSelected}
 *   sortBy="startTime"
 * />
 * ```
 */
export declare function FeatureList(props: FeatureListProps): JSX.Element;

// =============================================================================
// ThemeProvider Component
// =============================================================================

/**
 * ThemeProvider component props
 */
export interface ThemeProviderProps {
  /** Partial theme overrides (merged with defaults) */
  theme?: Partial<ThemeTokens>;

  /** Children to render within theme context */
  children: ReactNode;
}

/**
 * ThemeProvider component - provides theme context to children
 *
 * @example
 * ```tsx
 * <ThemeProvider theme={{ primary: '#1e40af' }}>
 *   <MapView features={data} />
 *   <FeatureList features={data} />
 * </ThemeProvider>
 * ```
 */
export declare function ThemeProvider(props: ThemeProviderProps): JSX.Element;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access current theme values
 *
 * @returns Current theme token values
 */
export declare function useTheme(): ThemeTokens;

/**
 * Hook to manage synchronized selection across components
 *
 * @param initialSelection - Initial selected IDs
 * @returns Tuple of [selectedIds, setSelectedIds]
 */
export declare function useSelection(
  initialSelection?: Set<string>
): [Set<string>, SelectionHandler];

// =============================================================================
// Utilities
// =============================================================================

/**
 * Calculate bounding box for a feature collection
 *
 * @param features - GeoJSON feature collection
 * @returns Bounds as [[south, west], [north, east]] or null if empty
 */
export declare function calculateBounds(
  features: DebriefFeatureCollection
): [[number, number], [number, number]] | null;

/**
 * Calculate time extent for features with temporal data
 *
 * @param features - GeoJSON feature collection
 * @returns Time range or null if no temporal data
 */
export declare function calculateTimeExtent(
  features: DebriefFeatureCollection
): TimeRange | null;

/**
 * Get display label for a feature
 *
 * @param feature - Debrief feature
 * @returns Display string (name or fallback)
 */
export declare function getFeatureLabel(feature: DebriefFeature): string;

/**
 * Get icon identifier for a feature type
 *
 * @param type - Feature type
 * @returns Icon identifier string
 */
export declare function getFeatureIcon(type: FeatureType): string;
