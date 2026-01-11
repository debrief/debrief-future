/**
 * STAC catalog validation.
 *
 * Performs structural validation to ensure a path contains a valid STAC catalog.
 * This is done offline without network calls per Constitution Article I.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InvalidCatalogError } from './errors.js';

// Required fields per STAC Catalog specification
const REQUIRED_FIELDS = new Set(['type', 'stac_version', 'id', 'description', 'links']);

/**
 * Validate that a path contains a valid STAC catalog.
 *
 * Checks for:
 * 1. Existence of catalog.json
 * 2. Valid JSON format
 * 3. Required fields present
 * 4. type == "Catalog"
 * 5. links is an array
 *
 * @param path - Path to the catalog directory
 * @throws InvalidCatalogError if validation fails
 */
export function validateStacCatalog(path: string): void {
  const catalogJson = join(path, 'catalog.json');

  // Check catalog.json exists
  if (!existsSync(catalogJson)) {
    throw new InvalidCatalogError(path, 'No catalog.json found');
  }

  // Check valid JSON
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(catalogJson, 'utf-8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new InvalidCatalogError(path, `Invalid JSON: ${e.message}`);
    }
    throw e;
  }

  // Check it's an object
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new InvalidCatalogError(path, 'catalog.json must be a JSON object');
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  const missing = [...REQUIRED_FIELDS].filter((field) => !(field in obj));
  if (missing.length > 0) {
    throw new InvalidCatalogError(path, `Missing required fields: ${missing.join(', ')}`);
  }

  // Check type is Catalog
  if (obj.type !== 'Catalog') {
    throw new InvalidCatalogError(path, `type must be 'Catalog', got '${obj.type}'`);
  }

  // Check links is an array
  if (!Array.isArray(obj.links)) {
    throw new InvalidCatalogError(path, 'links must be an array');
  }
}
