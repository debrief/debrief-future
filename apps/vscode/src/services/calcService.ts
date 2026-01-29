/**
 * Calc Service - Wrapper for debrief-calc MCP operations
 *
 * This service provides access to analysis tools via the Model Context Protocol.
 * It handles lazy connection, caching, and graceful degradation when the service
 * is unavailable.
 *
 * Feature: 038-context-tool-vscode - Updated to return Tool[] from @debrief/schemas
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import type {
  Tool,
  ToolExecution,
  ToolExecutionRequest,
  ToolExecutionResult,
  ResultLayer,
  ToolProvenance,
} from '../types/tool';
import {
  createToolExecution,
  createDefaultResultStyle,
} from '../types/tool';
import type { MapPanel } from '../webview/mapPanel';

const execFileAsync = promisify(execFile);

/** Spawn a process with JSON on stdin, return stdout. */
function spawnWithStdin(
  cmd: string,
  args: string[],
  input: string,
  timeout: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { timeout });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`));
      } else {
        resolve(stdout);
      }
    });
    proc.on('error', reject);
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

// Self-contained SafeFeatureCollection to avoid any from geojson
interface SafeFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown> | null;
  }>;
}

// MCP connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Tool cache entry
interface ToolCacheEntry {
  tools: Tool[];
  timestamp: number;
}

// Default cache TTL: 60 seconds
const TOOL_CACHE_TTL = 60000;

// Circuit breaker settings
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_TIME = 30000;

export class CalcService {
  private context: vscode.ExtensionContext;
  private connectionState: ConnectionState = 'disconnected';
  private toolCache: ToolCacheEntry | null = null;
  private failureCount = 0;
  private lastFailureTime = 0;
  private currentExecution: ToolExecution | null = null;
  private getMapPanel: () => MapPanel | undefined;

  constructor(context: vscode.ExtensionContext, getMapPanel: () => MapPanel | undefined) {
    this.context = context;
    this.getMapPanel = getMapPanel;
  }

  // Reserved for future use (e.g., storing execution history)
  getContext(): vscode.ExtensionContext {
    return this.context;
  }

  /**
   * Check if debrief-calc is available
   */
  async checkAvailability(): Promise<boolean> {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      return false;
    }

    try {
      // Attempt to connect
      await this.connect();
      return this.connectionState === 'connected';
    } catch {
      return false;
    }
  }

  /**
   * Connect to debrief-calc MCP server
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected') {
      return;
    }

    if (this.connectionState === 'connecting') {
      // Wait for existing connection attempt
      await this.waitForConnection();
      return;
    }

    this.connectionState = 'connecting';

    try {
      const pythonPath = this.getPythonPath();
      const config = vscode.workspace.getConfiguration('debrief');
      const timeout = config.get<number>('calc.connectionTimeout') ?? 5000;

      await this.validatePython(pythonPath, timeout);

      this.connectionState = 'connected';
      this.failureCount = 0;
    } catch (err) {
      this.connectionState = 'error';
      this.recordFailure();
      throw err;
    }
  }

  /**
   * Disconnect from debrief-calc
   */
  disconnect(): void {
    this.connectionState = 'disconnected';
    this.toolCache = null;
  }

  /**
   * List available analysis tools.
   *
   * Returns Tool[] compatible with ToolMatchService.
   * Tools use the SelectionRequirement format from @debrief/schemas.
   */
  async listTools(): Promise<Tool[]> {
    // Check cache
    if (this.toolCache && Date.now() - this.toolCache.timestamp < TOOL_CACHE_TTL) {
      return this.toolCache.tools;
    }

    // Ensure connected
    await this.connect();

    try {
      // Note: In a real implementation, this would call the MCP server
      const tools = await this.fetchToolsFromMcp();

      // Update cache
      this.toolCache = {
        tools,
        timestamp: Date.now(),
      };

      return tools;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  /**
   * Execute a tool on the selection.
   *
   * @param request - Execution request with tool ID and feature IDs
   * @returns Execution result with features and provenance
   */
  async executeTool(
    request: ToolExecutionRequest
  ): Promise<ToolExecutionResult> {
    // Ensure connected
    await this.connect();

    // Find the tool
    const allTools = this.toolCache?.tools ?? [];
    const tool = allTools.find((t) => t.id === request.toolId);
    const toolName = tool?.name ?? request.toolId;

    // Create execution record
    const execution = createToolExecution(request.toolId, toolName);
    this.currentExecution = execution;

    try {
      execution.status = 'running';

      const startTime = Date.now();

      // Note: In a real implementation, this would call the MCP server
      const result = await this.executeToolOnMcp(
        request.toolId,
        request.featureIds,
        request.params
      );

      const durationMs = Date.now() - startTime;

      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();

      return {
        success: true,
        features: result,
        durationMs,
      };
    } catch (err) {
      execution.status = 'failed';
      execution.error = err instanceof Error ? err.message : String(err);
      execution.completedAt = new Date().toISOString();

      this.recordFailure();

      return {
        success: false,
        error: execution.error,
        durationMs: 0,
      };
    } finally {
      this.currentExecution = null;
    }
  }

  /**
   * Cancel current tool execution
   */
  cancelExecution(): void {
    if (this.currentExecution) {
      this.currentExecution.status = 'cancelled';
      this.currentExecution.completedAt = new Date().toISOString();
      this.currentExecution = null;
    }
  }

  /**
   * Get current execution state
   */
  getCurrentExecution(): ToolExecution | null {
    return this.currentExecution;
  }

  /**
   * Create a result layer from tool execution with provenance (FR-024).
   *
   * @param toolId - Tool ID that produced the result
   * @param executionId - Execution ID
   * @param result - Tool execution result
   * @param sourceFeatureIds - IDs of features used as inputs
   * @returns ResultLayer with provenance metadata
   */
  createResultLayer(
    toolId: string,
    executionId: string,
    result: ToolExecutionResult,
    sourceFeatureIds: string[]
  ): ResultLayer | null {
    if (result.success !== true || result.features === undefined) {
      return null;
    }

    const allTools = this.toolCache?.tools ?? [];
    const tool = allTools.find((t) => t.id === toolId);
    const toolName = tool?.name ?? toolId;
    const toolVersion = tool?.version ?? '0.0.0';

    const provenance: ToolProvenance = {
      toolId,
      toolName,
      toolVersion,
      executionTime: new Date().toISOString(),
      sourceFeatureIds,
      durationMs: result.durationMs,
    };

    return {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: toolName,
      toolId,
      toolName,
      executionId,
      features: result.features as SafeFeatureCollection,
      style: createDefaultResultStyle(toolName),
      visible: true,
      createdAt: new Date().toISOString(),
      zIndex: 100, // Result layers on top
      provenance,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isCircuitOpen(): boolean {
    if (this.failureCount < CIRCUIT_BREAKER_THRESHOLD) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure < CIRCUIT_BREAKER_RESET_TIME;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  private async waitForConnection(): Promise<void> {
    // Simple polling wait for connection
    const maxWait = 5000;
    const pollInterval = 100;
    let waited = 0;

    while (waited < maxWait && this.connectionState === 'connecting') {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      waited += pollInterval;
    }

    if (this.connectionState !== 'connected') {
      throw new Error('Connection timeout');
    }
  }

  private async validatePython(
    pythonPath: string,
    timeout: number
  ): Promise<void> {
    try {
      await execFileAsync(pythonPath, ['-c', 'import debrief_calc'], {
        timeout,
      });
    } catch {
      throw new Error(
        `debrief-calc not available via '${pythonPath}'. ` +
        'Ensure debrief_calc is installed in the configured Python environment.'
      );
    }
  }

  private getPythonPath(): string {
    const config = vscode.workspace.getConfiguration('debrief');
    const configured = config.get<string>('calc.pythonPath');
    if (configured) {
      return configured;
    }

    // Try workspace folders and their ancestors for .venv (common with uv/poetry monorepos)
    const folders = vscode.workspace.workspaceFolders;
    if (folders) {
      for (const folder of folders) {
        let dir = folder.uri.fsPath;
        // Walk up to 5 levels looking for .venv
        for (let i = 0; i < 5; i++) {
          const venvPython = path.join(dir, '.venv', 'bin', 'python');
          if (fs.existsSync(venvPython)) {
            return venvPython;
          }
          const parent = path.dirname(dir);
          if (parent === dir) { break; }
          dir = parent;
        }
      }
    }

    return 'python';
  }

  /**
   * Fetch tools from debrief-calc Python registry.
   *
   * Returns Tool[] with SelectionRequirement format for ToolMatchService.
   */
  private async fetchToolsFromMcp(): Promise<Tool[]> {
    const pythonPath = this.getPythonPath();
    const script = `
import json
from debrief_calc.registry import registry
from debrief_calc.models import ContextType
tools = []
for t in registry.list_all():
    ctx = t.context_type
    min_count = 1 if ctx == ContextType.SINGLE else (2 if ctx == ContextType.MULTI else 0)
    max_count = 1 if ctx == ContextType.SINGLE else (99 if ctx == ContextType.MULTI else 0)
    reqs = [{"kind": k.upper(), "min": min_count, "max": max_count} for k in t.input_kinds]
    tools.append({"id": t.name, "name": t.name, "description": t.description, "version": t.version, "requirements": reqs})
print(json.dumps(tools))
`;
    const { stdout } = await execFileAsync(pythonPath, ['-c', script], {
      timeout: 10000,
    });
    return JSON.parse(stdout.trim()) as Tool[];
  }

  /**
   * Resolve feature IDs to GeoJSON features using MapPanel data.
   */
  private resolveFeatures(
    featureIds: string[]
  ): Array<{ type: 'Feature'; geometry: unknown; properties: Record<string, unknown> }> {
    const panel = this.getMapPanel();
    if (!panel) {
      throw new Error('No map panel available');
    }

    const tracks = panel.getTracks();
    const locations = panel.getLocations();
    const features: Array<{ type: 'Feature'; geometry: unknown; properties: Record<string, unknown> }> = [];

    for (const id of featureIds) {
      const track = tracks.find((t) => t.id === id);
      if (track) {
        features.push({
          type: 'Feature',
          geometry: track.geometry,
          properties: {
            id: track.id,
            name: track.name,
            kind: 'track',
            platformType: track.platformType,
            times: track.times,
            startTime: track.startTime,
            endTime: track.endTime,
          },
        });
        continue;
      }

      const location = locations.find((l) => l.id === id);
      if (location) {
        features.push({
          type: 'Feature',
          geometry: location.geometry,
          properties: {
            id: location.id,
            name: location.name,
            kind: 'location',
            locationType: location.locationType,
          },
        });
        continue;
      }

      throw new Error(`Feature not found: ${id}`);
    }

    return features;
  }

  private async executeToolOnMcp(
    toolId: string,
    featureIds: string[],
    params?: Record<string, unknown>
  ): Promise<SafeFeatureCollection> {
    const features = this.resolveFeatures(featureIds);

    const input = JSON.stringify({
      tool: toolId,
      features,
      params: params ?? {},
    });

    const pythonPath = this.getPythonPath();
    const stdout = await spawnWithStdin(
      pythonPath,
      ['-m', 'debrief_calc.cli'],
      input,
      30000
    );

    const result = JSON.parse(stdout.trim()) as {
      success: boolean;
      features: SafeFeatureCollection['features'];
      error?: { code: string; message: string };
    };

    if (!result.success) {
      throw new Error(result.error?.message ?? 'Tool execution failed');
    }

    return {
      type: 'FeatureCollection',
      features: result.features,
    };
  }
}
