/**
 * Error Message Templates - Consistent, user-friendly error messages for import operations
 *
 * All error messages follow these principles:
 * - State what happened
 * - Explain why (if known)
 * - Suggest what to do next
 */

export type ErrorCode =
  | 'INVALID_FORMAT'
  | 'PARSE_FAILED'
  | 'STORAGE_ERROR'
  | 'FILE_NOT_FOUND'
  | 'DUPLICATE_IMPORT'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN';

export interface ErrorContext {
  filePath?: string;
  fileName?: string;
  lineNumber?: number;
  field?: string;
  itemPath?: string;
  cause?: string;
}

/**
 * Format error message with context
 */
export function formatErrorMessage(
  code: ErrorCode,
  context: ErrorContext = {}
): string {
  const fileName = context.fileName ?? context.filePath?.split('/').pop() ?? 'file';

  switch (code) {
    case 'INVALID_FORMAT':
      return formatInvalidFormat(fileName, context);

    case 'PARSE_FAILED':
      return formatParseFailed(fileName, context);

    case 'STORAGE_ERROR':
      return formatStorageError(fileName, context);

    case 'FILE_NOT_FOUND':
      return formatFileNotFound(context.filePath ?? fileName);

    case 'DUPLICATE_IMPORT':
      return formatDuplicateImport(fileName, context.itemPath);

    case 'SERVICE_UNAVAILABLE':
      return formatServiceUnavailable();

    default:
      return `Import failed: ${context.cause ?? 'Unknown error'}`;
  }
}

function formatInvalidFormat(
  fileName: string,
  context: ErrorContext
): string {
  let message = `Invalid REP format in "${fileName}"`;

  if (context.lineNumber !== undefined) {
    message += ` at line ${context.lineNumber}`;
  }

  if (context.field) {
    message += ` (field: ${context.field})`;
  }

  message += '. Check file format and try again.';
  return message;
}

function formatParseFailed(
  fileName: string,
  context: ErrorContext
): string {
  let message = `Failed to parse "${fileName}"`;

  if (context.lineNumber !== undefined) {
    message += ` at line ${context.lineNumber}`;
  }

  if (context.cause) {
    message += `: ${context.cause}`;
  }

  return message;
}

function formatStorageError(
  fileName: string,
  context: ErrorContext
): string {
  let message = `Failed to store "${fileName}"`;

  if (context.itemPath) {
    message += ` to plot "${context.itemPath}"`;
  }

  message += '. Check disk space and folder permissions.';
  return message;
}

function formatFileNotFound(filePath: string): string {
  return `File not found: "${filePath}". The file may have been moved or deleted.`;
}

function formatDuplicateImport(
  fileName: string,
  itemPath?: string
): string {
  let message = `"${fileName}" has already been imported`;

  if (itemPath) {
    message += ` to this plot`;
  }

  return message;
}

function formatServiceUnavailable(): string {
  return 'REP parsing service unavailable. Ensure debrief-io Python package is installed.';
}

/**
 * User-friendly messages for common scenarios
 */
export const ImportMessages = {
  // Success messages
  importSuccess: (featureCount: number, fileName: string) =>
    `Imported ${featureCount} feature${featureCount !== 1 ? 's' : ''} from ${fileName}`,

  // Warning messages
  noFeatures: (fileName: string) =>
    `No features found in ${fileName}`,

  parseWarnings: (count: number, preview: string) =>
    `Parsed with ${count} warning${count !== 1 ? 's' : ''}: ${preview}`,

  duplicateFound: (fileName: string) =>
    `File "${fileName}" has already been imported to this plot.`,

  // Progress messages
  checkingDuplicates: 'Checking for duplicates...',
  parsingFile: 'Parsing REP file...',
  storingAsset: 'Storing asset...',
  storingFeatures: 'Storing features...',

  // Validation messages
  onlyRepFiles: 'Only .rep files can be imported.',
  singleFileOnly: 'Only single file import is supported. Please drop one file at a time.',
  noStoresAvailable: 'No STAC stores available. Add a store first.',
  noPlotsAvailable: 'No plots found. Create a plot first.',
} as const;
