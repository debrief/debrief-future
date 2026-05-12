# Phase 1 — Data Model (refreshed)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Date**: 2026-05-12 (refresh)

This document captures the on-disk schema change (LinkML) and the
in-memory shapes (TypeScript) introduced by feature 192. The schema
change is **one** new class on `BaseFeatureProperties` — by inheritance
it reaches `TrackProperties` and the seven annotation classes.

---

## 1. LinkML schema change

### 1.1 New class — `VertexMetadata`

In `shared/schemas/src/linkml/common.yaml`, alongside `BaseFeatureProperties`.

| Slot     | Range     | Cardinality | Notes |
|----------|-----------|-------------|-------|
| `path`   | `string`  | 1..1        | Structured selection-path (R-008). Pattern enforced per parent geometry kind (see §1.3). Acts as the identity within the array. |
| `label`  | `string`  | 0..1        | Free-text short label (e.g., "intercept", "exclusion zone N corner"). |
| `tags`   | `string`  | 0..*        | Multivalued tag list. |
| `note`   | `string`  | 0..1        | Free-text long note. |

An entry is **valid only if** at least one of `label`, `tags`, `note` is
populated (FR-010). Otherwise the entry MUST be omitted on write (the
flush function prunes; see §2.3).

### 1.2 New slot on `BaseFeatureProperties`

| Slot              | Range            | Cardinality | Notes |
|-------------------|------------------|-------------|-------|
| `vertex_metadata` | `VertexMetadata` | 0..*        | Sparse list of per-vertex metadata, keyed by `path`. Empty arrays MUST be omitted. Duplicate `path` values MUST be rejected. |

Every class inheriting from `BaseFeatureProperties` gets the slot:

- `TrackProperties` (geojson.yaml:390–504)
- `NarrativeEntryProperties`, `CircleAnnotationProperties`,
  `LineAnnotationProperties`, `PolygonAnnotationProperties`,
  `TextAnnotationProperties`, `ReferenceLocationProperties` (annotations.yaml + geojson.yaml)
- Any future feature class that inherits the base

(`CircleAnnotationProperties` is included for inheritance correctness;
in practice circles have no per-vertex address — only centre/radius —
so the slot will remain empty there. The schema doesn't need to special-
case this: sparse storage handles it.)

### 1.3 Path-pattern validation (per parent geometry)

The `path` slot is validated by **the writer/flush function** against
the parent feature's geometry kind, using these patterns:

| Geometry | Pattern (regex) |
|---|---|
| Track (positions) | `^positions/[0-9]+$` |
| Polygon | `^rings/[0-9]+/vertices/[0-9]+$` |
| LineString | `^vertices/[0-9]+$` |
| MultiPoint | `^vertices/[0-9]+$` |
| Point | `^vertex/0$` |

LinkML adherence tests cover both:

- **Class-level**: `VertexMetadata.path` matches the union of all
  patterns (so a generic LinkML round-trip works).
- **Cross-class**: each fixture exercises the pattern that matches its
  parent geometry.

### 1.4 Backwards compatibility

- Optional slot (`0..*`). Existing plot files without it round-trip
  unchanged.
- Pre-release freedom (Article XIV.1) applies — no migration code.

---

## 2. In-memory shapes (TypeScript)

### 2.1 `VertexMetadata` (generated)

Imported from `@debrief/schemas`. Shape mirrors §1.1.

### 2.2 `BaseFeatureProperties.vertex_metadata` (generated)

`VertexMetadata[] | undefined` — undefined when no vertices on this
feature have annotations.

### 2.3 Staged-edit buffer — `StagedEdits` (panel-local, in-memory)

Owned by `useStagedEdits()` in `shared/components/src/ActivityPanel/useStagedEdits.ts`.
Held as `useReducer` state inside `ActivityPanel`. Never persisted
directly. Flushed into `Feature.properties` on plot save.

```ts
type StagedEditKey =
  | { kind: 'plot' }
  | { kind: 'feature'; featureId: string }
  | { kind: 'vertex'; featureId: string; path: string };

interface StagedEdits {
  plot?: Partial<PlotEditableProperties>;
  byFeature: Record<string, Partial<FeatureEditableProperties>>;
  byVertex: Record<
    string /* featureId */,
    Record<string /* path */, Partial<VertexEditableProperties>>
  >;
  // R-011: paths reverted this session (override removed; on flush, the slot
  //         is OMITTED from the saved feature.properties — sparse rule).
  revertedFields: Record<string /* featureId */, Set<FieldKey>>;
}

type VertexEditableProperties = Pick<VertexMetadata, 'label' | 'tags' | 'note'>;
```

Invariants:

1. **Survives selection changes** — entries are never auto-cleared on
   navigation (FR-006, FR-009, US-3 AS-3).
2. **Cleared only on successful save**; preserved on failed save
   (US-5 AS-3 + R-003 escalation).
3. **Sparse** — prune-on-equality rule applies to all setters; empty
   feature/vertex partials are removed.
4. **No `any`** — all slot keys typed against the LinkML-generated
   types (Article XV).
5. **O(1) lookup on read**. `byVertex[featureId]` is keyed by `path`
   string; `useMemo` builds a `Map<path, entry>` from the feature's
   `vertex_metadata[]` once per feature change for the read-time
   lookup the form needs at mode-swap time.

### 2.4 `EditingMode`

```ts
type EditingMode =
  | { kind: 'plot' }
  | { kind: 'feature'; featureId: string }
  | { kind: 'subfeature'; featureId: string; path: string }   // R-008 path string
  | { kind: 'multi'; featureIds: string[] }
  | { kind: 'stale' };
```

Derived purely from `(plot.features, selection)` — see
`contracts/selection-mode.md`.

### 2.5 Read-only signal (NEW)

Added to the `plot` slice of `@debrief/session-state`:

```ts
interface PlotSliceState {
  // … existing fields …
  /**
   * Derived read-only flag. True if either:
   *   - the writer's CapabilityReport.persistent is false for this plot's host, OR
   *   - the most recent saveSession() returned a ReadOnlyFilesystemError
   *     (or matching Node EACCES/EPERM error code).
   * Most-restrictive precedence: any signal saying "read-only" wins.
   * Resets to false on a successful open of a writable plot.
   */
  readonly isReadOnly: boolean;
  /** Reason text shown in the banner; null when not read-only. */
  readonly readOnlyReason: string | null;
}
```

Consumers:

- `PropertiesPanel` reads it to disable inputs across every mode (FR-015).
- The selector is exposed (named export) so future write-capable panels
  can subscribe; **wiring them is Out of Scope here** (FR-019).

### 2.6 Multi-select selection (existing shape, new emitter)

`selection.featureIds: string[]` + `selection.primary: string | null`.
Shape unchanged. Click-handler glue gains the modifier semantics:

| User action | `selection.featureIds` after | `selection.primary` after |
|---|---|---|
| Plain click on `B` (current: `[A]`) | `[B]` | `B` |
| Ctrl/Cmd-click on `B` (current: `[A]`) | `[A, B]` | `B` |
| Ctrl/Cmd-click on `A` (current: `[A, B]`) | `[B]` | `B` |
| Plain click on `C` (current: `[A, B]`) | `[C]` | `C` |
| Click in empty space (current: `[A]`) | `[]` | `null` |

---

## 3. Entity relationships

```text
STAC Item (plot)  ────────── isReadOnly (NEW derived)
└── GeoJSON FeatureCollection
    └── Feature
        ├── geometry      (untouched)
        └── properties (BaseFeatureProperties → concrete subclass)
            ├── existing slots (kind, tags, provenance, …)
            └── vertex_metadata: VertexMetadata[]   ← NEW (inherited from base)
                ├── { path: "positions/4",          label: "intercept" }
                ├── { path: "rings/0/vertices/3",   note: "NE corner" }
                └── { path: "vertices/2",           tags: ["recurring-fix"] }
```

Selection → editing-target:

```text
selection.primary = null                              → plot
selection.primary = "<featureId>"                     → feature
selection.primary = "<featureId>/<vertex-path>"       → subfeature (path string)
|selection.featureIds| > 1                            → multi
(any selection refers to absent feature/vertex)       → stale → plot
```

---

## 4. State transitions

```text
EditingMode = plot
    | analyst clicks 1 feature (plain)     → EditingMode = feature
    | analyst Ctrl/Cmd-clicks adds 2nd      → EditingMode = multi
    | analyst clicks a vertex (any geom)    → EditingMode = subfeature
    | (selection cleared)                   → EditingMode = plot

EditingMode = feature
    | analyst types in field F              → byFeature[id][F] set; dirty=true
    | analyst clicks revert(F)              → byFeature[id][F] pruned; revertedFields[id] += {F}; dirty per state
    | analyst saves plot                    → flush; on success clear + dirty=false; on RO failure preserve + isReadOnly=true
    | feature deleted under us              → EditingMode = stale → plot

EditingMode = subfeature
    | analyst fills label/tags/note         → byVertex[id][path][k] set; dirty=true
    | path no longer valid                  → form "out-of-range" notice; save disabled
    | analyst saves plot                    → flush as a VertexMetadata entry on parent
```

---

## 5. Validation matrix

| Rule | Where enforced | Surfaced as |
|---|---|---|
| `VertexMetadata.path` matches geometry pattern | LinkML adherence + flush-time check against parent geometry | Inline error; save aborted with offending-features toast |
| No duplicate `path` per feature | LinkML adherence | Schema-validation error on save |
| Empty entry pruning | flush function | Silent prune |
| `vertex_metadata` empty array → slot omitted | flush function | Silent omission |
| Selection refers to absent feature/vertex | `selectionMode.ts` resolver | Fall back to plot + `clearSelection()` |
| Multi-select divergence | `MultiSelectSummaryMode` derivation | `(differs)` token; inputs disabled |
| Read-only + save attempted | `saveSession` + UI consumer | No write, no provenance, banner update, single notice |
| Revert on field with no auto-derived value | `useStagedEdits` derivation | Revert control disabled + tooltip |
