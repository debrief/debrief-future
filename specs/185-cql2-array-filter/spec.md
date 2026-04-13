# Feature Specification: CQL2 `array_filter` Evaluator

**Feature Branch**: `185-cql2-array-filter`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Extend the CQL2 filter engine to evaluate `array_filter()` for compound predicates on `platforms[]`, with matchers, CQL2-JSON serialization, and unit tests"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compound Platform Filtering (Priority: P1)

An analyst wants to find plots that contain a specific combination of platform attributes -- for example, "plots involving a British submarine". The current filter engine can match nationality and vessel class independently, but cannot express the joined predicate "a platform whose nationality is GB AND whose domain is subsurface". With `array_filter`, the engine evaluates compound predicates per-element in the `platforms[]` array, so a match only occurs when the same platform satisfies all conditions.

**Why this priority**: This is the core capability. Without per-element compound matching, joined queries like "UK submarines" or "German frigates" produce false positives when one platform is British and a different platform is a submarine. This is the fundamental gap identified in the E10 prototype.

**Independent Test**: Can be fully tested by constructing STAC items with mixed platform arrays and verifying that compound predicates match only when conditions are satisfied by the same platform element.

**Acceptance Scenarios**:

1. **Given** a STAC item has platforms `[{nationality: "GB", domain: "surface"}, {nationality: "DE", domain: "subsurface"}]`, **When** the filter `array_filter(platforms, p -> p.nationality = 'GB' AND p.domain = 'subsurface')` is evaluated, **Then** the item does NOT match (no single platform satisfies both conditions).
2. **Given** a STAC item has platforms `[{nationality: "GB", domain: "subsurface", vessel_role: "submarine"}]`, **When** the filter `array_filter(platforms, p -> p.nationality = 'GB' AND p.domain = 'subsurface')` is evaluated, **Then** the item DOES match.
3. **Given** a STAC item has platforms `[{nationality: "GB", domain: "surface"}, {nationality: "GB", domain: "subsurface"}]`, **When** the same compound filter is evaluated, **Then** the item DOES match (the second platform satisfies both conditions).

---

### User Story 2 - CQL2 JSON Serialization Round-Trip (Priority: P1)

A downstream system (the NL-to-CQL2 generator, #188) produces CQL2 JSON containing `array_filter` expressions. The filter engine must be able to deserialize these expressions from CQL2 JSON and evaluate them, as well as serialize internal filter expressions back to CQL2 JSON that includes `array_filter`.

**Why this priority**: Equal priority with evaluation because the NL pipeline (#188) generates CQL2 JSON as its output format. Without serialization/deserialization, the generated filters cannot be consumed by the engine.

**Independent Test**: Can be fully tested by round-tripping `array_filter` expressions through serialize, deserialize, and evaluate, verifying the result matches direct evaluation.

**Acceptance Scenarios**:

1. **Given** a FilterExpression containing an `array_filter` predicate, **When** serialized to CQL2 JSON, **Then** the output contains a valid `array_filter` function call with the compound predicate expressed as nested CQL2 JSON operators.
2. **Given** a CQL2 JSON object containing an `array_filter` function call, **When** deserialized to a FilterExpression, **Then** the resulting expression evaluates correctly against test items.
3. **Given** a compound `array_filter` with both AND and OR sub-predicates, **When** serialized to CQL2 JSON, **Then** the logical structure is preserved in the output.

---

### User Story 3 - Hierarchical Vessel Class in Compound Predicates (Priority: P2)

An analyst filters for "British frigates" -- meaning platforms where nationality is GB and vessel class is at or below `surface/warship/frigate` in the taxonomy tree. The `array_filter` evaluator must support the existing hierarchical taxonomy expansion for `vessel_class` predicates within compound expressions, so that filtering by a parent class (e.g., `frigate`) matches all child classes (e.g., `type23`, `type26`, `fremm`).

**Why this priority**: Important for real-world queries but builds on the P1 compound matching. The taxonomy expansion mechanism already exists in the engine; this story ensures it works inside `array_filter` sub-predicates.

**Independent Test**: Can be tested by constructing items with specific vessel classes and verifying that parent-class compound predicates correctly expand and match.

**Acceptance Scenarios**:

1. **Given** a STAC item has platform `{nationality: "GB", vessel_class: "surface/warship/frigate/type23"}`, **When** `array_filter(platforms, p -> p.nationality = 'GB' AND p.vessel_class = 'frigate')` is evaluated with the taxonomy, **Then** the item matches (taxonomy expansion maps `frigate` to include `type23`).
2. **Given** a STAC item has platform `{nationality: "DE", vessel_class: "surface/warship/frigate/type23"}`, **When** the same compound filter is evaluated, **Then** the item does NOT match (nationality mismatch on the same platform).

---

### User Story 4 - Negated Compound Predicates (Priority: P3)

An analyst wants to exclude items that contain a specific type of platform -- for example, "show me everything except plots with British submarines". The `array_filter` evaluator must support negation at the expression level, so the entire compound predicate can be negated.

**Why this priority**: Negation is a secondary capability that extends the core compound matching. It follows naturally from the existing negation support in the filter engine.

**Independent Test**: Can be tested by negating `array_filter` expressions and verifying items are excluded when any platform matches the compound predicate.

**Acceptance Scenarios**:

1. **Given** a negated `array_filter` expression for `nationality = 'GB' AND domain = 'subsurface'`, **When** evaluated against an item with a British submarine platform, **Then** the item does NOT match (the negation excludes it).
2. **Given** the same negated expression, **When** evaluated against an item with only surface platforms, **Then** the item DOES match.

---

### Edge Cases

- What happens when the `platforms` array is empty or undefined? The `array_filter` returns false (no element satisfies the predicate).
- What happens when an `array_filter` sub-predicate references a platform field that is null or missing on a platform record? The comparison evaluates to false for that element, without raising errors.
- What happens when an `array_filter` contains only a single sub-predicate (not compound)? It behaves equivalently to the existing flat array matching for that field.
- What happens when the compound predicate uses OR logic (e.g., `nationality = 'GB' OR nationality = 'US'`)? Each platform element is tested against the full OR expression individually.
- What happens when multiple `array_filter` predicates appear in the same FilterExpression? They are AND'd together following existing top-level predicate combination rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST evaluate `array_filter()` expressions that apply compound predicates (AND/OR combinations) per-element against array properties on STAC items.
- **FR-002**: System MUST support the `debrief:platforms` array as the target of `array_filter()`, matching against platform record fields: `nationality`, `domain`, `vessel_class`, `vessel_type`, `vessel_role`, `name`, and `id`.
- **FR-003**: System MUST support hierarchical taxonomy expansion for `vessel_class` sub-predicates within `array_filter()`, reusing the existing taxonomy descendant map.
- **FR-004**: System MUST serialize `array_filter()` expressions to valid CQL2 JSON function-call encoding, preserving compound predicate structure.
- **FR-005**: System MUST deserialize CQL2 JSON containing `array_filter()` function calls back into evaluable filter expressions.
- **FR-006**: System MUST support negation of `array_filter()` expressions, consistent with the existing predicate negation mechanism.
- **FR-007**: System MUST return false (no match) when `array_filter()` is evaluated against an empty or missing array, without raising errors.
- **FR-008**: System MUST treat null or missing platform fields within array elements as non-matching for comparison operators, without raising errors.
- **FR-009**: System MUST support multiple `array_filter()` predicates in a single FilterExpression, combined via AND logic with other predicates.
- **FR-010**: System MUST include unit tests covering compound predicates, taxonomy expansion, negation, empty arrays, null fields, serialization round-trips, and mixed expressions with existing filter types.

### Key Entities

- **ArrayFilterExpression**: Represents an `array_filter()` call -- binds a target array property, an element variable, and a compound predicate to evaluate per-element. Conceptually: `array_filter(arrayProperty, variable -> predicate)`.
- **CompoundPredicate**: A boolean combination (AND/OR) of comparison operations on fields of an array element. Each comparison tests a platform field against a literal value using equality or taxonomy-expanded matching.
- **PlatformRecord**: The existing per-platform metadata structure from `@debrief/schemas` -- contains `id`, `name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, and `domain`.

## Assumptions

- The `cql2-filters-parser` third-party library already supports `array_filter` syntax at the parse level, as noted in the E10 epic document. This feature extends the evaluator and serializer, not the parser.
- The `array_filter()` function targets only the `debrief:platforms` array in this iteration. Support for arbitrary arrays is out of scope.
- The CQL2 JSON encoding for `array_filter` follows the OGC CQL2 function-call convention: `{"op": "array_filter", "args": [arrayRef, lambdaPredicate]}`.
- All existing filter types and evaluation semantics remain unchanged. The `array_filter` is an additive extension.
- This feature does not modify the FilterBar UI -- that is covered by #186 (Filter bar platform chips).

## Dependencies

- **Requires #181** (LinkML platform overrides): The `debrief:platforms` array structure on STAC items must exist with the per-platform fields (`nationality`, `domain`, `vessel_class`, etc.) for `array_filter` to have data to evaluate against.
- **Required by #186** (Filter bar platform chips): The filter bar needs `array_filter` evaluation to wire compound platform chips to CQL2 expressions.
- **Required by #188** (NL to CQL2 prompt design): The NL pipeline generates CQL2 JSON containing `array_filter` expressions that this engine must evaluate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Compound platform queries ("UK submarines", "German frigates", "British Type 23 frigates") produce correct matches with zero false positives from cross-platform attribute mixing.
- **SC-002**: All `array_filter` expressions round-trip through CQL2 JSON serialization and deserialization without information loss, producing identical evaluation results before and after serialization.
- **SC-003**: The extended filter engine passes all existing unit tests without modification, confirming backward compatibility with the current filter types and evaluation logic.
- **SC-004**: At least 20 new unit tests cover the `array_filter` evaluator, spanning compound predicates, taxonomy expansion, negation, edge cases, and CQL2 serialization.
- **SC-005**: Evaluation of `array_filter` on a 100-item catalog completes within the same performance envelope as existing filter types (no perceptible latency increase for typical catalog sizes).
