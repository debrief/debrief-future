/**
 * IPC and JSON-RPC types for main process.
 */

/**
 * JSON-RPC 2.0 request structure.
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 success response.
 */
export interface JsonRpcSuccessResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result: T;
}

/**
 * JSON-RPC 2.0 error response.
 */
export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number;
  error: JsonRpcError;
}

/**
 * JSON-RPC 2.0 error object.
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * JSON-RPC 2.0 response (success or error).
 */
export type JsonRpcResponse<T = unknown> = JsonRpcSuccessResponse<T> | JsonRpcErrorResponse;

/**
 * Standard JSON-RPC error codes.
 */
export const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  APPLICATION_ERROR: -32000,
} as const;

/**
 * Application-specific error types.
 */
export type ApplicationErrorType =
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'PARSE_ERROR'
  | 'STORE_NOT_FOUND'
  | 'PLOT_NOT_FOUND'
  | 'WRITE_ERROR'
  | 'VALIDATION_ERROR';

/**
 * Application error data structure.
 */
export interface ApplicationErrorData {
  errorType: ApplicationErrorType;
  details: string;
  recoverable: boolean;
  suggestion?: string;
}

/**
 * Provenance metadata for tracking data lineage.
 */
export interface ProvenanceMetadata {
  sourcePath: string;
  sourceHash: string;
  parser: string;
  parserVersion: string;
  timestamp: string;
}
