/**
 * Calc Service - Wrapper for debrief-calc MCP operations
 *
 * This service provides access to analysis tools via the Model Context Protocol.
 * It handles lazy connection, caching, and graceful degradation when the service
 * is unavailable.
 *
 * Feature: 038-context-tool-vscode - Updated to return Tool[] from @debrief/schemas
 * Feature: 052-tool-api-integration - listTools() now uses MCP adapter (T017)
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
  MCPToolDefinition,
  MCPToolResponse,
  MCPErrorResponse,
} from '../types/tool';
import {
  createToolExecution,
  createDefaultResultStyle,
} from '../types/tool';
import { adaptMCPToolsForMatching } from './mcpToolAdapter';
import type { MapPanel } from '../webview/mapPanel';
import type { DebriefFeature, ToolCategoryEnum } from '@debrief/schemas';

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
        // Prefer stdout JSON error response over generic stderr message.
        // The Python CLI writes error details to stdout before exiting.
        if (stdout.trim()) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      } else {
        resolve(stdout);
      }
    });
    proc.on('error', reject);
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

// Canonical Safe GeoJSON types from @debrief/utils (T02)
import type { SafeFeatureCollection } from '@debrief/utils';

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
  private outputChannel: vscode.OutputChannel | undefined;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

  constructor(context: vscode.ExtensionContext, getMapPanel: () => MapPanel | undefined) {
    this.context = context;
    this.getMapPanel = getMapPanel;
  }

  /**
   * Set the output channel for diagnostic logging.
   */
  setOutputChannel(channel: vscode.OutputChannel): void {
    this.outputChannel = channel;
  }

  private log(message: string): void {
    const line = `[calcService] ${message}`;
    this.outputChannel?.appendLine(line);
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
      this.log('Circuit breaker open — skipping availability check');
      return false;
    }

    try {
      // Attempt to connect
      await this.connect();
      this.log('debrief-calc available');
      const available = this.connectionState === 'connected';
      if (available) {
        this.startHeartbeat();
      }
      return available;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log(`debrief-calc unavailable: ${msg}`);
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
      this.log(`Python path: ${pythonPath}`);
      const config = vscode.workspace.getConfiguration('debrief');
      const timeout = config.get<number>('calc.connectionTimeout') ?? 5000;

      await this.validatePython(pythonPath, timeout);

      this.connectionState = 'connected';
      this.failureCount = 0;
      this.log('Connected successfully');
    } catch (err) {
      this.connectionState = 'error';
      this.recordFailure();
      const msg = err instanceof Error ? err.message : String(err);
      this.log(`Connection failed: ${msg}`);
      throw err;
    }
  }

  /**
   * Disconnect from debrief-calc
   */
  disconnect(): void {
    this.connectionState = 'disconnected';
    this.toolCache = null;
    this.stopHeartbeat();
  }

  /**
   * Dispose of resources held by this service.
   */
  dispose(): void {
    this.stopHeartbeat();
    this.disconnect();
  }

  /**
   * List available analysis tools.
   *
   * Returns Tool[] compatible with ToolMatchService.
   * Tools use the SelectionRequirement format from @debrief/schemas.
   *
   * The method first attempts to fetch MCP tool definitions (with Debrief
   * annotations) and adapts them via the shared mcpToolAdapter. This ensures
   * the same adapter logic is used as in the web-shell frontend. If MCP
   * tool definitions are not available, it falls back to the legacy Python
   * registry fetch.
   *
   * Feature: 052-tool-api-integration (T017)
   */
  async listTools(): Promise<Tool[]> {
    // Check cache
    if (this.toolCache && Date.now() - this.toolCache.timestamp < TOOL_CACHE_TTL) {
      return this.toolCache.tools;
    }

    // Ensure connected
    await this.connect();

    try {
      // Try MCP tools/list with annotations first (052-tool-api-integration)
      let tools: Tool[];
      try {
        const mcpToolDefs = await this.fetchMCPToolDefinitions();
        tools = adaptMCPToolsForMatching(mcpToolDefs);
        this.log(`Loaded ${tools.length} tools via MCP annotations`);
      } catch {
        // Fall back to legacy Python registry fetch
        tools = await this.fetchToolsFromMcp();
        this.log(`Loaded ${tools.length} tools via legacy registry`);
      }

      // Update cache
      this.toolCache = {
        tools,
        timestamp: Date.now(),
      };

      return tools;
    } catch (err) {
      this.recordFailure();
      const msg = err instanceof Error ? err.message : String(err);
      this.log(`Failed to list tools: ${msg}`);
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
        features: result.features,
        durationMs,
        resultType: result.resultType,
        label: result.label,
        sourceFeatureIds: result.sourceFeatureIds,
        artifactData: result.artifactData,
        artifactHref: result.artifactHref,
        tool_version: result.tool_version,
        modifiedFeatures: result.modifiedFeatures,
        createdFeatures: result.createdFeatures,
        createdAssets: result.createdAssets,
        parameters: result.parameters,
      };
    } catch (err) {
      execution.status = 'failed';
      execution.error = err instanceof Error ? err.message : String(err);
      execution.completedAt = new Date().toISOString();

      this.recordFailure();
      this.log(`Tool execution failed (${request.toolId}): ${execution.error}`);

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
   * Get currently cached tools without triggering a fetch.
   * Returns empty array if tools haven't been fetched yet.
   */
  getCurrentTools(): Tool[] {
    return this.toolCache?.tools ?? [];
  }

  /**
   * Feature 207: Project the cached tools into a `{toolId: category}` map
   * for the Log Panel icon resolver. Tools without a declared category
   * appear with `null` — the webview treats this as the grey-fallback
   * trigger.
   *
   * The `category` string on each cached Tool has already been coerced to
   * one of the five canonical `ToolCategoryEnum` values by the mcpAdapter
   * boundary (see `parseToolUICategory`). Any other string is replaced with
   * `null` before it ever reaches the cache. The cast in the return type is
   * therefore safe — this is the defensive boundary already paid for.
   *
   * Called by `logPanelView` when pushing `tools:manifest` messages. Does
   * NOT trigger a fetch — returns whatever is in the cache.
   */
  getToolCategoryMap(): Record<string, ToolCategoryEnum | null> {
    const tools = this.toolCache?.tools ?? [];
    const map: Record<string, ToolCategoryEnum | null> = {};
    for (const tool of tools) {
      // Safe cast: mcpAdapter whitelists to canonical values only.
      map[tool.id] = (tool.category as ToolCategoryEnum | undefined) ?? null;
    }
    return map;
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
    if (result.success !== true) {
      return null;
    }

    // Artifact results: no GeoJSON features, but still create layer for Layers panel
    if (result.artifactData && result.artifactHref) {
      const allTools = this.toolCache?.tools ?? [];
      const tool = allTools.find((t) => t.id === toolId);
      const toolName = tool?.name ?? toolId;
      const toolVersion = tool?.version ?? '0.0.0';

      const provenance: ToolProvenance = {
        toolId,
        toolName,
        tool_version: toolVersion,
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
        features: { type: 'FeatureCollection', features: [] },
        style: createDefaultResultStyle(toolName),
        visible: true,
        createdAt: new Date().toISOString(),
        zIndex: 100,
        provenance,
        artifactHref: result.artifactHref,
        artifactMimeType: 'application/json',
      };
    }

    if (result.features === undefined) {
      return null;
    }

    const allTools = this.toolCache?.tools ?? [];
    const tool = allTools.find((t) => t.id === toolId);
    const toolName = tool?.name ?? toolId;
    const toolVersion = tool?.version ?? '0.0.0';

    const provenance: ToolProvenance = {
      toolId,
      toolName,
      tool_version: toolVersion,
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
      features: result.features,
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

  /**
   * Start periodic heartbeat to re-validate Python dependency availability.
   * Feature: 111-heartbeat-revalidation
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return; // Already running
    }

    this.log(`Starting heartbeat (interval: ${this.HEARTBEAT_INTERVAL_MS}ms)`);
    this.heartbeatInterval = setInterval(() => {
      void (async () => {
        try {
          // Force a fresh connection check by resetting state
          this.connectionState = 'disconnected';
          await this.connect();
          this.log('Heartbeat: debrief-calc still available');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.log(`Heartbeat: debrief-calc became unavailable: ${msg}`);
          this.connectionState = 'error';
          this.stopHeartbeat();
        }
      })();
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop the periodic heartbeat timer.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.log('Heartbeat stopped');
    }
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
    // First check the Python interpreter itself
    try {
      const { stdout } = await execFileAsync(
        pythonPath,
        ['-c', 'import sys; print(f"{sys.version} | {sys.executable}")'],
        { timeout }
      );
      this.log(`Python interpreter: ${stdout.trim()}`);
    } catch {
      this.log(`Python interpreter not found at: ${pythonPath}`);
      throw new Error(
        `Python not found at '${pythonPath}'. ` +
        'Set debrief.calc.pythonPath in settings or ensure a .venv exists in the workspace.'
      );
    }

    // Then check for debrief_calc
    try {
      const { stdout } = await execFileAsync(
        pythonPath,
        ['-c', 'import debrief_calc; print(getattr(debrief_calc, "__version__", "unknown"))'],
        { timeout }
      );
      this.log(`debrief_calc version: ${stdout.trim()}`);
    } catch {
      this.log('debrief_calc package not installed');
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
      this.log(`Using configured Python path: ${configured}`);
      return configured;
    }

    // Try workspace folders and their ancestors for .venv (common with uv/poetry monorepos)
    const isWindows = process.platform === 'win32';
    const venvBin = isWindows
      ? path.join('.venv', 'Scripts', 'python.exe')
      : path.join('.venv', 'bin', 'python');

    const folders = vscode.workspace.workspaceFolders;
    if (folders) {
      for (const folder of folders) {
        let dir = folder.uri.fsPath;
        // Walk up to 5 levels looking for .venv
        for (let i = 0; i < 5; i++) {
          const venvPython = path.join(dir, venvBin);
          if (fs.existsSync(venvPython)) {
            this.log(`Found .venv Python at: ${venvPython}`);
            return venvPython;
          }
          const parent = path.dirname(dir);
          if (parent === dir) { break; }
          dir = parent;
        }
      }
    }

    this.log('No .venv found — falling back to system "python"');
    return 'python';
  }

  /**
   * Fetch MCP tool definitions with Debrief annotations from debrief-calc.
   *
   * Returns MCPToolDefinition[] in the standard MCP tools/list format with
   * debrief:selectionRequirements annotations. These are then adapted via
   * the shared mcpToolAdapter for use with ToolMatchService.
   *
   * Feature: 052-tool-api-integration (T017)
   */
  private async fetchMCPToolDefinitions(): Promise<MCPToolDefinition[]> {
    const pythonPath = this.getPythonPath();
    const script = `
import json
from debrief_calc.registry import registry
tools = [t.to_mcp_tool() for t in registry.list_all()]
print(json.dumps(tools))
`;
    const { stdout } = await execFileAsync(pythonPath, ['-c', script], {
      timeout: 10000,
    });
    return JSON.parse(stdout.trim()) as MCPToolDefinition[];
  }

  /**
   * Fetch tools from debrief-calc Python registry (legacy path).
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
    multi_kind = False
    if ctx == ContextType.REGION:
        reqs = [{"kind": "REGION", "min": 1, "max": 1}]
    elif ctx == ContextType.NONE:
        reqs = []
    else:
        if ctx == ContextType.SINGLE:
            reqs = [{"kind": k.upper(), "min": 1, "max": 1} for k in t.input_kinds]
        else:
            reqs = [{"kind": k.upper(), "min": 1} for k in t.input_kinds]
    params = []
    for p in t.parameters:
        pd = {"name": p.name, "valueType": "enum" if p.type == "enum" else p.type, "description": p.description}
        if p.required:
            pd["required"] = True
        if p.default is not None:
            pd["defaultValue"] = p.default
        if p.choices:
            pd["choices"] = p.choices
        if p.param_type:
            pd["paramType"] = p.param_type
        if p.param_type or p.choices:
            params.append(pd)
    entry = {"id": t.name, "name": t.name, "description": t.description, "version": t.version, "requirements": reqs}
    if params:
        entry["parameters"] = params
    tools.append(entry)
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
  ): Array<{ type: 'Feature'; id?: string | number; geometry: unknown; properties: Record<string, unknown> }> {
    const panel = this.getMapPanel();
    if (!panel) {
      throw new Error('No map panel available');
    }

    const allFeatures: DebriefFeature[] = panel.getFeatures();
    const resultLayers = panel.getResultLayers();
    const resolved: Array<{ type: 'Feature'; id?: string | number; geometry: unknown; properties: Record<string, unknown> }> = [];

    for (const id of featureIds) {
      const feature: DebriefFeature | undefined = allFeatures.find((f: DebriefFeature) => String(f.id) === id);
      if (feature !== undefined) {
          resolved.push({
          type: 'Feature',
          id: feature.id,
          geometry: feature.geometry,
          properties: {
            ...structuredClone(feature.properties),
            id: feature.id,
          },
        });
        continue;
      }

      const resultLayer = resultLayers.find((l) => l.id === id);
      if (resultLayer) {
        for (const rlFeature of resultLayer.features.features) {
          resolved.push({
            type: 'Feature',
            geometry: rlFeature.geometry,
            properties: {
              ...rlFeature.properties,
              kind: 'result',
              sourceToolId: resultLayer.toolId,
              sourceToolName: resultLayer.toolName,
              resultLayerId: resultLayer.id,
            },
          });
        }
        continue;
      }

      throw new Error(`Feature not found: ${id}`);
    }

    return resolved;
  }

  /**
   * Execute a tool with caller-provided features (for replay engine use).
   * Bypasses MapPanel feature resolution — caller provides features directly.
   */
  async executeToolDirect(
    toolId: string,
    features: Array<{ type: 'Feature'; id?: string | number; geometry: unknown; properties: Record<string, unknown> | null }>,
    params: Record<string, unknown>
  ): Promise<{ success: boolean; features?: SafeFeatureCollection; resultType?: string; artifactHref?: string; tool_version?: string }> {
    await this.connect();

    const input = JSON.stringify({
      tool: toolId,
      features,
      params,
    });

    const pythonPath = this.getPythonPath();
    const stdout = await spawnWithStdin(
      pythonPath,
      ['-m', 'debrief_calc.cli'],
      input,
      30000
    );

    const parsed = JSON.parse(stdout.trim()) as MCPToolResponse | MCPErrorResponse;
    if ('error' in parsed) {
      return { success: false };
    }

    const geoFeatures: SafeFeatureCollection['features'] = [];
    let resultType: string | undefined;
    let artifactHref: string | undefined;
    let toolVersion: string | undefined;

    for (const item of parsed.content) {
      if (!resultType && item.annotations?.['debrief:resultType']) {
        resultType = item.annotations['debrief:resultType'];
      }
      if (item.annotations?.['debrief:toolVersion']) {
        toolVersion = item.annotations['debrief:toolVersion'];
      }
      if (item.annotations?.['debrief:href']) {
        // Feature 178: dataset artifacts carry a GeoJSON feature with
        // `__datasets` in its properties — route into geoFeatures so
        // downstream code can hand them to the Results panel.  Mirrors
        // the same fix in executeToolOnMcp above.
        const resultTypeAnno = item.annotations['debrief:resultType'];
        if (
          typeof resultTypeAnno === 'string' &&
          resultTypeAnno.startsWith('artifact/dataset/') &&
          item.type === 'resource' &&
          item.resource
        ) {
          try {
            const feature = JSON.parse(item.resource.text) as SafeFeatureCollection['features'][number];
            geoFeatures.push(feature);
            continue;
          } catch {
            /* fall through */
          }
        }
        artifactHref = item.annotations['debrief:href'];
        continue;
      }
      if (item.type === 'resource' && item.resource) {
        const feature = JSON.parse(item.resource.text) as SafeFeatureCollection['features'][number];
        geoFeatures.push(feature);
      }
    }

    return {
      success: true,
      features: { type: 'FeatureCollection', features: geoFeatures },
      resultType,
      artifactHref,
      tool_version: toolVersion,
    };
  }

  /**
   * Get the version of an installed tool from the cached tool list.
   */
  getToolVersion(toolId: string): string | null {
    const tools = this.toolCache?.tools ?? [];
    const tool = tools.find((t) => t.id === toolId);
    return tool?.version ?? null;
  }

  private async executeToolOnMcp(
    toolId: string,
    featureIds: string[],
    params?: Record<string, unknown>
  ): Promise<{ features: SafeFeatureCollection; resultType?: string; label?: string; sourceFeatureIds?: string[]; artifactData?: string; artifactHref?: string; tool_version?: string; modifiedFeatures?: ToolExecutionResult['modifiedFeatures']; createdFeatures?: string[]; createdAssets?: ToolExecutionResult['createdAssets']; parameters?: ToolExecutionResult['parameters'] }> {
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

    const parsed = JSON.parse(stdout.trim()) as MCPToolResponse | MCPErrorResponse;

    // Check for error response
    if ('error' in parsed) {
      const errResponse: MCPErrorResponse = parsed;
      throw new Error(errResponse.error.message);
    }

    const response = parsed;

    // Extract content from MCP response items
    const geoFeatures: SafeFeatureCollection['features'] = [];
    let resultType: string | undefined;
    let label: string | undefined;
    let sourceFeatureIds: string[] | undefined;
    let artifactData: string | undefined;
    let artifactHref: string | undefined;
    let toolVersion: string | undefined;
    let modifiedFeatures: ToolExecutionResult['modifiedFeatures'] | undefined;
    let createdFeatures: string[] | undefined;
    let createdAssets: ToolExecutionResult['createdAssets'] | undefined;
    let parameters: ToolExecutionResult['parameters'] | undefined;

    for (const item of response.content) {
      // Grab annotations from first item
      if (!resultType && item.annotations !== undefined) {
        resultType = item.annotations['debrief:resultType'];
        label = item.annotations['debrief:label'];
        sourceFeatureIds = item.annotations['debrief:sourceFeatures'];
      }

      // Parse expanded ToolResult fields (Phase 0, Feature 071)
      if (item.annotations?.['debrief:toolVersion']) {
        toolVersion = item.annotations['debrief:toolVersion'];
      }
      if (item.annotations?.['debrief:modifiedFeatures']) {
        // eslint-disable-next-line no-restricted-syntax -- mapping MCP camelCase wire format to snake_case
        modifiedFeatures = item.annotations['debrief:modifiedFeatures'].map((mf) => ({
          feature_id: mf.featureId, // eslint-disable-line no-restricted-syntax -- MCP wire format
          changed_properties: Object.fromEntries(
            Object.entries(mf.changedProperties).map(([k, v]) => [k, { previous_value: v.previousValue, new_value: v.newValue }]) // eslint-disable-line no-restricted-syntax -- MCP wire format
          ),
        }));
      }
      if (item.annotations?.['debrief:createdFeatures']) {
        createdFeatures = item.annotations['debrief:createdFeatures'];
      }
      if (item.annotations?.['debrief:createdAssets']) {
        createdAssets = item.annotations['debrief:createdAssets'].map((ca) => ({
          result_id: ca.resultId,
          path: ca.path,
          ...(ca.mimeType !== undefined ? { mime_type: ca.mimeType } : {}),
        }));
      }
      if (item.annotations?.['debrief:parameters']) {
        parameters = item.annotations['debrief:parameters'];
      }

      // Detect artifact items via debrief:href annotation
      if (item.annotations?.['debrief:href']) {
        // Feature 178: dataset artifacts carry a GeoJSON feature with
        // `__datasets` (or `statistics`) in its properties.  The MCP
        // result builder wraps these in `build_artifact()` with a
        // `debrief:resultType` of `artifact/dataset/<subtype>`.  We
        // detect that here and route the parsed feature into
        // `geoFeatures` so the downstream executeTool carrier filter
        // can hand it to the Results panel as an in-memory tab
        // (FR-009 save-explicit contract).  The user must click
        // Save / Save As to persist it — NOT the MCP adapter.
        //
        // Non-dataset artifacts (e.g. images) still go through the
        // artifactData path unchanged.
        const resultTypeAnno = item.annotations['debrief:resultType'];
        const isDatasetArtifact =
          typeof resultTypeAnno === 'string' &&
          resultTypeAnno.startsWith('artifact/dataset/');
        if (
          isDatasetArtifact &&
          item.type === 'resource' &&
          item.resource
        ) {
          try {
            const feature = JSON.parse(item.resource.text) as SafeFeatureCollection['features'][number];
            geoFeatures.push(feature);
            continue;
          } catch (parseErr) {
            this.log(`[debrief] executeToolOnMcp: failed to parse dataset artifact, falling back to artifact path: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
            // Fall through to artifactData branch below.
          }
        }
        artifactHref = item.annotations['debrief:href'];
        if (item.type === 'resource' && item.resource) {
          artifactData = item.resource.text;
        }
        continue;
      }

      if (item.type === 'resource' && item.resource) {
        const feature = JSON.parse(item.resource.text) as SafeFeatureCollection['features'][number];
        geoFeatures.push(feature);
      }
    }

    return {
      features: { type: 'FeatureCollection', features: geoFeatures },
      resultType,
      label,
      sourceFeatureIds,
      artifactData,
      artifactHref,
      tool_version: toolVersion,
      modifiedFeatures,
      createdFeatures,
      createdAssets,
      parameters,
    };
  }
}

/**
 * Parse an MCP response JSON string into a structured result.
 *
 * Pure function — extracted from `CalcService.executeToolOnMcp` so
 * unit tests can feed real Python CLI output through it without
 * having to spin up a full CalcService.  The logic here MUST stay
 * in lock-step with `executeToolOnMcp`; they both consume the same
 * MCP wire format.
 *
 * Feature 178: dataset artifacts (MCP `debrief:resultType` of
 * `artifact/dataset/*`) are routed into the `features` array so the
 * downstream executeTool carrier filter can hand them to the
 * Results panel.  Non-dataset artifacts (images, etc.) still return
 * `artifactData` / `artifactHref`.
 *
 * @throws Error when the stdout is an MCP error response.
 */
export function parseMcpResponseForTest(stdout: string): {
  features: SafeFeatureCollection;
  resultType?: string;
  label?: string;
  sourceFeatureIds?: string[];
  artifactData?: string;
  artifactHref?: string;
} {
  const parsed = JSON.parse(stdout.trim()) as MCPToolResponse | MCPErrorResponse;

  if ('error' in parsed) {
    const errResponse: MCPErrorResponse = parsed;
    throw new Error(errResponse.error.message);
  }

  const response = parsed;
  const geoFeatures: SafeFeatureCollection['features'] = [];
  let resultType: string | undefined;
  let label: string | undefined;
  let sourceFeatureIds: string[] | undefined;
  let artifactData: string | undefined;
  let artifactHref: string | undefined;

  for (const item of response.content) {
    if (!resultType && item.annotations !== undefined) {
      resultType = item.annotations['debrief:resultType'];
      label = item.annotations['debrief:label'];
      sourceFeatureIds = item.annotations['debrief:sourceFeatures'];
    }

    if (item.annotations?.['debrief:href']) {
      const resultTypeAnno = item.annotations['debrief:resultType'];
      const isDatasetArtifact =
        typeof resultTypeAnno === 'string' &&
        resultTypeAnno.startsWith('artifact/dataset/');
      if (
        isDatasetArtifact &&
        item.type === 'resource' &&
        item.resource
      ) {
        try {
          const feature = JSON.parse(item.resource.text) as SafeFeatureCollection['features'][number];
          geoFeatures.push(feature);
          continue;
        } catch {
          /* fall through to artifact path */
        }
      }
      artifactHref = item.annotations['debrief:href'];
      if (item.type === 'resource' && item.resource) {
        artifactData = item.resource.text;
      }
      continue;
    }

    if (item.type === 'resource' && item.resource) {
      const feature = JSON.parse(item.resource.text) as SafeFeatureCollection['features'][number];
      geoFeatures.push(feature);
    }
  }

  return {
    features: { type: 'FeatureCollection', features: geoFeatures },
    resultType,
    label,
    sourceFeatureIds,
    artifactData,
    artifactHref,
  };
}
