# Phase 0 — Research (refreshed)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-05-12 (refresh)

This document carries forward the prior round's decisions (R-001..R-007),
re-baselines them where `/speckit.review` forced corrections, and adds
four new decisions (R-008..R-011) for the scope expansion (US-4..US-7).
No `NEEDS CLARIFICATION` markers remain.

---

## R-001 (refreshed) — Where vertex-level metadata lives in the schema

**Decision**: Add **one** new LinkML class `VertexMetadata` (slots: `path`,
`label`, `tags`, `note`) and **one** new multivalued slot `vertex_metadata:
VertexMetadata` on `BaseFeatureProperties` at
`shared/schemas/src/linkml/common.yaml:336–349`. By inheritance every
feature class — `TrackProperties` plus the seven annotation classes
listed in R-008 — gains the slot. The address is a structured **string
path** (R-008), not an integer index, so the same class works across all
geometry kinds.

**Rationale**: Same as the prior round (kinematic round-trip safety,
sparse storage, single dispatcher path in `PropertiesForm`), now extended
across every geometry. Putting the slot on the base class also avoids the
N-fold duplication that per-geometry classes would require (one of the
rejected R-008 alternatives).

**Alternatives**: covered under R-008.

---

## R-002 (refreshed) — Selection path format for sub-feature mode

**Decision**: The sub-feature editor activates when `selection.primary`
parses as any geometry-bearing path: `<featureId>/positions/<index>` (Track
points per #053), `<featureId>/rings/<ring>/vertices/<v>` (Polygon),
`<featureId>/vertices/<v>` (LineString and MultiPoint), or
`<featureId>/vertex/0` (single-vertex Point). The existing
`parsePath` exported from `services/session-state/src/utils/selectionPath.ts:96`
returns a structured `ParsedPath { root, levels: PathLevel[], depth }` — the
resolver matches on `levels[0].levelName`.

**Rationale**: The path-level convention is set by #053 and the `parsePath`
parser already exists. Reusing it across geometries keeps the
sub-feature mode resolver one pure function with no per-geometry forks.

**Alternatives considered**: A structured `selection.primary` object —
rejected as before (wider blast radius than this feature warrants).

---

## R-002a (NEW) — Staging buffer ownership

**Decision** (per `/speckit.review` 2A): The staging buffer lives in
**`ActivityPanel` React state**, exposed via a colocated hook
`useStagedEdits()` in `shared/components/src/ActivityPanel/useStagedEdits.ts`.
Backed by `useReducer`. Passed down to `PropertiesForm` via existing
props (extending the `onCommitField` pattern that's already shipped). No
Zustand store, no `@debrief/components`-owned module.

**Rationale**: ActivityPanel is the existing controller. Putting the
buffer anywhere else duplicates state. Survives selection changes
(component remains mounted across selection); cleared on successful save;
preserved on failed save.

**Alternatives considered**:

- New Zustand store at `shared/components/src/PropertiesPanel/stagedEditsStore.ts`
  (the original plan's choice) — rejected as state duplication.
- A new slice in `@debrief/session-state` — rejected as unnecessary
  cross-package surface for what is a panel-local concern.

---

## R-003 (FLIPPED) — Read-only plot detection

**Decision** (US-5 — pulled into scope): The read-only signal is derived
in session-state, sourced from two inputs with most-restrictive
precedence:

1. **Pre-flight**: the writer abstraction's existing
   `CapabilityReport.persistent` (`shared/stac-writer/src/interface.ts:53–62`).
   When `persistent === false` for the open plot's host, the plot is
   read-only.
2. **Post-write escalation**: when `saveSession`
   (`services/session-state/src/persistence/save.ts:57–102`) returns
   `{ success: false, error }` and the error matches the
   `ReadOnlyFilesystemError` class (`apps/vscode/src/services/stacService.ts:76`)
   or a Node `EACCES`/`EPERM`, the plot transitions to read-only and
   the staging buffer is preserved.

The derived `isReadOnly: boolean` field is added to the existing `plot`
slice of session-state. The Properties Panel consumes it via the slice's
selector; other write-capable panels MAY subscribe to it in subsequent
features (the field is exposed; their UX wiring is Out of Scope here).

**Rationale**: Avoids inventing a duplicate "lock" field in the LinkML
schema when the writer already reports its capability. Avoids silent
failure (Article I.3) by escalating runtime errors into the same
boolean signal so the UI converges on one read-only path.

**Alternatives considered**:

- New `locked: boolean` slot on STAC item LinkML — rejected as
  redundant with `CapabilityReport.persistent`; would need its own
  source-of-truth contract.
- Attempt-and-catch only — rejected because the failure happens after
  the analyst types, so the first edit attempt produces a misleading
  state transition.
- Probe-only — rejected because filesystem permission can change at
  runtime (e.g., mount becomes RO); we need both.

---

## R-004 (refreshed) — Multi-select read-only summary derivation

**Decision**: Unchanged from prior round. Pure derivation in
`MultiSelectSummaryMode`, memoised on `(selection.featureIds, features-by-id)`.
O(features × fields), well under the 16 ms budget at the spec's caps.

**Rationale**: As before. Now that US-4 makes multi-select reachable,
the cap to confirm is **realistic**: an analyst rarely Ctrl/Cmd-clicks
more than ~10 features, which is two orders of magnitude under any
performance concern.

---

## R-005 (refreshed) — Stale-selection handling

**Decision**: Unchanged. Resolver returns `{ kind: 'stale' }`; panel
falls back to plot mode and dispatches `clearSelection()` from
`services/session-state/src/store/slices/features.ts:51–86`. The resolver
also returns `stale` when a vertex path is well-formed but the index
exceeds the geometry's vertex count (e.g., `rings/0/vertices/99` on a
4-vertex ring).

---

## R-006 (refreshed) — Provenance entry shape

**Decision**: Unchanged. Reuse `PROPERTIES_PANEL_TOOL_SENTINEL` +
`PropertiesProvenanceEntry` from `provenanceTypes.ts:12–31`. The call
site itself is **new** (corrected per `/speckit.review` 1A — was wrongly
described as existing). Lands inside the integrated save-path test
contract (R-007).

For sub-feature edits, `inputs[]` uses the path-prefix convention
`vertex_metadata[<path>]/`, where `<path>` is the structured selection
path used by the resolver (e.g., `positions/4`, `rings/0/vertices/3`).

---

## R-007 (refreshed) — Schema generation pipeline + integrated save-path test

**Decision** (per `/speckit.review` 3A):

1. Schema generation continues to use the existing `Makefile` at
   `shared/schemas/Makefile:8–24` — `make generate-{pydantic,jsonschema,typescript}`.
2. The integrated save-path is covered by a new Vitest file
   `shared/components/src/PropertiesPanel/__tests__/saveSession-integration.test.ts`
   that asserts in one flow: (a) given a non-empty staging buffer, (b)
   `saveSession` routes through the writer with merged feature shapes,
   (c) one `appendProvenance` call lands per affected feature with the
   correct `tool` / `method` / `inputs[]`, (d) the staging buffer is
   cleared on success, (e) `isDirty()===false` after success.

**Rationale**: Closes the silent-provenance failure mode identified
during `/speckit.review` (Article I.3 surface).

---

## R-008 (NEW) — Cross-geometry vertex-metadata shape

**Decision**: Single class `VertexMetadata` on `BaseFeatureProperties`
with a string `path` slot. The path follows the existing `selectionPath`
convention — one of:

| Geometry | Path shape | Example |
|---|---|---|
| Point | `vertex/0` | the implicit single vertex |
| LineString | `vertices/<index>` | `vertices/3` |
| MultiPoint | `vertices/<index>` | `vertices/3` |
| Polygon | `rings/<ring>/vertices/<index>` | `rings/0/vertices/3` |
| Track (positions) | `positions/<index>` | `positions/42` |

Validation: per-class `pattern` (regex) on the `path` slot enforces
geometry-appropriate shape during LinkML adherence. Duplicate `path`
values within one feature's `vertex_metadata` array are rejected.

**Rationale**:

1. **One slot, every geometry.** `BaseFeatureProperties` is the existing
   single inheritance point (common.yaml:330–349); adding the slot
   there gives the seven annotation classes + `TrackProperties` the
   capability for free. No fan-out across schemas.
2. **String path is already canonical** (#053). The same parser that
   drives mode selection drives validation. No second address model.
3. **Sparse, additive, round-trip-safe.** Empty arrays omitted on
   write; existing readers ignore the slot.

**Alternatives considered**:

- **Per-geometry classes** (`TrackPositionMetadata`, `PolygonVertexMetadata`,
  …): seven new classes; seven new slots; seven new generator targets;
  duplicate field set. Strongly type-safe at the index slot but the cost
  is large for what is essentially the same payload.
- **Polymorphic `address` object** (`{ kind: 'positions'|'rings'|..., index, ... }`):
  more strongly typed than a string, but LinkML's discriminated-union
  ergonomics aren't great, and the string already round-trips through
  the existing parser. Rejected on simplicity grounds.
- **Sparse parallel arrays** (e.g., on each geometry's `coordinates`):
  forces every geometry class to grow a parallel slot, breaks
  inheritance, and re-introduces the dense-array problem rejected last
  round.

---

## R-009 (NEW) — Read-only signal sources

Covered above under **R-003 (FLIPPED)**. Recap of decision: pre-flight
`CapabilityReport.persistent` + post-write escalation from
`ReadOnlyFilesystemError`/Node `EACCES`/`EPERM`, most-restrictive wins,
derived `isReadOnly` boolean on the `plot` slice.

---

## R-010 (NEW) — Modifier-key detection across hosts

**Decision**: Use the platform-conventional modifier on each host:

- macOS: Cmd (`event.metaKey`)
- Windows / Linux: Ctrl (`event.ctrlKey`)
- Web-shell: read `navigator.platform` once at app boot to choose, then
  watch the appropriate flag. Same detection runs in the VS Code webview
  (no caveats — `docs/project_notes/webview-e2e-research.md` confirms
  React synthetic events pass modifier flags through unchanged).

The map click handler (`MapView.tsx`) currently does not surface
modifier flags. We extend its `onSelect(featureId, event)` prop signature
so consumers receive `{ ctrlKey, metaKey, shiftKey }` via the existing
event payload — no breaking change at the prop name, just a richer
event passed through.

`FeatureList.tsx:154–179` already implements this exact pattern; the
contract is to **converge** the map onto the FeatureList pattern, not
invent a third.

**Playwright pattern**: `await page.locator(...).click({ modifiers: ['Control'] })`
(or `['Meta']`). One Playwright suite per platform is unnecessary — the
test mocks `navigator.platform` to exercise both detection branches in
one run.

**Rationale**: Aligns with platform conventions; reuses the existing
event payload; converges on the pattern already used in FeatureList; no
new key-detection abstraction.

**Alternatives considered**:

- New shared `useModifierClick` hook — rejected as YAGNI when two call
  sites already work fine inline.
- Universal Ctrl (no Cmd) — rejected; macOS analysts would find this
  surprising.

---

## R-011 (NEW) — Revert action semantics on the staging buffer

**Decision**: A "revert" action on field `F` of feature `id` is
implemented as `useStagedEdits` action `revertField(id, F)`:

1. If the **saved** feature's `properties[F]` is currently set to a
   value (the explicit override is on disk), stage an edit that
   removes `F` from `properties` on flush (the saved file ends up with
   the slot absent).
2. If the **staged** edit set for `(id, F)` is currently populated
   (the analyst overrode the field this session), simply prune the
   staged entry.
3. Sparse-storage rule: the flushed feature MUST have `F` absent (not
   `null`/`undefined`/empty string). The flush function distinguishes
   "removed" from "untouched" via an internal `Set<FieldKey>` of
   "to-remove" keys alongside the buffer's "to-set" partials.

The revert control's enabled/disabled state is derived from
`{ savedValue, stagedValue, autoDerivedValue }`:

- enabled iff there is a value to revert from (saved or staged) AND
  `autoDerivedValue !== null`;
- disabled with tooltip when `autoDerivedValue` is null (the auto path
  can't resolve, so revert would leave the field absent on a feature
  where the saved value was the analyst's only source of truth).

**Rationale**: Matches FR-024 exactly. Preserves sparse storage. Plays
nicely with the staging buffer's existing prune-on-equality rule. The
"to-remove" set is a single additional field on the reducer state.

**Alternatives considered**:

- Set `F` to `null` and let the writer prune — rejected; ambiguous with
  "the analyst typed null", and the LinkML slot is not nullable.
- A separate `revertedFields: Set<FieldKey>` slice — rejected as a new
  store; the colocated reducer already owns this state in R-002a.

---

## Open items rolled forward to `/speckit.tasks`

- Decide which sample plot fixture to use for the read-only Playwright
  workflow (US-5). Recommend a **filesystem-permission** approach
  (chmod a fixture file 0444 in the test setup) so the test exercises
  both the pre-flight probe and the post-write escalation in one run.
- Decide whether to ship a separate "revert all overrides on this
  feature" affordance. Currently Out of Scope (per spec.md Out of Scope
  bullet); revisit during `/speckit.tasks` if the per-field affordance
  reads as too cumbersome in early UX review.
