/**
 * Tests for CSV formatting and filename sanitization utilities.
 * Feature: 177-tabular-results-panel
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  generateCsvFilename,
  formatCsvValue,
  buildCsvContent,
  parseCsvToTableDataset,
} from '../src/csv.js';

describe('sanitizeFilename', () => {
  it('passes through safe characters unchanged', () => {
    expect(sanitizeFilename('track-stats')).toBe('track-stats');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeFilename('my report')).toBe('my-report');
  });

  it('replaces special characters with hyphens', () => {
    expect(sanitizeFilename('file@name#1!')).toBe('file-name-1');
  });

  it('collapses consecutive hyphens', () => {
    expect(sanitizeFilename('a---b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(sanitizeFilename('--hello--')).toBe('hello');
  });

  it('enforces max length', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeFilename(long, 32).length).toBe(32);
  });

  it('preserves dots, hyphens, and underscores', () => {
    expect(sanitizeFilename('file_name.v2')).toBe('file_name.v2');
  });
});

describe('generateCsvFilename', () => {
  it('generates date-stamped filename for quick save', () => {
    const name = generateCsvFilename('track-stats');
    expect(name).toMatch(/^track-stats--\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
  });

  it('uses base name for Save As without tag', () => {
    expect(generateCsvFilename('track-stats', 'my-report')).toBe('my-report.csv');
  });

  it('uses base name and tag for Save As with tag', () => {
    expect(generateCsvFilename('track-stats', 'my-report', 'v2')).toBe('my-report--v2.csv');
  });

  it('sanitizes base name and tag', () => {
    expect(generateCsvFilename('track-stats', 'my report!', 'final draft'))
      .toBe('my-report--final-draft.csv');
  });
});

describe('formatCsvValue', () => {
  it('formats null as empty string', () => {
    expect(formatCsvValue(null)).toBe('');
  });

  it('formats undefined as empty string', () => {
    expect(formatCsvValue(undefined)).toBe('');
  });

  it('formats numbers with 4 significant figures', () => {
    expect(formatCsvValue(3.14159)).toBe('3.142');
  });

  it('formats small integers correctly', () => {
    expect(formatCsvValue(42)).toBe('42');
  });

  it('formats large numbers with 4 sig figs', () => {
    expect(formatCsvValue(123456)).toBe('123500');
  });

  it('handles NaN', () => {
    expect(formatCsvValue(NaN)).toBe('NaN');
  });

  it('handles Infinity', () => {
    expect(formatCsvValue(Infinity)).toBe('Infinity');
  });

  it('quotes strings containing commas', () => {
    expect(formatCsvValue('a,b')).toBe('"a,b"');
  });

  it('quotes strings containing quotes and escapes them', () => {
    expect(formatCsvValue('say "hi"')).toBe('"say ""hi"""');
  });

  it('passes plain strings through', () => {
    expect(formatCsvValue('hello')).toBe('hello');
  });

  it('formats Date as ISO 8601', () => {
    const d = new Date('2024-06-15T10:30:00Z');
    expect(formatCsvValue(d)).toBe('2024-06-15T10:30:00.000Z');
  });
});

describe('buildCsvContent', () => {
  it('returns empty string for empty data', () => {
    expect(buildCsvContent([])).toBe('');
  });

  it('builds CSV with headers from data keys', () => {
    const data = [
      { metric: 'speed', value: 12.34 },
      { metric: 'bearing', value: 45.67 },
    ];
    const csv = buildCsvContent(data);
    expect(csv).toBe('metric,value\nspeed,12.34\nbearing,45.67\n');
  });

  it('uses provided headers', () => {
    const data = [{ a: 1, b: 2, c: 3 }];
    const csv = buildCsvContent(data, ['c', 'a']);
    expect(csv).toBe('c,a\n3,1\n');
  });

  it('uses Unix line endings', () => {
    const csv = buildCsvContent([{ x: 1 }]);
    expect(csv).not.toContain('\r');
    expect(csv.endsWith('\n')).toBe(true);
  });
});

describe('parseCsvToTableDataset', () => {
  it('throws on empty input', () => {
    expect(() => parseCsvToTableDataset('', 'Test')).toThrow();
    expect(() => parseCsvToTableDataset('   ', 'Test')).toThrow();
  });

  it('parses a header-only CSV into an empty-data envelope', () => {
    const envelope = parseCsvToTableDataset('metric,value\n', 'Empty');
    expect(envelope.title).toBe('Empty');
    expect(envelope.displayHint).toBe('table');
    expect(envelope.data).toEqual([]);
    expect(envelope.metadata.xAxis.label).toBe('metric');
  });

  it('coerces numeric strings to numbers', () => {
    const envelope = parseCsvToTableDataset(
      'metric,value\nspeed,12.34\nbearing,45.67\n',
      'Stats',
    );
    expect(envelope.data).toEqual([
      { metric: 'speed', value: 12.34 },
      { metric: 'bearing', value: 45.67 },
    ]);
  });

  it('preserves string values that are not numeric', () => {
    const envelope = parseCsvToTableDataset(
      'name,value\nAlpha,fast\nBravo,slow\n',
      'Names',
    );
    expect(envelope.data).toEqual([
      { name: 'Alpha', value: 'fast' },
      { name: 'Bravo', value: 'slow' },
    ]);
  });

  it('handles quoted strings containing commas', () => {
    const envelope = parseCsvToTableDataset(
      'name,notes\nAlpha,"a, b, c"\nBravo,plain\n',
      'Notes',
    );
    expect(envelope.data).toEqual([
      { name: 'Alpha', notes: 'a, b, c' },
      { name: 'Bravo', notes: 'plain' },
    ]);
  });

  it('handles escaped double quotes', () => {
    const envelope = parseCsvToTableDataset(
      'name,saying\nAlpha,"say ""hi"""\n',
      'Sayings',
    );
    expect(envelope.data).toEqual([
      { name: 'Alpha', saying: 'say "hi"' },
    ]);
  });

  it('handles embedded newlines inside quoted fields', () => {
    const csv = 'name,desc\nAlpha,"line1\nline2"\n';
    const envelope = parseCsvToTableDataset(csv, 'NL');
    expect(envelope.data).toEqual([
      { name: 'Alpha', desc: 'line1\nline2' },
    ]);
  });

  it('round-trips buildCsvContent output', () => {
    const original: Record<string, unknown>[] = [
      { metric: 'speed', value: 12.34 },
      { metric: 'bearing', value: 45.67 },
    ];
    const csv = buildCsvContent(original);
    const envelope = parseCsvToTableDataset(csv, 'Round');
    expect(envelope.data).toEqual(original);
  });

  it('throws on malformed input (unterminated quote)', () => {
    expect(() =>
      parseCsvToTableDataset('name,value\n"Alpha,fast\n', 'Bad'),
    ).toThrow();
  });
});
