/**
 * Platform-chip tests for `useFilterBar` (#186).
 *
 * Covers U1–U13 from `specs/186-filter-chips/contracts/test-list.md` plus the
 * integration-level U36–U41 expectations that need the reducer + engine
 * together.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterBar, toFilterExpression } from '../useFilterBar';
import type { FilterBarState, PlatformAttributes } from '../types';
import { createFilterEngine } from '../../filter-engine';
import type {
  CompoundPredicate,
  StacBrowserItem,
  VesselTaxonomyNode,
} from '../../filter-engine';
import type { PlatformRecord } from '@debrief/schemas';

const TAXONOMY: readonly VesselTaxonomyNode[] = [
  {
    id: 'surface',
    label: 'Surface',
    children: [
      {
        id: 'warship',
        label: 'Warship',
        children: [
          {
            id: 'frigate',
            label: 'Frigate',
            children: [
              { id: 'type23', label: 'Type 23' },
              { id: 'type26', label: 'Type 26' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'subsurface',
    label: 'Subsurface',
    children: [{ id: 'submarine', label: 'Submarine' }],
  },
];

function makeItem(id: string, platforms: PlatformRecord[]): StacBrowserItem {
  return {
    id,
    title: id,
    itemPath: `/${id}.json`,
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    platforms,
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
  };
}

describe('platform lozenge reducer (#186)', () => {
  // U1
  it('U1: ADD_PLATFORM_LOZENGE appends a shape:platform lozenge with correct attributes', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() => result.current.addPlatformLozenge({ nationality: 'GB' }));

    expect(result.current.state.items).toHaveLength(1);
    const item = result.current.state.items[0]!;
    expect(item.kind).toBe('lozenge');
    if (item.kind === 'lozenge') {
      expect(item.shape).toBe('platform');
      expect(item.filterType).toBe('platform');
      if (item.shape === 'platform') {
        expect(item.attributes).toEqual({ nationality: 'GB' });
      }
    }
  });

  // U2
  it('U2: addPlatformLozenge rejects empty attributes (no-op)', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() => result.current.addPlatformLozenge({}));
    expect(result.current.state.items).toHaveLength(0);
    act(() => result.current.addPlatformLozenge({ nationality: '   ' }));
    expect(result.current.state.items).toHaveLength(0);
  });

  // U3
  it('U3: EDIT_PLATFORM_LOZENGE replaces attributes without changing id or position', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() => result.current.addPlatformLozenge({ nationality: 'GB' }));
    act(() => result.current.addLozenge('tag', 'convoy'));

    const original = result.current.state.items[0]!;
    const originalId = original.id;
    expect(original.kind).toBe('lozenge');

    act(() =>
      result.current.editPlatformLozenge(originalId, {
        nationality: 'US',
        vessel_role: 'frigate',
      }),
    );

    expect(result.current.state.items).toHaveLength(2);
    const updated = result.current.state.items[0]!;
    expect(updated.id).toBe(originalId);
    if (updated.kind === 'lozenge' && updated.shape === 'platform') {
      expect(updated.attributes).toEqual({ nationality: 'US', vessel_role: 'frigate' });
    }
  });

  // U4
  it('U4: TOGGLE_NEGATE on a platform lozenge flips negated without mutating attributes', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() =>
      result.current.addPlatformLozenge({ nationality: 'GB', domain: 'subsurface' }),
    );
    const id = result.current.state.items[0]!.id;

    act(() => result.current.toggleNegate(id));
    const negated = result.current.state.items[0]!;
    if (negated.kind === 'lozenge' && negated.shape === 'platform') {
      expect(negated.negated).toBe(true);
      expect(negated.attributes).toEqual({ nationality: 'GB', domain: 'subsurface' });
    }

    act(() => result.current.toggleNegate(id));
    const unnegated = result.current.state.items[0]!;
    if (unnegated.kind === 'lozenge' && unnegated.shape === 'platform') {
      expect(unnegated.negated).toBe(false);
    }
  });

  // U5
  it('U5: REMOVE_LOZENGE removes a platform lozenge by id', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() => result.current.addPlatformLozenge({ nationality: 'GB' }));
    const id = result.current.state.items[0]!.id;

    act(() => result.current.removeLozenge(id));
    expect(result.current.state.items).toHaveLength(0);
  });

  // U6
  it('U6: ADD_CHILD_PLATFORM_LOZENGE appends a platform lozenge inside an OR container', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() => result.current.addOrContainer());
    const containerId = result.current.state.items[0]!.id;

    act(() =>
      result.current.addChildPlatformLozenge(containerId, {
        nationality: 'GB',
        domain: 'subsurface',
      }),
    );

    const container = result.current.state.items[0]!;
    expect(container.kind).toBe('or-container');
    if (container.kind === 'or-container') {
      expect(container.children).toHaveLength(1);
      const child = container.children[0]!;
      expect(child.shape).toBe('platform');
      if (child.shape === 'platform') {
        expect(child.attributes).toEqual({ nationality: 'GB', domain: 'subsurface' });
      }
    }
  });

  // U7
  it('U7: MOVE_TO_CONTAINER moves a platform lozenge from top level into an OR container', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() => {
      result.current.addPlatformLozenge({ nationality: 'GB' });
      result.current.addOrContainer();
    });
    const lozengeId = result.current.state.items[0]!.id;
    const containerId = result.current.state.items[1]!.id;

    act(() => result.current.moveToContainer(lozengeId, containerId));

    expect(result.current.state.items).toHaveLength(1);
    const container = result.current.state.items[0]!;
    if (container.kind === 'or-container') {
      expect(container.children).toHaveLength(1);
      const child = container.children[0]!;
      expect(child.shape).toBe('platform');
    }
  });

  // U8
  it('U8: MOVE_TO_TOP_LEVEL moves a platform lozenge out of an OR container', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() => result.current.addOrContainer());
    const containerId = result.current.state.items[0]!.id;
    act(() =>
      result.current.addChildPlatformLozenge(containerId, { nationality: 'GB' }),
    );

    const container = result.current.state.items[0]!;
    if (container.kind === 'or-container') {
      const childId = container.children[0]!.id;
      act(() => result.current.moveToTopLevel(childId, containerId));

      expect(result.current.state.items).toHaveLength(2);
      const moved = result.current.state.items[1]!;
      expect(moved.kind).toBe('lozenge');
      if (moved.kind === 'lozenge') {
        expect(moved.shape).toBe('platform');
      }
    }
  });

  // U13
  it('U13: SET_STATE of a pre-feature saved filter coerces lozenges to shape:simple', () => {
    const { result } = renderHook(() => useFilterBar());
    // Legacy state without `shape` field
    const legacy = {
      items: [
        // Cast through unknown to emulate legacy JSON
        {
          kind: 'lozenge',
          id: 'legacy-1',
          filterType: 'nationality',
          value: 'GB',
        },
      ],
    } as unknown as FilterBarState;

    act(() => result.current.setState(legacy));
    const item = result.current.state.items[0]!;
    expect(item.kind).toBe('lozenge');
    if (item.kind === 'lozenge') {
      expect(item.shape).toBe('simple');
      if (item.shape === 'simple') {
        expect(item.value).toBe('GB');
      }
    }
  });
});

describe('toFilterExpression with platform lozenges (#186)', () => {
  // U9
  it('U9: single-attribute platform lozenge → one ArrayFilterPredicate with bare comparison', () => {
    const state: FilterBarState = {
      items: [
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'p1',
          filterType: 'platform',
          attributes: { nationality: 'GB' },
        },
      ],
    };
    const expr = toFilterExpression(state);
    expect(expr.predicates).toEqual([]);
    expect(expr.arrayFilters).toBeDefined();
    expect(expr.arrayFilters).toHaveLength(1);
    const af = expr.arrayFilters![0]!;
    expect(af.array).toBe('platforms');
    expect(af.predicate).toEqual({
      kind: 'comparison',
      field: 'nationality',
      value: 'GB',
    });
  });

  // U10
  it('U10: two-attribute platform lozenge → ArrayFilterPredicate with AND of two comparisons', () => {
    const state: FilterBarState = {
      items: [
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'p1',
          filterType: 'platform',
          attributes: { nationality: 'GB', domain: 'subsurface' },
        },
      ],
    };
    const expr = toFilterExpression(state);
    const af = expr.arrayFilters![0]!;
    expect(af.predicate.kind).toBe('and');
    if (af.predicate.kind === 'and') {
      expect(af.predicate.children).toHaveLength(2);
      const fields = af.predicate.children
        .map((c): string | undefined => (c.kind === 'comparison' ? c.field : undefined))
        .filter((x): x is string => x !== undefined)
        .sort();
      expect(fields).toEqual(['domain', 'nationality']);
    }
  });

  // U11
  it('U11: preserves negated from the lozenge to the ArrayFilterPredicate', () => {
    const state: FilterBarState = {
      items: [
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'p1',
          filterType: 'platform',
          attributes: { nationality: 'GB' },
          negated: true,
        },
      ],
    };
    const expr = toFilterExpression(state);
    expect(expr.arrayFilters![0]!.negated).toBe(true);
  });

  // U12
  it('U12: platform lozenges inside an OR container produce a single combined OR array_filter', () => {
    const state: FilterBarState = {
      items: [
        {
          kind: 'or-container',
          id: 'or1',
          children: [
            {
              kind: 'lozenge',
              shape: 'platform',
              id: 'p1',
              filterType: 'platform',
              attributes: { nationality: 'GB', domain: 'subsurface' },
            },
            {
              kind: 'lozenge',
              shape: 'platform',
              id: 'p2',
              filterType: 'platform',
              attributes: { nationality: 'DE', vessel_role: 'frigate' },
            },
          ],
        },
      ],
    };
    const expr = toFilterExpression(state);
    expect(expr.arrayFilters).toHaveLength(1);
    const af = expr.arrayFilters![0]!;
    expect(af.predicate.kind).toBe('or');
    if (af.predicate.kind === 'or') {
      expect(af.predicate.children).toHaveLength(2);
    }
  });
});

describe('platform chip evaluation — integration with filter engine (#186)', () => {
  const makeEngine = () => createFilterEngine({ taxonomy: TAXONOMY });

  const itemBritishFrigate = makeItem('a', [
    {
      id: 'p1',
      name: 'HMS Argyll',
      nationality: 'GB',
      vessel_class: 'surface/warship/frigate/type23',
      vessel_role: 'frigate',
      domain: 'surface',
    },
  ]);
  const itemBritishSubmarine = makeItem('b', [
    {
      id: 'p2',
      name: 'HMS Astute',
      nationality: 'GB',
      vessel_class: 'subsurface/submarine',
      vessel_role: 'submarine',
      domain: 'subsurface',
    },
  ]);
  const itemGermanFrigateAndBritishShip = makeItem('c', [
    {
      id: 'p3',
      name: 'FGS Sachsen',
      nationality: 'DE',
      vessel_class: 'surface/warship/frigate/type26',
      vessel_role: 'frigate',
      domain: 'surface',
    },
    {
      id: 'p4',
      name: 'HMS Diamond',
      nationality: 'GB',
      vessel_class: 'surface/warship/destroyer/type45',
      vessel_role: 'destroyer',
      domain: 'surface',
    },
  ]);
  const itemEmptyPlatforms = makeItem('d', []);
  const allItems = [
    itemBritishFrigate,
    itemBritishSubmarine,
    itemGermanFrigateAndBritishShip,
    itemEmptyPlatforms,
  ];

  const platformLozengeState = (attrs: PlatformAttributes, negated = false): FilterBarState => ({
    items: [
      {
        kind: 'lozenge',
        shape: 'platform',
        id: 'p',
        filterType: 'platform',
        attributes: attrs,
        ...(negated ? { negated: true } : {}),
      },
    ],
  });

  // U36 + U37 (same-platform matching precision)
  it('U36/U37: {nationality:GB, domain:subsurface} matches only items with same-platform match', () => {
    const engine = makeEngine();
    const expr = toFilterExpression(
      platformLozengeState({ nationality: 'GB', domain: 'subsurface' }),
    );
    const result = engine.filter(allItems, expr);
    const ids = result.map((i) => i.id).sort();
    expect(ids).toEqual(['b']);
  });

  it('U36: item with GB surface AND DE subsurface does NOT match {GB, subsurface}', () => {
    const mixedItem = makeItem('mixed', [
      { id: 'x', name: 'x', nationality: 'GB', domain: 'surface' },
      { id: 'y', name: 'y', nationality: 'DE', domain: 'subsurface' },
    ]);
    const engine = makeEngine();
    const expr = toFilterExpression(
      platformLozengeState({ nationality: 'GB', domain: 'subsurface' }),
    );
    const result = engine.filter([mixedItem], expr);
    expect(result).toHaveLength(0);
  });

  // U38 (two top-level AND)
  it('U38: two top-level platform chips AND together — only items matching both', () => {
    const engine = makeEngine();
    const state: FilterBarState = {
      items: [
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'p1',
          filterType: 'platform',
          attributes: { nationality: 'GB' },
        },
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'p2',
          filterType: 'platform',
          attributes: { nationality: 'DE', vessel_role: 'frigate' },
        },
      ],
    };
    const expr = toFilterExpression(state);
    const result = engine.filter(allItems, expr);
    // Only itemGermanFrigateAndBritishShip has both GB platform AND DE frigate
    expect(result.map((i) => i.id)).toEqual(['c']);
  });

  // U39 (OR container)
  it('U39: two platform chips inside an OR container — items matching either', () => {
    const engine = makeEngine();
    const state: FilterBarState = {
      items: [
        {
          kind: 'or-container',
          id: 'or1',
          children: [
            {
              kind: 'lozenge',
              shape: 'platform',
              id: 'p1',
              filterType: 'platform',
              attributes: { nationality: 'GB', domain: 'subsurface' },
            },
            {
              kind: 'lozenge',
              shape: 'platform',
              id: 'p2',
              filterType: 'platform',
              attributes: { nationality: 'DE', vessel_role: 'frigate' },
            },
          ],
        },
      ],
    };
    const expr = toFilterExpression(state);
    const result = engine.filter(allItems, expr);
    const ids = result.map((i) => i.id).sort();
    expect(ids).toEqual(['b', 'c']);
  });

  // U40 (negation + empty platforms)
  it('U40: negated platform chip excludes matching items AND includes empty-platforms items', () => {
    const engine = makeEngine();
    const expr = toFilterExpression(
      platformLozengeState({ nationality: 'GB', domain: 'subsurface' }, true),
    );
    const result = engine.filter(allItems, expr);
    const ids = result.map((i) => i.id).sort();
    expect(ids).toContain('d'); // empty platforms included
    expect(ids).not.toContain('b'); // matching item excluded
  });

  // U41 (taxonomy expansion via vessel_role through array_filter)
  it('U41: vessel_role:frigate matches the type23 surface platform via taxonomy', () => {
    const engine = makeEngine();
    const expr = toFilterExpression(
      platformLozengeState({ nationality: 'GB', vessel_role: 'frigate' }),
    );
    const result = engine.filter(allItems, expr);
    expect(result.map((i) => i.id)).toContain('a');
  });
});

describe('CompoundPredicate emission shape (#186)', () => {
  it('emits field:value comparisons using bare PlatformField names', () => {
    const state: FilterBarState = {
      items: [
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'p1',
          filterType: 'platform',
          attributes: { nationality: 'GB', domain: 'subsurface' },
        },
      ],
    };
    const expr = toFilterExpression(state);
    const af = expr.arrayFilters![0]!;
    const pred = af.predicate as CompoundPredicate;
    if (pred.kind === 'and') {
      for (const child of pred.children) {
        if (child.kind === 'comparison') {
          expect(['nationality', 'domain']).toContain(child.field);
        }
      }
    }
  });
});
