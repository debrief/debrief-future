/**
 * Cleanup handling for interrupted operations.
 * Uses write-ahead logging pattern to track and recover from partial writes.
 */

import { app, ipcMain } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';

const PENDING_OPS_FILE = 'pending-operations.json';

interface PendingOperation {
  id: string;
  startTime: string;
  storePath: string;
  plotId?: string;
  phase: 'parse' | 'create' | 'write' | 'copy';
}

/**
 * Gets the path to the pending operations file.
 */
function getPendingOpsPath(): string {
  return join(app.getPath('userData'), PENDING_OPS_FILE);
}

/**
 * Reads pending operations from disk.
 */
async function readPendingOperations(): Promise<PendingOperation[]> {
  try {
    const data = await fs.readFile(getPendingOpsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Writes pending operations to disk.
 */
async function writePendingOperations(ops: PendingOperation[]): Promise<void> {
  await fs.writeFile(getPendingOpsPath(), JSON.stringify(ops, null, 2));
}

/**
 * Marks an operation as pending (write-ahead log entry).
 */
export async function markOperationPending(operation: PendingOperation): Promise<void> {
  const ops = await readPendingOperations();
  ops.push(operation);
  await writePendingOperations(ops);
}

/**
 * Clears a pending operation after successful completion.
 */
export async function clearOperationPending(operationId: string): Promise<void> {
  const ops = await readPendingOperations();
  const filtered = ops.filter((op) => op.id !== operationId);
  await writePendingOperations(filtered);
}

/**
 * Checks for and cleans up any interrupted operations on startup.
 */
export async function checkAndCleanup(): Promise<void> {
  const ops = await readPendingOperations();

  if (ops.length === 0) {
    return;
  }

  console.log(`Found ${ops.length} interrupted operation(s), cleaning up...`);

  for (const op of ops) {
    try {
      console.log(`Cleaning up operation ${op.id} (phase: ${op.phase}, store: ${op.storePath})`);

      // Remove the partial plot directory if the operation was interrupted
      // during create/write/copy phases and we have a plot ID
      if (op.plotId && op.storePath && op.phase !== 'parse') {
        const plotDir = join(op.storePath, op.plotId);
        try {
          await fs.rm(plotDir, { recursive: true, force: true });
          console.log(`Removed partial plot directory: ${plotDir}`);
        } catch (rmErr) {
          // Directory may not exist if the operation failed before creation
          console.warn(`Could not remove ${plotDir}:`, rmErr);
        }
      }
    } catch (err) {
      console.error(`Failed to cleanup operation ${op.id}:`, err);
    }
  }

  // Clear all pending operations after cleanup attempt
  await writePendingOperations([]);
}

/**
 * Sets up IPC handlers for cleanup operations.
 */
export function setupCleanupHandlers(ipc: typeof ipcMain): void {
  ipc.handle('cleanup:markPending', async (_event, operationId: string) => {
    await markOperationPending({
      id: operationId,
      startTime: new Date().toISOString(),
      storePath: '',
      phase: 'parse',
    });
  });

  ipc.handle('cleanup:clearPending', async (_event, operationId: string) => {
    await clearOperationPending(operationId);
  });
}
