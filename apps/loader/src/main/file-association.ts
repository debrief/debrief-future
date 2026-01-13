/**
 * File association handling for OS integration.
 * Handles file paths from command line and macOS open-file events.
 */

import { BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;
let pendingFilePath: string | null = null;

/**
 * Sets the main window reference for sending file-opened events.
 */
export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;

  // If we received a file path before the window was ready, send it now
  if (mainWindow && pendingFilePath) {
    mainWindow.webContents.once('did-finish-load', () => {
      if (mainWindow && pendingFilePath) {
        mainWindow.webContents.send('file-opened', pendingFilePath);
        pendingFilePath = null;
      }
    });
  }
}

/**
 * Extracts file path from command line arguments.
 * On Windows/Linux, the file path is passed as the last argument.
 */
export function extractFilePath(argv: string[]): string | null {
  // Skip the first two arguments (electron and script path in dev, or app path in prod)
  const args = argv.slice(process.defaultApp ? 2 : 1);

  // Find the first argument that looks like a file path (not a flag)
  for (const arg of args) {
    if (!arg.startsWith('-') && !arg.startsWith('--')) {
      // Check if it looks like a REP file
      if (arg.endsWith('.rep') || arg.endsWith('.REP')) {
        return arg;
      }
    }
  }

  return null;
}

/**
 * Handles macOS open-file event.
 * This can fire before or after the app is ready.
 */
export function handleOpenFile(path: string): void {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('file-opened', path);
  } else {
    // Window not ready yet, store for later
    pendingFilePath = path;
  }
}
