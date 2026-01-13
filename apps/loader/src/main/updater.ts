/**
 * Auto-updater infrastructure for Debrief Loader
 *
 * This module provides automatic update checking and installation.
 * Currently disabled by default - enable when release infrastructure is ready.
 *
 * Prerequisites for enabling:
 * 1. Configure update server URL in environment
 * 2. Set up code signing for all platforms
 * 3. Configure GitHub Releases or custom update server
 * 4. Enable in production builds only
 */

import { app } from 'electron';
// import { autoUpdater } from 'electron-updater';

/**
 * Configuration for auto-updater
 */
export interface UpdaterConfig {
  /** Enable/disable auto-updates */
  enabled: boolean;
  /** URL to check for updates (GitHub Releases by default) */
  feedUrl?: string;
  /** Check for updates on app start */
  checkOnStartup: boolean;
  /** Interval in hours between update checks (0 = manual only) */
  checkInterval: number;
  /** Allow pre-release updates */
  allowPrerelease: boolean;
}

/**
 * Default updater configuration (disabled for development)
 */
export const defaultUpdaterConfig: UpdaterConfig = {
  enabled: false,
  checkOnStartup: true,
  checkInterval: 24,
  allowPrerelease: false,
};

/**
 * Initialize the auto-updater
 *
 * @param config - Updater configuration
 *
 * @example
 * ```ts
 * // Enable in production only
 * if (app.isPackaged) {
 *   initUpdater({ ...defaultUpdaterConfig, enabled: true });
 * }
 * ```
 */
export function initUpdater(config: UpdaterConfig = defaultUpdaterConfig): void {
  if (!config.enabled) {
    console.log('[updater] Auto-updates disabled');
    return;
  }

  // NOTE: Uncomment when ready to enable auto-updates
  // autoUpdater.autoDownload = false;
  // autoUpdater.autoInstallOnAppQuit = true;
  // autoUpdater.allowPrerelease = config.allowPrerelease;

  // if (config.feedUrl) {
  //   autoUpdater.setFeedURL({ provider: 'generic', url: config.feedUrl });
  // }

  // autoUpdater.on('checking-for-update', () => {
  //   console.log('[updater] Checking for updates...');
  // });

  // autoUpdater.on('update-available', (info) => {
  //   console.log('[updater] Update available:', info.version);
  //   // Notify renderer process to show update dialog
  // });

  // autoUpdater.on('update-not-available', () => {
  //   console.log('[updater] No updates available');
  // });

  // autoUpdater.on('error', (err) => {
  //   console.error('[updater] Update error:', err);
  // });

  // autoUpdater.on('download-progress', (progress) => {
  //   console.log(`[updater] Download progress: ${progress.percent}%`);
  // });

  // autoUpdater.on('update-downloaded', (info) => {
  //   console.log('[updater] Update downloaded:', info.version);
  //   // Prompt user to restart and install
  // });

  // if (config.checkOnStartup) {
  //   autoUpdater.checkForUpdates();
  // }

  // if (config.checkInterval > 0) {
  //   setInterval(() => {
  //     autoUpdater.checkForUpdates();
  //   }, config.checkInterval * 60 * 60 * 1000);
  // }

  console.log('[updater] Auto-updater configured (awaiting infrastructure)');
}

/**
 * Manually check for updates
 */
export async function checkForUpdates(): Promise<void> {
  // NOTE: Uncomment when ready
  // await autoUpdater.checkForUpdates();
  console.log('[updater] Manual update check - infrastructure not ready');
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  return app.getVersion();
}
