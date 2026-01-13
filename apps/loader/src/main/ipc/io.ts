/**
 * debrief-io service integration.
 * Spawns stateless parser for each file parse request.
 */

import { IpcMain } from 'electron';
import { spawnAndRequest } from './jsonrpc.js';
import type { ParseResult, GeoJSONFeature } from '../../renderer/types/results.js';

// Path to debrief-io executable (configured at build time or via env)
const DEBRIEF_IO_PATH = process.env.DEBRIEF_IO_PATH || 'debrief-io';

interface ParseFileResponse {
  features: GeoJSONFeature[];
  metadata: {
    parser: string;
    version: string;
    timestamp: string;
    source_hash: string;
  };
}

/**
 * Parses a REP file and returns GeoJSON features.
 */
export async function parseFile(filePath: string): Promise<ParseResult> {
  try {
    const result = await spawnAndRequest<ParseFileResponse>(
      DEBRIEF_IO_PATH,
      [],
      'parse_file',
      { file_path: filePath }
    );

    return {
      success: true,
      features: result.features,
      metadata: {
        parser: result.metadata.parser,
        version: result.metadata.version,
        timestamp: result.metadata.timestamp,
        sourceHash: result.metadata.source_hash,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Try to extract line/column from error message if available
    let line: number | undefined;
    let column: number | undefined;

    const lineMatch = message.match(/line (\d+)/i);
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
    }

    const colMatch = message.match(/column (\d+)/i);
    if (colMatch) {
      column = parseInt(colMatch[1], 10);
    }

    return {
      success: false,
      error: {
        message,
        line,
        column,
      },
      metadata: {
        parser: 'debrief-io',
        version: '0.0.0',
        timestamp: new Date().toISOString(),
        sourceHash: '',
      },
    };
  }
}

/**
 * Sets up IPC handlers for IO operations.
 */
export function setupIoHandlers(ipc: IpcMain): void {
  ipc.handle('io:parseFile', async (_event, filePath: string) => {
    return parseFile(filePath);
  });
}
