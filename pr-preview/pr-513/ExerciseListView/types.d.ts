import { CatalogOverviewItem, PlatformRecord } from '../filter-engine/types';
import { RawGeoJSONFeature as GeoJSONFeature, RawGeoJSONFeatureCollection as GeoJSONFeatureCollection } from '../../../schemas/src/generated/typescript/index.ts';

export type { PlatformRecord };
export type { GeoJSONFeature, GeoJSONFeatureCollection };
/** Exercise data for list view display. Extends CatalogOverviewItem with STAC extension metadata. */
export interface ExerciseListItem extends CatalogOverviewItem {
    /** Per-platform metadata from debrief:platforms */
    readonly platforms: readonly PlatformRecord[];
    /** Plot-level tags from debrief:tags */
    readonly tags: readonly string[];
    /** Exercise author from debrief:author */
    readonly author: string | null;
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
    /** Called when the analyst clicks an exercise to open it (double-click when onItemHighlight provided). */
    readonly onItemSelect?: (itemPath: string) => void;
    /** Called on single-click to highlight an item for preview (#174). */
    readonly onItemHighlight?: (itemId: string) => void;
    /** ID of the currently highlighted/selected item (#174). */
    readonly highlightedItemId?: string | null;
    /** Initial sort configuration. Defaults to recency descending. */
    readonly initialSort?: SortConfiguration;
    /** Controlled sort state — when provided, overrides internal state. */
    readonly sort?: SortConfiguration;
    /** Sort change callback for controlled mode. */
    readonly onSortChange?: (sort: SortConfiguration) => void;
    /** Hide the inline sort bar (when sort controls are rendered externally). */
    readonly hideSortBar?: boolean;
    /** Called when track GeoJSON data is needed for a thumbnail. */
    readonly onRequestTrackData?: (itemId: string, trackDataHref: string) => void;
    /** Track data loaded via lazy loading, keyed by item ID. */
    readonly trackData?: ReadonlyMap<string, GeoJSONFeatureCollection>;
    /** Thumbnail size preset (small/medium/large). Defaults to 'small'. */
    readonly thumbnailSize?: ThumbnailSize;
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
    /** Called when the row is clicked (single-click = open, or highlight if onHighlight provided). */
    readonly onSelect?: (itemPath: string) => void;
    /** Called on single-click to highlight/preview the item (#174). When provided, onSelect fires on double-click. */
    readonly onHighlight?: (itemId: string) => void;
    /** Whether this row is currently highlighted/selected for preview (#174). */
    readonly highlighted?: boolean;
    /** Thumbnail size preset controlling image dimensions. Defaults to 'small'. */
    readonly thumbnailSize?: ThumbnailSize;
}
/** Thumbnail display size preset. */
export type ThumbnailSize = 'small' | 'medium' | 'large';
/** Dimensions configuration for a given thumbnail size preset. */
export interface ThumbnailSizeConfig {
    readonly rasterWidth: number;
    readonly rasterHeight: number;
    readonly spatialWidth: number;
    readonly spatialHeight: number;
    readonly rowHeight: number;
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
//# sourceMappingURL=types.d.ts.map