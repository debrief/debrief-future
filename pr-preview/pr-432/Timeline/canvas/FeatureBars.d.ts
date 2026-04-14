import { DebriefFeature, TimeExtent } from '../../utils/types';

export interface FeatureBarsConfig {
    /** Canvas width in pixels */
    width: number;
    /** Canvas height in pixels (excluding axis) */
    height: number;
    /** Time extent [startMs, endMs] */
    timeExtent: TimeExtent;
    /** Height of each feature bar */
    barHeight?: number;
    /** Vertical padding between bars */
    barPadding?: number;
    /** Corner radius for bars */
    barRadius?: number;
    /** Selected feature IDs */
    selectedIds?: Set<string>;
    /** Selection highlight color */
    selectionColor?: string;
    /** Font family for labels */
    fontFamily?: string;
    /** Font size for labels */
    fontSize?: number;
}
export interface FeatureBarInfo {
    feature_id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    color: string;
    isSelected: boolean;
}
/**
 * Calculate bar positions and dimensions for all features.
 */
export declare function calculateFeatureBars(features: DebriefFeature[], config: FeatureBarsConfig): FeatureBarInfo[];
/**
 * Render feature bars on a canvas context.
 */
export declare function renderFeatureBars(ctx: CanvasRenderingContext2D, bars: FeatureBarInfo[], config: FeatureBarsConfig): void;
/**
 * Find bar at a given point.
 */
export declare function findBarAtPoint(x: number, y: number, bars: FeatureBarInfo[]): FeatureBarInfo | null;
//# sourceMappingURL=FeatureBars.d.ts.map