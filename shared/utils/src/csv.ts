/**
 * CSV formatting and filename sanitization utilities.
 * Feature: 177-tabular-results-panel
 */

/**
 * Sanitize a string for use as a filename component.
 * Replaces non-alphanumeric characters (except `.`, `-`, `_`) with hyphens,
 * collapses consecutive hyphens, and trims leading/trailing hyphens.
 */
export function sanitizeFilename(input: string, maxLength = 64): string {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

/**
 * Generate a CSV filename from tool name, optional base name, and optional tag.
 *
 * Formats:
 * - Quick save: `{toolName}--{ISO-date}.csv`
 * - Save As (no tag): `{baseName}.csv`
 * - Save As (with tag): `{baseName}--{tag}.csv`
 */
export function generateCsvFilename(
  toolName: string,
  baseName?: string,
  tag?: string,
): string {
  if (baseName) {
    const safeName = sanitizeFilename(baseName, 64);
    if (tag) {
      const safeTag = sanitizeFilename(tag, 32);
      return `${safeName}--${safeTag}.csv`;
    }
    return `${safeName}.csv`;
  }
  const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeTool = sanitizeFilename(toolName, 32);
  return `${safeTool}--${dateStamp}.csv`;
}

/**
 * Format a value for CSV output.
 * - Numbers: 4 significant figures, locale-independent decimal (.)
 * - Dates: ISO 8601 UTC
 * - Strings: quoted if they contain commas, quotes, or newlines
 * - null/undefined: empty string
 */
export function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    return Number(value.toPrecision(4)).toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build CSV content from an array of records.
 * Uses Unix line endings (\n) and UTF-8 encoding.
 * Column names are derived dynamically from the data keys.
 */
export function buildCsvContent(
  data: Record<string, unknown>[],
  headers?: string[],
): string {
  if (data.length === 0) return '';

  const firstRow = data[0];
  if (!firstRow) return '';
  const cols = headers ?? Object.keys(firstRow);
  const headerLine = cols.join(',');
  const rows = data.map(row =>
    cols.map(col => formatCsvValue(row[col])).join(','),
  );

  return [headerLine, ...rows].join('\n') + '\n';
}
