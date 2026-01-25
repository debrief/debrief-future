/**
 * IO Service - Wrapper for debrief-io REP parsing operations
 *
 * This service is STORAGE-AGNOSTIC: it only parses REP files and returns
 * GeoJSON features. The VS Code extension acts as orchestrator, calling
 * IoService for parsing then StacService for storage separately.
 *
 * This separation enables future storage backends (local files, other catalogs)
 * without changing IoService.
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { ParseResult, ParseWarning, GeoJSONFeature } from '../types/import';
import { RepParseError } from '../types/import';

export class IoService {
  private pythonPath: string;

  constructor(extensionPath?: string) {
    const config = vscode.workspace.getConfiguration('debrief');
    const configuredPath = config.get<string>('calc.pythonPath', '');

    // Use configured path if explicitly set, otherwise auto-detect
    this.pythonPath = configuredPath || this.findPythonPath(extensionPath);
  }

  /**
   * Find Python executable, preferring project venv
   */
  private findPythonPath(extensionPath?: string): string {
    // Look for .venv in extension's parent directories (monorepo structure)
    // apps/vscode -> apps -> repo-root/.venv
    if (extensionPath) {
      const candidates = [
        path.join(extensionPath, '..', '..', '.venv', 'bin', 'python'),
        path.join(extensionPath, '..', '.venv', 'bin', 'python'),
        path.join(extensionPath, '.venv', 'bin', 'python'),
      ];

      for (const candidate of candidates) {
        const resolved = path.resolve(candidate);
        if (fs.existsSync(resolved)) {
          return resolved;
        }
      }
    }

    // Fall back to system python
    return 'python';
  }

  /**
   * Parse REP file and return GeoJSON features.
   * Storage-agnostic - only handles parsing, not storage.
   *
   * @param filePath Absolute path to .rep file
   * @returns Parsed features and metadata
   * @throws RepParseError with line number and details
   */
  async parseRep(filePath: string): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      const result = await this.callDebriefIo(filePath);

      const rawFeatures = result.features as GeoJSONFeature[] | undefined;
      const features: GeoJSONFeature[] = rawFeatures ?? [];

      const rawWarnings = result.warnings as Array<Record<string, unknown>> | undefined;
      const warnings: ParseWarning[] = (rawWarnings ?? []).map((w) => ({
        message: String(w.message ?? ''),
        lineNumber: typeof w.line_number === 'number' ? w.line_number : undefined,
        field: typeof w.field === 'string' ? w.field : undefined,
        code: String(w.code ?? 'UNKNOWN'),
      }));

      return {
        features,
        warnings,
        sourceFile: filePath,
        encoding: String(result.encoding ?? 'utf-8'),
        parseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      if (error instanceof RepParseError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);

      // Try to extract line number from error message
      const lineMatch = message.match(/line\s+(\d+)/i);
      const lineNumber = lineMatch && lineMatch[1] ? parseInt(lineMatch[1], 10) : undefined;

      throw new RepParseError(filePath, lineNumber, undefined, 'PARSE_FAILED');
    }
  }

  /**
   * Check if debrief-io service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Try to import debrief_io module
      await this.runPython('-c', 'import debrief_io; print("ok")');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Call debrief-io Python service
   */
  private async callDebriefIo(
    filePath: string
  ): Promise<Record<string, unknown>> {
    const script = `
import json
import sys
from debrief_io import parse_rep

try:
    file_path = sys.argv[1]

    if not file_path:
        raise ValueError("file_path is required")

    result = parse_rep(file_path)

    # Convert to JSON-serializable format
    output = {
        'features': result.get('features', []),
        'warnings': result.get('warnings', []),
        'encoding': result.get('encoding', 'utf-8')
    }

    print(json.dumps(output))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const output = await this.runPython('-c', script, filePath);

    try {
      const result = JSON.parse(output) as Record<string, unknown>;
      if (result.error) {
        throw new Error(String(result.error));
      }
      return result;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON response from debrief-io: ${output}`);
      }
      throw error;
    }
  }

  /**
   * Run Python with arguments
   */
  private runPython(...args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonPath, args, {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to run Python: ${error.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `Python process exited with code ${code}`));
        }
      });
    });
  }
}
