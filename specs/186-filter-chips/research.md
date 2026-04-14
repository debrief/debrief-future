# Phase 0 Research: Filter Bar Platform Chips

**Feature**: `186-filter-chips`
**Date**: 2026-04-14
**Status**: Complete — no unresolved NEEDS CLARIFICATION markers

## Scope of Research

The spec introduces a new filter-bar chip type that maps to `array_filter` CQL2 expressions. All heavy lifting (evaluation, taxonomy expansion, CQL2 round-trip) is delivered by upstream specs (#126, #185). This research document captures the small set of design decisions that the implementation must make to integrate the new chip into the existing FilterBar plumbing without regressing #127/#128.

No unknowns were surfaced during specification; no research agents were dispatched.

---

## Decision 1 — Extend `LozengeItem` to a discriminated union

**Decision**: Replace the single `LozengeItem` shape with a discriminated union of two `kind`s:

- `{ kind: 'lozenge', kind2: 'simple', filterType: FilterType, value: string, negated?: boolean, id: string }` — the existing chip shape, carrying a single string value.
- `{ kind: 'lozenge', kind2: 'platform', filterType: 'platform', attributes: Record<PlatformField, string>, negated?: boolean, id: string }` — the new compound platform chip, carrying a map of attribute → value.

The outer `kind: 'lozenge'` discriminator is retained so `OrContainerItem` vs `LozengeItem` detection at the `FilterBarItem` level is unchanged (minimal blast radius on `useFilterBar`, `Lozenge`, `OrContainer` consumers). An inner `shape` discriminator (renamed from `kind2` above for production) is added to distinguish simple vs platform lozenges.

**Rationale**:
- A discriminated union keeps the chip lifecycle (add/edit/negate/drag/remove/save) generic while letting each `shape` carry its own payload type.
- Reusing the outer `kind: 'lozenge'` preserves existing type-narrowing in every `.filter(i => i.kind === 'lozenge')` call across the codebase.
- Storing a `Record<PlatformField, string>` (with at least one key populated) instead of a nested `CompoundPredicate` keeps the UI state flat and easy to edit. The mapping to `CompoundPredicate` happens at a single location (`toFilterExpression`).

**Alternatives considered**:
- *Single shape with an optional `attributes` field* — rejected: it encodes state validity through runtime checks instead of types, and the value string becomes nonsensical for platform chips.
- *Store a `CompoundPredicate` tree directly on the lozenge* — rejected: the UI only supports conjunction (AND) of comparisons; carrying the full predicate tree in state adds complexity without capability. `CompoundPredicate` is derived on demand from `attributes` at `toFilterExpression` time.
- *Break `LozengeItem` into two top-level types (`SimpleLozengeItem | PlatformLozengeItem`)* — rejected: the reducer and drag-drop logic operate on `LozengeItem` generically; splitting forces per-shape branches throughout. The discriminated union keeps those branches local to render and serialisation.

---

## Decision 2 — Map a platform lozenge to a single `ArrayFilterPredicate`

**Decision**: `toFilterExpression` in `useFilterBar.ts` converts each platform lozenge into exactly one entry in `FilterExpression.arrayFilters`, with the `CompoundPredicate` built as a top-level AND of one `comparison` per attribute. Negation on the lozenge maps to the `negated` field on the `ArrayFilterPredicate`.

Shape:

```ts
// Platform lozenge with attributes { nationality: "GB", domain: "subsurface" }
// →
{
  array: "platforms",
  predicate: {
    kind: "and",
    children: [
      { kind: "comparison", field: "nationality", value: "GB" },
      { kind: "comparison", field: "domain", value: "subsurface" },
    ],
  },
  negated: false,
}
```

Special case: a platform lozenge with exactly one attribute produces `predicate: { kind: "comparison", ... }` (no AND wrapper); the existing `compoundPredicateToCql2` collapses single-child ANDs, so this is equivalent, but emitting a bare comparison keeps the CQL2 JSON minimal.

**Rationale**:
- Matches the semantics the engine already exposes in #185: `array_filter(platforms, p -> all conditions true for the same p)`.
- Keeps the serialiser path simple — reuses `filterExpressionToCql2Json` unchanged (it already handles `expression.arrayFilters` produced by extensions like this feature).
- AND is the only combinator exposed by the new editor; OR across platform attributes is expressible today by placing two platform chips inside an OR container (covered by User Story 3).

**Alternatives considered**:
- *Expose OR/NOT within the single platform chip* — rejected: it balloons the editor UI without a concrete use case from E10's motivating queries. Can be added later as a superset without breaking the current chip shape.
- *Emit separate predicates per attribute (not a single `array_filter`)* — rejected: this would match "any platform has nationality=GB AND any platform (possibly different) has domain=subsurface" — the exact false-positive case #186 is designed to eliminate.

---

## Decision 3 — Deserialiser treats `array_filter` over `debrief:platforms` as a platform chip

**Decision**: When restoring a saved filter (or loading one from an external source), the CQL2-JSON-to-FilterBar-state path recognises an `array_filter(debrief:platforms, ...)` whose inner predicate is a top-level AND-of-comparisons (or a single comparison) and reconstructs a **platform lozenge** with `attributes` populated from the comparisons.

If the deserialiser encounters an `array_filter` whose predicate contains structures the UI cannot represent (an OR inside the AND, a comparison on a field not in `PlatformField`, or nested ANDs), it **declines to reconstruct a platform chip** and instead raises a restore error surfaced through the existing `FILTER_ERROR_MESSAGE` banner. The CQL2 JSON is preserved verbatim for the user to edit externally — it is not silently dropped.

**Rationale**:
- Spec FR-008 requires lossless round-trip for chips produced *by the UI*. Lossy deserialisation would violate Story 4.
- External CQL2 sources (e.g., #188 NL → CQL2) may emit richer structures. Refusing to display them in the chip UI is safer than misrepresenting them as a simplified chip; the error banner gives the analyst a clear signal.
- The deserialiser already handles the negation wrapper (`{ op: "not", args: [array_filter] }`); no new logic required for that path.

**Alternatives considered**:
- *Always attempt a lossy reconstruction (flatten OR to first branch)* — rejected: violates the principle of no silent failures (Constitution I.3).
- *Persist the full `ArrayFilterPredicate` on the lozenge and render a read-only chip when shape is unsupported* — rejected: it adds a third lozenge shape just for edge cases that won't exist until #188 lands. Defer until needed.

---

## Decision 4 — Platform editor UI: a popover form with one picker per supported attribute

**Decision**: A new `PlatformValueEditor` React component is added alongside `ValueEditor.tsx`. It renders a popover with one picker per `PlatformField` in scope (`nationality`, `domain`, `vessel_role`, `vessel_type`, `vessel_class`) and a confirm button. Value sources:

- `nationality`: flat-dropdown, populated by `useDistinctValues().platform.nationality` (distinct non-null nationalities across `item.platforms`).
- `domain`: flat-dropdown, populated by `useDistinctValues().platform.domain`.
- `vessel_role`: flat-dropdown, populated by `useDistinctValues().platform.vessel_role`.
- `vessel_type`: flat-dropdown, populated by `useDistinctValues().platform.vessel_type`.
- `vessel_class`: the existing `SearchableCascadingMenu` with the vessel taxonomy tree (reused from the current `vessel-class` chip).

Confirm is enabled once any one attribute has a value. Clearing a picker removes that attribute from the `attributes` record on confirm. The editor is reused for both "add new chip" and "edit existing chip" flows (in edit mode, pickers are pre-filled from the lozenge's `attributes`).

**Rationale**:
- Parity with existing chip editors (popover, click-outside to close, Escape to cancel) means no new interaction paradigm.
- Flat dropdowns for small enums (domain ∈ {surface, subsurface}, vessel_role ∈ {frigate, destroyer, submarine, ...}) match the analyst's mental model — they pick from concrete observed values, not free text.
- Vessel class reuses the existing hierarchical picker so the taxonomy expansion story (spec Story 1.3 in #185) works out of the box inside platform chips.

**Alternatives considered**:
- *Inline editor inside the chip body* — rejected: compound chips would become unreadable in the inline layout; a popover is the established pattern.
- *Multi-select per attribute (OR within the attribute)* — rejected: Decision 2 already captures OR across platform chips via OR containers. Adding OR inside the attribute complicates the editor and the CQL2 emission for no spec-required capability.

---

## Decision 5 — Chip label is a deterministic, locale-aware summary of selected attributes

**Decision**: The platform chip's display label is constructed at render time by `Lozenge.tsx` as a space-separated summary of attributes in a fixed, meaningful order: `nationality` → `domain` → `vessel_role` → `vessel_type` → `vessel_class`. Each attribute is labelled using:

- `nationality`: raw ISO code (`GB`, `US`, `DE`) — uppercase.
- `domain`: humanised (`surface` → "Surface", `subsurface` → "Subsurface").
- `vessel_role` / `vessel_type`: the taxonomy `label` via `resolveTaxonomyLabel(value, labelMap)` when found; otherwise the raw value.
- `vessel_class`: `resolveTaxonomyLabel` applied to the full class path (reuses existing logic).

Example outputs:
- `{ nationality: "GB", domain: "subsurface" }` → **Platform: GB · Subsurface**
- `{ nationality: "GB", vessel_role: "frigate" }` → **Platform: GB · Frigate**
- `{ vessel_type: "type23" }` → **Platform: Type 23 (Duke-class)**

**Rationale**:
- Deterministic order so the label is stable across renders and diffable in snapshot tests.
- Consistency with the `getFilterTypeLabel` / `resolveTaxonomyLabel` patterns already used for other chips.
- Human-readable in the observed catalog languages without requiring a separate rendering service.

**Alternatives considered**:
- *Let the user pick a custom label* — rejected: out of scope; no spec requirement.
- *Attribute-per-line vertical label* — rejected: breaks the single-row filter bar layout; separator-joined keeps chips compact.

---

## Decision 6 — Visual distinction uses a platform glyph + tinted chip

**Decision**: Platform chips receive a distinct visual treatment via a platform icon (using an existing `vscrui` icon already in the bundle) prefixed inside the chip body, plus a subtly tinted background colour defined as a new CSS custom property in `Lozenge.css` (additive; does not override existing lozenge variants). The negation indicator (`NOT` prefix) and remove/negate buttons remain unchanged.

**Rationale**:
- FR-013 requires visual distinction without specifying a form. Icon + tint is the least-invasive option and readable in every theme variant.
- No new dependency — `vscrui` already ships with the FilterBar bundle for the existing `+` button and other glyphs.
- Additive CSS variable keeps #127's visual snapshots stable for existing chip types.

**Alternatives considered**:
- *Different chip shape (e.g., hexagonal)* — rejected: heavier CSS cost and inconsistent with the "one family of chips" visual language.
- *Coloured chip per attribute combination* — rejected: fragile and hard to standardise.

---

## Decision 7 — Saved-filter schema: extend `filterBarState` payload in place

**Decision**: The persisted `SavedFilterConfiguration.filterBarState` now stores the extended `LozengeItem` union. This is a breaking change to the saved-filter shape, but Article XIV (Pre-Release Freedom) explicitly permits this; saved filters created against the old shape that contain only simple lozenges remain loadable because the `shape` field is optional-by-default with a migration coercion step: on restore, any `kind: 'lozenge'` entry without a `shape` field is coerced to `shape: 'simple'`.

**Rationale**:
- Keeps a single `SavedFilterConfiguration` shape rather than versioning the schema.
- Graceful upgrade path for users who have saved filters before this feature lands (no one in production yet — pre-v4.0.0 — but the migration is cheap and reduces surprise).
- No change to `SavedFiltersCollection.version` is required because the shape change is additive at the lozenge level.

**Alternatives considered**:
- *Bump `SavedFiltersCollection.version`* — deferred: if additional shape changes land together, a single bump is cleaner. Today's change is backwards-loadable.
- *Store platform chips as raw CQL2 JSON on the lozenge* — rejected: deserialisation into `attributes` happens anyway (Decision 3); storing the CQL2 shape duplicates state.

---

## Open Items

None. All spec ambiguities were resolved during `/speckit.specify` and the design decisions above cover every FR and every UI state. The plan is ready for `/speckit.tasks`.
