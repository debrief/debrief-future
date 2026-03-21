/**
 * Import Error Types - Error classes for REP file import operations
 */
import type { SafeFeature } from '@debrief/utils';

/**
 * Error thrown when a file has already been imported to the same STAC item
 */
export class DuplicateImportError extends Error {
  constructor(
    public filename: string,
    public plotId: string,
    public existingAssetKey: string
  ) {
    super(`File "${filename}" already imported to plot "${plotId}"`);
    this.name = 'DuplicateImportError';
  }
}

/**
 * Error thrown when REP file parsing fails
 */
export class RepParseError extends Error {
  public filePath: string;
  public lineNumber?: number;
  public field?: string;
  public code?: string;

  constructor(
    filePath: string,
    lineNumber?: number,
    field?: string,
    code?: string
  ) {
    super(`Failed to parse REP file: ${filePath}`);
    this.name = 'RepParseError';
    this.filePath = filePath;
    this.lineNumber = lineNumber;
    this.field = field;
    this.code = code;
  }
}

/**
 * Error thrown when STAC storage operations fail
 */
export class StacStorageError extends Error {
  public operation: 'addAsset' | 'addFeatures';
  public catalogPath: string;
  public plotId: string;
  public override cause?: Error;

  constructor(
    operation: 'addAsset' | 'addFeatures',
    catalogPath: string,
    plotId: string,
    cause?: Error
  ) {
    super(`STAC ${operation} failed for plot "${plotId}"`);
    this.name = 'StacStorageError';
    this.operation = operation;
    this.catalogPath = catalogPath;
    this.plotId = plotId;
    this.cause = cause;
  }
}

/**
 * Parse result from IoService
 */
export interface ParseResult {
  features: SafeFeature[];
  warnings: ParseWarning[];
  sourceFile: string;
  encoding: string;
  parseTimeMs: number;
}

/**
 * Warning from parsing (non-fatal issues)
 */
export interface ParseWarning {
  message: string;
  lineNumber?: number;
  field?: string;
  code: string;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: SafeFeature[];
}

// Re-exported alias so existing importers can continue to use GeoJSONFeature
export type { SafeFeature as GeoJSONFeature } from '@debrief/utils';
