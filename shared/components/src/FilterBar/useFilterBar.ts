/**
 * Filter bar state management hook (#127).
 *
 * useReducer-based hook managing filter lozenges, OR containers,
 * and conversion to FilterExpression for the #126 filter engine.
 */

import { useReducer, useCallback, useMemo } from 'react';
import type { FilterExpression, FilterType } from '../filter-engine';
import type {
  FilterBarState,
  FilterBarAction,
  LozengeItem,
  OrContainerItem,
} from './types';

const emptyState: FilterBarState = { items: [] };

function createLozenge(filterType: FilterType, value: string): LozengeItem {
  return {
    kind: 'lozenge',
    id: crypto.randomUUID(),
    filterType,
    value,
  };
}

function reducer(state: FilterBarState, action: FilterBarAction): FilterBarState {
  switch (action.type) {
    case 'ADD_LOZENGE': {
      const lozenge = createLozenge(action.filterType, action.value);
      return { items: [...state.items, lozenge] };
    }

    case 'REMOVE_LOZENGE': {
      // Remove from top level or from inside OR containers
      const items = state.items
        .filter((item) => !(item.kind === 'lozenge' && item.id === action.id))
        .map((item) => {
          if (item.kind === 'or-container') {
            return {
              ...item,
              children: item.children.filter((c) => c.id !== action.id),
            };
          }
          return item;
        });
      return { items };
    }

    case 'EDIT_LOZENGE': {
      const items = state.items.map((item) => {
        if (item.kind === 'lozenge' && item.id === action.id) {
          return { ...item, value: action.value };
        }
        if (item.kind === 'or-container') {
          return {
            ...item,
            children: item.children.map((c) =>
              c.id === action.id ? { ...c, value: action.value } : c,
            ),
          };
        }
        return item;
      });
      return { items };
    }

    case 'ADD_OR_CONTAINER': {
      const container: OrContainerItem = {
        kind: 'or-container',
        id: crypto.randomUUID(),
        children: [],
      };
      return { items: [...state.items, container] };
    }

    case 'REMOVE_OR_CONTAINER': {
      return { items: state.items.filter((item) => item.id !== action.id) };
    }

    case 'ADD_CHILD_LOZENGE': {
      const lozenge = createLozenge(action.filterType, action.value);
      const items = state.items.map((item) => {
        if (item.kind === 'or-container' && item.id === action.containerId) {
          return { ...item, children: [...item.children, lozenge] };
        }
        return item;
      });
      return { items };
    }

    case 'MOVE_TO_CONTAINER': {
      // Find the lozenge at top level
      let movedLozenge: LozengeItem | undefined;
      const withoutLozenge = state.items
        .filter((item) => {
          if (item.kind === 'lozenge' && item.id === action.lozengeId) {
            movedLozenge = item;
            return false;
          }
          return true;
        })
        .map((item) => {
          // Also check inside other containers
          if (item.kind === 'or-container' && !movedLozenge) {
            const child = item.children.find((c) => c.id === action.lozengeId);
            if (child) {
              movedLozenge = child;
              return {
                ...item,
                children: item.children.filter((c) => c.id !== action.lozengeId),
              };
            }
          }
          return item;
        });

      if (!movedLozenge) return state;

      const items = withoutLozenge.map((item) => {
        if (item.kind === 'or-container' && item.id === action.containerId) {
          return { ...item, children: [...item.children, movedLozenge!] };
        }
        return item;
      });
      return { items };
    }

    case 'TOGGLE_NEGATE': {
      const items = state.items.map((item) => {
        if (item.kind === 'lozenge' && item.id === action.id) {
          return { ...item, negated: !item.negated };
        }
        if (item.kind === 'or-container') {
          return {
            ...item,
            children: item.children.map((c) =>
              c.id === action.id ? { ...c, negated: !c.negated } : c,
            ),
          };
        }
        return item;
      });
      return { items };
    }

    case 'MOVE_TO_TOP_LEVEL': {
      let movedLozenge: LozengeItem | undefined;
      const items = state.items.map((item) => {
        if (item.kind === 'or-container' && item.id === action.fromContainerId) {
          const child = item.children.find((c) => c.id === action.lozengeId);
          if (child) {
            movedLozenge = child;
            return {
              ...item,
              children: item.children.filter((c) => c.id !== action.lozengeId),
            };
          }
        }
        return item;
      });

      if (!movedLozenge) return state;
      return { items: [...items, movedLozenge] };
    }

    default:
      return state;
  }
}

/** Convert filter bar state to a FilterExpression for the engine */
export function toFilterExpression(state: FilterBarState): FilterExpression {
  const predicates: { type: FilterType; value: string; negated?: boolean }[] = [];
  const orGroups: { predicates: { type: FilterType; value: string; negated?: boolean }[] }[] = [];

  for (const item of state.items) {
    if (item.kind === 'lozenge') {
      predicates.push({ type: item.filterType, value: item.value, negated: item.negated });
    } else if (item.kind === 'or-container') {
      // Skip empty OR containers (review decision #4)
      if (item.children.length === 0) continue;
      orGroups.push({
        predicates: item.children.map((c) => ({
          type: c.filterType,
          value: c.value,
          negated: c.negated,
        })),
      });
    }
  }

  return { predicates, orGroups };
}

export interface UseFilterBarReturn {
  readonly state: FilterBarState;
  readonly dispatch: React.Dispatch<FilterBarAction>;
  readonly expression: FilterExpression;
  readonly addLozenge: (filterType: FilterType, value: string) => void;
  readonly removeLozenge: (id: string) => void;
  readonly editLozenge: (id: string, value: string) => void;
  readonly addOrContainer: () => void;
  readonly removeOrContainer: (id: string) => void;
  readonly addChildLozenge: (containerId: string, filterType: FilterType, value: string) => void;
  readonly toggleNegate: (id: string) => void;
  readonly moveToContainer: (lozengeId: string, containerId: string) => void;
  readonly moveToTopLevel: (lozengeId: string, fromContainerId: string) => void;
}

export function useFilterBar(initialState?: FilterBarState): UseFilterBarReturn {
  const [state, dispatch] = useReducer(reducer, initialState ?? emptyState);

  const expression = useMemo(() => toFilterExpression(state), [state]);

  const addLozenge = useCallback(
    (filterType: FilterType, value: string) =>
      dispatch({ type: 'ADD_LOZENGE', filterType, value }),
    [],
  );

  const removeLozenge = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_LOZENGE', id }),
    [],
  );

  const editLozenge = useCallback(
    (id: string, value: string) => dispatch({ type: 'EDIT_LOZENGE', id, value }),
    [],
  );

  const addOrContainer = useCallback(
    () => dispatch({ type: 'ADD_OR_CONTAINER' }),
    [],
  );

  const removeOrContainer = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_OR_CONTAINER', id }),
    [],
  );

  const addChildLozenge = useCallback(
    (containerId: string, filterType: FilterType, value: string) =>
      dispatch({ type: 'ADD_CHILD_LOZENGE', containerId, filterType, value }),
    [],
  );

  const toggleNegate = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_NEGATE', id }),
    [],
  );

  const moveToContainer = useCallback(
    (lozengeId: string, containerId: string) =>
      dispatch({ type: 'MOVE_TO_CONTAINER', lozengeId, containerId }),
    [],
  );

  const moveToTopLevel = useCallback(
    (lozengeId: string, fromContainerId: string) =>
      dispatch({ type: 'MOVE_TO_TOP_LEVEL', lozengeId, fromContainerId }),
    [],
  );

  return {
    state,
    dispatch,
    expression,
    addLozenge,
    removeLozenge,
    editLozenge,
    addOrContainer,
    removeOrContainer,
    addChildLozenge,
    toggleNegate,
    moveToContainer,
    moveToTopLevel,
  };
}
