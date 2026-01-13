/**
 * Service path resolution for Python executables.
 *
 * In development, services are invoked via PATH (requires pip install).
 * In production, services are bundled executables in extraResources.
 */

import { app } from 'electron';
import { join } from 'path';

/**
 * Returns true if running in development mode.
 */
export function isDev(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.ELECTRON_IS_DEV === '1' ||
    !app.isPackaged
  );
}

/**
 * Resolves the path to a Python service executable.
 *
 * @param name - Service name (e.g., 'debrief-stac', 'debrief-io')
 * @returns Path to executable (absolute in production, name-only in development)
 */
export function getServicePath(name: string): string {
  // Check environment variable override first
  const envKey = name.toUpperCase().replace(/-/g, '_') + '_PATH';
  const envPath = process.env[envKey];
  if (envPath) {
    return envPath;
  }

  if (!app.isPackaged) {
    // Development: use PATH lookup
    return name;
  }

  // Production: use bundled executable in extraResources
  const platform = process.platform;
  const ext = platform === 'win32' ? '.exe' : '';
  return join(process.resourcesPath, 'python-services', `${name}${ext}`);
}

/**
 * Path to debrief-stac executable.
 */
export const DEBRIEF_STAC_PATH = getServicePath('debrief-stac');

/**
 * Path to debrief-io executable.
 */
export const DEBRIEF_IO_PATH = getServicePath('debrief-io');
