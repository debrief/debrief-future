/**
 * Component prop contracts for List View with Spatial Thumbnails (#129)
 *
 * Defines the public API of the ExerciseListView component.
 */

import type {
  ExerciseListItem,
  RecentlyOpenedEntry,
  SortConfiguration,
} from './messages';

/** Props for the main ExerciseListView component. */
export interface ExerciseListViewProps {
  /** All exercises available for display (pre-filtered or full set). */
  readonly items: readonly ExerciseListItem[];

  /** Recently opened exercises, ordered by most recent first. */
  readonly recentItems: readonly RecentlyOpenedEntry[];

  /** Called when the analyst clicks an exercise to open it. */
  readonly onItemSelect?: (itemPath: string) => void;

  /** Initial sort configuration. Defaults to recency descending. */
  readonly initialSort?: SortConfiguration;

  /** Additional CSS class for the container. */
  readonly className?: string;
}

/** Props for a single exercise list item row. */
export interface ExerciseListItemRowProps {
  /** The exercise data to display. */
  readonly item: ExerciseListItem;

  /** Called when the row is clicked. */
  readonly onSelect?: (itemPath: string) => void;
}

/** Props for the spatial thumbnail component. */
export interface SpatialThumbnailProps {
  /** Bounding box [west, south, east, north] for the viewport. */
  readonly bbox: readonly [number, number, number, number] | null;

  /** URL/path to the GeoJSON track data file. */
  readonly trackDataHref: string | null;

  /** Width in pixels. */
  readonly width?: number;

  /** Height in pixels. */
  readonly height?: number;
}

/** Props for the sort control. */
export interface SortControlProps {
  /** Current sort configuration. */
  readonly sort: SortConfiguration;

  /** Called when sort dimension or direction changes. */
  readonly onSortChange: (sort: SortConfiguration) => void;
}

/** Props for the recently opened section. */
export interface RecentlyOpenedSectionProps {
  /** Recently opened entries. */
  readonly items: readonly RecentlyOpenedEntry[];

  /** Called when a recent item is clicked. */
  readonly onItemSelect?: (uri: string) => void;
}
