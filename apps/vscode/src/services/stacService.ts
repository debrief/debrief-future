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
} from '../types/stac';
import type { Plot, Track, ReferenceLocation } from '../types/plot';
import type { GeoJSONFeature } from '../types/import';

// Type-safe properties to avoid any from geojson
type SafeProperties = Record<string, unknown>;

// Self-contained geometry type to avoid any
interface SafeGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}

// Self-contained feature type to avoid any from geojson Feature
interface SafeFeature {
  type: 'Feature';
  geometry: SafeGeometry | null;
  properties: SafeProperties | null;
}

// Self-contained FeatureCollection type to avoid any from geojson
interface SafeFeatureCollection {
  type: 'FeatureCollection';
  features: SafeFeature[];
}

export class StacService {
  private catalogCache: Map<string, StacCatalog> = new Map();
  private itemCache: Map<string, StacItem> = new Map();

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
      const catalog = JSON.parse(content) as unknown;

      // Basic STAC catalog validation
      if (
        catalog === null ||
        typeof catalog !== 'object' ||
        !('type' in catalog) ||
        catalog.type !== 'Catalog'
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
   * List catalogs in a store
   */
  async listCatalogs(store: StacStore): Promise<Catalog[]> {
    const catalogs: Catalog[] = [];

    try {
      const rootCatalog = await this.loadCatalog(store.path);
      if (!rootCatalog) {
        return catalogs;
      }

      // Root catalog counts as a catalog
      catalogs.push({
        id: rootCatalog.id,
        title: rootCatalog.title ?? rootCatalog.id,
        description: rootCatalog.description,
        catalogPath: 'catalog.json',
        storeId: store.id,
        itemCount: await this.countItems(store.path, rootCatalog),
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
            itemCount: await this.countItems(
              path.dirname(childPath),
              childCatalog
            ),
          });
        }
      }
    } catch (err) {
      console.error('Failed to list catalogs:', err);
    }

    return catalogs;
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
          items.push({
            id: item.id,
            title: item.properties.title ?? item.id,
            datetime: item.properties.datetime,
            itemPath: relativePath,
            catalogId: catalog.id,
            storeId: store.id,
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

      let trackCount = 0;
      let locationCount = 0;
      const timeExtent: [string, string] = [
        item.properties.datetime,
        item.properties.datetime,
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

              // Update time extent from track times
              const props = feature.properties ?? {};
              const times = props.times as string[] | undefined;
              if (times && times.length > 0) {
                const firstTime = times[0];
                const lastTime = times[times.length - 1];
                if (firstTime && new Date(firstTime) < new Date(timeExtent[0])) {
                  timeExtent[0] = firstTime;
                }
                if (lastTime && new Date(lastTime) > new Date(timeExtent[1])) {
                  timeExtent[1] = lastTime;
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
        bbox: item.bbox,
        timeExtent,
        trackCount,
        locationCount,
      };
    } catch (err) {
      console.error('Failed to load plot:', err);
      return null;
    }
  }

  /**
   * Load tracks and locations from a plot
   */
  async loadPlotData(
    store: StacStore,
    itemPath: string
  ): Promise<{ tracks: Track[]; locations: ReferenceLocation[]; otherFeatures: GeoJSONFeature[] } | null> {
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
        return { tracks: [], locations: [], otherFeatures: [] };
      }

      const geoJsonPath = path.resolve(
        path.dirname(fullPath),
        geoJsonAsset.href
      );
      const featureCollection = await this.loadGeoJson(geoJsonPath);

      if (featureCollection === null) {
        return { tracks: [], locations: [], otherFeatures: [] };
      }

      const tracks: Track[] = [];
      const locations: ReferenceLocation[] = [];
      const otherFeatures: GeoJSONFeature[] = [];

      for (const feature of featureCollection.features) {
        const props = feature.properties ?? {};
        const geom = feature.geometry;

        // Skip features with no geometry or empty coordinates
        if (!geom || !geom.coordinates || (Array.isArray(geom.coordinates) && geom.coordinates.length === 0)) {
          continue;
        }

        if (geom.type === 'LineString' && props.times) {
          // Track: LineString with times array
          const times = (props.times as string[]) ?? [];
          const lineCoords = geom.coordinates as number[][];

          tracks.push({
            id: (props.id as string) ?? `track-${tracks.length}`,
            name: (props.platform_name as string) ?? (props.name as string) ?? `Track ${tracks.length + 1}`,
            platformType: (props.track_type as string) ?? (props.platformType as string) ?? undefined,
            geometry: { type: 'LineString' as const, coordinates: lineCoords },
            times,
            startTime: times[0] ?? '',
            endTime: times[times.length - 1] ?? '',
            color: props.color as string | undefined,
            visible: true,
            selected: false,
          });
        } else if (geom.type === 'Point' && props.kind === 'LOCATION') {
          // Reference location: Point with kind=LOCATION
          const pointCoords = geom.coordinates as number[];

          locations.push({
            id: (props.id as string) ?? `location-${locations.length}`,
            name: (props.name as string) ?? `Location ${locations.length + 1}`,
            locationType: props.locationType as string | undefined,
            geometry: { type: 'Point' as const, coordinates: pointCoords },
            visible: true,
            selected: false,
          });
        } else {
          // Other features: render with standard GeoJSON layer
          otherFeatures.push({
            type: 'Feature',
            geometry: geom as GeoJSONFeature['geometry'],
            properties: props,
          });
        }
      }

      return { tracks, locations, otherFeatures };
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
  async createItem(
    storePath: string,
    options: { title: string; id?: string }
  ): Promise<{ itemPath: string; itemId: string; itemDir: string }> {
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
      const times = props.times as string[] | undefined;
      if (times && times.length > 0) {
        const first = times[0];
        const last = times[times.length - 1];
        if (first && (!earliest || first < earliest)) {earliest = first;}
        if (last && (!latest || last > latest)) {latest = last;}
      }
    }

    if (earliest || latest) {
      item.properties.start_datetime = earliest;
      item.properties.end_datetime = latest;
      fs.writeFileSync(fullItemPath, JSON.stringify(item, null, 2));
      this.itemCache.delete(fullItemPath);
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
      const rings = geometry.coordinates as unknown as number[][][];
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
