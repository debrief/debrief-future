/**
 * Electron main process entry point.
 * Handles window management, IPC setup, and Python service orchestration.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { extractFilePath, handleOpenFile, setMainWindow } from './file-association.js';
import { checkAndCleanup } from './cleanup.js';
import { setupConfigHandlers } from './ipc/config.js';
import { setupIoHandlers } from './ipc/io.js';
import { setupStacHandlers, initializeStac } from './ipc/stac.js';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 600,
    minWidth: 400,
    minHeight: 500,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'default',
    show: false,
  });

  setMainWindow(mainWindow);

  // Load the renderer
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initialize(): Promise<void> {
  // Check for and cleanup any interrupted operations
  await checkAndCleanup();

  // Setup IPC handlers for Python services
  setupConfigHandlers(ipcMain);
  setupIoHandlers(ipcMain);
  setupStacHandlers(ipcMain);

  // Create the main window
  await createWindow();

  // Initialize debrief-stac with configured store paths
  await initializeStac();

  // Handle file path from command line (non-macOS)
  const filePath = extractFilePath(process.argv);
  if (filePath && mainWindow) {
    mainWindow.webContents.send('file-opened', filePath);
  }
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

  app.whenReady().then(initialize);
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
