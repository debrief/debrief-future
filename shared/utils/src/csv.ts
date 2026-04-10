/**
 * CSV formatting and filename sanitization utilities.
 * Feature: 177-tabular-results-panel, 178-vscode-tabular-results (round-trip parser)
 */

import type { DatasetEnvelope } from './types.js';

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

/**
 * Tokenise a full CSV string into rows of string fields.  Handles quoted
 * fields with embedded newlines and escaped double quotes.
 *
 * Internal helper for `parseCsvToTableDataset`.
 */
function tokeniseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }

    if (ch === '\n' || ch === '\r') {
      // End of row — ignore \r (CRLF support), flush on \n
      if (ch === '\r' && csv[i + 1] === '\n') {
        i += 2;
      } else {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += ch;
    i++;
  }

  // Flush trailing field/row if the file did not end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (inQuotes) {
    throw new Error('Malformed CSV: unterminated quoted field');
  }

  // Drop purely empty trailing rows (e.g. caused by a final \n).
  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last && last.length === 1 && last[0] === '') {
      rows.pop();
      continue;
    }
    break;
  }

  return rows;
}

/**
 * Inverse of `buildCsvContent` — parse a CSV string into a flat-table
 * `DatasetEnvelope` suitable for display in the Results panel.
 *
 * The resulting envelope uses `displayHint: 'table'` and carries one
 * record per data row.  Numeric-looking values are coerced to `number`;
 * everything else is retained as a string.
 *
 * Feature: 178-vscode-tabular-results (R3)
 *
 * @throws Error if the CSV is malformed (unterminated quotes) or empty.
 */
export function parseCsvToTableDataset(
  csv: string,
  title: string,
): DatasetEnvelope {
  if (csv.trim().length === 0) {
    throw new Error('Cannot parse empty CSV');
  }

  const rows = tokeniseCsv(csv);
  if (rows.length === 0) {
    throw new Error('Cannot parse empty CSV');
  }

  const header = rows[0];
  if (!header || header.length === 0) {
    throw new Error('Cannot parse CSV without a header row');
  }

  const data: Record<string, unknown>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const rowValues = rows[r];
    if (!rowValues) continue;
    const record: Record<string, unknown> = {};
    for (let c = 0; c < header.length; c++) {
      const key = header[c] ?? '';
      const raw = rowValues[c] ?? '';

      if (raw === '') {
        record[key] = '';
        continue;
      }

      // Try to coerce to a number if the field looks numeric.
      // Preserves locale-independent decimal (.) from buildCsvContent.
      const asNumber = Number(raw);
      if (!Number.isNaN(asNumber) && /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(raw)) {
        record[key] = asNumber;
      } else {
        record[key] = raw;
      }
    }
    data.push(record);
  }

  return {
    type: 'csv_table',
    title,
    displayHint: 'table',
    metadata: {
      xAxis: { label: header[0] ?? 'Column', type: 'nominal' },
      yAxis: { label: 'Value', type: 'quantitative' },
    },
    data,
  };
}
