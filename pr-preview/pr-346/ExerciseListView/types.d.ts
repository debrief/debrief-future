import { CatalogOverviewItem } from '../filter-engine/types';

/** Exercise data for list view display. Extends CatalogOverviewItem with STAC extension metadata. */
export interface ExerciseListItem extends CatalogOverviewItem {
    /** Vessel taxonomy paths from debrief:vessel_classes */
    readonly vesselClasses: readonly string[];
    /** Plot-level tags from debrief:tags */
    readonly tags: readonly string[];
    /** Exercise author from debrief:author */
    readonly author: string | null;
    /** ISO 3166-1 alpha-2 nationality codes from debrief:nationalities */
    readonly nationalities: readonly string[];
    /** Track platform names from debrief:track_names */
    readonly trackNames: readonly string[];
    /** Path to GeoJSON track data for spatial thumbnail */
    readonly trackDataHref: string | null;
}
/** Recently opened exercise entry, matching RecentPlot shape from VS Code extension. */
export interface RecentlyOpenedEntry {
    /** Plot ID (STAC Item ID) */
    readonly plotId: string;
    /** Plot title */
    readonly title: string;
    /** Store identifier */
    readonly storeId: string;
    /** Last opened timestamp (ISO 8601) */
    readonly lastOpened: string;
    /** URI for quick open */
    readonly uri: string;
}
/** Sort dimension options. */
export type SortDimension = 'recency' | 'title' | 'duration';
/** Sort direction options. */
export type SortDirection = 'asc' | 'desc';
/** Sort configuration state. */
export interface SortConfiguration {
    readonly dimension: SortDimension;
    readonly direction: SortDirection;
}
/** Props for the main ExerciseListView component. */
export interface ExerciseListViewProps {
    /** All exercises available for display (pre-filtered or full set). */
    readonly items: readonly ExerciseListItem[];
    /** Recently opened exercises, ordered by most recent first. */
    readonly recentItems?: readonly RecentlyOpenedEntry[];
    /** Called when the analyst clicks an exercise to open it. */
    readonly onItemSelect?: (itemPath: string) => void;
    /** Initial sort configuration. Defaults to recency descending. */
    readonly initialSort?: SortConfiguration;
    /** Called when track GeoJSON data is needed for a thumbnail. */
    readonly onRequestTrackData?: (itemId: string, trackDataHref: string) => void;
    /** Track data loaded via lazy loading, keyed by item ID. */
    readonly trackData?: ReadonlyMap<string, GeoJSONFeatureCollection>;
    /** Additional CSS class for the container. */
    readonly className?: string;
    /** Height of the list container in pixels. */
    readonly height?: number;
}
/** Props for a single exercise list item row. */
export interface ExerciseListItemRowProps {
    /** The exercise data to display. */
    readonly item: ExerciseListItem;
    /** Track GeoJSON data for the spatial thumbnail (null if not yet loaded). */
    readonly trackData?: GeoJSONFeatureCollection | null;
    /** Whether track data is currently loading. */
    readonly trackDataLoading?: boolean;
    /** Called when the row is clicked. */
    readonly onSelect?: (itemPath: string) => void;
}
/** Props for the spatial thumbnail component. */
export interface SpatialThumbnailProps {
    /** Bounding box [west, south, east, north] for the viewport. */
    readonly bbox: readonly [number, number, number, number] | null;
    /** GeoJSON track data to render. */
    readonly trackData?: GeoJSONFeatureCollection | null;
    /** Whether data is currently loading. */
    readonly loading?: boolean;
    /** Width in pixels. */
    readonly width?: number;
    /** Height in pixels. */
    readonly height?: number;
}
export type GeoJSONGeometry = {
    type: 'Point';
    coordinates: number[];
} | {
    type: 'MultiPoint';
    coordinates: number[][];
} | {
    type: 'LineString';
    coordinates: number[][];
} | {
    type: 'MultiLineString';
    coordinates: number[][][];
} | {
    type: 'Polygon';
    coordinates: number[][][];
} | {
    type: 'MultiPolygon';
    coordinates: number[][][][];
} | {
    type: 'GeometryCollection';
    geometries: GeoJSONGeometry[];
};
export interface GeoJSONFeature {
    type: 'Feature';
    geometry: GeoJSONGeometry;
    properties: Record<string, unknown> | null;
}
export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}
//# sourceMappingURL=types.d.ts.map