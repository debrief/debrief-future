/**
 * Service path resolution for Python services.
 *
 * In development, services are invoked via PATH (requires pip install).
 * In production, services are bundled as shiv archives with embedded Python.
 */

import { app } from 'electron';
import { join } from 'path';

/**
 * Command structure for spawning a service.
 */
export interface ServiceCommand {
  /** Executable path */
  executable: string;
  /** Arguments to pass to executable */
  args: string[];
}

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
 * Resolves the command to spawn a Python service.
 *
 * In development: { executable: 'debrief-stac', args: [] }
 * In production:  { executable: '/path/to/python', args: ['/path/to/service.pyz'] }
 *
 * @param name - Service name (e.g., 'debrief-stac', 'debrief-io')
 * @returns ServiceCommand with executable and args
 */
export function getServiceCommand(name: string): ServiceCommand {
  // Check environment variable override first
  const envKey = name.toUpperCase().replace(/-/g, '_') + '_PATH';
  const envPath = process.env[envKey];
  if (envPath) {
    return { executable: envPath, args: [] };
  }

  if (!app.isPackaged) {
    // Development: use PATH lookup (requires: pip install -e ./services/stac etc.)
    return { executable: name, args: [] };
  }

  // Production: use bundled Python + shiv archive
  const pythonExe = process.platform === 'win32' ? 'python.exe' : 'bin/python3';
  const pythonPath = join(process.resourcesPath, 'python', pythonExe);
  const archivePath = join(process.resourcesPath, 'services', `${name}.pyz`);

  return {
    executable: pythonPath,
    args: [archivePath],
  };
}

/**
 * Legacy function for backward compatibility.
 * @deprecated Use getServiceCommand instead
 */
export function getServicePath(name: string): string {
  const cmd = getServiceCommand(name);
  return cmd.executable;
}
