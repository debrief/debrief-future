/**
 * StacService Extension Contract — Feature 071
 *
 * New method(s) added to the existing stacService for provenance writes.
 * This is a design artifact, not production code.
 */

export interface FeatureProvenance {
  /** Feature ID to append the entry to */
  featureId: string;
  /** Log entry to append (camelCase JSON, PROV-aligned) */
  entry: Record<string, unknown>;
}

/**
 * Extension to the existing StacService interface.
 * Added alongside existing methods: addFeatures(), addResultAsset(), etc.
 */
export interface StacServiceProvenanceExtension {
  /**
   * Append provenance Log entries to existing features in a STAC item's GeoJSON.
   *
   * For each entry in the list:
   * 1. Find the feature by ID in the GeoJSON FeatureCollection
   * 2. Ensure properties.provenance is an array (wrap single object if needed)
   * 3. Append the Log entry to the array
   * 4. Write the updated GeoJSON back to disk
   *
   * @param storePath - Path to the STAC store root
   * @param itemPath - Relative path to the item JSON file
   * @param provenance - Array of feature ID + Log entry pairs
   * @returns Number of features successfully updated
   * @throws If item not found or GeoJSON file missing
   */
  appendProvenance(
    storePath: string,
    itemPath: string,
    provenance: FeatureProvenance[]
  ): Promise<number>;
}
