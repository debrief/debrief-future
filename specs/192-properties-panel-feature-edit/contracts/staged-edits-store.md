# Contract — Staged-edits store

**Owner**: `shared/components/src/PropertiesPanel/stagedEditsStore.ts`
(extends the buffer introduced in #447)
**Consumers**: `FeatureEditorMode.tsx`, `SubFeatureEditorMode.tsx`,
`PlotEditorMode.tsx`, `saveSession` flush hook

This contract pins the in-memory shape of un-flushed edits and the
operations the mode components use to read and mutate it. It is the
single anchor for FR-006, FR-009, FR-010, FR-013, and SC-005.

---

## State shape

```ts
type PlotEditableProperties     = /* generated from STAC item LinkML */;
type FeatureEditableProperties  = /* generated subset of TrackProperties */;
type PositionEditableProperties = Pick<PositionMetadata, 'label' | 'tags' | 'note'>;

interface StagedEdits {
  plot?: Partial<PlotEditableProperties>;
  byFeature: Record<string /* featureId */, Partial<FeatureEditableProperties>>;
  byPosition: Record<
    string /* featureId */,
    Record<number /* index */, Partial<PositionEditableProperties>>
  >;
}
```

Every field key MUST be a known LinkML slot name. No string-keyed
escape hatches; no `any`.

---

## Operations

### Read

```ts
getStagedFeatureEdit(state, featureId): Partial<FeatureEditableProperties> | undefined
getStagedPositionEdit(state, featureId, index): Partial<PositionEditableProperties> | undefined
isDirty(state): boolean
```

`isDirty` returns true iff at least one entry survives sparse pruning.
Equivalent to "the save button should be active".

### Write

```ts
setFeatureField(featureId, slotName, nextValue, currentValue): void
setPositionField(featureId, index, slotName, nextValue, currentValue): void
clearAll(): void  // called by saveSession after a successful flush
```

Both setters MUST:

1. Compute `equal(nextValue, currentValue)` via a deep equality helper
   keyed off the LinkML slot type. If equal, **prune** the entry
   (the field is no longer "edited").
2. After pruning, if a feature's partial becomes empty, prune the
   feature's entry too. Same for the position's entry.
3. Never block on I/O — they are synchronous Zustand updates.

### Flush (called by `saveSession` immediately before write)

```ts
applyEditsToFeatures(features: Feature[], state: StagedEdits): {
  nextFeatures: Feature[];
  editedPaths: ProvenancePath[];
}
```

Behaviour:

- **Plot-level edits** apply to the STAC item's properties (existing
  #447 behaviour, untouched).
- **Feature-level edits** spread into `feature.properties` for each
  edited feature.
- **Position-level edits** are merged into `feature.properties.position_metadata`:
  - If an entry with the same `index` exists, merge field-by-field.
  - Otherwise append a new `PositionMetadata` entry.
  - After merge, if the entry has no populated fields (label/tags/note
    all empty), **remove** it (FR-010 — sparse storage).
  - If the resulting `position_metadata` array is empty, omit the slot
    entirely (no `"position_metadata": []`).
- `editedPaths` is the list of LinkML field paths used by
  `appendProvenance` (R-006). Position-level paths use the prefix
  `position_metadata[<index>]/`.

Flush is **pure** in `state` (does not mutate it); the caller invokes
`clearAll()` after a successful write to the writer abstraction
(Constitution IV.4).

---

## Invariants

1. **Sparse pruning is total.** After every setter, the store contains
   no empty partials.
2. **No persistence.** The buffer is in-memory only; never written to
   disk except via `applyEditsToFeatures` + the existing writer.
3. **Survives selection changes.** Selection actions (`setSelection`,
   `clearSelection`) MUST NOT touch the staged-edits store.
4. **One write path.** All flushes go through `applyEditsToFeatures` —
   no per-mode component writes directly to features.

---

## Tests (Vitest)

```text
stagedEditsStore
  ├── setFeatureField stores the value
  ├── setFeatureField with value === current prunes the entry
  ├── setFeatureField pruning removes empty feature partials
  ├── setPositionField stores per-(featureId, index)
  ├── isDirty true after setFeatureField, false after pruning back
  ├── selection change does not touch the store
  ├── applyEditsToFeatures merges feature-level edits
  ├── applyEditsToFeatures appends a new PositionMetadata entry
  ├── applyEditsToFeatures merges into an existing PositionMetadata entry by index
  ├── applyEditsToFeatures removes an entry that becomes empty
  ├── applyEditsToFeatures omits position_metadata entirely if the array becomes empty
  ├── applyEditsToFeatures returns the correct editedPaths for provenance
  └── clearAll wipes the buffer (only called after a successful save)
```
