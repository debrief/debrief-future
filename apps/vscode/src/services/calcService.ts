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

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
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
      // Get Python path from configuration
      const config = vscode.workspace.getConfiguration('debrief');
      const pythonPath = config.get<string>('calc.pythonPath') ?? 'python';
      const timeout = config.get<number>('calc.connectionTimeout') ?? 5000;

      // Note: In a real implementation, this would spawn the MCP server
      // and establish a connection. For now, we'll simulate the connection.
      await this.simulateConnection(pythonPath, timeout);

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

  private async simulateConnection(
    _pythonPath: string,
    timeout: number
  ): Promise<void> {
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, Math.min(timeout, 100)));

    // Note: In production, this would actually spawn and connect to the MCP server
    // For now, we'll simulate a successful connection
  }

  /**
   * Fetch tools from MCP server.
   *
   * Returns Tool[] with SelectionRequirement format for ToolMatchService.
   */
  private fetchToolsFromMcp(): Promise<Tool[]> {
    // Simulated tools - in production, these come from debrief-calc MCP
    return Promise.resolve([
      {
        id: 'range-bearing',
        name: 'Range & Bearing',
        description: 'Calculate distance and bearing between two tracks at matching times',
        version: '1.0.0',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      },
      {
        id: 'closest-approach',
        name: 'Closest Point of Approach',
        description: 'Find when and where the tracks came closest to each other',
        version: '1.0.0',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      },
      {
        id: 'relative-motion',
        name: 'Relative Motion Analysis',
        description: 'Compute motion of one track relative to another',
        version: '1.0.0',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      },
      {
        id: 'track-stats',
        name: 'Track Statistics',
        description: 'Calculate speed, course, and distance statistics for a track',
        version: '1.0.0',
        requirements: [{ kind: 'TRACK', min: 1, max: 1 }],
      },
      {
        id: 'distance-to-point',
        name: 'Distance to Point',
        description: 'Calculate distance from track to a reference point over time',
        version: '1.0.0',
        requirements: [
          { kind: 'TRACK', min: 1, max: 1 },
          { kind: 'POINT', min: 1, max: 1 },
        ],
      },
    ]);
  }

  private async executeToolOnMcp(
    _toolId: string,
    _featureIds: string[],
    _params?: Record<string, unknown>
  ): Promise<SafeFeatureCollection> {
    // Simulate tool execution delay
    await new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.random() * 500)
    );

    // Return empty result - in production, this would be actual computed data
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
}
