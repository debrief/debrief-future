# Data Model: SystemState migration

**Feature**: `261-session-state-systemstate`
**Phase**: 1 (design)
**Date**: 2026-05-19

This document enumerates the entities the feature touches, their shapes, the relationships between them, and the state transitions they undergo. Wire formats and API surfaces are in `contracts/`. Field-level mappings between the sidecar and the new in-plot home are in `contracts/slice-mappings.md`.

---

## Entity 1: `SystemStateProperties` (LinkML — extended by this work)

**Definition source**: `shared/schemas/src/linkml/geojson.yaml` (existing class, modified).

**Shape post-migration** (all fields):

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | string (literal `"SYSTEM"`) | yes | Distinguishes SystemState features from spatial features. |
| `state_type` | `SystemStateTypeEnum` | yes | Discriminator: `temporal` / `spatial` / `selection` / `active_storyboard`. |
| `provenance` | `LogEntry[]` | yes | Append-only audit trail (Article III.3). Per review 2A — uses existing LinkML LogEntry fields verbatim, no new fields added. |
| `start_time` | datetime | conditional | Required when `state_type=temporal`. |
| `end_time` | datetime | conditional | Required when `state_type=temporal`. |
| `current_time` | datetime | **NEW — optional** | The playhead at save time. Only meaningful when `state_type=temporal`. Optional initially per FR-016 (may tighten to required after a deprecation cycle). Cross-field invariant: when present, must lie in `[start_time, end_time]` (FR-018 — R-011). |
| `viewport` | `ViewportPolygon` | conditional | Required when `state_type=spatial`. Per review 1B — replaces the parallel `bbox`/`zoom`/`center` fields. Identity-mapped to `SpatialSlice.viewport`. |
| `selected_ids` | string[] | conditional | Required when `state_type=selection`. May be empty array (= "explicit no-selection"). |
| `active_storyboard_id` | string \| null | conditional | Required when `state_type=active_storyboard`. `null` = "explicit no pin"; absence of the feature entirely = "no preference, use default" (different semantics). |

**Conditional-required semantics** are enforced by a LinkML `rules:` block keyed on `state_type`. The Pydantic and TS bindings reflect this at runtime via the discriminated-union shape (R-005).

**Why one class with optional fields rather than four sub-classes**: matches the existing LinkML structure (#215), keeps the wire format flat for human inspection of plot files, and lets the discriminated-union narrowing happen at the runtime validator boundary rather than at the type-generator level.

**Schema delta** vs pre-migration: one field added (`current_time`), no fields renamed or removed. Additive minor bump per Article II.3.

---

## Entity 2: `SystemStateTypeEnum`

**Definition source**: `shared/schemas/src/linkml/common.yaml` (existing, unchanged by this work).

**Permissible values** (post-migration, no change from pre-migration):

- `temporal`
- `spatial`
- `selection`
- `active_storyboard`

This work does NOT add new enum values. It activates the three values (`temporal`, `spatial`, `selection`) that #215 modelled but #237 left unproduced.

---

## Entity 3: `SystemState` Feature (the GeoJSON wire shape)

**Definition**: A GeoJSON `Feature` whose `properties` conform to `SystemStateProperties`. The `geometry` field is **always `null`** (these features have no spatial extent — they're state-bearing, not geographic).

**Example — temporal variant** (provenance shape per review 2A — uses existing LinkML LogEntry fields):

```json
{
  "type": "Feature",
  "id": "sys-temporal-01HZ0EXAMPLE",
  "geometry": null,
  "properties": {
    "kind": "SYSTEM",
    "state_type": "temporal",
    "start_time": "2024-01-01T00:00:00Z",
    "end_time": "2024-01-07T00:00:00Z",
    "current_time": "2024-01-03T14:30:00Z",
    "provenance": [
      {
        "activity_id": "01HZ0PROV0EXAMPLE",
        "timestamp": "2026-05-19T10:14:22Z",
        "agent": "alice@machine-7",
        "activity_type": "created",
        "was_generated_by": {
          "tool": "vscode-extension",
          "tool_version": "0.4.2"
        },
        "used": [],
        "generated": ["sys-temporal-01HZ0EXAMPLE"],
        "execution_duration": "PT0S"
      }
    ]
  }
}
```

**Example — spatial variant** (post-1B — viewport carries ViewportPolygon identity, not bbox+center):

```json
{
  "type": "Feature",
  "id": "sys-spatial-01HZ1EXAMPLE",
  "geometry": null,
  "properties": {
    "kind": "SYSTEM",
    "state_type": "spatial",
    "viewport": {
      "coordinates": [
        { "longitude": -3.5, "latitude": 51.5 },
        { "longitude":  2.5, "latitude": 51.5 },
        { "longitude":  2.5, "latitude": 50.0 },
        { "longitude": -3.5, "latitude": 50.0 }
      ],
      "zoom": 8
    },
    "provenance": [ /* same shape as above */ ]
  }
}
```

**ID convention**: `sys-<state_type>-<ULID>`. ULIDs (already a project dependency) make IDs sortable by creation time without colliding across hosts. The helper allocates the ID on **first** write; subsequent writes for the same `state_type` reuse the existing feature's ID (per FR-008).

**Cardinality invariant**: At most one `SystemState` feature per `state_type` per `FeatureCollection` (FR-003). Multiple is a load error.

---

## Entity 4: `SystemStateMap` (runtime helper output)

**Definition**: The typed map the helper returns from `readSystemStateFromFeatureCollection(fc)`. Lives in the helper's public API surface (`services/session-state/src/system-state/index.ts`).

**TypeScript shape** (illustrative — actual derivation is from generated types):

```typescript
import type { SystemStateProperties, SystemStateTypeEnum } from '@debrief/schemas';

type VariantOf<K extends SystemStateTypeEnum> =
  Extract<SystemStateProperties, { state_type: K }>;

export interface SystemStateMap {
  temporal?: VariantOf<'temporal'>;
  spatial?: VariantOf<'spatial'>;
  selection?: VariantOf<'selection'>;
  active_storyboard?: VariantOf<'active_storyboard'>;
}
```

**Key invariant**: every key is **either absent or fully-typed**. A `temporal` entry that exists has all of `start_time`, `end_time`, `current_time?` and `provenance` — there is no partially-populated state in the runtime shape. Parsing-time validation (R-005) rejects partial features at the boundary.

**Why `VariantOf<K>` rather than the verbatim union**: Article IV.5 — boundary types are derived structurally, not re-listed. The `Extract<…>` form makes new variants in LinkML automatically extend the map shape via `SystemStateProperties`'s widened union.

---

## Entity 5: `SessionFile` sidecar (existing — modified shape post-migration)

**Definition source**: `services/session-state/src/persistence/load.ts` (existing `SessionFile` interface).

**Pre-migration shape** (today):

```typescript
interface SessionFile {
  $schema: string;
  version: "1.1.0";
  savedAt: string;            // ISO-8601
  temporal: TemporalSlice;    // full Zustand slice (~7 fields)
  spatial: SpatialSlice;      // full Zustand slice (~5 fields)
  features: FeaturesSlice;    // full Zustand slice including selection
}
```

**Post-migration shape**:

```typescript
interface SessionFile {
  $schema: string;
  version: "1.2.0";            // bumped (R-004)
  savedAt: string;
  migration_lineage?: {        // NEW — optional, diagnostic only (R-004)
    schema_version_at_write: string;
    migrated_variants: SystemStateTypeEnum[];
  };
  temporal: PartialOmit<TemporalSlice, MigratedTemporalFields>;
  spatial: PartialOmit<SpatialSlice, MigratedSpatialFields>;
  features: PartialOmit<FeaturesSlice, MigratedSelectionFields>;
}
```

Where `MigratedXFields` are the keys enumerated in `contracts/slice-mappings.md`. The `PartialOmit` pattern (a `Pick<>` over the non-migrated keys, with optionality preserved) is a derived boundary type per Article IV.5 — not hand-rewritten.

**Old sidecar compatibility**: A `1.1.0` sidecar opened under post-migration code: the helper sees `version === "1.1.0"` and reconciles **as if** the plot file had no SystemState features for the migrated variants — i.e. all values come from the sidecar. On next save, the sidecar is rewritten as `1.2.0` with migrated fields dropped; the SystemState features now exist in the plot.

---

## Entity 6: Slice (existing — unchanged shape)

The three Zustand slices (`temporal`, `spatial`, `features`) keep their **in-memory shape** unchanged. The store API and the slice interfaces stay byte-identical pre- and post-migration. Only the persistence wiring (`load.ts`, `save.ts`) changes.

This is deliberate per spec Key Entities: "Session-state Zustand store: …Unchanged in shape — its `loadSession` and `saveSession` boundaries gain the new responsibility of reading/writing `SystemState` Features alongside the sidecar."

---

## Relationships

```text
                       Plot File (*.plot.geojson)
                       ┌─────────────────────────────┐
                       │ FeatureCollection           │
                       │  ┌────────────────────┐     │
                       │  │ regular Features    │    │
                       │  │ (Track, Point, etc) │    │
                       │  └────────────────────┘     │
                       │  ┌────────────────────┐     │
                       │  │ SystemState        │     │  ←── at most one per state_type
                       │  │   state_type:      │     │
                       │  │     temporal       │     │
                       │  └────────────────────┘     │
                       │  ┌────────────────────┐     │
                       │  │ SystemState        │     │
                       │  │   state_type:      │     │
                       │  │     spatial        │     │
                       │  └────────────────────┘     │
                       │  ┌────────────────────┐     │
                       │  │ SystemState        │     │
                       │  │   state_type:      │     │
                       │  │     selection      │     │
                       │  └────────────────────┘     │
                       │  ┌────────────────────┐     │
                       │  │ SystemState        │     │
                       │  │   state_type:      │     │
                       │  │   active_storyboard│     │
                       │  └────────────────────┘     │
                       └─────────────────────────────┘
                                  │
                                  │ readSystemStateFromFeatureCollection()
                                  ▼
                          SystemStateMap
                                  │
                                  │ + sidecar (non-migrated fields)
                                  ▼
                          ┌────────────────┐
                          │ Zustand store  │
                          │  - temporal    │
                          │  - spatial     │
                          │  - features    │
                          │  - storyboard  │
                          └────────────────┘
                                  │
                                  │ saveSession() →
                                  ▼
                          Updated FeatureCollection  +  shrunken sidecar
```

The diagram emphasises the two persistence destinations and the asymmetry: SystemState features flow through the (existing) writer abstraction with the rest of the FeatureCollection; the sidecar continues to write via its existing path. The helper is the *transformer* — it doesn't own a write call.

---

## State transitions

The four `SystemState` features in a plot transition through three relevant runtime states:

```text
   absent ──── first save with new code ───▶ created
     ▲                                          │
     │                                          │ save with new value
     │                                          ▼
     │                                       updated  ──── save with same value ──▶ updated  (LogEntry still appended)
     │                                          │
     │ user explicitly clears via host UI       │
     └──────────────────────────────────────────┘
                       (out of scope of this work —
                        spec does not specify a "reset SystemState" command)
```

The `absent → created` transition writes a new Feature into the FeatureCollection with a fresh ULID. The `created/updated → updated` transition replaces the Feature's `properties` (preserving its `id`) and appends a `LogEntry`.

There is no `updated → absent` transition in this work — clearing a SystemState feature is out of scope. If a future feature wants "forget the saved bbox", it can either delete the feature outright (via direct FeatureCollection edit) or write a sentinel value; this work doesn't speculate.

---

## Validation rules

| Rule | Enforcement point | Article |
|---|---|---|
| `kind === "SYSTEM"` on every SystemState Feature | LinkML schema; Zod validator at load. | II.1 |
| `state_type` is one of the four enum values | LinkML schema; Zod validator at load. | II.1, XIV.4 |
| At most one Feature per `state_type` per FeatureCollection | Helper `read.ts` check during load. | FR-003 |
| Provenance array non-empty | Helper `write.ts` enforces — never writes without appending a LogEntry. | III.1 |
| Provenance is append-only | Helper `write.ts` only appends; type system enforces (no public mutators). | III.3 |
| Per-variant required fields populated (e.g. temporal requires start_time + end_time) | LinkML `rules` block; Pydantic at adherence-test gate; Zod at runtime load. | XIV.4 |
| `current_time` (when present) lies within `[start_time, end_time]` | Helper `validate.ts` cross-field check at runtime load. Throws `SystemStateLoadError(kind='cross-field-invariant')`. **Per review 3A / R-011.** | I.3, XIV.4 |
| `start_time ≤ end_time` (degenerate-window check) | Helper `validate.ts` cross-field check. Throws `SystemStateLoadError(kind='cross-field-invariant')`. | I.3, XIV.4 |
| VS Code save: FC write must succeed before sidecar write commits | Host save command (saveSession.ts) — FC-first, sidecar-second flow per R-012. **Per review 3A.** | I.3 |

---

## Per-variant detail

### `temporal`

- Migrated from sidecar: `temporal.timeRange.start` → `start_time`; `temporal.timeRange.end` → `end_time`; `temporal.currentTime` → `current_time` (Q2=B).
- Stays in sidecar (per-user): `temporal.playbackState`, `temporal.playbackRate`, `temporal.stepSize`, `temporal.displayMode`, `temporal.timeFilter`.
- Default when absent: derived from the plot's feature timestamps (existing behaviour — same as today's "no sidecar" path).

### `spatial`

- Migrated from sidecar: `spatial.viewport` → `viewport` (identity — same `ViewportPolygon` shape on both sides, per review 1B / R-010).
- Stays in sidecar (per-user): `spatial.rotation`, `spatial.drawingMode`, `spatial.drawingPaletteIndex`, `spatial.viewportLocked`.
- Default when absent: derived from the plot's bbox extent (existing behaviour).

### `selection`

- Migrated from sidecar: `features.selection` → `selected_ids` (Q1=B).
- Stays in sidecar (per-user): `features.hiddenFeatureIds`, `features.styleVersion`, `features.featureCollectionUri`.
- Default when absent: empty selection (existing behaviour).

### `active_storyboard`

- Migrated from #237's existing runtime: no new migration needed — already in the FeatureCollection. **This work consolidates the writer to the shared helper** (FR-011/FR-012) but does not change the wire shape (NG-004).
- Default when absent: platform default (whichever storyboard the application picks by default).

---

## Open issues for `/speckit.tasks`

- The exact ULID generation entry point — does the helper depend on a `ulid` library directly, or should it accept a generator from the caller (testability)? Tactical implementation detail; ADR-027 ULID guidance applies.
- Whether `LogEntry.host` exists today as a field on the LinkML `LogEntry` class — if not, this work adds it (additive minor bump on LogEntry too).
- Fixture naming convention — single fixture per variant, or "happy / variant-A / variant-B"? Should follow whatever convention `shared/schemas/fixtures/system-record/valid/` uses today.
