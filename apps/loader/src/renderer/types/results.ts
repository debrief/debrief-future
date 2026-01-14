/**
 * Operation result types.
 */

/**
 * Error codes for categorization.
 */
export type ErrorCode =
  | 'PARSE_ERROR'
  | 'STORE_ERROR'
  | 'WRITE_ERROR'
  | 'SERVICE_ERROR'
  | 'UNKNOWN';

/**
 * Result of a successful load operation.
 */
export interface LoadResult {
  /** Target plot ID */
  plotId: string;

  /** Target plot name */
  plotName: string;

  /** Target store name */
  storeName: string;

  /** Number of features loaded */
  featuresLoaded: number;

  /** Path to the copied source file in assets */
  assetPath: string;

  /** Provenance record ID */
  provenanceId: string;
}

/**
 * Error information for display.
 */
export interface LoaderError {
  /** Error code for categorization */
  code: ErrorCode;

  /** User-friendly error message */
  message: string;

  /** Detailed technical message (for debugging) */
  details?: string;

  /** Suggested resolution steps */
  resolution?: string;

  /** Whether the operation can be retried */
  retryable: boolean;
}

/**
 * Result from debrief-io parse operation.
 */
export interface ParseResult {
  success: boolean;
  features?: GeoJSONFeature[];
  error?: {
    message: string;
    line?: number;
    column?: number;
  };
  metadata: {
    parser: string;
    version: string;
    timestamp: string;
    sourceHash: string;
  };
}

/**
 * GeoJSON Feature type (simplified).
 */
export interface GeoJSONFeature {
  type: 'Feature';
  id?: string | number;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: Record<string, unknown>;
}

/**
 * Result from debrief-stac write operations.
 */
export interface WriteResult {
  success: boolean;
  plotId?: string;
  assetPath?: string;
  provenanceId?: string;
  error?: {
    message: string;
    code: string;
  };
}
