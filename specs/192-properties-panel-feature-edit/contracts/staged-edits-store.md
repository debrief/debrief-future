# Contract — Staged-edits buffer (refreshed: in-ActivityPanel hook)

**Owner**: `shared/components/src/ActivityPanel/useStagedEdits.ts` (NEW)
**Consumers**: `FeatureEditorMode`, `SubFeatureEditorMode`,
`MultiSelectSummaryMode` (read-only consumer), `saveSession` flush hook,
`revertControl`

Per `/speckit.review` decision 2A: the staging buffer is a `useReducer`
hook colocated with `ActivityPanel`. **Not** a Zustand store. **Not** a
new session-state slice.

## State shape

```ts
import type { VertexMetadata, BaseFeatureProperties, TrackProperties } from '@debrief/schemas';

type PlotEditableProperties     = /* generated subset of STAC item LinkML */;
type FeatureEditableProperties  = /* generated subset of feature properties */;
type VertexEditableProperties   = Pick<VertexMetadata, 'label' | 'tags' | 'note'>;
type FieldKey                   = keyof FeatureEditableProperties;

interface StagedEdits {
  plot?: Partial<PlotEditableProperties>;
  byFeature: Record<string /* featureId */, Partial<FeatureEditableProperties>>;
  byVertex: Record<
    string /* featureId */,
    Record<string /* path: positions/N | rings/R/vertices/V | vertices/N | vertex/0 */, Partial<VertexEditableProperties>>
  >;
  revertedFields: Record<string /* featureId */, Set<FieldKey>>;
}
```

## Hook surface

```ts
export function useStagedEdits(): {
  state: StagedEdits;
  isDirty: () => boolean;
  setFeatureField:  (featureId: string, slot: FieldKey, next: unknown, current: unknown) => void;
  setVertexField:   (featureId: string, path: string, slot: keyof VertexEditableProperties, next: unknown, current: unknown) => void;
  revertField:      (featureId: string, slot: FieldKey) => void;
  unrevertField:    (featureId: string, slot: FieldKey) => void;  // analyst undoes a revert before save
  applyEditsToFeatures: (features: Feature[]) => { nextFeatures: Feature[]; editedPaths: ProvenancePath[] };
  clearAll: () => void;   // invoked by saveSession on successful flush
};
```

## Setter semantics

- **`setFeatureField`** / **`setVertexField`**: compute `equal(next, current)`
  via a deep-equality helper keyed off the LinkML slot type. If equal,
  prune the entry (and the per-feature / per-vertex partial if it
  becomes empty). Synchronous reducer updates only.
- **`revertField`** (FR-024): drop any staged entry for `(featureId, slot)`
  from `byFeature`; add `slot` to `revertedFields[featureId]`. The
  `applyEditsToFeatures` flush translates "reverted" into "slot
  absent from the saved feature" (NOT `null`/empty).
- **`unrevertField`**: removes `slot` from `revertedFields[featureId]`
  (used when the analyst undoes a revert in the same session before
  saving).

## Flush

`applyEditsToFeatures(features)` is **pure** in `state`. Behaviour:

1. **Plot-level edits** apply to the STAC item's properties (the #447
   plot-editor path, untouched here).
2. **Feature-level edits**: shallow-merge `byFeature[id]` into
   `feature.properties`.
3. **Reverted fields**: remove every `slot` in `revertedFields[id]` from
   `feature.properties` (slot becomes absent — sparse-storage rule).
4. **Vertex-level edits**: merge into `feature.properties.vertex_metadata`:
   - find an entry by `path`; if exists, merge field-by-field; otherwise
     append a new `VertexMetadata` entry with that `path`;
   - after merge, if the entry has no populated fields (label/tags/note
     all absent), remove the entry (FR-010);
   - if the resulting `vertex_metadata` array is empty, omit the slot
     entirely.
5. **`editedPaths`**: list of LinkML field paths used by
   `appendProvenance` (R-006). Feature-level paths use the slot name;
   reverted slots use `<slot>` (no decoration — the LogEntry's source
   is `user revert`); vertex-level paths use `vertex_metadata[<path>]/<slot>`.

Flush does not mutate `state`; `clearAll()` is invoked by the caller
after the writer succeeds.

## Invariants

1. **Sparse pruning is total.** After every setter/reverter the buffer
   contains no empty partials.
2. **No persistence.** In-memory only; never serialised; cleared on
   successful save; **preserved on failed save** (US-5 AS-3).
3. **Selection-independent.** Selection actions (`setSelection`,
   `clearSelection`) MUST NOT touch the buffer.
4. **One write path.** All flushes go through `applyEditsToFeatures` →
   `saveSession` → writer abstraction (Article IV.4).

## Vitest cases

```text
useStagedEdits
  ├── setFeatureField stores value
  ├── setFeatureField with value === current prunes the entry
  ├── pruning removes empty feature partials
  ├── setVertexField stores per-(featureId, path)
  ├── isDirty true after any setter; false after pruning to empty
  ├── revertField adds slot to revertedFields and prunes staged override
  ├── unrevertField removes slot from revertedFields
  ├── selection change does not touch the buffer
  ├── applyEditsToFeatures merges feature-level edits
  ├── applyEditsToFeatures DROPS reverted slots from saved feature.properties
  ├── applyEditsToFeatures appends a new VertexMetadata entry by path
  ├── applyEditsToFeatures merges into an existing VertexMetadata entry by path
  ├── applyEditsToFeatures prunes entries that become empty
  ├── applyEditsToFeatures omits vertex_metadata entirely when array empty
  ├── applyEditsToFeatures returns correct editedPaths for provenance
  └── clearAll wipes the buffer
```
