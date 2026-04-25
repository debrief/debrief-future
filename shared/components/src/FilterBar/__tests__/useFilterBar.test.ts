import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterBar, toFilterExpression } from '../useFilterBar';
import type { FilterBarState } from '../types';

describe('useFilterBar', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useFilterBar());
    expect(result.current.state.items).toEqual([]);
  });

  it('produces empty expression for empty state', () => {
    const { result } = renderHook(() => useFilterBar());
    expect(result.current.expression).toEqual({ predicates: [], orGroups: [] });
  });

  // #191 T028 — regression guard (review Decision 12).
  // Phase 3 of #191 adds an optional `llmClient` prop to `FilterBar` that
  // routes Enter through a natural-language → CQL2 pipeline. This test
  // pins today's baseline: `useFilterBar` has no LLM dependency and no
  // LLM-related surface. If Phase 3 later makes the literal QuickSearch
  // path implicitly depend on an llmClient, this assertion fails and the
  // regression is caught at CI time.
  it('[#191 regression] operates without any live-LLM client (literal path unchanged)', () => {
    const { result } = renderHook(() => useFilterBar());
    act(() => result.current.addLozenge('nationality', 'French'));
    expect(result.current.state.items).toHaveLength(1);
    const api = result.current as unknown as Record<string, unknown>;
    expect(api).not.toHaveProperty('llmClient');
    expect(api).not.toHaveProperty('generateFromPhrase');
  });

  describe('add lozenge', () => {
    it('adds a lozenge to the bar', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addLozenge('nationality', 'French'));

      expect(result.current.state.items).toHaveLength(1);
      const item = result.current.state.items[0]!;
      expect(item.kind).toBe('lozenge');
      if (item.kind === 'lozenge') {
        expect(item.filterType).toBe('nationality');
        expect(item.value).toBe('French');
        expect(item.id).toBeTruthy();
      }
    });

    it('generates unique IDs for each lozenge', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => {
        result.current.addLozenge('nationality', 'French');
        result.current.addLozenge('nationality', 'British');
      });

      const ids = result.current.state.items.map((i) => i.id);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('remove lozenge', () => {
    it('removes a top-level lozenge', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addLozenge('nationality', 'French'));
      const id = result.current.state.items[0]!.id;

      act(() => result.current.removeLozenge(id));
      expect(result.current.state.items).toHaveLength(0);
    });

    it('removes a lozenge from inside an OR container', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addOrContainer());
      const containerId = result.current.state.items[0]!.id;
      act(() => result.current.addChildLozenge(containerId, 'nationality', 'French'));

      const container = result.current.state.items[0]!;
      expect(container.kind).toBe('or-container');
      if (container.kind === 'or-container') {
        const childId = container.children[0]!.id;
        act(() => result.current.removeLozenge(childId));

        const updated = result.current.state.items[0]!;
        if (updated.kind === 'or-container') {
          expect(updated.children).toHaveLength(0);
        }
      }
    });
  });

  describe('edit lozenge', () => {
    it('updates a top-level lozenge value', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addLozenge('nationality', 'French'));
      const id = result.current.state.items[0]!.id;

      act(() => result.current.editLozenge(id, 'British'));

      const item = result.current.state.items[0]!;
      if (item.kind === 'lozenge') {
        expect(item.value).toBe('British');
      }
    });

    it('updates a lozenge inside an OR container', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addOrContainer());
      const containerId = result.current.state.items[0]!.id;
      act(() => result.current.addChildLozenge(containerId, 'nationality', 'French'));

      const container = result.current.state.items[0]!;
      expect(container.kind).toBe('or-container');
      if (container.kind === 'or-container') {
        const childId = container.children[0]!.id;
        act(() => result.current.editLozenge(childId, 'British'));

        const updated = result.current.state.items[0]!;
        if (updated.kind === 'or-container') {
          expect(updated.children[0]!.value).toBe('British');
        }
      }
    });
  });

  describe('OR container', () => {
    it('adds an empty OR container', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addOrContainer());

      expect(result.current.state.items).toHaveLength(1);
      const item = result.current.state.items[0]!;
      expect(item.kind).toBe('or-container');
      if (item.kind === 'or-container') {
        expect(item.children).toHaveLength(0);
      }
    });

    it('removes an OR container', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addOrContainer());
      const id = result.current.state.items[0]!.id;

      act(() => result.current.removeOrContainer(id));
      expect(result.current.state.items).toHaveLength(0);
    });

    it('adds a child lozenge to an OR container', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addOrContainer());
      const containerId = result.current.state.items[0]!.id;

      act(() => result.current.addChildLozenge(containerId, 'vessel-class', 'type23'));

      const container = result.current.state.items[0]!;
      expect(container.kind).toBe('or-container');
      if (container.kind === 'or-container') {
        expect(container.children).toHaveLength(1);
        expect(container.children[0]!.filterType).toBe('vessel-class');
      }
    });
  });

  describe('toggle negate', () => {
    it('toggles negated on a top-level lozenge', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addLozenge('nationality', 'French'));

      const id = result.current.state.items[0]!.id;
      act(() => result.current.toggleNegate(id));

      const item = result.current.state.items[0]!;
      if (item.kind === 'lozenge') {
        expect(item.negated).toBe(true);
      }
    });

    it('toggles negated back to false', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addLozenge('nationality', 'French'));

      const id = result.current.state.items[0]!.id;
      act(() => result.current.toggleNegate(id));
      act(() => result.current.toggleNegate(id));

      const item = result.current.state.items[0]!;
      if (item.kind === 'lozenge') {
        expect(item.negated).toBe(false);
      }
    });

    it('toggles negated on a child lozenge inside OR container', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => {
        result.current.addOrContainer();
      });

      const containerId = result.current.state.items[0]!.id;
      act(() => result.current.addChildLozenge(containerId, 'nationality', 'French'));

      const container = result.current.state.items[0]!;
      if (container.kind === 'or-container') {
        const childId = container.children[0]!.id;
        act(() => result.current.toggleNegate(childId));

        const updated = result.current.state.items[0]!;
        if (updated.kind === 'or-container') {
          expect(updated.children[0]!.negated).toBe(true);
        }
      }
    });
  });

  describe('move to container', () => {
    it('moves a top-level lozenge into an OR container', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => {
        result.current.addLozenge('nationality', 'French');
        result.current.addOrContainer();
      });

      const lozengeId = result.current.state.items[0]!.id;
      const containerId = result.current.state.items[1]!.id;

      act(() => result.current.moveToContainer(lozengeId, containerId));

      // Should have one item (OR container with the lozenge inside)
      expect(result.current.state.items).toHaveLength(1);
      const container = result.current.state.items[0]!;
      if (container.kind === 'or-container') {
        expect(container.children).toHaveLength(1);
        expect(container.children[0]!.value).toBe('French');
      }
    });
  });

  describe('move to top level', () => {
    it('moves a lozenge from OR container to top level', () => {
      const { result } = renderHook(() => useFilterBar());
      act(() => result.current.addOrContainer());
      const containerId = result.current.state.items[0]!.id;
      act(() => result.current.addChildLozenge(containerId, 'nationality', 'French'));

      const container = result.current.state.items[0]!;
      expect(container.kind).toBe('or-container');
      if (container.kind === 'or-container') {
        const childId = container.children[0]!.id;
        act(() => result.current.moveToTopLevel(childId, containerId));

        // Container empty, lozenge at top level
        expect(result.current.state.items).toHaveLength(2);
        const moved = result.current.state.items[1]!;
        expect(moved.kind).toBe('lozenge');
        if (moved.kind === 'lozenge') {
          expect(moved.value).toBe('French');
        }
      }
    });
  });
});

describe('toFilterExpression', () => {
  it('converts empty state to empty expression', () => {
    const state: FilterBarState = { items: [] };
    expect(toFilterExpression(state)).toEqual({ predicates: [], orGroups: [] });
  });

  it('converts top-level lozenges to predicates', () => {
    const state: FilterBarState = {
      items: [
        { kind: 'lozenge', id: '1', filterType: 'nationality', value: 'French' },
        { kind: 'lozenge', id: '2', filterType: 'duration', value: '<24H' },
      ],
    };

    const expr = toFilterExpression(state);
    expect(expr.predicates).toEqual([
      { type: 'nationality', value: 'French' },
      { type: 'duration', value: '<24H' },
    ]);
    expect(expr.orGroups).toEqual([]);
  });

  it('converts OR container to OR group', () => {
    const state: FilterBarState = {
      items: [
        {
          kind: 'or-container',
          id: 'or1',
          children: [
            { kind: 'lozenge', id: '1', filterType: 'vessel-class', value: 'type23' },
            { kind: 'lozenge', id: '2', filterType: 'vessel-class', value: 'type45' },
          ],
        },
      ],
    };

    const expr = toFilterExpression(state);
    expect(expr.predicates).toEqual([]);
    expect(expr.orGroups).toHaveLength(1);
    expect(expr.orGroups[0]!.predicates).toEqual([
      { type: 'vessel-class', value: 'type23' },
      { type: 'vessel-class', value: 'type45' },
    ]);
  });

  it('skips empty OR containers (review decision #4)', () => {
    const state: FilterBarState = {
      items: [
        { kind: 'or-container', id: 'or1', children: [] },
        { kind: 'lozenge', id: '1', filterType: 'nationality', value: 'French' },
      ],
    };

    const expr = toFilterExpression(state);
    expect(expr.orGroups).toEqual([]);
    expect(expr.predicates).toHaveLength(1);
  });

  it('produces AND + OR expression for mixed state', () => {
    const state: FilterBarState = {
      items: [
        { kind: 'lozenge', id: '1', filterType: 'nationality', value: 'French' },
        {
          kind: 'or-container',
          id: 'or1',
          children: [
            { kind: 'lozenge', id: '2', filterType: 'vessel-class', value: 'type23' },
            { kind: 'lozenge', id: '3', filterType: 'vessel-class', value: 'type45' },
          ],
        },
      ],
    };

    const expr = toFilterExpression(state);
    expect(expr.predicates).toHaveLength(1);
    expect(expr.orGroups).toHaveLength(1);
  });
});
