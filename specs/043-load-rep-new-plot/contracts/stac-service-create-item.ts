/**
 * Contract: stacService.createItem()
 *
 * Creates a new STAC Item with per-item folder structure.
 * Does NOT parse or store any data — only creates the empty item scaffold.
 */

export interface CreateItemOptions {
  /** User-provided plot title. Must be non-empty. */
  title: string;
  /** Optional item ID. If omitted, a UUID is generated. */
  id?: string;
}

export interface CreateItemResult {
  /** Relative path to item.json from store root, e.g., "{itemId}/item.json" */
  itemPath: string;
  /** The item ID (generated or provided) */
  itemId: string;
  /** Absolute path to the item directory */
  itemDir: string;
}

/**
 * Creates a new STAC Item in the given store.
 *
 * Operations performed:
 * 1. Generate UUID if id not provided
 * 2. Create directory: {storePath}/{itemId}/
 * 3. Create directory: {storePath}/{itemId}/assets/
 * 4. Write {storePath}/{itemId}/item.json with:
 *    - type: "Feature", stac_version: "1.0.0"
 *    - id: generated or provided
 *    - geometry: null, bbox: null
 *    - properties: { title, datetime: null, created: ISO now }
 *    - links: root → ../catalog.json, parent → ../catalog.json, self → ./item.json
 *    - assets: {} (empty — populated later by addFeatures/addAsset)
 * 5. Update {storePath}/catalog.json to add item link
 *
 * @param storePath - Absolute path to the STAC store root
 * @param options - Title and optional ID
 * @returns Created item path and ID
 * @throws If storePath doesn't exist or isn't writable
 * @throws If item with same ID already exists
 */
export type CreateItem = (
  storePath: string,
  options: CreateItemOptions
) => Promise<CreateItemResult>;
