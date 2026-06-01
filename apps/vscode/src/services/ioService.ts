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
import type { ParseResult, ParseWarning } from '../types/import';
import type { IngressFeature } from '@debrief/schemas';
import { RepParseError } from '../types/import';

export class IoService {
  private pythonPath: string;
  private outputChannel: vscode.OutputChannel | undefined;

  constructor(extensionPath?: string) {
    const config = vscode.workspace.getConfiguration('debrief');
    const configuredPath = config.get<string>('calc.pythonPath', '');

    // Use configured path if explicitly set, otherwise auto-detect from project .venv
    this.pythonPath = configuredPath || this.findPythonPath(extensionPath);
  }

  /**
   * Set the output channel for diagnostic logging.
   */
  setOutputChannel(channel: vscode.OutputChannel): void {
    this.outputChannel = channel;
    // Log the Python path that was resolved during construction
    this.log(`Python path: ${this.pythonPath}`);
  }

  private log(message: string): void {
    const line = `[ioService] ${message}`;
    this.outputChannel?.appendLine(line);
  }

  /**
   * Find Python executable, preferring project venv
   */
  private findPythonPath(extensionPath?: string): string {
    // Look for .venv in extension's parent directories (monorepo structure)
    // apps/vscode -> apps -> repo-root/.venv
    const isWindows = process.platform === 'win32';
    const venvBin = isWindows
      ? path.join('.venv', 'Scripts', 'python.exe')
      : path.join('.venv', 'bin', 'python');

    if (extensionPath) {
      const candidates = [
        path.join(extensionPath, '..', '..', venvBin),
        path.join(extensionPath, '..', venvBin),
        path.join(extensionPath, venvBin),
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

      const rawFeatures = result.features as IngressFeature[] | undefined;
      const features: IngressFeature[] = rawFeatures ?? [];

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

      // Log full error for debugging
      this.log(`Parse error: ${message}`);

      // Try to extract line number from error message
      const lineMatch = message.match(/line\s+(\d+)/i);
      const lineNumber = lineMatch && lineMatch[1] ? parseInt(lineMatch[1], 10) : undefined;

      // Include actual error message in the thrown error
      const parseError = new RepParseError(filePath, lineNumber, undefined, 'PARSE_FAILED');
      parseError.message = `Failed to parse REP file: ${message}`;
      throw parseError;
    }
  }

  /**
   * Check if debrief-io service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Try to import debrief_io module
      const output = await this.runPython(
        '-c',
        'import debrief_io; print(getattr(debrief_io, "__version__", "ok"))'
      );
      this.log(`debrief-io available (${output.trim()})`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log(`debrief-io unavailable: ${msg}`);
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

    # Convert Pydantic model to JSON-serializable dict
    output = result.model_dump()

    print(json.dumps(output))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const output = await this.runPython('-c', script, filePath);

    try {
      const result = JSON.parse(output) as { error?: unknown; [key: string]: unknown };
      if (result.error !== undefined && result.error !== null) {
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
