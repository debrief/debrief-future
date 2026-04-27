/**
 * Unit tests for the a11y violation categoriser (Feature 234, US3 — T4A).
 * Pure-function tests; no filesystem, no axe-core dependency.
 */

import { describe, expect, it } from 'vitest';
import {
  categoriseAxeViolations,
  writeWarnRows,
  type AxeViolationLike,
  type ReportRow,
} from '../a11yCategoriser';

function v(
  impact: AxeViolationLike['impact'],
  extras: Partial<AxeViolationLike> = {},
): AxeViolationLike {
  return { impact, id: `rule-${impact ?? 'null'}`, ...extras };
}

describe('categoriseAxeViolations', () => {
  it('routes serious → fail', () => {
    const out = categoriseAxeViolations([v('serious')]);
    expect(out.fail.length).toBe(1);
    expect(out.warn.length).toBe(0);
    expect(out.ignore.length).toBe(0);
  });

  it('routes critical → fail', () => {
    const out = categoriseAxeViolations([v('critical')]);
    expect(out.fail.length).toBe(1);
  });

  it('routes moderate → warn', () => {
    const out = categoriseAxeViolations([v('moderate')]);
    expect(out.warn.length).toBe(1);
    expect(out.fail.length).toBe(0);
  });

  it('routes minor → ignore', () => {
    const out = categoriseAxeViolations([v('minor')]);
    expect(out.ignore.length).toBe(1);
    expect(out.warn.length).toBe(0);
    expect(out.fail.length).toBe(0);
  });

  it('routes null/undefined impact → ignore (defensive default)', () => {
    const out = categoriseAxeViolations([v(null), v(undefined)]);
    expect(out.ignore.length).toBe(2);
    expect(out.fail.length).toBe(0);
  });

  it('partitions a mixed input correctly', () => {
    const out = categoriseAxeViolations([
      v('serious', { id: 'r1' }),
      v('moderate', { id: 'r2' }),
      v('critical', { id: 'r3' }),
      v('minor', { id: 'r4' }),
      v('moderate', { id: 'r5' }),
    ]);
    expect(out.fail.map((x) => x.id)).toEqual(['r1', 'r3']);
    expect(out.warn.map((x) => x.id)).toEqual(['r2', 'r5']);
    expect(out.ignore.map((x) => x.id)).toEqual(['r4']);
  });
});

describe('writeWarnRows', () => {
  it('writes one row per moderate violation via the injected writer', () => {
    const rows: ReportRow[] = [];
    writeWarnRows(
      { surface: 'harness:overflow-menu', theme: 'vscode' },
      [
        v('moderate', { id: 'r-color', help: 'Improve contrast', helpUrl: 'https://x' }),
        v('moderate', { id: 'r-label', help: 'Add label', helpUrl: 'https://y' }),
      ],
      (row) => rows.push(row),
    );
    expect(rows).toEqual([
      {
        surface: 'harness:overflow-menu',
        theme: 'vscode',
        ruleId: 'r-color',
        impact: 'moderate',
        help: 'Improve contrast',
        helpUrl: 'https://x',
      },
      {
        surface: 'harness:overflow-menu',
        theme: 'vscode',
        ruleId: 'r-label',
        impact: 'moderate',
        help: 'Add label',
        helpUrl: 'https://y',
      },
    ]);
  });

  it('falls back to "<unknown>" when ruleId is missing', () => {
    const rows: ReportRow[] = [];
    writeWarnRows(
      { surface: 'story:with-edit-form', theme: 'light' },
      [{ impact: 'moderate' }],
      (row) => rows.push(row),
    );
    expect(rows.length).toBe(1);
    expect(rows[0].ruleId).toBe('<unknown>');
  });
});
