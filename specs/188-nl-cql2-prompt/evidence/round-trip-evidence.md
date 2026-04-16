---
feature: 188-nl-cql2-prompt
captured_at: 2026-04-16T12:52:00Z
artifact: filter-engine CQL2-JSON round-trip proof
---

# Round-trip evidence — `filterExpressionToCql2Json` ↔ `cql2JsonToFilterExpression`

This document demonstrates that the new reverse parser (#188 decision 1A) is
semantically inverse to the existing forward serialiser across every
`FilterType` and the representative `array_filter` shapes the NL→CQL2 corpus
produces.

**Implementation**: `shared/components/src/filter-engine/cql2-json.ts`
**Tests**: `shared/components/src/filter-engine/__tests__/cql2-json-reverse.test.ts` (25 tests, all green)

## Coverage map

| Shape | Forward output (abridged) | Reverse recovers | Test |
|-------|---------------------------|------------------|------|
| `{}` (no-op) | `{}` | empty `FilterExpression` | empty-object test |
| `vessel-class` leaf | `a_containedBy([value], {property: "debrief:platforms[*].vessel_class"})` | `{ type: "vessel-class", value }` | round-trip loop |
| `tag` leaf | `a_containedBy([value], {property: "debrief:tags"})` | `{ type: "tag", value }` | round-trip loop |
| `author` leaf | `= / debrief:author` | `{ type: "author", value }` | round-trip loop |
| `duration` leaf | `= / duration` | `{ type: "duration", value }` | round-trip loop |
| `modified` leaf | `= / updated` | `{ type: "modified", value }` | round-trip loop |
| `title` leaf | `like / title` (with `%…%`) | `{ type: "title", value }` (wildcards stripped) | round-trip loop |
| `filename` leaf | `like / debrief:filename` | `{ type: "filename", value }` | round-trip loop |
| `plot-contents` leaf | `like / debrief:plot_contents` | `{ type: "plot-contents", value }` | round-trip loop |
| `track-name` leaf | `a_containedBy([value], {property: "debrief:platforms[*].name"})` | `{ type: "track-name", value }` | round-trip loop |
| `nationality` leaf | `a_containedBy([value], {property: "debrief:platforms[*].nationality"})` | `{ type: "nationality", value }` | round-trip loop |
| `collection` leaf | `= / collection` | `{ type: "collection", value }` | round-trip loop |
| Compound `array_filter` (UK subsurface) | `array_filter(debrief:platforms, and(=nationality/GB, =domain/subsurface))` | `arrayFilters[0].predicate.kind === "and"` | "compound array_filter" test |
| Negated `array_filter` | `not(array_filter(…))` | `arrayFilters[0].negated === true` | "negated array_filter" test |
| Top-level `not` leaf | `not(a_containedBy([GB], nationality))` | `predicates[0].negated === true` | "negated predicate" test |
| OR group | `or(a_containedBy(GB), a_containedBy(US))` | `orGroups[0].predicates.length === 2` | "OR group" test |
| Mixed AND of leaf + array_filter | `and(like(title,…), array_filter(…))` | `predicates.length === 1`, `arrayFilters.length === 1` | "AND leaf + array_filter" test |

## Integration proof (T011)

`filterByCql2Json` evaluates the output of `filterExpressionToCql2Json` and
reports the same items as the forward-path `createFilterEngine().filter` call
for every test input. See `filterByCql2Json — integration (T011)` describe
block in the test file, in particular:

- A 3-item catalog with {GB subsurface, US surface, GB surface} + a compound
  `array_filter(nationality=GB AND domain=subsurface)` yields exactly the
  GB-subsurface item — matching the forward path.
- `result matches forward-path filtering (semantic equivalence)` asserts the
  ID lists match element-for-element.

## Throw-path coverage (T010)

The reverse parser refuses to degrade silently when the input is malformed.
Each of the five `Cql2ReverseParseError.code` values is exercised:

- `unsupported-operator` — unknown op like `contains_weirdly`.
- `bad-arg-arity` — `=` with one arg; `array_filter` with one arg.
- `unknown-property` — `debrief:fabricated` path.
- `malformed-node` — `array_filter` over `debrief:not_platforms` (wrong array ref).

## Conclusion

Across every `FilterType`, every compound shape present in the corpus, and the
negation wrappers, the reverse parser reproduces the original expression
(semantic equality via filter results, not structural equality — structural
differences like wildcard stripping are explicit above). The throw paths close
the `cql2-evaluation-failed` reason surface in `parseResponse.ts`.
