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
      // For now, we just log the interrupted operation
      // In a full implementation, we would call debrief-stac to rollback partial writes
      console.log(`Cleaning up operation ${op.id} (phase: ${op.phase}, store: ${op.storePath})`);

      // TODO: Implement actual cleanup via debrief-stac rollback API
      // await stacService.rollback(op.storePath, op.plotId);
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
