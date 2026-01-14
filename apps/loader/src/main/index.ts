/**
 * Electron main process entry point.
 * Handles window management, IPC setup, and Python service orchestration.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { extractFilePath, handleOpenFile, setMainWindow } from './file-association.js';
import { checkAndCleanup, setupCleanupHandlers } from './cleanup.js';
import { setupConfigHandlers } from './ipc/config.js';
import { setupIoHandlers } from './ipc/io.js';
import { setupStacHandlers, initializeStac } from './ipc/stac.js';

let mainWindow: BrowserWindow | null = null;

// Detect dev mode: check for Vite dev server or explicit NODE_ENV
const isDev = process.env.NODE_ENV === 'development' ||
              process.env.ELECTRON_IS_DEV === '1' ||
              !app.isPackaged;

console.log('[main] Starting Debrief Loader, isDev:', isDev);

async function createWindow(): Promise<void> {
  console.log('[main] Creating window...');

  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
    minWidth: 400,
    minHeight: 500,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for preload to work in dev
    },
    titleBarStyle: 'default',
    show: false,
  });

  setMainWindow(mainWindow);

  // Load the renderer
  if (isDev) {
    console.log('[main] Loading dev server at http://localhost:5173');
    try {
      await mainWindow.loadURL('http://localhost:5173');
      console.log('[main] Dev server loaded successfully');
      mainWindow.webContents.openDevTools();
    } catch (err) {
      console.error('[main] Failed to load dev server:', err);
    }
  } else {
    const indexPath = join(__dirname, '../renderer/index.html');
    console.log('[main] Loading production file:', indexPath);
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[main] Window ready to show');
    mainWindow?.show();
  });

  // Fallback: show window after a short delay if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('[main] Forcing window to show (fallback)');
      mainWindow.show();
    }
  }, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initialize(): Promise<void> {
  console.log('[main] Initializing...');

  // Check for and cleanup any interrupted operations (non-critical)
  try {
    await checkAndCleanup();
  } catch (err) {
    console.warn('[main] Cleanup check failed (non-critical):', err);
  }

  // Setup IPC handlers for Python services
  setupConfigHandlers(ipcMain);
  setupIoHandlers(ipcMain);
  setupStacHandlers(ipcMain);
  setupCleanupHandlers(ipcMain);

  // Create the main window
  await createWindow();

  // Initialize debrief-stac with configured store paths (non-critical)
  try {
    await initializeStac();
  } catch (err) {
    console.warn('[main] STAC initialization failed (services may not be available):', err);
  }

  // Handle file path from command line (non-macOS)
  const filePath = extractFilePath(process.argv);
  if (filePath && mainWindow) {
    mainWindow.webContents.send('file-opened', filePath);
  }

  console.log('[main] Initialization complete');
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Focus window and send file path from second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const filePath = extractFilePath(commandLine);
      if (filePath) {
        mainWindow.webContents.send('file-opened', filePath);
      }
    }
  });

  app.whenReady().then(initialize).catch((err) => {
    console.error('[main] Failed to initialize:', err);
  });
}

// macOS: Handle file open events
app.on('open-file', (event, path) => {
  event.preventDefault();
  handleOpenFile(path);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
