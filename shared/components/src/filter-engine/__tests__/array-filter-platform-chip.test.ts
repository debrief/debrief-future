/**
 * FilterBar-emitted array_filter CQL2 round-trip (#186).
 * Covers U31–U35 from contracts/test-list.md and the emission contract in
 * contracts/cql2-roundtrip.md.
 */

import { describe, expect, it } from 'vitest';
import {
  filterExpressionToCql2Json,
  cql2JsonToArrayFilters,
  arrayFilterToPlatformAttributes,
} from '../cql2-json';
import type { FilterExpression } from '../types';

describe('platform-chip CQL2 emission (#186)', () => {
  // U31
  it('U31: filterExpressionToCql2Json emits exactly one array_filter with documented shape', () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: 'platforms',
          predicate: {
            kind: 'and',
            children: [
              { kind: 'comparison', field: 'nationality', value: 'GB' },
              { kind: 'comparison', field: 'domain', value: 'subsurface' },
            ],
          },
          negated: false,
        },
      ],
    };
    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: 'array_filter',
      args: [
        { property: 'debrief:platforms' },
        {
          op: 'and',
          args: [
            { op: '=', args: [{ property: 'nationality' }, 'GB'] },
            { op: '=', args: [{ property: 'domain' }, 'subsurface'] },
          ],
        },
      ],
    });
  });

  it('single attribute collapses to bare comparison', () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: 'platforms',
          predicate: { kind: 'comparison', field: 'nationality', value: 'GB' },
          negated: false,
        },
      ],
    };
    const cql2 = filterExpressionToCql2Json(expr);
    expect(cql2).toEqual({
      op: 'array_filter',
      args: [
        { property: 'debrief:platforms' },
        { op: '=', args: [{ property: 'nationality' }, 'GB'] },
      ],
    });
  });

  it('negation wraps the array_filter in a NOT', () => {
    const expr: FilterExpression = {
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: 'platforms',
          predicate: { kind: 'comparison', field: 'nationality', value: 'GB' },
          negated: true,
        },
      ],
    };
    const cql2 = filterExpressionToCql2Json(expr);
    expect((cql2 as { op: string }).op).toBe('not');
  });
});

describe('platform-chip CQL2 round-trip / restore (#186)', () => {
  // U32
  it('U32: deserialise a FilterBar-emitted CQL2 → reconstructs the same platform attributes', () => {
    const cql2 = filterExpressionToCql2Json({
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: 'platforms',
          predicate: {
            kind: 'and',
            children: [
              { kind: 'comparison', field: 'nationality', value: 'GB' },
              { kind: 'comparison', field: 'domain', value: 'subsurface' },
            ],
          },
          negated: false,
        },
      ],
    });
    const afs = cql2JsonToArrayFilters(cql2);
    expect(afs).toHaveLength(1);
    const reconstructed = arrayFilterToPlatformAttributes(afs[0]!);
    expect(reconstructed).not.toBeNull();
    expect(reconstructed!.attributes).toEqual({
      nationality: 'GB',
      domain: 'subsurface',
    });
    expect(reconstructed!.negated).toBe(false);
  });

  // U33
  it('U33: array_filter with OR sub-predicate → reconstruction declines (returns null)', () => {
    const afs = cql2JsonToArrayFilters({
      op: 'array_filter',
      args: [
        { property: 'debrief:platforms' },
        {
          op: 'or',
          args: [
            { op: '=', args: [{ property: 'nationality' }, 'GB'] },
            { op: '=', args: [{ property: 'nationality' }, 'US'] },
          ],
        },
      ],
    });
    expect(afs).toHaveLength(1);
    const reconstructed = arrayFilterToPlatformAttributes(afs[0]!);
    expect(reconstructed).toBeNull();
  });

  // U34
  it('U34: array_filter with unknown field → reconstruction declines', () => {
    // Note: cql2JsonToArrayFilters will parse whatever property path appears,
    // but arrayFilterToPlatformAttributes rejects fields outside PlatformField.
    const afs = cql2JsonToArrayFilters({
      op: 'array_filter',
      args: [
        { property: 'debrief:platforms' },
        { op: '=', args: [{ property: 'unknown_field' }, 'X'] },
      ],
    });
    const reconstructed = arrayFilterToPlatformAttributes(afs[0]!);
    expect(reconstructed).toBeNull();
  });

  // U35
  it('U35: deserialise negation wrapper around array_filter → platform lozenge with negated:true', () => {
    const cql2 = filterExpressionToCql2Json({
      predicates: [],
      orGroups: [],
      arrayFilters: [
        {
          array: 'platforms',
          predicate: { kind: 'comparison', field: 'nationality', value: 'GB' },
          negated: true,
        },
      ],
    });
    const afs = cql2JsonToArrayFilters(cql2);
    expect(afs).toHaveLength(1);
    expect(afs[0]!.negated).toBe(true);
    const reconstructed = arrayFilterToPlatformAttributes(afs[0]!);
    expect(reconstructed).not.toBeNull();
    expect(reconstructed!.negated).toBe(true);
    expect(reconstructed!.attributes).toEqual({ nationality: 'GB' });
  });
});
