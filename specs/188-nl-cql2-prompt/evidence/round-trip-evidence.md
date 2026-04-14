---
feature: 188-nl-cql2-prompt
captured_at: 2026-04-14
artefact: round-trip-evidence
---

# CQL2-JSON Round-Trip Evidence (T012)

Phase 2 adds `cql2JsonToFilterExpression` — the reverse of the existing
`filterExpressionToCql2Json`. This file demonstrates that the pair
round-trips cleanly across every `FilterType` value and the `array_filter`
compound-predicate shape the generator emits.

The proof is the test suite at
`shared/components/src/filter-engine/__tests__/cql2-json-reverse.test.ts`.

## Test output

```
 ✓ src/filter-engine/__tests__/cql2-json-reverse.test.ts  (26 tests) 72ms

 Test Files  1 passed (1)
      Tests  26 passed (26)
```

Regression across the whole filter-engine (unchanged + new):

```
 Test Files  8 passed (8)
      Tests  152 passed (152)
```

## Round-trip coverage

| FilterType        | CQL2 operator      | Forward → Reverse round-trip |
|-------------------|--------------------|------------------------------|
| vessel-class      | a_containedBy      | ✓                            |
| tag               | a_containedBy      | ✓                            |
| author            | =                  | ✓                            |
| duration          | =                  | ✓                            |
| modified          | =                  | ✓                            |
| title             | like (wildcards)   | ✓                            |
| filename          | like               | ✓                            |
| plot-contents     | like               | ✓                            |
| track-name        | a_containedBy      | ✓                            |
| nationality       | a_containedBy      | ✓                            |
| collection        | =                  | ✓                            |
| compound platform | array_filter (and) | ✓                            |
| negated scalar    | not wrapping =     | ✓                            |
| negated array     | not wrapping a_containedBy | ✓                    |
| negated array_filter | not wrapping array_filter | ✓                 |
| OR group          | or                 | ✓                            |
| AND of many preds | and                | ✓                            |

## Throw-path coverage (decision 10A — feeds `cql2-evaluation-failed` reason)

| Bad input                                    | Thrown by reverse parser |
|----------------------------------------------|--------------------------|
| Unknown operator (`between`)                 | ✓ `Cql2ParseError`       |
| Unknown property path                        | ✓ (message: `PROPERTY_MAP`) |
| `=` with wrong arg arity                     | ✓                        |
| `a_containedBy` with multi-element value array | ✓                      |
| `=` with non-property first arg              | ✓                        |
| `array_filter` first arg ≠ `debrief:platforms` | ✓                      |

## `filterByCql2Json` integration

`filterByCql2Json(items, cql2)` — one-liner wrapper that reverse-parses
then filters via an empty-taxonomy engine. Asserted against the forward-path
engine with taxonomy loaded: match counts are equal for non-taxonomy filter
types (nationality, tag, author, …). See the final two test cases in
`cql2-json-reverse.test.ts`.

## Notes

- `PROPERTY_MAP` is now exported (promoted from internal) per decision 3A.
- `Cql2ParseError` is exported so downstream callers (`parseResponse`, T020)
  can discriminate parser failures from other errors.
- `cql2JsonToArrayFilters` is preserved unchanged for backwards compatibility
  with #127's filter-bar imports.
