/**
 * JSON-RPC 2.0 client utility for Python service communication.
 * Handles spawning processes and managing stdin/stdout message passing.
 */

import { spawn, ChildProcess } from 'child_process';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcErrorCodes,
} from '../types/ipc.js';

let requestId = 0;

/**
 * Generates a unique request ID.
 */
function nextId(): number {
  return ++requestId;
}

/**
 * Creates a JSON-RPC request object.
 */
export function createRequest(method: string, params?: Record<string, unknown>): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: nextId(),
    method,
    params,
  };
}

/**
 * Sends a JSON-RPC request to a running process and waits for response.
 */
export async function sendRequest<T>(
  process: ChildProcess,
  method: string,
  params?: Record<string, unknown>,
  timeoutMs = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = createRequest(method, params);
    let responseData = '';
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Request timeout after ${timeoutMs}ms: ${method}`));
      }
    }, timeoutMs);

    const onData = (data: Buffer) => {
      responseData += data.toString();

      // Try to parse complete JSON response
      try {
        const response = JSON.parse(responseData) as JsonRpcResponse<T>;

        clearTimeout(timeout);
        resolved = true;

        if ('error' in response) {
          reject(new JsonRpcClientError(response.error));
        } else {
          resolve(response.result);
        }
      } catch {
        // Incomplete JSON, wait for more data
      }
    };

    const onError = (error: Error) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(error);
      }
    };

    process.stdout?.on('data', onData);
    process.on('error', onError);

    // Send request
    process.stdin?.write(JSON.stringify(request) + '\n');
  });
}

/**
 * Spawns a one-shot process, sends a request, and returns the response.
 */
export async function spawnAndRequest<T>(
  executable: string,
  args: string[],
  method: string,
  params?: Record<string, unknown>,
  timeoutMs = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const proc = spawn(executable, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const request = createRequest(method, params);
    let responseData = '';
    let stderrData = '';
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        reject(new Error(`Request timeout after ${timeoutMs}ms: ${method}`));
      }
    }, timeoutMs);

    proc.stdout?.on('data', (data: Buffer) => {
      responseData += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderrData += data.toString();
    });

    proc.on('close', (code) => {
      if (resolved) return;

      clearTimeout(timeout);
      resolved = true;

      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${stderrData}`));
        return;
      }

      try {
        const response = JSON.parse(responseData) as JsonRpcResponse<T>;

        if ('error' in response) {
          reject(new JsonRpcClientError(response.error));
        } else {
          resolve(response.result);
        }
      } catch (err) {
        reject(new Error(`Failed to parse response: ${responseData}`));
      }
    });

    proc.on('error', (error) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(error);
      }
    });

    // Send request and close stdin
    proc.stdin?.write(JSON.stringify(request) + '\n');
    proc.stdin?.end();
  });
}

/**
 * Custom error class for JSON-RPC errors.
 */
export class JsonRpcClientError extends Error {
  code: number;
  data?: unknown;

  constructor(error: JsonRpcError) {
    super(error.message);
    this.name = 'JsonRpcClientError';
    this.code = error.code;
    this.data = error.data;
  }
}

/**
 * Service process manager for long-running services.
 */
export class ServiceManager {
  private process: ChildProcess | null = null;
  private executable: string;
  private args: string[];

  constructor(executable: string, args: string[] = []) {
    this.executable = executable;
    this.args = args;
  }

  /**
   * Starts the service process if not already running.
   */
  async start(): Promise<void> {
    if (this.process) return;

    this.process = spawn(this.executable, this.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.on('exit', () => {
      this.process = null;
    });

    // Wait for ready signal (optional handshake)
    // For now, just give it a moment to start
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Sends a request to the running service.
   */
  async request<T>(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = 30000
  ): Promise<T> {
    if (!this.process) {
      await this.start();
    }

    if (!this.process) {
      throw new Error('Failed to start service');
    }

    return sendRequest<T>(this.process, method, params, timeoutMs);
  }

  /**
   * Stops the service process.
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
