/**
 * STAC Service - Wrapper for debrief-stac operations
 *
 * This service provides access to local STAC catalogs for browsing and loading plots.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  StacStore,
  Catalog,
  StacItemSummary,
  StacCatalog,
  StacItem,
} from '../types/stac';
import type { Plot, Track, ReferenceLocation } from '../types/plot';
import type { LineString, Point, FeatureCollection, Feature } from 'geojson';

export class StacService {
  private catalogCache: Map<string, StacCatalog> = new Map();
  private itemCache: Map<string, StacItem> = new Map();

  /**
   * Validate that a path contains a valid STAC catalog
   */
  async validateStorePath(storePath: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const catalogPath = path.join(storePath, 'catalog.json');

      if (!fs.existsSync(catalogPath)) {
        return {
          valid: false,
          error: 'No catalog.json found in directory',
        };
      }

      const content = fs.readFileSync(catalogPath, 'utf-8');
      const catalog = JSON.parse(content) as unknown;

      // Basic STAC catalog validation
      if (
        !catalog ||
        typeof catalog !== 'object' ||
        !('type' in catalog) ||
        catalog.type !== 'Catalog'
      ) {
        return {
          valid: false,
          error: 'Invalid STAC catalog format',
        };
      }

      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: `Failed to read catalog: ${err instanceof Error ? err.message : String(err)}`,
      };
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
      let timeExtent: [string, string] = [
        item.properties.datetime,
        item.properties.datetime,
      ];

      if (geoJsonAsset) {
        const geoJsonPath = path.resolve(
          path.dirname(fullPath),
          geoJsonAsset.href
        );
        const features = await this.loadGeoJson(geoJsonPath);

        if (features) {
          // Count tracks and locations
          for (const feature of features.features) {
            if (feature.geometry.type === 'LineString') {
              trackCount++;

              // Update time extent from track times
              const times = (feature.properties as { times?: string[] })?.times;
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
            } else if (feature.geometry.type === 'Point') {
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
  ): Promise<{ tracks: Track[]; locations: ReferenceLocation[] } | null> {
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
        return { tracks: [], locations: [] };
      }

      const geoJsonPath = path.resolve(
        path.dirname(fullPath),
        geoJsonAsset.href
      );
      const featureCollection = await this.loadGeoJson(geoJsonPath);

      if (!featureCollection) {
        return { tracks: [], locations: [] };
      }

      const tracks: Track[] = [];
      const locations: ReferenceLocation[] = [];

      for (const feature of featureCollection.features) {
        if (feature.geometry.type === 'LineString') {
          const props = feature.properties as Record<string, unknown>;
          const times = (props.times as string[]) ?? [];

          tracks.push({
            id: (props.id as string) ?? `track-${tracks.length}`,
            name: (props.name as string) ?? `Track ${tracks.length + 1}`,
            platformType: props.platformType as string | undefined,
            geometry: feature.geometry as LineString,
            times,
            startTime: times[0] ?? '',
            endTime: times[times.length - 1] ?? '',
            color: props.color as string | undefined,
            visible: true,
            selected: false,
          });
        } else if (feature.geometry.type === 'Point') {
          const props = feature.properties as Record<string, unknown>;

          locations.push({
            id: (props.id as string) ?? `location-${locations.length}`,
            name: (props.name as string) ?? `Location ${locations.length + 1}`,
            locationType: props.locationType as string | undefined,
            geometry: feature.geometry as Point,
            visible: true,
            selected: false,
          });
        }
      }

      return { tracks, locations };
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

  private async loadCatalogFromPath(
    catalogPath: string
  ): Promise<StacCatalog | null> {
    // Check cache
    const cached = this.catalogCache.get(catalogPath);
    if (cached) {
      return cached;
    }

    try {
      if (!fs.existsSync(catalogPath)) {
        return null;
      }

      const content = fs.readFileSync(catalogPath, 'utf-8');
      const catalog = JSON.parse(content) as StacCatalog;

      // Cache for future use
      this.catalogCache.set(catalogPath, catalog);

      return catalog;
    } catch {
      return null;
    }
  }

  private async loadItem(itemPath: string): Promise<StacItem | null> {
    // Check cache
    const cached = this.itemCache.get(itemPath);
    if (cached) {
      return cached;
    }

    try {
      if (!fs.existsSync(itemPath)) {
        return null;
      }

      const content = fs.readFileSync(itemPath, 'utf-8');
      const item = JSON.parse(content) as StacItem;

      // Cache for future use
      this.itemCache.set(itemPath, item);

      return item;
    } catch {
      return null;
    }
  }

  private async loadGeoJson(
    geoJsonPath: string
  ): Promise<FeatureCollection | null> {
    try {
      if (!fs.existsSync(geoJsonPath)) {
        return null;
      }

      const content = fs.readFileSync(geoJsonPath, 'utf-8');
      return JSON.parse(content) as FeatureCollection;
    } catch {
      return null;
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
}
