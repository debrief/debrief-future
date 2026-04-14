# Contract: CQL2 JSON Round-Trip (Platform Chips)

**Applies to**: `shared/components/src/filter-engine/cql2-json.ts`
**Scope**: The CQL2 JSON shape produced by a platform lozenge and the rules for reconstructing a platform lozenge from CQL2 JSON.

## Emission contract

A filter bar containing a single platform lozenge with `attributes = { nationality: 'GB', domain: 'subsurface' }` and `negated: false` produces the following CQL2 JSON (via `filterExpressionToCql2Json(toFilterExpression(state))`):

```json
{
  "op": "array_filter",
  "args": [
    { "property": "debrief:platforms" },
    {
      "op": "and",
      "args": [
        { "op": "=", "args": [ { "property": "nationality" }, "GB" ] },
        { "op": "=", "args": [ { "property": "domain" }, "subsurface" ] }
      ]
    }
  ]
}
```

Notes:

- The `"property"` inside the inner comparisons is the bare `PlatformField` name (`"nationality"`, `"domain"`, …), not a dotted path — this matches the shape the engine already evaluates in `matchers.ts::evaluateCompound`.
- When `negated: true`, the emission wraps the outer node in `{ "op": "not", "args": [ ... ] }` (existing `arrayFilterToCql2` behaviour).
- With a single attribute, the inner `"and"` is collapsed to the bare comparison (existing `compoundPredicateToCql2` behaviour).
- Multiple platform lozenges at top level produce multiple `array_filter` nodes AND'd together via the existing `filterExpressionToCql2Json` composition — same as any two top-level predicates.
- Multiple platform lozenges inside an OR container produce multiple `array_filter` nodes combined under `{"op": "or", "args": [...]}` following the existing OR-group serialisation path.

## Restore contract

Given a CQL2 JSON document containing one or more `array_filter` nodes over `debrief:platforms`:

1. `cql2JsonToArrayFilters(cql2)` (unchanged from #185) extracts all `ArrayFilterPredicate` entries, including negation.
2. For each `ArrayFilterPredicate af`, the FilterBar restore logic attempts to reconstruct a platform lozenge:
   - If `af.predicate.kind === 'comparison'` with `field ∈ PlatformField`: build `attributes = { [field]: value }`.
   - If `af.predicate.kind === 'and'` and every child is a `comparison` with `field ∈ PlatformField`: build `attributes` by flattening the comparisons. If two children share the same field, last-wins (and a warning is logged; the CQL2 source is rare in practice and the behaviour is predictable).
   - Otherwise (OR sub-predicate, nested ANDs, unsupported fields): **decline to reconstruct**. Log a restore error; the filter bar shows its existing `FILTER_ERROR_MESSAGE` banner. No lozenge is produced.
3. Any residual `Predicate[]` and `OrGroup[]` extracted from the same CQL2 JSON are restored through existing #127 logic unchanged.

## Lossless cases

Round-tripping is guaranteed lossless for any platform lozenge *produced by the UI*: the UI only ever emits `comparison` or top-level AND-of-comparisons, both of which are handled by the restore contract.

## Lossy / rejected cases

The following CQL2 JSON shapes are rejected on restore (not silently degraded):

- `array_filter(platforms, p -> p.nationality = 'GB' OR p.nationality = 'US')` — OR at the top level of the predicate tree.
- `array_filter(platforms, p -> (p.nationality = 'GB' AND p.vessel_class = 'X') AND p.domain = 'surface')` — nested ANDs (would need flattening logic; deferred until #188 demands it).
- `array_filter(platforms, p -> p.nationality != 'GB')` — any operator other than `=`.
- `array_filter(platforms, p -> p.unknown_field = 'X')` — `field` not in `PlatformField`.

When the same CQL2 document contains a mix of supported and unsupported `array_filter` nodes, supported nodes MUST still be restored; unsupported nodes MUST NOT silently corrupt the restore (partial restore with a single error banner is acceptable; full-reject is also acceptable; the implementation choice is documented in `quickstart.md` once made).

**Recommended**: partial restore — restore what can be restored, raise a non-blocking banner listing the skipped nodes. This matches the intent of Article I.3 (no silent failures).

## Regression boundary with #185

This contract must not alter any existing behaviour in `cql2-json.ts`. The engine file is extended only to the extent of exposing a slightly richer `cql2JsonToArrayFilters` result (if required) or to accommodate a partial-restore error list. The existing `filterExpressionToCql2Json`, `arrayFilterToCql2`, and `compoundPredicateToCql2` functions are used unchanged.
