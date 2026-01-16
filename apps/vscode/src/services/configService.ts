/**
 * Config Service - Wrapper for debrief-config operations
 *
 * This service manages STAC store registrations and user preferences,
 * reading from and writing to the shared debrief-config location.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { StacStore } from '../types/stac';
import { createStore, isValidStorePath } from '../types/stac';

// XDG Base Directory paths
const XDG_CONFIG_HOME =
  process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
const DEBRIEF_CONFIG_DIR = path.join(XDG_CONFIG_HOME, 'debrief');
const CONFIG_FILE = path.join(DEBRIEF_CONFIG_DIR, 'config.json');

interface DebriefConfig {
  stores: StacStore[];
  preferences: {
    recentPlots?: string[];
    trackColors?: Record<string, string>;
  };
}

export class ConfigService {
  private config: DebriefConfig | null = null;
  private configWatcher: fs.FSWatcher | null = null;
  private changeListeners: Array<() => void> = [];

  constructor() {
    this.ensureConfigDir();
    this.loadConfig();
    this.watchConfig();
  }

  /**
   * Get all registered STAC stores
   */
  getStores(): StacStore[] {
    return this.config?.stores ?? [];
  }

  /**
   * Get a store by ID
   */
  getStore(storeId: string): StacStore | undefined {
    return this.config?.stores.find((s) => s.id === storeId);
  }

  /**
   * Add a new STAC store
   */
  async addStore(storePath: string, displayName?: string): Promise<StacStore> {
    if (!isValidStorePath(storePath)) {
      throw new Error('Invalid store path');
    }

    // Check if store already exists
    const existing = this.config?.stores.find((s) => s.path === storePath);
    if (existing) {
      throw new Error('Store already registered');
    }

    const store = createStore(storePath, displayName);
    store.status = 'available';

    if (!this.config) {
      this.config = { stores: [], preferences: {} };
    }

    this.config.stores.push(store);
    await this.saveConfig();

    return store;
  }

  /**
   * Remove a STAC store
   */
  async removeStore(storeId: string): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    const index = this.config.stores.findIndex((s) => s.id === storeId);
    if (index === -1) {
      return false;
    }

    this.config.stores.splice(index, 1);
    await this.saveConfig();

    return true;
  }

  /**
   * Update a store's path
   */
  async updateStorePath(storeId: string, newPath: string): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    if (!isValidStorePath(newPath)) {
      throw new Error('Invalid store path');
    }

    const store = this.config.stores.find((s) => s.id === storeId);
    if (!store) {
      return false;
    }

    store.path = newPath;
    store.status = 'checking';
    store.errorMessage = undefined;

    await this.saveConfig();

    return true;
  }

  /**
   * Update a store's status
   */
  async updateStoreStatus(
    storeId: string,
    status: 'available' | 'unavailable',
    errorMessage?: string
  ): Promise<void> {
    if (!this.config) {
      return;
    }

    const store = this.config.stores.find((s) => s.id === storeId);
    if (!store) {
      return;
    }

    store.status = status;
    store.errorMessage = errorMessage;

    await this.saveConfig();
  }

  /**
   * Get recent plots
   */
  getRecentPlots(): string[] {
    return this.config?.preferences.recentPlots ?? [];
  }

  /**
   * Add a plot to recent list
   */
  async addRecentPlot(plotUri: string, maxCount = 10): Promise<void> {
    if (!this.config) {
      this.config = { stores: [], preferences: {} };
    }

    if (!this.config.preferences.recentPlots) {
      this.config.preferences.recentPlots = [];
    }

    // Remove if already exists
    const index = this.config.preferences.recentPlots.indexOf(plotUri);
    if (index !== -1) {
      this.config.preferences.recentPlots.splice(index, 1);
    }

    // Add to front
    this.config.preferences.recentPlots.unshift(plotUri);

    // Trim to max count
    if (this.config.preferences.recentPlots.length > maxCount) {
      this.config.preferences.recentPlots = this.config.preferences.recentPlots.slice(
        0,
        maxCount
      );
    }

    await this.saveConfig();
  }

  /**
   * Register a listener for config changes
   */
  onConfigChange(listener: () => void): () => void {
    this.changeListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index !== -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.configWatcher) {
      this.configWatcher.close();
      this.configWatcher = null;
    }
    this.changeListeners = [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureConfigDir(): void {
    if (!fs.existsSync(DEBRIEF_CONFIG_DIR)) {
      fs.mkdirSync(DEBRIEF_CONFIG_DIR, { recursive: true });
    }
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(content) as DebriefConfig;
      } else {
        this.config = { stores: [], preferences: {} };
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      this.config = { stores: [], preferences: {} };
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      this.ensureConfigDir();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error('Failed to save config:', err);
      throw err;
    }
  }

  private watchConfig(): void {
    try {
      // Watch the config file for external changes
      if (fs.existsSync(CONFIG_FILE)) {
        this.configWatcher = fs.watch(CONFIG_FILE, (eventType) => {
          if (eventType === 'change') {
            this.loadConfig();
            this.notifyListeners();
          }
        });
      }
    } catch {
      // Watching may not be supported on all platforms
    }
  }

  private notifyListeners(): void {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (err) {
        console.error('Config change listener error:', err);
      }
    }
  }
}
