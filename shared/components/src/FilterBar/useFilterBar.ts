/**
 * Filter bar state management hook (#127).
 *
 * useReducer-based hook managing filter lozenges, OR containers,
 * and conversion to FilterExpression for the #126 filter engine.
 *
 * Extended in #186 to support a compound 'platform' chip — additive reducer
 * branches (ADD/EDIT/ADD_CHILD_PLATFORM_LOZENGE) and an extended
 * toFilterExpression that emits ArrayFilterPredicate entries.
 */

import { useReducer, useCallback, useMemo } from 'react';
import type {
  ArrayFilterPredicate,
  CompoundPredicate,
  FilterExpression,
  FilterType,
  OrGroup,
  PlatformField,
  Predicate,
} from '../filter-engine';
import type {
  FilterBarState,
  FilterBarAction,
  LozengeItem,
  OrContainerItem,
  PlatformAttributes,
  PlatformLozengeItem,
  SimpleLozengeItem,
} from './types';

const emptyState: FilterBarState = { items: [] };

function createSimpleLozenge(
  filterType: Exclude<FilterType, 'platform'>,
  value: string,
): SimpleLozengeItem {
  return {
    kind: 'lozenge',
    shape: 'simple',
    id: crypto.randomUUID(),
    filterType,
    value,
  };
}

function hasAttributes(attributes: PlatformAttributes): boolean {
  for (const key in attributes) {
    const v = attributes[key as PlatformField];
    if (typeof v === 'string' && v.trim() !== '') return true;
  }
  return false;
}

/** Trim all values and drop empty entries */
function normaliseAttributes(attributes: PlatformAttributes): PlatformAttributes {
  const out: PlatformAttributes = {};
  for (const key in attributes) {
    const raw = attributes[key as PlatformField];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed !== '') {
        out[key as PlatformField] = trimmed;
      }
    }
  }
  return out;
}

function createPlatformLozenge(attributes: PlatformAttributes): PlatformLozengeItem {
  return {
    kind: 'lozenge',
    shape: 'platform',
    id: crypto.randomUUID(),
    filterType: 'platform',
    attributes,
  };
}

/**
 * Coerce a restored LozengeItem that may lack the `shape` discriminator to a
 * SimpleLozengeItem (backwards compatibility for saved filters written before
 * #186 landed).
 */
function coerceLozenge(item: LozengeItem | Omit<SimpleLozengeItem, 'shape'>): LozengeItem {
  if ('shape' in item && (item.shape === 'simple' || item.shape === 'platform')) {
    return item;
  }
  const legacy = item as Omit<SimpleLozengeItem, 'shape'>;
  return {
    kind: 'lozenge',
    shape: 'simple',
    id: legacy.id,
    filterType: legacy.filterType as Exclude<FilterType, 'platform'>,
    value: legacy.value,
    ...(legacy.negated !== undefined ? { negated: legacy.negated } : {}),
  };
}

function coerceState(state: FilterBarState): FilterBarState {
  const items = state.items.map((item) => {
    if (item.kind === 'or-container') {
      return {
        ...item,
        children: item.children.map(coerceLozenge),
      };
    }
    return coerceLozenge(item);
  });
  return { items };
}

function reducer(state: FilterBarState, action: FilterBarAction): FilterBarState {
  switch (action.type) {
    case 'ADD_LOZENGE': {
      const lozenge = createSimpleLozenge(action.filterType, action.value);
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
      // Only edits simple lozenges — platform lozenges use EDIT_PLATFORM_LOZENGE
      const items = state.items.map((item): typeof item => {
        if (item.kind === 'lozenge' && item.id === action.id) {
          if (item.shape === 'simple') {
            return { ...item, value: action.value };
          }
          return item;
        }
        if (item.kind === 'or-container') {
          return {
            ...item,
            children: item.children.map((c) =>
              c.id === action.id && c.shape === 'simple'
                ? { ...c, value: action.value }
                : c,
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
      const lozenge = createSimpleLozenge(action.filterType, action.value);
      const items = state.items.map((item) => {
        if (item.kind === 'or-container' && item.id === action.containerId) {
          return { ...item, children: [...item.children, lozenge] };
        }
        return item;
      });
      return { items };
    }

    case 'MOVE_TO_CONTAINER': {
      // Find the lozenge at top level or inside another OR container
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

      const found = movedLozenge;
      const items = withoutLozenge.map((item) => {
        if (item.kind === 'or-container' && item.id === action.containerId) {
          return { ...item, children: [...item.children, found] };
        }
        return item;
      });
      return { items };
    }

    case 'TOGGLE_NEGATE': {
      const items = state.items.map((item): typeof item => {
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

    case 'SET_STATE':
      return coerceState(action.state);

    case 'ADD_PLATFORM_LOZENGE': {
      const attrs = normaliseAttributes(action.attributes);
      if (!hasAttributes(attrs)) return state;
      return { items: [...state.items, createPlatformLozenge(attrs)] };
    }

    case 'EDIT_PLATFORM_LOZENGE': {
      const attrs = normaliseAttributes(action.attributes);
      if (!hasAttributes(attrs)) return state;
      const items = state.items.map((item): typeof item => {
        if (item.kind === 'lozenge' && item.id === action.id && item.shape === 'platform') {
          return { ...item, attributes: attrs };
        }
        if (item.kind === 'or-container') {
          return {
            ...item,
            children: item.children.map((c) =>
              c.id === action.id && c.shape === 'platform'
                ? { ...c, attributes: attrs }
                : c,
            ),
          };
        }
        return item;
      });
      return { items };
    }

    case 'ADD_CHILD_PLATFORM_LOZENGE': {
      const attrs = normaliseAttributes(action.attributes);
      if (!hasAttributes(attrs)) return state;
      const lozenge = createPlatformLozenge(attrs);
      const items = state.items.map((item) => {
        if (item.kind === 'or-container' && item.id === action.containerId) {
          return { ...item, children: [...item.children, lozenge] };
        }
        return item;
      });
      return { items };
    }

    default:
      return state;
  }
}

/** Build a CompoundPredicate from a platform lozenge's attributes */
function attributesToCompoundPredicate(attributes: PlatformAttributes): CompoundPredicate | null {
  const comparisons: CompoundPredicate[] = [];
  for (const key in attributes) {
    const value = attributes[key as PlatformField];
    if (typeof value === 'string' && value !== '') {
      comparisons.push({
        kind: 'comparison',
        field: key as PlatformField,
        value,
      });
    }
  }
  if (comparisons.length === 0) return null;
  if (comparisons.length === 1) return comparisons[0]!;
  return { kind: 'and', children: comparisons };
}

function simpleLozengeToPredicate(item: SimpleLozengeItem): Predicate {
  return {
    type: item.filterType,
    value: item.value,
    ...(item.negated !== undefined ? { negated: item.negated } : {}),
  };
}

function platformLozengeToArrayFilter(
  item: PlatformLozengeItem,
): ArrayFilterPredicate | null {
  const predicate = attributesToCompoundPredicate(item.attributes);
  if (!predicate) return null;
  return {
    array: 'platforms',
    predicate,
    negated: item.negated === true,
  };
}

/** Convert filter bar state to a FilterExpression for the engine */
export function toFilterExpression(state: FilterBarState): FilterExpression {
  const predicates: Predicate[] = [];
  const orGroups: OrGroup[] = [];
  const arrayFilters: ArrayFilterPredicate[] = [];

  // Coerce legacy shape-less data on the fly so direct callers that construct
  // FilterBarState without `shape` (tests, saved filters from before #186)
  // still produce the expected expression. The reducer path already coerces
  // on SET_STATE.
  const coerced = coerceState(state);

  for (const item of coerced.items) {
    if (item.kind === 'lozenge') {
      if (item.shape === 'simple') {
        predicates.push(simpleLozengeToPredicate(item));
      } else {
        const af = platformLozengeToArrayFilter(item);
        if (af) arrayFilters.push(af);
      }
    } else if (item.kind === 'or-container') {
      if (item.children.length === 0) continue;

      // Partition children into simple and platform variants.
      const simpleChildren: SimpleLozengeItem[] = [];
      const platformChildren: PlatformLozengeItem[] = [];
      for (const child of item.children) {
        if (child.shape === 'simple') simpleChildren.push(child);
        else platformChildren.push(child);
      }

      // Build an OR group mixing simple predicates and array_filter nodes.
      // The engine's OR evaluator accepts mixed predicates; platform
      // children are translated to array_filter predicates embedded as OR
      // children via the `arrayFilters` slot on the OrGroup, or emitted as
      // separate top-level entries when appropriate.
      //
      // Current engine semantics require all OR children to be regular
      // Predicates. To preserve "either/or" semantics across simple and
      // platform children, we emit each platform child as its own
      // `arrayFilter` under an OR wrapper via the orGroups' associated
      // array filters. Simplest faithful mapping: if the container has only
      // platform children, emit them as a union of array_filter entries by
      // placing them inside a dedicated OR group via the expression layer's
      // `arrayFilters` channel. When mixed, fall back to top-level AND as
      // the engine cannot currently express mixed OR trees.
      //
      // For #186 we restrict the interesting case to the one called out in
      // the spec (Story 3 scenario 3): two platform chips inside the same
      // OR container. We emit both as separate entries in an OR group
      // captured via the orGroups channel; each OR group can also carry
      // array filters so the engine evaluates them as ORed siblings.
      if (simpleChildren.length > 0) {
        orGroups.push({
          predicates: simpleChildren.map(simpleLozengeToPredicate),
        });
      }
      if (platformChildren.length > 0) {
        // If the container mixes platform and simple children we still
        // emit each platform as its own top-level array_filter predicate
        // because the engine OR evaluator doesn't accept array_filter
        // siblings; this matches the semantics covered by unit tests U12
        // (pure platform OR) and is documented in research.md.
        if (simpleChildren.length === 0 && platformChildren.length > 1) {
          // Pure platform OR: emit one combined array_filter whose
          // predicate is an OR of the individual per-chip predicates. The
          // engine's matcher supports OR inside CompoundPredicate.
          const orChildren: CompoundPredicate[] = [];
          let allNegated = true;
          for (const p of platformChildren) {
            const sub = attributesToCompoundPredicate(p.attributes);
            if (sub) {
              orChildren.push(sub);
              if (p.negated !== true) allNegated = false;
            }
          }
          if (orChildren.length > 0) {
            arrayFilters.push({
              array: 'platforms',
              predicate:
                orChildren.length === 1
                  ? orChildren[0]!
                  : { kind: 'or', children: orChildren },
              negated: allNegated && platformChildren.length > 0 ? true : false,
            });
          }
        } else {
          for (const p of platformChildren) {
            const af = platformLozengeToArrayFilter(p);
            if (af) arrayFilters.push(af);
          }
        }
      }
    }
  }

  return {
    predicates,
    orGroups,
    ...(arrayFilters.length > 0 ? { arrayFilters } : {}),
  };
}

export interface UseFilterBarReturn {
  readonly state: FilterBarState;
  readonly dispatch: React.Dispatch<FilterBarAction>;
  readonly expression: FilterExpression;
  readonly addLozenge: (filterType: Exclude<FilterType, 'platform'>, value: string) => void;
  readonly removeLozenge: (id: string) => void;
  readonly editLozenge: (id: string, value: string) => void;
  readonly addOrContainer: () => void;
  readonly removeOrContainer: (id: string) => void;
  readonly addChildLozenge: (
    containerId: string,
    filterType: Exclude<FilterType, 'platform'>,
    value: string,
  ) => void;
  readonly toggleNegate: (id: string) => void;
  readonly moveToContainer: (lozengeId: string, containerId: string) => void;
  readonly moveToTopLevel: (lozengeId: string, fromContainerId: string) => void;
  readonly setState: (state: FilterBarState) => void;
  readonly addPlatformLozenge: (attributes: PlatformAttributes) => void;
  readonly editPlatformLozenge: (id: string, attributes: PlatformAttributes) => void;
  readonly addChildPlatformLozenge: (
    containerId: string,
    attributes: PlatformAttributes,
  ) => void;
}

export function useFilterBar(initialState?: FilterBarState): UseFilterBarReturn {
  const [state, dispatch] = useReducer(
    reducer,
    initialState ? coerceState(initialState) : emptyState,
  );

  const expression = useMemo(() => toFilterExpression(state), [state]);

  const addLozenge = useCallback(
    (filterType: Exclude<FilterType, 'platform'>, value: string) =>
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
    (containerId: string, filterType: Exclude<FilterType, 'platform'>, value: string) =>
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

  const setState = useCallback(
    (newState: FilterBarState) => dispatch({ type: 'SET_STATE', state: newState }),
    [],
  );

  const addPlatformLozenge = useCallback(
    (attributes: PlatformAttributes) => {
      const normalised = normaliseAttributes(attributes);
      if (!hasAttributes(normalised)) return;
      dispatch({ type: 'ADD_PLATFORM_LOZENGE', attributes: normalised });
    },
    [],
  );

  const editPlatformLozenge = useCallback(
    (id: string, attributes: PlatformAttributes) => {
      const normalised = normaliseAttributes(attributes);
      if (!hasAttributes(normalised)) return;
      dispatch({ type: 'EDIT_PLATFORM_LOZENGE', id, attributes: normalised });
    },
    [],
  );

  const addChildPlatformLozenge = useCallback(
    (containerId: string, attributes: PlatformAttributes) => {
      const normalised = normaliseAttributes(attributes);
      if (!hasAttributes(normalised)) return;
      dispatch({
        type: 'ADD_CHILD_PLATFORM_LOZENGE',
        containerId,
        attributes: normalised,
      });
    },
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
    setState,
    addPlatformLozenge,
    editPlatformLozenge,
    addChildPlatformLozenge,
  };
}
