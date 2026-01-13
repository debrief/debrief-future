/**
 * debrief-stac service integration.
 * Manages a single long-running service instance with configure() pattern.
 */

import { IpcMain } from 'electron';
import { ServiceManager, spawnAndRequest } from './jsonrpc.js';
import { getStorePaths } from './config.js';
import type { PlotInfo } from '../../renderer/types/store.js';
import type { GeoJSONFeature } from '../../renderer/types/results.js';
import type { ProvenanceMetadata } from '../types/ipc.js';

// Path to debrief-stac executable
const DEBRIEF_STAC_PATH = process.env.DEBRIEF_STAC_PATH || 'debrief-stac';

// Single service instance
let stacService: ServiceManager | null = null;

/**
 * Gets or creates the STAC service manager.
 */
function getService(): ServiceManager {
  if (!stacService) {
    stacService = new ServiceManager(DEBRIEF_STAC_PATH);
  }
  return stacService;
}

/**
 * Initializes debrief-stac with current store paths.
 * Called on startup and when stores change.
 */
export async function initializeStac(): Promise<void> {
  const storePaths = await getStorePaths();

  if (storePaths.length === 0) {
    // No stores configured, nothing to initialize
    return;
  }

  try {
    const service = getService();
    await service.request('configure', { stores: storePaths });
  } catch (err) {
    console.error('Failed to initialize debrief-stac:', err);
    // Don't throw - app can still function, stores just won't be pre-cached
  }
}

/**
 * Reconfigures debrief-stac with updated store paths.
 */
export async function reconfigureStac(): Promise<void> {
  const storePaths = await getStorePaths();
  const service = getService();
  await service.request('configure', { stores: storePaths });
}

interface ListPlotsResponse {
  plots: Array<{
    id: string;
    name: string;
    description?: string;
    created: string;
    modified: string;
    feature_count: number;
  }>;
}

/**
 * Lists all plots in a STAC store.
 */
export async function listPlots(storePath: string): Promise<PlotInfo[]> {
  const service = getService();
  const result = await service.request<ListPlotsResponse>('list_plots', {
    store_path: storePath,
  });

  return result.plots.map((plot) => ({
    id: plot.id,
    name: plot.name,
    description: plot.description,
    created: plot.created,
    modified: plot.modified,
    featureCount: plot.feature_count,
  }));
}

interface CreatePlotResponse {
  plot_id: string;
  name: string;
  created: string;
}

/**
 * Creates a new plot in a STAC store.
 */
export async function createPlot(
  storePath: string,
  name: string,
  description?: string
): Promise<{ plotId: string; name: string; created: string }> {
  const service = getService();
  const result = await service.request<CreatePlotResponse>('create_plot', {
    store_path: storePath,
    name,
    description,
  });

  return {
    plotId: result.plot_id,
    name: result.name,
    created: result.created,
  };
}

interface AddFeaturesResponse {
  plot_id: string;
  features_added: number;
  provenance_id: string;
}

/**
 * Adds features to an existing plot.
 */
export async function addFeatures(
  storePath: string,
  plotId: string,
  features: GeoJSONFeature[],
  provenance: ProvenanceMetadata
): Promise<{ plotId: string; featuresAdded: number; provenanceId: string }> {
  const service = getService();
  const result = await service.request<AddFeaturesResponse>('add_features', {
    store_path: storePath,
    plot_id: plotId,
    features,
    provenance: {
      source_path: provenance.sourcePath,
      source_hash: provenance.sourceHash,
      parser: provenance.parser,
      parser_version: provenance.parserVersion,
      timestamp: provenance.timestamp,
    },
  });

  return {
    plotId: result.plot_id,
    featuresAdded: result.features_added,
    provenanceId: result.provenance_id,
  };
}

interface CopyAssetResponse {
  asset_path: string;
  asset_href: string;
}

/**
 * Copies source file to plot assets.
 */
export async function copyAsset(
  storePath: string,
  plotId: string,
  sourcePath: string,
  assetRole: string
): Promise<{ assetPath: string; assetHref: string }> {
  const service = getService();
  const result = await service.request<CopyAssetResponse>('copy_asset', {
    store_path: storePath,
    plot_id: plotId,
    source_path: sourcePath,
    asset_role: assetRole,
  });

  return {
    assetPath: result.asset_path,
    assetHref: result.asset_href,
  };
}

/**
 * Initializes a new STAC catalog at the given path.
 */
export async function initStore(path: string, name: string): Promise<void> {
  // Use one-shot spawn for initialization
  await spawnAndRequest(DEBRIEF_STAC_PATH, [], 'init_catalog', {
    path,
    name,
  });

  // Reconfigure to include new store
  await reconfigureStac();
}

/**
 * Sets up IPC handlers for STAC operations.
 */
export function setupStacHandlers(ipc: IpcMain): void {
  ipc.handle('stac:listPlots', async (_event, storePath: string) => {
    return listPlots(storePath);
  });

  ipc.handle(
    'stac:createPlot',
    async (_event, storePath: string, name: string, description?: string) => {
      return createPlot(storePath, name, description);
    }
  );

  ipc.handle(
    'stac:addFeatures',
    async (
      _event,
      storePath: string,
      plotId: string,
      features: GeoJSONFeature[],
      provenance: ProvenanceMetadata
    ) => {
      return addFeatures(storePath, plotId, features, provenance);
    }
  );

  ipc.handle(
    'stac:copyAsset',
    async (_event, storePath: string, plotId: string, sourcePath: string, assetRole: string) => {
      return copyAsset(storePath, plotId, sourcePath, assetRole);
    }
  );

  ipc.handle('stac:initStore', async (_event, path: string, name: string) => {
    return initStore(path, name);
  });
}
