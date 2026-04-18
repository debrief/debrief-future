import { ExerciseListItem, SortDimension, GeoJSONFeatureCollection } from './types';

/** Compute duration in milliseconds from start/end datetimes. Returns null if either is missing. */
export declare function computeDuration(item: Pick<ExerciseListItem, 'startDatetime' | 'endDatetime'>): number | null;
/** Format a duration in ms to a human-readable string using locale-aware formatting. */
export declare function formatDuration(ms: number | null): string;
/** Format a date range as "12 Jan 2024 – 14 Jan 2024" or single date. */
export declare function formatDateRange(startDatetime: string | null, endDatetime: string | null, datetime: string | null): string;
/** Format a timestamp as relative time (e.g., "2 hours ago", "yesterday"). */
export declare function formatRelativeTime(isoDate: string): string;
/** Sort comparator functions. All return descending order by default. */
export declare const sortComparators: Record<SortDimension, (a: ExerciseListItem, b: ExerciseListItem) => number>;
/** Truncate an array of strings, returning the visible items and overflow count. */
export declare function truncateArray(items: readonly string[], maxVisible?: number): {
    visible: string[];
    overflow: number;
};
/**
 * Douglas-Peucker line simplification for SVG thumbnail rendering.
 * Reduces point count while preserving shape characteristics.
 */
export declare function simplifyLine(coords: readonly (readonly number[])[], epsilon: number): number[][];
/** Extract all line coordinates from a GeoJSON FeatureCollection. */
export declare function extractLineCoordinates(fc: GeoJSONFeatureCollection): number[][][];
/** Project geographic coordinates to pixel space within a bounding box. */
export declare function projectToPixel(lon: number, lat: number, bbox: readonly [number, number, number, number], width: number, height: number, padding?: number): [number, number];
//# sourceMappingURL=utils.d.ts.map