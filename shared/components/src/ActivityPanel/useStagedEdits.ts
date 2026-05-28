/**
 * useStagedEdits — staging buffer for plot/feature/vertex edits in the
 * Properties Panel (Spec 192 — Phase 2, T014).
 *
 * Per R-002a and contracts/staged-edits-store.md, the staging buffer is
 * a `useReducer` hook colocated with `ActivityPanel`. Not a Zustand store.
 * Not a new session-state slice.
 *
 * Invariants (contracts/staged-edits-store.md):
 *   1. Sparse pruning is total — no empty partials after any setter.
 *   2. In-memory only — never serialised, cleared on successful save,
 *      preserved on failed save.
 *   3. Selection-independent — no selection API; buffer only mutates via
 *      the listed setters/reverters.
 *   4. One write path — `applyEditsToFeatures` is pure; the caller wires
 *      writes through `saveSession` (Article IV.4).
 *
 * Article IV.5 (boundary types are derived, not rewritten):
 *   - `VertexEditableProperties` is `Pick<VertexMetadata, …>`.
 *   - `FeatureEditableProperties` is `Pick<TrackProperties, …>` of the
 *     six override slots + `tags` (the analyst-editable base slot).
 *   - `PlotEditableProperties` is `Record<string, unknown>` — a TODO,
 *     pending T019 when the STAC item's editable properties become a
 *     typed surface. See marker below.
 */

import { useReducer, useMemo, useRef } from 'react';
import type {
  BaseFeatureProperties,
  DebriefFeature,
  TrackProperties,
  VertexMetadata,
} from '@debrief/schemas';

// ─── Derived boundary types (Article IV.5) ────────────────────────────

/**
 * Mutable per-vertex slots — derived from the generated VertexMetadata.
 * `path` is the identity slot, not editable.
 */
export type VertexEditableProperties = Pick<VertexMetadata, 'label' | 'tags' | 'note'>;

/**
 * Analyst-editable slots on a feature. Derived from `TrackProperties`
 * (the richest concrete subclass) using `Pick<>` per Article IV.5 — never
 * re-list field names. The six override slots are documented in
 * `tasks.md` T061 and `contracts/revert-action.md`; `tags` is the
 * inherited `BaseFeatureProperties.tags` slot, also analyst-editable.
 *
 * If a future slot is added to TrackProperties and should be editable,
 * extend the `Pick<>` set here — do NOT duplicate the field list elsewhere.
 */
export type FeatureEditableProperties = Pick<
  TrackProperties,
  | 'display_name'
  | 'nationality'
  | 'vessel_class'
  | 'vessel_type'
  | 'vessel_role'
  | 'domain'
  | 'tags'
>;

export type FieldKey = keyof FeatureEditableProperties;

/**
 * TODO: tighten to derived type when STAC item properties are typed
 * (spec #192 T019). For now, the staging hook holds the partial in
 * untyped form — this hook does not own plot persistence.
 */
export type PlotEditableProperties = Record<string, unknown>;

// ─── State shape ──────────────────────────────────────────────────────

export interface StagedEdits {
  plot?: Partial<PlotEditableProperties>;
  byFeature: Record<string, Partial<FeatureEditableProperties>>;
  byVertex: Record<string, Record<string, Partial<VertexEditableProperties>>>;
  revertedFields: Record<string, Set<FieldKey>>;
}

const INITIAL_STATE: StagedEdits = {
  byFeature: {},
  byVertex: {},
  revertedFields: {},
};

// ─── Provenance type (R-006) ──────────────────────────────────────────

export interface ProvenancePath {
  path: string;
  op: 'set' | 'revert';
}

// ─── Feature type (input/output of the flush function) ────────────────

/**
 * The flush function operates on the schema-generated DebriefFeature
 * union (TrackFeature | ReferenceLocation | MultiPointFeature | …).
 * Re-exported as `FeatureForEdit` for clarity at call sites; this is
 * deliberately not a re-typed local alias.
 */
export type FeatureForEdit = DebriefFeature;

// ─── Reducer ──────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_FEATURE_FIELD'; featureId: string; slot: FieldKey; next: unknown; current: unknown }
  | {
      type: 'SET_VERTEX_FIELD';
      featureId: string;
      path: string;
      slot: keyof VertexEditableProperties;
      next: unknown;
      current: unknown;
    }
  | { type: 'REVERT_FIELD'; featureId: string; slot: FieldKey }
  | { type: 'UNREVERT_FIELD'; featureId: string; slot: FieldKey }
  | { type: 'CLEAR_ALL' };

/**
 * Deep equality sufficient for the slot types we hold:
 * primitives (string, number, boolean, null, undefined) and arrays of
 * strings (the `tags` slot). Anything else falls back to strict equality.
 *
 * For v1 we treat the empty string and `undefined` as "absent" for
 * pruning purposes: setting a slot from "X" to "" prunes the entry,
 * mirroring the form's clear-input affordance.
 */
function isAbsent(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Treat absent values as equivalent (clears collapse to "no override")
  if (isAbsent(a) && isAbsent(b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  return false;
}

function reducer(state: StagedEdits, action: Action): StagedEdits {
  switch (action.type) {
    case 'SET_FEATURE_FIELD': {
      const { featureId, slot, next, current } = action;
      const featurePartial = { ...(state.byFeature[featureId] ?? {}) };

      if (deepEqual(next, current)) {
        // Prune the slot from the partial
        delete featurePartial[slot];
      } else {
        // eslint-disable-next-line no-restricted-syntax
        (featurePartial as Record<string, unknown>)[slot] = next;
      }

      const byFeature = { ...state.byFeature };
      if (Object.keys(featurePartial).length === 0) {
        delete byFeature[featureId];
      } else {
        byFeature[featureId] = featurePartial;
      }
      return { ...state, byFeature };
    }

    case 'SET_VERTEX_FIELD': {
      const { featureId, path, slot, next, current } = action;
      const perFeature = { ...(state.byVertex[featureId] ?? {}) };
      const perPath = { ...(perFeature[path] ?? {}) };

      if (deepEqual(next, current)) {
        delete perPath[slot];
      } else {
        // eslint-disable-next-line no-restricted-syntax
        (perPath as Record<string, unknown>)[slot] = next;
      }

      if (Object.keys(perPath).length === 0) {
        delete perFeature[path];
      } else {
        perFeature[path] = perPath;
      }

      const byVertex = { ...state.byVertex };
      if (Object.keys(perFeature).length === 0) {
        delete byVertex[featureId];
      } else {
        byVertex[featureId] = perFeature;
      }
      return { ...state, byVertex };
    }

    case 'REVERT_FIELD': {
      const { featureId, slot } = action;

      // Drop any staged override for this slot
      const byFeature = { ...state.byFeature };
      const existing = byFeature[featureId];
      if (existing && slot in existing) {
        const next = { ...existing };
        delete next[slot];
        if (Object.keys(next).length === 0) {
          delete byFeature[featureId];
        } else {
          byFeature[featureId] = next;
        }
      }

      // Add slot to revertedFields
      const revertedFields = { ...state.revertedFields };
      const existingSet = revertedFields[featureId];
      const nextSet = new Set<FieldKey>(existingSet ?? []);
      nextSet.add(slot);
      revertedFields[featureId] = nextSet;

      return { ...state, byFeature, revertedFields };
    }

    case 'UNREVERT_FIELD': {
      const { featureId, slot } = action;
      const existing = state.revertedFields[featureId];
      if (!existing || !existing.has(slot)) return state;

      const nextSet = new Set<FieldKey>(existing);
      nextSet.delete(slot);

      const revertedFields = { ...state.revertedFields };
      if (nextSet.size === 0) {
        delete revertedFields[featureId];
      } else {
        revertedFields[featureId] = nextSet;
      }
      return { ...state, revertedFields };
    }

    case 'CLEAR_ALL': {
      return INITIAL_STATE;
    }

    default: {
      // Exhaustiveness check
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────

export interface UseStagedEditsApi {
  state: StagedEdits;
  isDirty: () => boolean;
  setFeatureField: (
    featureId: string,
    slot: FieldKey,
    next: unknown,
    current: unknown
  ) => void;
  setVertexField: (
    featureId: string,
    path: string,
    slot: keyof VertexEditableProperties,
    next: unknown,
    current: unknown
  ) => void;
  revertField: (featureId: string, slot: FieldKey) => void;
  unrevertField: (featureId: string, slot: FieldKey) => void;
  applyEditsToFeatures: (features: FeatureForEdit[]) => {
    nextFeatures: FeatureForEdit[];
    editedPaths: ProvenancePath[];
  };
  clearAll: () => void;
}

export function useStagedEdits(): UseStagedEditsApi {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Keep a ref to the latest state so isDirty/applyEditsToFeatures can
  // read it inside stable callbacks without forcing a re-render on every
  // consumer that captures the API object.
  const stateRef = useRef(state);
  stateRef.current = state;

  return useMemo<UseStagedEditsApi>(() => {
    return {
      state,
      isDirty: (): boolean => {
        const s = stateRef.current;
        if (s.plot && Object.keys(s.plot).length > 0) return true;
        if (Object.keys(s.byFeature).length > 0) return true;
        if (Object.keys(s.byVertex).length > 0) return true;
        for (const key of Object.keys(s.revertedFields)) {
          if ((s.revertedFields[key]?.size ?? 0) > 0) return true;
        }
        return false;
      },
      setFeatureField: (featureId, slot, next, current) => {
        dispatch({ type: 'SET_FEATURE_FIELD', featureId, slot, next, current });
      },
      setVertexField: (featureId, path, slot, next, current) => {
        dispatch({ type: 'SET_VERTEX_FIELD', featureId, path, slot, next, current });
      },
      revertField: (featureId, slot) => {
        dispatch({ type: 'REVERT_FIELD', featureId, slot });
      },
      unrevertField: (featureId, slot) => {
        dispatch({ type: 'UNREVERT_FIELD', featureId, slot });
      },
      applyEditsToFeatures: (features) => {
        return applyEditsToFeaturesPure(stateRef.current, features);
      },
      clearAll: () => {
        dispatch({ type: 'CLEAR_ALL' });
      },
    };
  }, [state]);
}

// ─── Pure flush function ──────────────────────────────────────────────

/**
 * Pure transform: given the current staging state and a snapshot of
 * features, returns (a) the next features with edits merged and reverts
 * applied, and (b) the provenance path list for `appendProvenance`
 * (R-006).
 *
 * Behaviour (contracts/staged-edits-store.md § Flush):
 *
 *   1. Plot-level edits are held in `state.plot`; the caller routes
 *      these through the #447 plot-editor path (out of scope here).
 *   2. Feature-level edits — shallow-merge `byFeature[id]` into
 *      `feature.properties`.
 *   3. Reverted fields — `delete props[slot]` so the slot is absent on
 *      the saved feature (sparse-storage rule; not `null`/empty string).
 *   4. Vertex-level edits — merge into `properties.vertex_metadata`:
 *      find by `path`; merge field-by-field; prune entries that empty;
 *      omit the slot entirely when the array empties.
 *   5. `editedPaths` — feature slots as `<slot>`; reverts as `<slot>`
 *      with `op: 'revert'`; vertex slots as
 *      `vertex_metadata[<path>]/<slot>`.
 *
 * Does NOT mutate `state`; does NOT mutate `features` (each touched
 * feature is shallow-cloned).
 */
function applyEditsToFeaturesPure(
  state: StagedEdits,
  features: FeatureForEdit[]
): { nextFeatures: FeatureForEdit[]; editedPaths: ProvenancePath[] } {
  const editedPaths: ProvenancePath[] = [];

  const nextFeatures = features.map((feature): FeatureForEdit => {
    const featureId = feature.id;
    const featureEdits = state.byFeature[featureId];
    const vertexEdits = state.byVertex[featureId];
    const reverts = state.revertedFields[featureId];

    const hasFeatureEdits = featureEdits && Object.keys(featureEdits).length > 0;
    const hasVertexEdits = vertexEdits && Object.keys(vertexEdits).length > 0;
    const hasReverts = reverts && reverts.size > 0;

    if (!hasFeatureEdits && !hasVertexEdits && !hasReverts) {
      return feature;
    }

    // Clone properties (shallow). We're going to mutate the clone.
    // eslint-disable-next-line no-restricted-syntax
    const nextProps: Record<string, unknown> = {
      ...(feature.properties as unknown as Record<string, unknown>),
    };

    // (2) Feature-level edits — shallow merge
    if (hasFeatureEdits) {
      for (const slot of Object.keys(featureEdits)) {
        // eslint-disable-next-line no-restricted-syntax
        const value = (featureEdits as Record<string, unknown>)[slot];
        nextProps[slot] = value;
        editedPaths.push({ path: slot, op: 'set' });
      }
    }

    // (3) Reverted fields — delete slots so they're absent on the saved feature.
    //     Provenance op is 'revert'.
    if (hasReverts) {
      for (const slot of reverts) {
        delete nextProps[slot];
        editedPaths.push({ path: slot, op: 'revert' });
      }
    }

    // (4) Vertex-level edits — merge into properties.vertex_metadata
    if (hasVertexEdits) {
      // Start from a clone of the existing vertex_metadata array (if any)
      const existingVm = (nextProps['vertex_metadata'] as VertexMetadata[] | undefined) ?? [];
      // Build a path → entry map for in-place merge
      const byPath = new Map<string, VertexMetadata>();
      for (const entry of existingVm) {
        byPath.set(entry.path, { ...entry });
      }

      for (const path of Object.keys(vertexEdits)) {
        const partial = vertexEdits[path] ?? {};
        const existing = byPath.get(path);
        const merged: VertexMetadata = existing ?? { path };

        // eslint-disable-next-line no-restricted-syntax
        const mergedMut = merged as unknown as Record<string, unknown>;
        for (const slot of Object.keys(partial) as (keyof VertexEditableProperties)[]) {
          // eslint-disable-next-line no-restricted-syntax
          const value = (partial as Record<string, unknown>)[slot];
          // Treat absent value as "clear the slot" (prune-on-flush rule).
          if (isAbsent(value)) {
            delete mergedMut[slot];
          } else {
            mergedMut[slot] = value;
          }
          editedPaths.push({
            path: `vertex_metadata[${path}]/${slot}`,
            op: 'set',
          });
        }

        byPath.set(path, merged);
      }

      // Prune entries that have no populated fields (label/tags/note all absent)
      const nextVm: VertexMetadata[] = [];
      for (const entry of byPath.values()) {
        const hasLabel = !isAbsent(entry.label);
        const hasNote = !isAbsent(entry.note);
        const hasTags = Array.isArray(entry.tags) && entry.tags.length > 0;
        if (hasLabel || hasNote || hasTags) {
          nextVm.push(entry);
        }
      }

      if (nextVm.length === 0) {
        delete nextProps['vertex_metadata'];
      } else {
        nextProps['vertex_metadata'] = nextVm;
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    return {
      ...feature,
      properties: nextProps as unknown as BaseFeatureProperties,
    } as FeatureForEdit;
  });

  return { nextFeatures, editedPaths };
}
