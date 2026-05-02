import { ExerciseListItem, RecentlyOpenedEntry, GeoJSONFeatureCollection } from '../types';

/** Generate a single mock ExerciseListItem. */
export declare function createMockExerciseItem(index: number): ExerciseListItem;
/** Generate N mock ExerciseListItems with stable random seed. */
export declare function createMockExerciseItems(count: number): ExerciseListItem[];
/** Generate mock recently opened entries. */
export declare function createMockRecentItems(count?: number): RecentlyOpenedEntry[];
/** Generate a mock GeoJSON FeatureCollection with track lines. */
export declare function createMockTrackData(bbox: readonly [number, number, number, number], trackCount?: number): GeoJSONFeatureCollection;
/** Pre-generated mock items for consistent use across tests and stories. */
export declare const MOCK_100_ITEMS: ExerciseListItem[];
export declare const MOCK_5_ITEMS: ExerciseListItem[];
export declare const MOCK_RECENT_ITEMS: RecentlyOpenedEntry[];
//# sourceMappingURL=mockData.d.ts.map