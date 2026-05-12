# Phase 1 — Data Model

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Date**: 2026-05-12

This document captures the on-disk schema change (LinkML) and the
in-memory shapes (TypeScript) that this feature introduces. All
on-disk shapes are LinkML — the TS shapes are generated from them.

---

## 1. LinkML schema change

### 1.1 New class — `PositionMetadata`

Lives in `shared/schemas/src/linkml/common.yaml` alongside the existing
`TimestampedPosition` class. Optional, sparse, additive.

| Slot     | Range            | Cardinality | Notes |
|----------|------------------|-------------|-------|
| `index`  | `integer`        | 1..1        | 0-based index into `geometry.coordinates`. Acts as the identifier when the entry is serialised inside a list. Validation: `>= 0`. |
| `label`  | `string`         | 0..1        | Free-text short label (e.g., "intercept"). |
| `tags`   | `string`         | 0..*        | Multivalued tag list. Schema uniqueness applied at validation. |
| `note`   | `string`         | 0..1        | Free-text long note. |

An entry is **valid only if** at least one of `label`, `tags`, `note` is
populated (FR-010 — sparse storage). Otherwise the entry MUST be omitted
on write.

### 1.2 New slot on `TrackProperties`

In `shared/schemas/src/linkml/geojson.yaml`, alongside `tags`, the
per-platform overrides, etc.:

| Slot                | Range              | Cardinality | Notes |
|---------------------|--------------------|-------------|-------|
| `position_metadata` | `PositionMetadata` | 0..*        | Sparse list of per-position metadata, keyed by `index`. Order is not significant; readers MUST treat duplicate `index` values as a validation error. |

### 1.3 Constraints / validation rules

- Every `PositionMetadata.index` MUST be in the range `[0, coordinates.length)`.
- `position_metadata` MUST NOT contain duplicate `index` values.
- An empty `position_metadata` SHOULD be omitted entirely from the
  serialised feature (no `"position_metadata": []`).
- Adherence tests cover round-trip across Python → JSON → TypeScript →
  JSON → Python and golden fixtures (valid + invalid) per
  CONSTITUTION.md §"Schema Test Strategy".

### 1.4 Backwards compatibility

- New slot is optional (`0..*`). Existing plot files without the slot
  parse unchanged and round-trip lossless.
- Pre-release freedom (Constitution XIV.1) applies — no migration
  scaffolding required.

---

## 2. In-memory shapes (TypeScript)

Generated from LinkML; this section documents their use, not their
declaration.

### 2.1 `PositionMetadata` (generated)

Imported from `@debrief/schemas`. Shape mirrors §1.1.

### 2.2 `TrackProperties.position_metadata` (generated)

`PositionMetadata[] | undefined` — `undefined` when the feature has no
point-level annotations.

### 2.3 Staged-edit buffer — `StagedEdits` (panel-owned, in-memory only)

Lives next to `shared/components/src/PropertiesPanel/stagedEditsStore.ts`.
Held in Zustand under the existing session-state store; never persisted
directly. Flushed into `Feature.properties` on plot save.

```ts
type StagedEditKey =
  | { kind: 'plot' }
  | { kind: 'feature'; featureId: string }
  | { kind: 'position'; featureId: string; index: number };

type StagedEdits = {
  // Sparse partials keyed by the editing target. Plot-level entry
  // exists at most once; per-feature entries one per feature; per-
  // position entries one per (featureId, index).
  plot?: Partial<PlotEditableProperties>;
  byFeature: Record<string, Partial<FeatureEditableProperties>>;
  byPosition: Record<string /* featureId */, Record<number /* index */, Partial<PositionMetadata>>>;
};
```

Invariants:

1. **Survives selection changes** — entries are never auto-cleared when
   the user navigates between selections (FR-006, FR-009, US-1 AS-3).
2. **Cleared on save** — flushed to the plot file and pruned on
   successful save (FR-006, FR-009, FR-013).
3. **Sparse** — only fields whose value differs from the current
   `Feature.properties` are present; setting a value back to its current
   value MUST remove the entry to keep the dirty indicator honest.
4. **No `any`** — all slot keys are typed against the LinkML-generated
   types (Constitution XV).

### 2.4 `EditingMode` (panel-owned discriminator)

```ts
type EditingMode =
  | { kind: 'plot' }
  | { kind: 'feature'; featureId: string }
  | { kind: 'subfeature'; featureId: string; index: number }
  | { kind: 'multi'; featureIds: string[] }
  | { kind: 'stale' };
```

Derived purely from `(plot.features, selection)` — see
`contracts/selection-mode.md`. The `stale` branch triggers a fall-back
to `plot` mode and a `clearSelection()` dispatch in the same render
cycle (R-005).

---

## 3. Entity relationships

```text
STAC Item (plot)
└── GeoJSON FeatureCollection
    └── Feature  (= one track / shape / annotation)
        ├── geometry            (existing — untouched)
        │   └── coordinates[]
        └── properties
            ├── existing fields (tags, debrief:feature_tags, per-platform overrides …)
            └── position_metadata: PositionMetadata[]   ← NEW (sparse, optional)
                ├── { index: 4, label: "intercept", tags: ["foxtrot"] }
                └── { index: 42, note: "speed change observed" }
```

Selection → editing-target mapping (canonical):

```text
selection.primary = null                       → EditingMode.plot
selection.primary = "<featureId>"              → EditingMode.feature
selection.primary = "<featureId>/positions/N"  → EditingMode.subfeature
|selection.featureIds| > 1                     → EditingMode.multi
(selection points to a feature that no longer exists)  → EditingMode.stale → plot
```

---

## 4. State transitions

```text
EditingMode = plot
    | user selects 1 feature        → EditingMode = feature
    | user selects 2+ features      → EditingMode = multi
    | user selects a position path  → EditingMode = subfeature
    | (selection cleared)           → EditingMode = plot

EditingMode = feature
    | user types in a field         → StagedEdits.byFeature[id] updated; dirty=true
    | user saves plot               → flush + clear dirty
    | user selects same field again with same value → entry pruned; dirty=false (if no other edits remain)
    | feature deleted under us      → EditingMode = stale → plot

EditingMode = subfeature
    | user fills label/tags/note    → StagedEdits.byPosition[id][N] updated; dirty=true
    | user saves plot               → flush as PositionMetadata entry on parent feature; sparse rules apply
    | index goes out of range       → form shows "out-of-range" notice; save disabled
```

---

## 5. Validation matrix

| Rule | Where enforced | Surfaced as |
|------|----------------|-------------|
| `position_metadata[].index` in `[0, coordinates.length)` | LinkML adherence + write-time check in the flush function | Inline error on the offending input; save aborted with a single error toast that lists offending features |
| No duplicate `index` per feature | LinkML adherence | Schema-validation error on save (Constitution I.3 — no silent failures) |
| Empty entry pruning (all three fields blank) | Flush function in `stagedEditsStore.ts` | Silent prune; not an error |
| Selection refers to non-existent feature | `selectionMode.ts` resolver | Fall back to plot mode + `clearSelection()` |
| Multi-select summary divergence | `MultiSelectSummaryMode.tsx` derivation | Render `(differs)` token; inputs disabled |
