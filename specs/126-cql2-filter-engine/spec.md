# Feature Specification: Client-Side CQL2 Filter Engine

**Feature Branch**: `126-cql2-filter-engine`
**Created**: 2026-03-06
**Status**: Draft
**Epic**: E08 — STAC Stack Browser Discovery UI
**Input**: Reference implementation of CQL2 AND/OR filter logic operating on mock data array; validates query model without backend
**Depends on**: #125 (STAC Extension spec + mock data fixtures)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Filter Mock Data with AND Logic (Priority: P1)

A Discovery UI developer building the filter bar in Storybook needs to apply multiple metadata filters simultaneously and see only the exercises matching all criteria. The filter engine evaluates a set of predicates against the mock data array and returns matching items, combining all predicates with AND logic.

**Why this priority**: AND conjunction is the default and most common filtering mode. Every filter bar interaction produces AND-combined predicates. Without this, no meaningful filtering can be demonstrated in Storybook.

**Independent Test**: Provide the engine with two or more filter predicates (e.g., vessel class = "frigate" AND nationality = "GB") and verify only items matching all predicates are returned.

**Acceptance Scenarios**:

1. **Given** 100 mock STAC items and a single vessel-class filter, **When** the filter engine evaluates the predicate, **Then** only items whose `debrief:vessel_classes` include a matching path are returned.
2. **Given** 100 mock items and two filters (vessel class + nationality), **When** the engine evaluates both predicates combined with AND, **Then** only items matching both criteria are returned.
3. **Given** 100 mock items and filters that match no items, **When** the engine evaluates, **Then** an empty array is returned.

---

### User Story 2 — Filter Mock Data with OR Logic (Priority: P2)

A Discovery UI developer needs to test OR container behaviour: grouping two or more predicates so that items matching any one of them are included. The OR group itself is AND'd with other top-level predicates.

**Why this priority**: OR groups are the second most important logical construct. The SRD specifies that OR containers appear in the filter bar and are AND'd with top-level lozenges. This must work correctly before the filter bar UI (#127) can integrate.

**Independent Test**: Provide the engine with an OR group containing two vessel-class predicates, plus a top-level nationality filter, and verify items matching (vessel A OR vessel B) AND nationality are returned.

**Acceptance Scenarios**:

1. **Given** 100 mock items and an OR group with two vessel-class values, **When** the engine evaluates, **Then** items matching either vessel class are returned.
2. **Given** a top-level nationality filter AND an OR group with two tag values, **When** the engine evaluates, **Then** only items matching the nationality AND at least one of the tags are returned.
3. **Given** an OR group where no predicates match any items, **When** the engine evaluates, **Then** an empty array is returned.

---

### User Story 3 — Support All SRD Filter Types (Priority: P3)

A Discovery UI developer needs the filter engine to handle every metadata filter type listed in SRD Section 4.4, so that any filter the user adds in the filter bar (#127) can be evaluated against mock data without a backend.

**Why this priority**: Completeness of filter types ensures no filter bar feature is blocked by a missing engine capability. Each filter type maps to a specific STAC item property or computed value.

**Independent Test**: For each filter type (vessel class, plot tag, feature tag, author, duration, title, track name, nationality, folder/collection), provide a predicate and verify correct matching against mock data.

**Acceptance Scenarios**:

1. **Given** a vessel-class filter with a parent taxonomy node (e.g., "warship"), **When** the engine evaluates, **Then** items with any descendant vessel class (frigate, destroyer, etc.) are returned (hierarchical matching).
2. **Given** a duration filter with bucket "<24H", **When** the engine evaluates, **Then** only items whose computed duration (from `start_datetime` and `end_datetime`) falls under 24 hours are returned.
3. **Given** a title filter with a search string, **When** the engine evaluates, **Then** items whose `title` contains the search string (case-insensitive) are returned.
4. **Given** a folder/collection filter, **When** the engine evaluates, **Then** items belonging to the specified STAC collection are returned.

---

### User Story 4 — Serialise Filter State as CQL2 JSON (Priority: P4)

A Discovery UI developer needs the current filter state to be representable as a CQL2 JSON expression. This validates that the query model is spec-compliant and ensures a smooth transition from Storybook mock data to production API calls.

**Why this priority**: CQL2 JSON serialisation is required for saved filter configurations (SRD Section 4.6) and for the eventual production transition (SRD Section 9.5). It can follow after the core evaluation logic is proven.

**Independent Test**: Construct a filter state with AND and OR predicates, serialise it to CQL2 JSON, and verify the output conforms to the OGC CQL2 JSON encoding specification.

**Acceptance Scenarios**:

1. **Given** a filter state with two AND-combined predicates, **When** serialised to CQL2 JSON, **Then** the output is a valid CQL2 JSON object with an `"and"` array containing two comparison expressions.
2. **Given** a filter state with a top-level predicate AND an OR group, **When** serialised to CQL2 JSON, **Then** the output nests an `"or"` array inside the top-level `"and"` array.
3. **Given** an empty filter state, **When** serialised to CQL2 JSON, **Then** a valid CQL2 expression representing "match all" is produced.

---

### Edge Cases

- What happens when the filter set is empty (no active predicates)? All items are returned (no filtering applied).
- What happens when a vessel-class filter specifies a taxonomy path not present in any item? No items match that predicate; the engine does not error.
- What happens when an item has no `start_datetime`/`end_datetime` (single `datetime` only)? Duration is treated as zero; the item matches only the shortest duration bucket.
- What happens when a predicate references a property that is absent from an item? The item does not match that predicate (treated as missing/null, not as an error).
- What happens when multiple OR groups exist at the top level? Each OR group is AND'd with the others and with all top-level predicates.
- What happens when a tag filter value has different casing than the stored value? Tag matching is case-insensitive.
- What happens when an OR group contains only one predicate? It behaves identically to that predicate appearing at the top level (AND'd with other predicates).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The filter engine MUST accept an array of STAC items and a filter expression, and return the subset of items that match the expression.
- **FR-002**: The filter engine MUST support AND conjunction: all top-level predicates are combined with AND logic.
- **FR-003**: The filter engine MUST support OR disjunction: a group of predicates where matching any one predicate in the group is sufficient.
- **FR-004**: The filter engine MUST support nesting OR groups within AND: each OR group is AND'd with other top-level predicates. One level of OR nesting is supported (no nested OR-within-OR).
- **FR-005**: The filter engine MUST support all metadata filter types from SRD Section 4.4:
  - Vessel Class — matches against `debrief:vessel_classes` with hierarchical expansion
  - Plot Tag — matches against `debrief:tags`
  - Feature Tag — matches against `debrief:feature_tags`
  - Author — matches against `debrief:author`
  - Duration — computed from `start_datetime` and `end_datetime`, matched against buckets (`<6H`, `<24H`, `<72H`, `<10D`, `>10D`)
  - Title — substring match against `title` (case-insensitive)
  - Track Name — matches against `debrief:track_names`
  - Nationality — matches against `debrief:nationalities`
  - Folder/Collection — matches against the item's parent collection identifier
- **FR-006**: Vessel-class filtering MUST support hierarchical matching: filtering on a parent node (e.g., "warship") MUST return items with any descendant vessel class in their `debrief:vessel_classes` array.
- **FR-007**: Duration filtering MUST compute duration from `start_datetime` and `end_datetime` at evaluation time. Items with only a single `datetime` (no range) MUST be treated as zero duration.
- **FR-008**: The filter engine MUST produce a CQL2 JSON representation of the current filter state, conforming to the OGC CQL2 JSON encoding specification.
- **FR-009**: An empty filter expression (no predicates) MUST return all items unfiltered.
- **FR-010**: The filter engine MUST handle missing or null property values gracefully — a predicate referencing a property absent from an item results in no match for that predicate, not an error.
- **FR-011**: Array-valued property matching (tags, track names, nationalities, vessel classes) MUST use "contains" semantics — the item matches if the property array includes the filter value.
- **FR-012**: The filter engine MUST be usable in Storybook without a backend — it operates entirely on in-memory data.

### Key Entities

- **Filter Expression**: A structured representation of the user's active filters. Contains zero or more predicates combined with AND logic, and zero or more OR groups each containing predicates combined with OR logic.
- **Predicate**: A single filter condition specifying a filter type, a comparison operator, and a value. Maps to a CQL2 comparison expression.
- **OR Group**: A container holding two or more predicates combined with OR logic. The group itself participates in the top-level AND conjunction.
- **Duration Bucket**: A named time range category used for duration filtering. Five fixed buckets: `<6H` (under 6 hours), `<24H` (under 24 hours), `<72H` (under 72 hours), `<10D` (under 10 days), `>10D` (10 days or more).
- **Vessel Taxonomy**: A hierarchical tree of vessel classifications used to expand parent-node filters into leaf-node matches. Provided by #125.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The filter engine correctly evaluates all 9 metadata filter types against the 100-item mock data set, returning accurate results for each type individually (verified by unit tests covering every filter type).
- **SC-002**: Combined AND filtering with 3 or more simultaneous predicates returns only items matching all criteria, with zero false positives or false negatives across the full mock data set.
- **SC-003**: OR group filtering correctly returns the union of matches within the group, AND'd with top-level predicates, verified by test cases covering 2-predicate and 3-predicate OR groups.
- **SC-004**: CQL2 JSON serialisation produces valid OGC CQL2 JSON for all supported filter combinations (AND-only, OR-only, mixed AND+OR, empty filter).
- **SC-005**: Hierarchical vessel-class filtering on a parent node returns all items with any descendant vessel class, verified against the taxonomy tree from #125.
- **SC-006**: Duration bucket filtering correctly categorises all 100 mock items into their expected buckets based on computed duration from temporal properties.
- **SC-007**: All edge cases (empty filters, missing properties, unknown taxonomy paths, zero-duration items, single-predicate OR groups) are handled without errors, verified by dedicated test cases.

## Assumptions

- The STAC extension property names (`debrief:vessel_classes`, `debrief:tags`, `debrief:feature_tags`, `debrief:author`, `debrief:track_names`, `debrief:nationalities`) and their types are defined by #125 and are stable before this feature is implemented.
- Duration is computed at filter-evaluation time from `start_datetime` and `end_datetime`, consistent with the #125 decision to not store duration as a property.
- The vessel taxonomy tree structure is provided by #125 as a data fixture. The filter engine consumes this tree but does not own or define it.
- The five duration buckets (`<6H`, `<24H`, `<72H`, `<10D`, `>10D`) are mutually exclusive. An item falls into the smallest matching bucket (e.g., a 5-hour exercise is `<6H`).
- "Plot Contents" full-text search (SRD Section 4.4) is out of scope for this feature, as it requires backend full-text indexing. Title substring search is included as the client-side equivalent.
- One level of OR nesting is sufficient (per SRD Section 4.5). Nested OR-within-OR is explicitly not supported.
- The `ogc-cql2-filters` library (`cql2-filters-parser` on npm) is adopted for CQL2 parsing and serialisation, as decided in the idea document. The filter engine implements an evaluator on top of the library's parsed expression tree.
