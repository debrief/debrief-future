/**
 * STAC Service - Wrapper for debrief-stac operations
 *
 * This service provides access to local STAC catalogs for browsing and loading plots.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import type {
  StacStore,
  Catalog,
  StacItemSummary,
  StacCatalog,
  StacItem,
  StacAsset,
  PlatformRecord,
} from '../types/stac';

// AssociatedFile is canonically defined by `@debrief/components`; re-export
// rather than redeclare (see spec #214 drift guard).
export type { AssociatedFile } from '@debrief/components';
import type { AssociatedFile } from '@debrief/components';
import type { Plot } from '../types/plot';
import type {
  DebriefFeature,
  TrackFeature,
  ReferenceLocation,
  LogEntry as SchemaLogEntry,
  PositionStyle,
  PositionStyleOverride,
} from '@debrief/schemas';

// Canonical Safe GeoJSON types from @debrief/utils (T02)
import type { SafeFeature, SafeFeatureCollection, SafeGeometry } from '@debrief/utils';

// Properties Panel (#191/#193) — provenance constants + type. Imported via
// subpath so the service does not drag in the full components barrel (and its
// Leaflet/DOM-dependent modules) in Node contexts.
import {
  PROVENANCE_LOG_CAP,
  PROVENANCE_LOG_ARCHIVE_FILENAME,
  PROPERTIES_PANEL_TOOL_SENTINEL,
} from '@debrief/components/PropertiesPanel/provenanceTypes';
import type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';

/**
 * Thrown when item.json was modified externally between the read and the
 * write (mtime fingerprint differs). UI must treat this as a write-error and
 * reload from disk.
 */
export class StaleItemJsonError extends Error {
  override readonly name = 'StaleItemJsonError' as const;
  constructor(
    readonly storePath: string,
    readonly itemPath: string,
    message: string = 'item.json was modified externally since this edit began',
  ) {
    super(message);
  }
}

/** Schema validation failed on the merged item.properties. */
export class SchemaValidationError extends Error {
  override readonly name = 'SchemaValidationError' as const;
  constructor(
    readonly violations: Array<{ field: string; message: string }>,
    message: string = 'Merged item.properties failed schema validation',
  ) {
    super(message);
  }
}

// `ReadOnlyFilesystemError` was moved to `@debrief/stac-writer` (spec #192
// T017) so `@debrief/session-state`'s `saveSession` catch block can detect
// it cleanly via `instanceof` without depending on this VS Code package.
// Re-exported here so existing call sites (and tests) keep working.
export { ReadOnlyFilesystemError } from '@debrief/stac-writer';
import { ReadOnlyFilesystemError } from '@debrief/stac-writer';

export interface UpdateItemMetadataInput {
  storePath: string;
  itemPath: string;
  patch: Record<string, unknown>;
  overrideFields: string[];
  provenance: Pick<PropertiesProvenanceEntry, 'tool' | 'fields'>;
  packageVersion: string;
}

export interface UpdateItemMetadataResult {
  updatedProperties: Record<string, unknown>;
  overrides: string[];
  // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-010, unrelated to #214
  activityId: string;
}

/** Type-safe JSON.parse wrapper — returns `unknown` without `as unknown` cast. */
function parseJsonSafe(text: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(text);
}

/** Detect EACCES / EROFS filesystem errors from Node's fs.*Sync methods. */
function isReadOnlyFsError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {return false;}
  const code = (err as { code?: unknown }).code;
  return code === 'EACCES' || code === 'EROFS' || code === 'EPERM';
}

/**
 * Narrow the LinkML-generated `StacItem.bbox: number[]` to the 4-tuple
 * shape expected by UI summary projections. STAC permits 4- or
 * 6-element bboxes; the catalog overview / plot UI only needs the 2D
 * corners. Returns null when the bbox is shorter than 4 elements (the
 * schema's lower-bound constraint rejects those at validation time,
 * but the conditional keeps TypeScript happy here).
 */
function toBbox4(bbox: number[] | undefined): [number, number, number, number] | null {
  if (!Array.isArray(bbox) || bbox.length < 4) {return null;}
  return [bbox[0]!, bbox[1]!, bbox[2]!, bbox[3]!];
}

export class StacService {
  private catalogCache: Map<string, StacCatalog> = new Map();
  private itemCache: Map<string, StacItem> = new Map();
  // #230 FR-051 — structured diagnostics for plot-load failures. Each
  // null-return branch of loadPlot writes a line here so failures can be
  // attributed to a specific step instead of just a silent `Failed to
  // load plot` toast.
  private diagnosticSink: { appendLine(line: string): void } | null = null;

  /**
   * #230 FR-051 — wire the Debrief output channel (or any line-sink) in
   * at extension-activation time so `loadPlot` null-branches surface a
   * structured failure cause.
   */
  setDiagnosticSink(sink: { appendLine(line: string): void }): void {
    this.diagnosticSink = sink;
  }

  private logDiagnostic(line: string): void {
    this.diagnosticSink?.appendLine(line);
  }

  /**
   * Validate that a path contains a valid STAC catalog
   */
  validateStorePath(storePath: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const catalogPath = path.join(storePath, 'catalog.json');

      if (!fs.existsSync(catalogPath)) {
        return Promise.resolve({
          valid: false,
          error: 'No catalog.json found in directory',
        });
      }

      const content = fs.readFileSync(catalogPath, 'utf-8');
      const parsed = parseJsonSafe(content);

      // Basic STAC catalog validation
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        !('type' in parsed) ||
        (parsed.type !== 'Catalog' && parsed.type !== 'Collection')
      ) {
        return Promise.resolve({
          valid: false,
          error: 'Invalid STAC catalog format',
        });
      }

      return Promise.resolve({ valid: true });
    } catch (err) {
      return Promise.resolve({
        valid: false,
        error: `Failed to read catalog: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  /**
   * List catalogs in a store.
   *
   * Returns catalogs immediately with `itemCount: -1` (unknown).
   * Call {@link countItemsForCatalogs} afterwards to fill in counts
   * and fire a tree refresh.
   */
  async listCatalogs(store: StacStore): Promise<Catalog[]> {
    const catalogs: Catalog[] = [];

    try {
      const rootCatalog = await this.loadCatalog(store.path);
      if (!rootCatalog) {
        return catalogs;
      }

      // Root catalog — itemCount deferred
      catalogs.push({
        id: rootCatalog.id,
        title: rootCatalog.title ?? rootCatalog.id,
        description: rootCatalog.description,
        catalogPath: 'catalog.json',
        storeId: store.id,
        itemCount: -1,
      });

      // Find child catalogs
      const childLinks = rootCatalog.links.filter(
        (link) => link.rel === 'child' && link.href.endsWith('catalog.json')
      );

      for (const link of childLinks) {
        const childPath = path.join(store.path, link.href);
        const childCatalog = await this.loadCatalogFromPath(childPath);

        if (childCatalog) {
          catalogs.push({
            id: childCatalog.id,
            title: childCatalog.title ?? childCatalog.id,
            description: childCatalog.description,
            catalogPath: link.href,
            storeId: store.id,
            itemCount: -1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to list catalogs:', err);
    }

    return catalogs;
  }

  /**
   * Fill in `itemCount` for each catalog in-place.
   * Designed to run in the background after the tree has already rendered.
   */
  async countItemsForCatalogs(
    store: StacStore,
    catalogs: Catalog[]
  ): Promise<void> {
    for (const catalog of catalogs) {
      try {
        const catalogPath = path.join(store.path, catalog.catalogPath);
        const catalogData = await this.loadCatalogFromPath(catalogPath);
        if (catalogData) {
          catalog.itemCount = await this.countItems(
            path.dirname(catalogPath),
            catalogData
          );
        }
      } catch {
        // Leave itemCount as -1 on failure
      }
    }
  }

  /**
   * List items in a catalog
   */
  async listItems(
    store: StacStore,
    catalog: Catalog
  ): Promise<StacItemSummary[]> {
    const items: StacItemSummary[] = [];

    try {
      const catalogPath = path.join(store.path, catalog.catalogPath);
      const catalogData = await this.loadCatalogFromPath(catalogPath);

      if (!catalogData) {
        return items;
      }

      // Find item links
      const itemLinks = catalogData.links.filter(
        (link) => link.rel === 'item'
      );

      for (const link of itemLinks) {
        const itemPath = path.resolve(path.dirname(catalogPath), link.href);
        const relativePath = path.relative(store.path, itemPath);
        const item = await this.loadItem(itemPath);

        if (item) {
          const startDatetime = item.properties.start_datetime ?? null;
          const endDatetime = item.properties.end_datetime ?? null;
          items.push({
            id: item.id,
            title: item.properties.title ?? item.id,
            datetime: item.properties.datetime,
            itemPath: relativePath,
            catalogId: catalog.id,
            storeId: store.id,
            bbox: toBbox4(item.bbox),
            startDatetime,
            endDatetime,
            platforms: (item.properties['debrief:platforms'] as PlatformRecord[] | undefined) ?? [],
            tags: (item.properties['debrief:tags'] as string[] | undefined) ?? [],
            featureTags: (item.properties['debrief:feature_tags'] as string[] | undefined) ?? [],
            // spec 241: assets.thumbnail is the small (200x150) variant;
            // assets.overview is the large (800x600) variant.
            thumbnailHref: item.assets['thumbnail']?.href ?? null,
            overviewHref: item.assets['overview']?.href ?? null,
          });
        }
      }
    } catch (err) {
      console.error('Failed to list items:', err);
    }

    // Sort by datetime descending
    items.sort(
      (a, b) =>
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );

    return items;
  }

  /**
   * Load a plot from a STAC item
   */
  async loadPlot(store: StacStore, itemPath: string): Promise<Plot | null> {
    const fullPath = path.join(store.path, itemPath);
    try {
      const item = await this.loadItem(fullPath);

      if (!item) {
        this.logDiagnostic(
          `[stac.loadPlot] item-not-found or unreadable: store=${store.path} itemPath=${itemPath} fullPath=${fullPath}`,
        );
        return null;
      }
      // Verify required fields for downstream consumers — missing
      // `properties.datetime` leads to a cryptic `Failed to load plot`
      // later in the pipeline.
      if (
        item.properties === null ||
        item.properties === undefined ||
        typeof item.properties !== 'object'
      ) {
        this.logDiagnostic(
          `[stac.loadPlot] item-has-no-properties: store=${store.path} itemPath=${itemPath}`,
        );
        return null;
      }
      if (item.properties.datetime === undefined) {
        this.logDiagnostic(
          `[stac.loadPlot] item-missing-required-field properties.datetime: store=${store.path} itemPath=${itemPath}`,
        );
      }

      // Find GeoJSON asset
      const geoJsonAsset = Object.values(item.assets).find(
        (asset) =>
          asset.type === 'application/geo+json' ||
          asset.href.endsWith('.geojson')
      );

      let trackCount = 0;
      let locationCount = 0;
      // Prefer start_datetime/end_datetime (set by updateTemporalMetadata),
      // falling back to datetime for both bounds
      const fallback = item.properties.datetime;
      const timeExtent: [string, string] = [
        item.properties.start_datetime ?? fallback,
        item.properties.end_datetime ?? fallback,
      ];

      if (geoJsonAsset) {
        const geoJsonPath = path.resolve(
          path.dirname(fullPath),
          geoJsonAsset.href
        );
        const features = await this.loadGeoJson(geoJsonPath);

        if (features !== null) {
          // Count tracks and locations
          for (const feature of features.features) {
            const geom = feature.geometry;
            if (!geom) {continue;} // Skip features with null geometry

            if (geom.type === 'LineString') {
              trackCount++;

              // Update time extent from track start_time/end_time (schema-standard)
              const props = feature.properties ?? {};
              const startTime = props.start_time as string | undefined;
              const endTime = props.end_time as string | undefined;
              if (startTime && endTime) {
                if (startTime < timeExtent[0]) {
                  timeExtent[0] = startTime;
                }
                if (endTime > timeExtent[1]) {
                  timeExtent[1] = endTime;
                }
              }
            } else if (geom.type === 'Point') {
              locationCount++;
            }
          }
        }
      }

      return {
        id: item.id,
        title: item.properties.title ?? item.id,
        datetime: item.properties.datetime,
        itemPath,
        catalogId: '', // Will be set by caller
        sourcePath: item.properties.sourcePath as string | undefined,
        // Plot.bbox is required as a 4-tuple; supply a zero-extent
        // fallback for the (validation-rejected) case of a too-short
        // schema bbox.
        bbox: toBbox4(item.bbox) ?? [0, 0, 0, 0],
        timeExtent,
        trackCount,
        locationCount,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logDiagnostic(
        `[stac.loadPlot] caught-exception: store=${store.path} itemPath=${itemPath} fullPath=${fullPath} error=${msg}`,
      );
      console.error('Failed to load plot:', err);
      return null;
    }
  }

  /**
   * Load all features from a plot as a unified FeatureCollection.
   * Each feature is classified by properties.kind (TRACK, POINT, CIRCLE, etc.)
   */
  async loadPlotData(
    store: StacStore,
    itemPath: string
  ): Promise<{ type: 'FeatureCollection'; features: DebriefFeature[] } | null> {
    try {
      const fullPath = path.join(store.path, itemPath);
      const item = await this.loadItem(fullPath);

      if (!item) {
        return null;
      }

      // Find GeoJSON asset
      const geoJsonAsset = Object.values(item.assets).find(
        (asset) =>
          asset.type === 'application/geo+json' ||
          asset.href.endsWith('.geojson')
      );

      if (!geoJsonAsset) {
        return { type: 'FeatureCollection', features: [] };
      }

      const geoJsonPath = path.resolve(
        path.dirname(fullPath),
        geoJsonAsset.href
      );
      const featureCollection = await this.loadGeoJson(geoJsonPath);

      if (featureCollection === null) {
        return { type: 'FeatureCollection', features: [] };
      }

      const features: DebriefFeature[] = [];
      let trackCount = 0;
      let locationCount = 0;

      for (const feature of featureCollection.features) {
        const props = feature.properties ?? {};
        const geom = feature.geometry;

        // Skip features with no geometry or empty coordinates
        if (geom === null || geom === undefined || (Array.isArray(geom.coordinates) && geom.coordinates.length === 0)) {
          continue;
        }

        // Preserve the GeoJSON top-level id — this is the canonical identifier
        // that provenance generated[] references.  Never derive from properties.
        const featureId = feature.id !== null && feature.id !== undefined
          ? String(feature.id)
          : `feature-${features.length}`;

        if (geom.type === 'LineString' && (props.kind === 'TRACK' || props.positions !== undefined)) {
          // Track: LineString with schema-standard positions array
          const lineCoords = geom.coordinates as number[][];
          const positions = (props.positions as Array<{ time: string }>) ?? [];

          const track: TrackFeature = {
            type: 'Feature',
            id: featureId,
            geometry: { type: 'LineString' as const, coordinates: lineCoords },
            properties: {
              kind: 'TRACK',
              platform_id: featureId,
              platform_name: (props.platform_name as string) ?? `Track ${trackCount + 1}`,
              track_type: (props.track_type as string) ?? 'CONTACT',
              start_time: (props.start_time as string) ?? positions[0]?.time ?? '',
              end_time: (props.end_time as string) ?? positions[positions.length - 1]?.time ?? '',
              positions,
              style: {
                line: { color: (props.color as string) ?? '#0066cc' },
                point: { shape: 'circle', radius: 3, fill: true, fill_color: (props.color as string) ?? '#0066cc', color: '#000000' },
              },
              default_position_style: (props.default_position_style as PositionStyle | undefined) ?? { show_symbol: true, symbol: 'circle', show_label: false },
              symbol_interval: props.symbol_interval as string | undefined,
              label_interval: props.label_interval as string | undefined,
              position_style_overrides: props.position_style_overrides as PositionStyleOverride[] | undefined,
              provenance: props.provenance as SchemaLogEntry[] | undefined,
            },
          };
          features.push(track);
          trackCount++;
        } else if (geom.type === 'Point' && (props.kind === 'POINT' || props.kind === 'LOCATION')) {
          // Reference location: Point with kind=POINT or LOCATION
          const pointCoords = geom.coordinates as number[];

          const location: ReferenceLocation = {
            type: 'Feature',
            id: featureId,
            geometry: { type: 'Point' as const, coordinates: pointCoords },
            properties: {
              kind: 'POINT',
              name: (props.name as string) ?? `Location ${locationCount + 1}`,
              location_type: (props.location_type as string) ?? 'REFERENCE',
              style: { shape: 'circle', radius: 5, fill_color: '#ff0000', color: '#000000' },
              provenance: props.provenance as SchemaLogEntry[] | undefined,
            },
          };
          features.push(location);
          locationCount++;
        } else {
          // Annotation/shape feature (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR, POLY, etc.)
          const kind = props.kind as string | undefined;
          if (!kind) {
            throw new Error(
              `Feature "${featureId}" is missing required "kind" property`,
            );
          }
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- annotation kind is dynamic
          const annotation: DebriefFeature = {
            type: 'Feature',
            id: featureId,
            geometry: geom,
            properties: { ...props, kind },
          } as DebriefFeature;
          features.push(annotation);
        }
      }

      return { type: 'FeatureCollection', features };
    } catch (err) {
      console.error('Failed to load plot data:', err);
      return null;
    }
  }

  /**
   * Save custom track colors to plot metadata
   */
  async saveTrackColors(
    store: StacStore,
    itemPath: string,
    trackColors: Record<string, string>
  ): Promise<boolean> {
    try {
      const fullPath = path.join(store.path, itemPath);
      const item = await this.loadItem(fullPath);

      if (!item) {
        return false;
      }

      // Update item properties with track colors
      item.properties.trackColors = trackColors;

      // Write back to file
      fs.writeFileSync(fullPath, JSON.stringify(item, null, 2));

      // Clear cache
      this.itemCache.delete(fullPath);

      return true;
    } catch (err) {
      console.error('Failed to save track colors:', err);
      return false;
    }
  }

  // ============================================================================
  // Result File Extraction (Feature 051)
  // ============================================================================

  /**
   * Parse multi-suffix viewer type from filename.
   * E.g., "range-bearing.2d.json" -> "2d", "result.table.geojson" -> "table"
   *
   * @param filename The filename to parse
   * @returns The viewer type if found, undefined otherwise
   */
  parseViewerType(filename: string): string | undefined {
    // Split by dots and check for multi-suffix pattern
    const parts = filename.split('.');
    if (parts.length >= 3) {
      // Second-to-last part is potential viewer type
      const potentialViewerType = parts[parts.length - 2];
      // Known viewer types
      const knownViewerTypes = ['2d', '3d', 'table', 'chart', 'map', 'text'];
      if (potentialViewerType && knownViewerTypes.includes(potentialViewerType.toLowerCase())) {
        return potentialViewerType.toLowerCase();
      }
    }
    return undefined;
  }

  /**
   * Parse file format from filename.
   *
   * @param filename The filename to parse
   * @returns The file extension without dot, lowercase
   */
  parseFileFormat(filename: string): string {
    const ext = path.extname(filename);
    return ext ? ext.slice(1).toLowerCase() : '';
  }

  /**
   * Transform a STAC asset to an AssociatedFile.
   *
   * @param asset The STAC asset
   * @param assetKey The asset key from the item
   * @returns AssociatedFile object
   */
  assetToAssociatedFile(asset: StacAsset, _assetKey: string): AssociatedFile {
    const hrefFilename = path.basename(asset.href);
    const displayName = asset.title ?? hrefFilename;
    const format = this.parseFileFormat(hrefFilename);
    const viewerType = this.parseViewerType(hrefFilename);

    return {
      name: displayName,
      path: asset.href.startsWith('./') ? asset.href.slice(2) : asset.href,
      category: 'result',
      viewerType,
      format,
    };
  }

  /**
   * Check if a STAC asset is a result file.
   * Primary: Check for 'result' role in roles array.
   * Fallback: Check for debrief:toolId metadata or known result patterns.
   *
   * @param asset The STAC asset to check
   * @param assetKey The asset key
   * @returns True if this asset is a result file
   */
  isResultAsset(asset: StacAsset, _assetKey: string): boolean {
    // Primary: Check for 'result' role
    if (asset.roles?.includes('result')) {
      return true;
    }

    // Fallback: Check for debrief:toolId metadata
    const assetWithMetadata = asset as StacAsset & { 'debrief:toolId'?: string };
    if (assetWithMetadata['debrief:toolId']) {
      return true;
    }

    // Fallback: Check filename patterns for known result types
    const href = asset.href.toLowerCase();
    const resultPatterns = [
      'range-bearing',
      '-result.',
      '-analysis.',
      '-calculation.',
    ];
    for (const pattern of resultPatterns) {
      if (href.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract result files from a loaded STAC item's assets.
   * Identifies assets with 'result' role or matching result patterns.
   *
   * @param item The STAC item object
   * @returns Array of AssociatedFile objects for result assets
   */
  getResultFilesFromItem(item: StacItem): AssociatedFile[] {
    const results: AssociatedFile[] = [];

    try {
      for (const [assetKey, asset] of Object.entries(item.assets)) {
        try {
          if (this.isResultAsset(asset, assetKey)) {
            results.push(this.assetToAssociatedFile(asset, assetKey));
          }
        } catch (err) {
          // Skip problematic assets, log warning
          console.warn(`[debrief] Skipping asset ${assetKey}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      console.warn(`[debrief] Failed to extract result files: ${err instanceof Error ? err.message : String(err)}`);
    }

    return results;
  }

  /**
   * Load result files from a plot's STAC item.
   * Convenience method that loads the item and extracts result files.
   * Feature: 051-load-result-attachments
   *
   * @param store The STAC store containing the item
   * @param itemPath Relative path to the item JSON file
   * @returns Array of AssociatedFile objects for result assets
   */
  async loadResultFiles(store: StacStore, itemPath: string): Promise<AssociatedFile[]> {
    try {
      const fullPath = path.join(store.path, itemPath);
      const item = await this.loadItem(fullPath);

      if (!item) {
        console.warn(`[debrief] Could not load item for result extraction: ${itemPath}`);
        return [];
      }

      const results = this.getResultFilesFromItem(item);

      // Populate mtime from filesystem for chronological ordering
      const itemDir = path.dirname(fullPath);
      for (const result of results) {
        try {
          const filePath = path.join(itemDir, result.path);
          const stat = fs.statSync(filePath);
          result.mtime = stat.mtimeMs;
        } catch {
          // File may not exist on disk; leave mtime undefined
        }
      }

      // Sort by mtime descending (most recent first), files without mtime go last
      results.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0));

      return results;
    } catch (err) {
      console.warn(`[debrief] Failed to load result files: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async loadCatalog(storePath: string): Promise<StacCatalog | null> {
    const catalogPath = path.join(storePath, 'catalog.json');
    return this.loadCatalogFromPath(catalogPath);
  }

  private loadCatalogFromPath(
    catalogPath: string
  ): Promise<StacCatalog | null> {
    // Check cache
    const cached = this.catalogCache.get(catalogPath);
    if (cached) {
      return Promise.resolve(cached);
    }

    try {
      if (!fs.existsSync(catalogPath)) {
        return Promise.resolve(null);
      }

      const content = fs.readFileSync(catalogPath, 'utf-8');
      const catalog = JSON.parse(content) as StacCatalog;

      // Cache for future use
      this.catalogCache.set(catalogPath, catalog);

      return Promise.resolve(catalog);
    } catch {
      return Promise.resolve(null);
    }
  }

  private loadItem(itemPath: string): Promise<StacItem | null> {
    // Check cache
    const cached = this.itemCache.get(itemPath);
    if (cached) {
      return Promise.resolve(cached);
    }

    try {
      if (!fs.existsSync(itemPath)) {
        return Promise.resolve(null);
      }

      const content = fs.readFileSync(itemPath, 'utf-8');
      const item = JSON.parse(content) as StacItem;

      // Cache for future use
      this.itemCache.set(itemPath, item);

      return Promise.resolve(item);
    } catch {
      return Promise.resolve(null);
    }
  }

  private loadGeoJson(
    geoJsonPath: string
  ): Promise<SafeFeatureCollection | null> {
    try {
      if (!fs.existsSync(geoJsonPath)) {
        return Promise.resolve(null);
      }

      const content = fs.readFileSync(geoJsonPath, 'utf-8');
      return Promise.resolve(JSON.parse(content) as SafeFeatureCollection);
    } catch {
      return Promise.resolve(null);
    }
  }

  private async countItems(
    catalogDir: string,
    catalog: StacCatalog
  ): Promise<number> {
    let count = 0;

    for (const link of catalog.links) {
      if (link.rel === 'item') {
        count++;
      } else if (link.rel === 'child' && link.href.endsWith('catalog.json')) {
        const childPath = path.join(catalogDir, link.href);
        const childCatalog = await this.loadCatalogFromPath(childPath);
        if (childCatalog) {
          count += await this.countItems(
            path.dirname(childPath),
            childCatalog
          );
        }
      }
    }

    return count;
  }

  /**
   * Write artifact data as a STAC asset on a plot item.
   *
   * @param storePath Path to the STAC store root
   * @param itemPath Relative path to the item JSON file
   * @param filename Asset filename (e.g. "range-bearing-t1-t2.json")
   * @param data String data to write
   * @param mimeType MIME type of the asset
   * @param metadata Extra metadata fields for the asset entry
   * @returns Absolute path to the written file
   */
  async addResultAsset(
    storePath: string,
    itemPath: string,
    filename: string,
    data: string,
    mimeType: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);

    if (!item) {
      throw new Error(`Item not found: ${itemPath}`);
    }

    // Create assets directory if needed
    const itemDir = path.dirname(fullItemPath);
    const assetsDir = path.join(itemDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Write data file
    const destPath = path.join(assetsDir, filename);
    fs.writeFileSync(destPath, data, 'utf-8');

    // Add asset reference to item
    const key = path.parse(filename).name;
    const relativeHref = `./assets/${filename}`;
    item.assets[key] = {
      href: relativeHref,
      type: mimeType,
      title: filename,
      roles: ['result'],
      ...metadata,
    };

    // Write updated item
    fs.writeFileSync(fullItemPath, JSON.stringify(item, null, 2));

    // Clear cache for this item
    this.itemCache.delete(fullItemPath);

    return destPath;
  }

  /**
   * Delete a result asset from a STAC item and remove the file on disk.
   *
   * Feature: 178-vscode-tabular-results (FR-018)
   *
   * This is the inverse of `addResultAsset`:
   *   1. Load the STAC item.
   *   2. Find the asset key whose href points at the given filename (either
   *      by filename match or full `./assets/<filename>` match).
   *   3. Remove the asset entry from `item.assets`.
   *   4. Delete the file on disk (best-effort — missing file is tolerated).
   *   5. Persist the updated item and invalidate the cache.
   *
   * @returns `true` if an asset entry was removed, `false` if none matched.
   */
  async deleteResultAsset(
    storePath: string,
    itemPath: string,
    filename: string
  ): Promise<boolean> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);
    if (!item) {
      throw new Error(`Item not found: ${itemPath}`);
    }

    // Locate the asset key whose href matches the filename.
    let matchedKey: string | undefined;
    for (const [key, asset] of Object.entries(item.assets)) {
      if (
        asset.href === `./assets/${filename}` ||
        asset.href === `assets/${filename}` ||
        path.basename(asset.href) === filename
      ) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      return false;
    }

    delete item.assets[matchedKey];

    // Delete the file from disk (best-effort).
    const itemDir = path.dirname(fullItemPath);
    const assetPath = path.join(itemDir, 'assets', filename);
    try {
      if (fs.existsSync(assetPath)) {
        fs.unlinkSync(assetPath);
      }
    } catch (err) {
      console.warn(
        `[debrief] deleteResultAsset: failed to delete file ${assetPath}:`,
        err
      );
    }

    // Persist updated item and clear cache.
    fs.writeFileSync(fullItemPath, JSON.stringify(item, null, 2));
    this.itemCache.delete(fullItemPath);

    return true;
  }

  // ============================================================================
  // Snapshot Operations (Feature: 074-snapshots)
  // ============================================================================

  /**
   * Write a snapshot GeoJSON as a STAC asset with role "snapshot".
   */
  async writeSnapshotAsset(
    storePath: string,
    itemPath: string,
    filename: string,
    data: string
  ): Promise<string> {
    return this.addResultAsset(storePath, itemPath, filename, data, 'application/geo+json', {
      roles: ['snapshot'],
      'debrief:snapshotTimestamp': new Date().toISOString(),
    });
  }

  /**
   * Load a snapshot GeoJSON by its asset filename.
   */
  async loadSnapshotGeoJson(
    storePath: string,
    itemPath: string,
    assetFilename: string
  ): Promise<SafeFeatureCollection | null> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);
    if (!item) {
      return null;
    }

    // Find asset by filename match in href
    const assetEntry = Object.values(item.assets).find(a =>
      a.href.endsWith(assetFilename)
    );
    if (!assetEntry) {
      return null;
    }

    const itemDir = path.dirname(fullItemPath);
    const geoJsonPath = path.resolve(itemDir, assetEntry.href);
    return this.loadGeoJson(geoJsonPath);
  }

  /**
   * Overwrite the working GeoJSON file for a STAC item.
   */
  async writeGeoJson(
    storePath: string,
    itemPath: string,
    featureCollection: SafeFeatureCollection
  ): Promise<void> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);
    if (!item) {
      throw new Error(`Item not found: ${itemPath}`);
    }

    const geoJsonAsset = Object.values(item.assets).find(
      (asset) =>
        asset.type === 'application/geo+json' ||
        asset.href.endsWith('.geojson')
    );

    if (!geoJsonAsset) {
      throw new Error(`No GeoJSON asset found for item: ${itemPath}`);
    }

    const itemDir = path.dirname(fullItemPath);
    const geoJsonPath = path.resolve(itemDir, geoJsonAsset.href);

    fs.writeFileSync(geoJsonPath, JSON.stringify(featureCollection, null, 2));

    // Clear cache
    this.itemCache.delete(fullItemPath);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.catalogCache.clear();
    this.itemCache.clear();
  }

  // ============================================================================
  // Item Creation (New Plot)
  // ============================================================================

  /**
   * Create a new STAC Item in a store.
   * Creates the per-item folder structure with item.json and assets/ directory,
   * and updates catalog.json to link the new item.
   *
   * @param storePath Absolute path to the STAC store root
   * @param options Title and optional ID for the new item
   * @returns Created item path (relative) and ID
   */
  createItem(
    storePath: string,
    options: { title: string; id?: string }
  ): { itemPath: string; itemId: string; itemDir: string } {
    const itemId = options.id ?? crypto.randomUUID();
    const folderName = options.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const itemDir = path.join(storePath, folderName || itemId);
    const assetsDir = path.join(itemDir, 'assets');
    const itemJsonPath = path.join(itemDir, 'item.json');

    // Check for existing item with same ID
    if (fs.existsSync(itemDir)) {
      throw new Error(`Item already exists: ${folderName || itemId}`);
    }

    // Create directories
    fs.mkdirSync(itemDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });

    // Build STAC Item JSON
    const now = new Date().toISOString();
    const item = {
      type: 'Feature',
      stac_version: '1.0.0',
      id: itemId,
      geometry: null,
      bbox: null,
      properties: {
        title: options.title,
        datetime: null,
        start_datetime: null,
        end_datetime: null,
        created: now,
      },
      links: [
        { rel: 'root', href: '../catalog.json', type: 'application/json' },
        { rel: 'parent', href: '../catalog.json', type: 'application/json' },
        { rel: 'self', href: './item.json', type: 'application/json' },
      ],
      assets: {},
    };

    // Write item.json
    fs.writeFileSync(itemJsonPath, JSON.stringify(item, null, 2));

    // Update catalog.json to link the new item
    const catalogPath = path.join(storePath, 'catalog.json');
    if (fs.existsSync(catalogPath)) {
      const catalogContent = fs.readFileSync(catalogPath, 'utf-8');
      const catalog = JSON.parse(catalogContent) as { links: Array<{ rel: string; href: string; type?: string; title?: string }> };

      catalog.links.push({
        rel: 'item',
        href: `./${folderName || itemId}/item.json`,
        type: 'application/json',
        title: options.title,
      });

      fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

      // Clear catalog cache
      this.catalogCache.delete(catalogPath);
    }

    const itemPath = `${folderName || itemId}/item.json`;
    return { itemPath, itemId, itemDir };
  }

  /**
   * Update temporal metadata on a STAC item from its GeoJSON features.
   * Scans track features for time arrays and sets start_datetime/end_datetime.
   */
  // TODO(#137): Delegate to Python MCP tool update_temporal_metadata when STAC MCP client is available
  async updateTemporalMetadata(
    storePath: string,
    itemPath: string
  ): Promise<void> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);
    if (!item) {return;}

    // Find GeoJSON asset and load features
    const geoJsonAsset = Object.values(item.assets).find(
      (asset) =>
        asset.type === 'application/geo+json' ||
        asset.href.endsWith('.geojson')
    );
    if (!geoJsonAsset) {return;}

    const geoJsonPath = path.resolve(path.dirname(fullItemPath), geoJsonAsset.href);
    const fc = await this.loadGeoJson(geoJsonPath);
    if (!fc) {return;}

    let earliest: string | null = null;
    let latest: string | null = null;

    for (const feature of fc.features) {
      const props = feature.properties ?? {};

      // Prefer start_time/end_time on TRACK features (REP handler output)
      if (props.kind === 'TRACK') {
        const startTime = props.start_time as string | undefined;
        const endTime = props.end_time as string | undefined;
        if (startTime && endTime) {
          if (!earliest || startTime < earliest) {earliest = startTime;}
          if (!latest || endTime > latest) {latest = endTime;}
        }
        continue;
      }

      // Fallback: extract from positions array (ISO timestamps)
      const positions = props.positions as Array<{ time: string }> | undefined;
      if (positions && positions.length > 0) {
        const start = positions[0]!.time;
        const end = positions[positions.length - 1]!.time;
        if (start && (!earliest || start < earliest)) {earliest = start;}
        if (end && (!latest || end > latest)) {latest = end;}
      }
    }

    if (!earliest || !latest) {return;}

    // Feature 193 / backlog #191: respect analyst overrides and become
    // idempotent. Skip any field listed in item.properties["debrief:overrides"],
    // and skip the write entirely when no derived value actually changed.
    // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
    const overridesRaw = (item.properties as Record<string, unknown>)['debrief:overrides'];
    const overrides = new Set<string>(
      Array.isArray(overridesRaw)
        ? overridesRaw.filter((v): v is string => typeof v === 'string')
        : [],
    );

    const proposed: Record<string, string> = {
      datetime: earliest,
      start_datetime: earliest,
      end_datetime: latest,
    };

    // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
    const props = item.properties as unknown as Record<string, unknown>;
    let changed = false;
    for (const [field, value] of Object.entries(proposed)) {
      if (overrides.has(field)) {continue;}
      if (props[field] === value) {continue;}
      props[field] = value;
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(fullItemPath, JSON.stringify(item, null, 2));
      this.itemCache.delete(fullItemPath);
    }
  }

  /**
   * Write item-level metadata to item.json in place.
   *
   * Implements the 11-step semantics in
   * specs/193-properties-panel/contracts/stac-service-extension.ts.
   *
   * - Single write-gatekeeper (Article IV.2).
   * - Direct-write, no session-state staging (Decision 2).
   * - Provenance into item.properties["debrief:provenance_log"] (Decision 7).
   * - Atomic temp+rename with mtime conflict check (Decision 9).
   * - Bounded provenance log with JSONL archive rotation (Decision 12).
   */
  updateItemMetadata(
    input: UpdateItemMetadataInput,
  ): Promise<UpdateItemMetadataResult> {
    try {
      return Promise.resolve(this.updateItemMetadataSync(input));
    } catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Synchronous core of updateItemMetadata. Exists because the contract
   * mandates a Promise-returning method while the implementation is fully
   * synchronous (fs.*Sync + in-memory transforms). Extracting a -Sync inner
   * keeps the Promise wrapping explicit and avoids an `async` method without
   * awaits.
   */
  private updateItemMetadataSync(
    input: UpdateItemMetadataInput,
  ): UpdateItemMetadataResult {
    const {
      storePath,
      itemPath,
      patch,
      overrideFields,
      provenance,
      packageVersion,
    } = input;

    // Step 2: reject empty patch early (cheap check; avoids reading file).
    if (Object.keys(patch).length === 0) {
      throw new Error('updateItemMetadata: patch must contain at least one field');
    }

    // Validate provenance fields are non-empty (structural invariant).
    if (!Array.isArray(provenance.fields) || provenance.fields.length === 0) {
      throw new Error('updateItemMetadata: provenance.fields must be non-empty');
    }

    const fullItemPath = path.join(storePath, itemPath);

    // Step 1: read item.json + record mtime fingerprint.
    if (!fs.existsSync(fullItemPath)) {
      throw new Error(`item.json not found: ${fullItemPath}`);
    }
    const content = fs.readFileSync(fullItemPath, 'utf-8');
    let item: StacItem;
    try {
      item = JSON.parse(content) as StacItem;
    } catch (err) {
      throw new Error(`item.json is not valid JSON: ${fullItemPath}`);
    }
    const fingerprint = fs.statSync(fullItemPath).mtimeMs;

    // Step 3: merge patch into properties.
    // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
    const props = item.properties as Record<string, unknown>;
    for (const [k, v] of Object.entries(patch)) {
      props[k] = v;
    }

    // Step 4: merge overrideFields into debrief:overrides (dedupe + sort).
    const existingOverrides = Array.isArray(props['debrief:overrides'])
      ? (props['debrief:overrides'] as unknown[]).filter(
          (x): x is string => typeof x === 'string',
        )
      : [];
    const overridesSet = new Set<string>(existingOverrides);
    for (const f of overrideFields) {
      overridesSet.add(f);
    }
    const mergedOverrides = Array.from(overridesSet).sort();
    props['debrief:overrides'] = mergedOverrides;

    // Step 5: construct provenance entry.
    const activityId = crypto.randomUUID();
    const entry: PropertiesProvenanceEntry = {
      activity_id: activityId,
      timestamp: new Date().toISOString(),
      tool: PROPERTIES_PANEL_TOOL_SENTINEL,
      method: `properties-panel@${packageVersion}`,
      source: 'user',
      fields: [...provenance.fields].sort(),
    };

    // Step 6: append entry; rotate oldest entries when cap exceeded.
    const existingLog = Array.isArray(props['debrief:provenance_log'])
      ? (props['debrief:provenance_log'] as PropertiesProvenanceEntry[])
      : [];
    const log: PropertiesProvenanceEntry[] = [...existingLog, entry];
    if (log.length > PROVENANCE_LOG_CAP) {
      const overflowCount = log.length - PROVENANCE_LOG_CAP;
      const toArchive = log.slice(0, overflowCount);
      const itemDir = path.dirname(fullItemPath);
      this.appendProvenanceArchive(itemDir, toArchive);
      log.splice(0, overflowCount);
    }
    props['debrief:provenance_log'] = log;

    // Step 7: LinkML schema validation skipped in v1 — only structural
    // invariants above are enforced. TODO(#193-v2): validate merged
    // item.properties against the generated JSON Schema and throw
    // SchemaValidationError on violations.

    // Step 8: re-stat + conflict check.
    const currentMtime = fs.statSync(fullItemPath).mtimeMs;
    if (currentMtime !== fingerprint) {
      throw new StaleItemJsonError(storePath, itemPath);
    }

    // Step 9: atomic write — temp + rename. Clean up temp on failure.
    const tempPath = `${fullItemPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    const payload = JSON.stringify(item, null, 2);
    try {
      try {
        fs.writeFileSync(tempPath, payload);
      } catch (err) {
        if (isReadOnlyFsError(err)) {
          throw new ReadOnlyFilesystemError(fullItemPath);
        }
        throw err;
      }
      try {
        fs.renameSync(tempPath, fullItemPath);
      } catch (err) {
        // Attempt best-effort cleanup of the temp; swallow cleanup errors.
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // ignore
        }
        if (isReadOnlyFsError(err)) {
          throw new ReadOnlyFilesystemError(fullItemPath);
        }
        throw err;
      }
    } catch (err) {
      // If temp file still exists (e.g., write succeeded but something else
      // blew up), try to remove it.
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }

    // Step 10: invalidate cache.
    this.itemCache.delete(fullItemPath);

    // Step 11: return result.
    return {
      updatedProperties: props,
      overrides: mergedOverrides,
      // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-010, unrelated to #214
      activityId,
    };
  }

  /**
   * Atomically append newline-delimited JSON entries to
   * <itemDir>/provenance_log_archive.jsonl. One entry per line. Uses a
   * temp-file copy+append+rename recipe so readers never see a half-written
   * file.
   */
  private appendProvenanceArchive(
    itemDir: string,
    entries: PropertiesProvenanceEntry[],
  ): void {
    if (entries.length === 0) {return;}
    const archivePath = path.join(itemDir, PROVENANCE_LOG_ARCHIVE_FILENAME);
    const tempPath = `${archivePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;

    const existing = fs.existsSync(archivePath)
      ? fs.readFileSync(archivePath, 'utf-8')
      : '';
    const appended =
      existing + entries.map((e) => JSON.stringify(e)).join('\n') + '\n';

    try {
      fs.writeFileSync(tempPath, appended);
      fs.renameSync(tempPath, archivePath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }

  // ============================================================================
  // Import Support Methods (REP File Loading)
  // ============================================================================

  /**
   * Add source file as asset on a STAC item.
   * Copies the file to the item's assets directory and updates the item JSON.
   *
   * @param storePath Path to the STAC store root
   * @param itemPath Relative path to the item JSON file
   * @param sourcePath Absolute path to source file to add
   * @param assetKey Optional asset key (defaults to filename stem)
   * @returns Asset key used
   */
  async addAsset(
    storePath: string,
    itemPath: string,
    sourcePath: string,
    assetKey?: string
  ): Promise<string> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);

    if (!item) {
      throw new Error(`Item not found: ${itemPath}`);
    }

    // Determine asset key from filename if not provided
    const filename = path.basename(sourcePath);
    const key = assetKey ?? path.parse(filename).name;

    // Create assets directory if needed
    const itemDir = path.dirname(fullItemPath);
    const assetsDir = path.join(itemDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Copy source file to assets directory
    const destPath = path.join(assetsDir, filename);
    fs.copyFileSync(sourcePath, destPath);

    // Add asset reference to item
    const relativeHref = `./assets/${filename}`;
    item.assets[key] = {
      href: relativeHref,
      type: 'application/x-rep',
      title: filename,
      roles: ['source'],
    };

    // Write updated item
    fs.writeFileSync(fullItemPath, JSON.stringify(item, null, 2));

    // Clear cache for this item
    this.itemCache.delete(fullItemPath);

    return key;
  }

  /**
   * Append features to a STAC item's GeoJSON data file.
   *
   * @param storePath Path to the STAC store root
   * @param itemPath Relative path to the item JSON file
   * @param features GeoJSON features to append
   * @returns Updated total feature count
   */
  async addFeatures(
    storePath: string,
    itemPath: string,
    features: SafeFeature[]
  ): Promise<number> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);

    if (!item) {
      throw new Error(`Item not found: ${itemPath}`);
    }

    // Find or create GeoJSON asset
    const geoJsonAsset = Object.values(item.assets).find(
      (asset) =>
        asset.type === 'application/geo+json' ||
        asset.href.endsWith('.geojson')
    );

    const itemDir = path.dirname(fullItemPath);
    let geoJsonPath: string;
    let featureCollection: SafeFeatureCollection;

    if (geoJsonAsset) {
      geoJsonPath = path.resolve(itemDir, geoJsonAsset.href);
      const existing = await this.loadGeoJson(geoJsonPath);
      featureCollection = existing ?? { type: 'FeatureCollection', features: [] };
    } else {
      // Create new GeoJSON file
      const geoJsonFilename = `${item.id}.geojson`;
      geoJsonPath = path.join(itemDir, geoJsonFilename);
      featureCollection = { type: 'FeatureCollection', features: [] };

      // Add asset reference
      item.assets['data'] = {
        href: `./${geoJsonFilename}`,
        type: 'application/geo+json',
        title: 'Plot Data',
        roles: ['data'],
      };
    }

    // Append new features
    featureCollection.features.push(...features);

    // Update bbox if features have coordinates
    const newBbox = this.calculateBboxFromFeatures(featureCollection.features);
    if (newBbox) {
      item.bbox = newBbox;
    }

    // Write updated GeoJSON
    fs.writeFileSync(geoJsonPath, JSON.stringify(featureCollection, null, 2));

    // Write updated item (with new bbox)
    fs.writeFileSync(fullItemPath, JSON.stringify(item, null, 2));

    // Clear caches
    this.itemCache.delete(fullItemPath);

    return featureCollection.features.length;
  }

  /**
   * Append provenance Log entries to existing features in a STAC item's GeoJSON.
   * Feature: 071-log-recording-service
   *
   * @param storePath Path to the STAC store root
   * @param itemPath Relative path to the item JSON file
   * @param provenance Array of feature ID + Log entry pairs
   * @returns Number of features successfully updated
   */
  async appendProvenance(
    storePath: string,
    itemPath: string,
    provenance: Array<{ feature_id: string; entry: Record<string, unknown> }>
  ): Promise<number> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);

    if (!item) {
      throw new Error(`Item not found: ${itemPath}`);
    }

    // Find GeoJSON asset
    const geoJsonAsset = Object.values(item.assets).find(
      (asset) =>
        asset.type === 'application/geo+json' ||
        asset.href.endsWith('.geojson')
    );

    if (!geoJsonAsset) {
      throw new Error(`No GeoJSON asset found for item: ${itemPath}`);
    }

    const itemDir = path.dirname(fullItemPath);
    const geoJsonPath = path.resolve(itemDir, geoJsonAsset.href);
    const featureCollection = await this.loadGeoJson(geoJsonPath);

    if (!featureCollection) {
      throw new Error(`GeoJSON file not found: ${geoJsonPath}`);
    }

    // Build a map of feature ID -> feature for quick lookup
    const featureMap = new Map<string, SafeFeature>();
    for (const feature of featureCollection.features) {
      const id = feature.id !== null && feature.id !== undefined
        ? String(feature.id)
        : undefined;
      const propsId = feature.properties?.['id'] as string | undefined;
      const featureId = id ?? propsId;
      if (featureId) {
        featureMap.set(featureId, feature);
      }
    }

    let updated = 0;
    for (const { feature_id: featureId, entry } of provenance) {
      const feature = featureMap.get(featureId);
      if (!feature) { continue; }

      // Ensure properties exists — SafeFeature.properties is Record<string, unknown> | null
      if (!feature.properties) {
        feature.properties = {};
      }

      const props = feature.properties;
      // Normalise provenance to array (FR-006: handle legacy single-object format)
      let existing = props['provenance'];
      if (existing === undefined || existing === null) {
        existing = [];
      } else if (!Array.isArray(existing)) {
        existing = [existing];
      }

      // Append the new entry
      (existing as unknown[]).push(entry);
      props['provenance'] = existing;
      updated++;
    }

    if (updated > 0) {
      // Write updated GeoJSON
      fs.writeFileSync(geoJsonPath, JSON.stringify(featureCollection, null, 2));

      // Clear cache
      this.itemCache.delete(fullItemPath);
    }

    return updated;
  }

  /**
   * Load the GeoJSON FeatureCollection for a STAC item.
   * Feature: 071-log-recording-service
   *
   * @param storePath Path to the STAC store root
   * @param itemPath Relative path to the item JSON file
   * @returns FeatureCollection or null
   */
  async loadGeoJsonForItem(
    storePath: string,
    itemPath: string
  ): Promise<SafeFeatureCollection | null> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);

    if (!item) { return null; }

    const geoJsonAsset = Object.values(item.assets).find(
      (asset) =>
        asset.type === 'application/geo+json' ||
        asset.href.endsWith('.geojson')
    );

    if (!geoJsonAsset) { return null; }

    const itemDir = path.dirname(fullItemPath);
    const geoJsonPath = path.resolve(itemDir, geoJsonAsset.href);
    return this.loadGeoJson(geoJsonPath);
  }

  /**
   * Check if an asset key already exists on a STAC item.
   * Used for duplicate import detection.
   *
   * @param storePath Path to the STAC store root
   * @param itemPath Relative path to the item JSON file
   * @param assetKey Asset key to check
   * @returns True if asset exists
   */
  async hasAsset(
    storePath: string,
    itemPath: string,
    assetKey: string
  ): Promise<boolean> {
    const fullItemPath = path.join(storePath, itemPath);
    const item = await this.loadItem(fullItemPath);

    if (!item) {
      return false;
    }

    return assetKey in item.assets;
  }

  /**
   * Calculate bounding box from features
   */
  private calculateBboxFromFeatures(
    features: SafeFeature[]
  ): [number, number, number, number] | null {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const feature of features) {
      if (!feature.geometry) {continue;} // Skip features with null geometry
      const coords = this.extractCoordinates(feature.geometry);
      for (const [lon, lat] of coords) {
        if (typeof lon === 'number' && typeof lat === 'number') {
          minLon = Math.min(minLon, lon);
          minLat = Math.min(minLat, lat);
          maxLon = Math.max(maxLon, lon);
          maxLat = Math.max(maxLat, lat);
        }
      }
    }

    if (minLon === Infinity) {
      return null;
    }

    return [minLon, minLat, maxLon, maxLat];
  }

  /**
   * Extract all coordinates from a geometry
   */
  private extractCoordinates(geometry: SafeGeometry): number[][] {
    const coords: number[][] = [];

    if (geometry.type === 'Point') {
      const point = geometry.coordinates as number[];
      if (point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number') {
        coords.push([point[0], point[1]]);
      }
    } else if (geometry.type === 'LineString') {
      const line = geometry.coordinates as number[][];
      for (const point of line) {
        if (point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number') {
          coords.push([point[0], point[1]]);
        }
      }
    } else if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates as number[][][];
      for (const ring of rings) {
        for (const point of ring) {
          if (point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number') {
            coords.push([point[0], point[1]]);
          }
        }
      }
    }

    return coords;
  }
}
