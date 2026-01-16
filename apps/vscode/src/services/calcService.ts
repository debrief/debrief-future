/**
 * Calc Service - Wrapper for debrief-calc MCP operations
 *
 * This service provides access to analysis tools via the Model Context Protocol.
 * It handles lazy connection, caching, and graceful degradation when the service
 * is unavailable.
 */

import * as vscode from 'vscode';
import type {
  AnalysisTool,
  ToolExecution,
  ToolExecutionRequest,
  ToolExecutionResult,
  ResultLayer,
} from '../types/tool';
import {
  createToolExecution,
  createDefaultResultStyle,
} from '../types/tool';
import type { Track, ReferenceLocation } from '../types/plot';

// MCP connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Tool cache entry
interface ToolCacheEntry {
  tools: AnalysisTool[];
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
   * List available analysis tools
   */
  async listTools(): Promise<AnalysisTool[]> {
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
   * Get tools applicable to the current selection
   */
  async getApplicableTools(
    tracks: Track[],
    locations: ReferenceLocation[]
  ): Promise<AnalysisTool[]> {
    const allTools = await this.listTools();

    // Determine selection context
    const trackCount = tracks.filter((t) => t.selected).length;
    const locationCount = locations.filter((l) => l.selected).length;

    let contextType: string;
    if (trackCount === 0 && locationCount === 0) {
      return [];
    } else if (trackCount === 1 && locationCount === 0) {
      contextType = 'single-track';
    } else if (trackCount > 1 && locationCount === 0) {
      contextType = 'multi-track';
    } else if (trackCount === 0 && locationCount > 0) {
      contextType = 'location';
    } else {
      contextType = 'mixed';
    }

    // Filter tools by context
    return allTools.filter(
      (tool) => tool.contextType === 'any' || tool.contextType === contextType
    );
  }

  /**
   * Execute a tool on the selection
   */
  async executeTool(
    request: ToolExecutionRequest,
    tracks: Track[],
    locations: ReferenceLocation[]
  ): Promise<ToolExecutionResult> {
    // Ensure connected
    await this.connect();

    // Create execution record
    const execution = createToolExecution(request.toolName);
    this.currentExecution = execution;

    try {
      execution.status = 'running';

      // Get selected features
      const selectedTracks = tracks.filter((t) =>
        request.trackIds.includes(t.id)
      );
      const selectedLocations = locations.filter((l) =>
        request.locationIds.includes(l.id)
      );

      const startTime = Date.now();

      // Note: In a real implementation, this would call the MCP server
      const result = await this.executeToolOnMcp(
        request.toolName,
        selectedTracks,
        selectedLocations,
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
   * Create a result layer from tool execution
   */
  createResultLayer(
    toolName: string,
    executionId: string,
    result: ToolExecutionResult
  ): ResultLayer | null {
    if (result.success !== true || !result.features) {
      return null;
    }

    const allTools = this.toolCache?.tools ?? [];
    const tool = allTools.find((t) => t.name === toolName);
    const displayName = tool?.displayName ?? toolName;

    return {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: displayName,
      toolName,
      executionId,
      features: result.features as GeoJSON.Feature[],
      style: createDefaultResultStyle(toolName),
      visible: true,
      createdAt: new Date().toISOString(),
      zIndex: 100, // Result layers on top
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

  private fetchToolsFromMcp(): Promise<AnalysisTool[]> {
    // Simulated tools - in production, these come from debrief-calc MCP
    return Promise.resolve([
      {
        name: 'range-bearing',
        displayName: 'Range & Bearing Calculator',
        description:
          'Calculate distance and bearing between two tracks at matching times',
        contextType: 'multi-track',
        inputKinds: ['track'],
        inputSchema: {},
      },
      {
        name: 'closest-approach',
        displayName: 'Closest Point of Approach',
        description: 'Find when and where the tracks came closest to each other',
        contextType: 'multi-track',
        inputKinds: ['track'],
        inputSchema: {},
      },
      {
        name: 'relative-motion',
        displayName: 'Relative Motion Analysis',
        description: 'Compute motion of one track relative to the other',
        contextType: 'multi-track',
        inputKinds: ['track'],
        inputSchema: {},
      },
      {
        name: 'track-stats',
        displayName: 'Track Statistics',
        description: 'Calculate speed, course, and distance statistics for a track',
        contextType: 'single-track',
        inputKinds: ['track'],
        inputSchema: {},
      },
      {
        name: 'distance-to-point',
        displayName: 'Distance to Point',
        description: 'Calculate distance from track to a reference point over time',
        contextType: 'mixed',
        inputKinds: ['track', 'location'],
        inputSchema: {},
      },
    ]);
  }

  private async executeToolOnMcp(
    _toolName: string,
    _tracks: Track[],
    _locations: ReferenceLocation[],
    _params?: Record<string, unknown>
  ): Promise<GeoJSON.FeatureCollection> {
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
