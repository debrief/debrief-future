# [E08] Client-side CQL2 filter engine

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
The filter bar's AND/OR logic must be validated without a backend. A reference CQL2 filter implementation is needed for Storybook development and to ensure the query model is correct before production integration.

## Research: Existing JS/TS CQL2 Implementations

### Surveyed Libraries

| Library | Language | Parses CQL2 | Evaluates against data | Runtime deps | Notes |
|---------|----------|-------------|----------------------|--------------|-------|
| [`ogc-cql2-filters`](https://github.com/NoamRa/ogc-cql2-filters) (`cql2-filters-parser` on npm) | TypeScript | Yes (text + JSON) | No (parser only) | Zero | Visitor pattern, active development (273+ commits), v0.9.16 |
| [`cql2-rs`](https://github.com/developmentseed/cql2-rs) | Rust + Python bindings | Yes | No | N/A | No JS/TS bindings |
| [`pygeofilter`](https://github.com/geopython/pygeofilter) | Python | Yes | Yes (native + DB backends) | Many | Python-only, full evaluator with AST |

### Decision: Adopt `ogc-cql2-filters` for parsing, write a thin evaluator visitor

**`ogc-cql2-filters`** is the only viable JS/TS CQL2 library. It covers the hard part
(spec-compliant parsing of CQL2 text and JSON encodings) and exposes a visitor pattern
(`accept(visitor, context)`) that makes building a custom evaluator straightforward.

**What we get for free:**
- CQL2 Text and JSON parsing into an expression tree
- `toText()` / `toJSON()` serialisation (satisfies the CQL2 JSON serialisation requirement)
- Full conformance class coverage (basic CQL2, advanced comparison, spatial, temporal, array, arithmetic)
- Zero runtime dependencies, published as an ES module
- TypeScript types out of the box

**What we still build:**
- An **evaluator visitor** that walks the parsed AST and evaluates predicates against
  STAC Item properties (the domain-specific part — matching vessel class, tags, etc.)
- This is architecturally equivalent to pygeofilter's `native.evaluate` backend, but
  scoped to our property types

**Why not build from scratch:**
- CQL2 parsing is non-trivial (operator precedence, multiple encodings, nested expressions)
- The library is well-tested, actively maintained, and presented at FOSS4G Europe 2025
- Writing only the evaluator visitor keeps our code small and domain-focused

## Proposed Solution
Adopt `ogc-cql2-filters` (`cql2-filters-parser` on npm) for CQL2 parsing and serialisation,
and implement a client-side evaluator visitor that:
1. Operates on the mock data array (fixture item.json files)
2. Supports AND conjunction of multiple filter predicates
3. Supports OR disjunction within OR container groups
4. Handles all filter types: vessel class, tags, author, duration, title, track name, nationality, folder/collection
5. Uses `ogc-cql2-filters` for CQL2 JSON serialisation (spec-compliant out of the box)

## Success Criteria
- Filter function correctly applies AND/OR logic on mock data
- All filter types from SRD Section 4.4 are supported
- CQL2 JSON serialisation matches OGC CQL2 spec structure
- Unit tests cover AND, OR, nested AND+OR, and edge cases (empty filters, no matches)

## Dependencies
Requires #125 (STAC Extension spec + mock data fixtures)

## New Dependency
- `cql2-filters-parser` (npm) — zero-dep ES module, TypeScript, [MIT-licensed](https://github.com/NoamRa/ogc-cql2-filters)

## Complexity
Low–Medium (reduced from Medium by adopting existing parser)
