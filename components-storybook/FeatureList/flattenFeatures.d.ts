import { DebriefFeature } from '../utils/types';

export type DisplayItemType = 'feature' | 'storyboard' | 'position' | 'point' | 'polygon' | 'segment' | 'group' | 'sensor' | 'contact';
export interface DisplayItem {
    /** Discriminator for the row kind */
    type: DisplayItemType;
    /** Selection path for this item (e.g., 'track-001' or 'track-001/positions/4') */
    id: string;
    /** Display label for the row */
    label: string;
    /** Secondary info (e.g., course/speed for positions, coordinates for points) */
    sublabel: string | null;
    /** Nesting depth (0 = top-level, 1 = child of feature, 2 = child of segment) */
    depth: number;
    /** Feature ID of the parent (null for top-level features) */
    parentId: string | null;
    /** Whether this item can be expanded to show children */
    isExpandable: boolean;
    /** Reference to the original feature (only for type 'feature') */
    feature: DebriefFeature | null;
    /** Child index within parent (null for top-level features) */
    index: number | null;
    /**
     * Scene count for `'storyboard'` rows (Spec #258 / FR-013). Always
     * present on storyboard rows (including empty storyboards, which carry
     * `childCount: 0` and `isExpandable: false`). Absent on every other row
     * type.
     */
    childCount?: number;
}
/**
 * Flatten features + expansion state into a flat array of display items.
 * This is a pure function — no side effects.
 */
export declare function flattenFeatures(features: DebriefFeature[], expandedIds: Set<string>): DisplayItem[];
/**
 * Extract the root feature ID from any path in the DisplayItem ID scheme.
 * E.g., 'track-001/sensors/TOWED/contacts/3' → 'track-001'
 */
export declare function getRootFeatureId(path: string): string;
/**
 * Check if any selected ID is a child of the given feature.
 * Uses simple string prefix matching — no path parsing required.
 */
export declare function hasChildSelected(featureId: string, selectedIds: Set<string>): boolean;
//# sourceMappingURL=flattenFeatures.d.ts.map