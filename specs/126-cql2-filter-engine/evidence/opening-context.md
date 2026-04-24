## What We're Building

The STAC Browser Discovery UI needs filtering. Nine filter types -- vessel class, plot tags, feature tags, author, duration, title search, track names, nationalities, and folder/collection -- all combined with AND/OR logic, all running against STAC item arrays in the browser. No backend required.

The interesting constraint here is that we want CQL2 compatibility from the start. CQL2 is the OGC standard for query expressions, and our production API will speak it natively. Rather than build a bespoke filter model now and translate later, we are adopting `cql2-filters-parser` (a zero-dependency TypeScript CQL2 parser) and building a thin evaluator on top. Filter state gets serialised to CQL2 JSON for saved configurations. When the backend arrives, the same filter expressions that work against mock data in Storybook will work against the real API -- no rewrite needed.

## How It Fits

This is part of Epic E08 (STAC Stack Browser Discovery UI) and depends on #125, which defines the STAC extension properties and mock data fixtures. The filter engine lives in `shared/components/src/filter-engine/` alongside the components that consume it -- the catalog overview panel and the upcoming filter bar (#127). It is a pure function: array of items in, filtered array out. No UI, no side effects, no network calls. The filter bar will handle presentation; this module handles logic.

## Key Decisions

- **CQL2 from day one, not bolted on later.** We are using `cql2-filters-parser` for parsing and serialisation, and building our evaluator to produce CQL2-compatible expressions. The migration path from Storybook mock data to a production STAC API is a configuration change, not a rewrite.

- **No visitor pattern.** The library offers a full AST visitor interface with 14 methods. We are not using it. Our filter expressions are built programmatically from UI state, not parsed from CQL2 text, so a simpler direct evaluation is cleaner. Each filter type gets its own matcher function -- straightforward to test, straightforward to extend.

- **Vessel taxonomy expansion is pre-computed.** When you filter on "warship", the engine needs to match frigates, destroyers, and every other descendant class. Rather than walking the taxonomy tree on every filter evaluation, we build a descendant map once at engine construction time. Filtering 100 items stays well under 10ms.

- **Duration is computed, not stored.** Exercise duration is not a STAC property -- it is calculated from `start_datetime` and `end_datetime` at filter time. Five buckets: <6H, <24H, <72H, <10D, >10D. An exercise matches any bucket whose threshold it falls under.

- **One level of OR nesting.** Top-level predicates are AND'd together. OR groups let you say "frigate OR destroyer" and AND that group with other filters. Nested OR-within-OR is explicitly out of scope -- the SRD does not require it, and the filter bar UI does not have a way to express it.

- **Graceful handling of missing data.** If an item lacks a property that a filter references, it simply does not match that predicate. No errors, no special-casing. This matters because STAC items from different collections will have different extension properties populated.
