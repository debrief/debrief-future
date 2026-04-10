import { DebriefFeature } from './types';

/**
 * Get a human-readable label for a feature.
 * Uses platform_name for tracks, name for reference locations.
 * Falls back to ID if no name is available.
 *
 * @param feature - The feature to get a label for
 * @returns A display label string
 */
export declare function getFeatureLabel(feature: DebriefFeature): string;
/**
 * Get an icon identifier for a feature based on its type.
 * Returns a string that can be used to look up an icon in a sprite sheet
 * or icon library.
 *
 * @param feature - The feature to get an icon for
 * @returns An icon identifier string
 */
export declare function getFeatureIcon(feature: DebriefFeature): string;
/**
 * Get a color for a feature, using its explicit color property
 * or falling back to type-based defaults.
 *
 * @param feature - The feature to get a color for
 * @returns A CSS color string
 */
export declare function getFeatureColor(feature: DebriefFeature): string;
/**
 * Get a description or subtitle for a feature.
 * Returns additional contextual information about the feature.
 *
 * @param feature - The feature to describe
 * @returns A description string
 */
export declare function getFeatureDescription(feature: DebriefFeature): string;
//# sourceMappingURL=labels.d.ts.map