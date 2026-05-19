/**
 * Sample GeoJSON features for the ToolMatchHarness.
 *
 * These simplified features are used for demonstration and testing.
 * They have minimal properties to focus on selection and tool matching.
 */
export interface SimpleFeature {
    id: string;
    kind: string;
    name: string;
}
/**
 * Sample features grouped by kind.
 */
export declare const sampleFeatures: SimpleFeature[];
/**
 * Get features grouped by kind.
 */
export declare function getFeaturesByKind(): Map<string, SimpleFeature[]>;
/**
 * Get feature by ID.
 */
export declare function getFeatureById(id: string): SimpleFeature | undefined;
/**
 * Get human-readable label for a kind.
 */
export declare function getKindLabel(kind: string): string;
//# sourceMappingURL=features.d.ts.map