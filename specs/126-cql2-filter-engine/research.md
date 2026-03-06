# Research: Client-Side CQL2 Filter Engine

**Feature**: 126-cql2-filter-engine
**Date**: 2026-03-06

## R1: CQL2 Parsing Library Selection

### Decision: Adopt `cql2-filters-parser` (npm) from `ogc-cql2-filters`

### Rationale
The only viable TypeScript CQL2 library. It provides spec-compliant parsing of CQL2 text and JSON encodings, a visitor pattern for AST traversal, and serialisation via `toText()`/`toJSON()` methods on every expression node. Zero runtime dependencies, published as an ES module with TypeScript types.

### Key API Surface

**Parsing:**
- `parseCql2Text(input: string): Expression` — parses CQL2 text encoding
- `parseCql2Json(input: object): Expression` — parses CQL2 JSON encoding

**AST Node Types (all implement `Expression` interface):**
- `BinaryExpression` — comparisons and logical AND/OR (left, operator, right)
- `PropertyExpression` — property references (name: string)
- `LiteralExpression` — scalar values (literalPair: LiteralPair)
- `AdvancedComparisonExpression` — LIKE, BETWEEN, IN (operator, args, negate)
- `UnaryExpression` — NOT (operator, right)
- `GroupingExpression` — parenthetical grouping (expression)
- `ArrayExpression` — array literals (expressions)
- `FunctionExpression` — spatial/array functions (operator, args)
- `IntervalExpression` — temporal intervals (start, end)
- `GeometryExpression`, `BBoxExpression` — spatial types
- `IsNullOperatorExpression` — IS NULL / IS NOT NULL checks

**Visitor Pattern:**
```typescript
interface ExpressionVisitor<TReturn, TContext = undefined> {
  visitBinaryExpression(expr: BinaryExpression, context?: TContext): TReturn;
  visitPropertyExpression(expr: PropertyExpression, context?: TContext): TReturn;
  visitLiteralExpression(expr: LiteralExpression, context?: TContext): TReturn;
  visitAdvancedComparisonExpression(expr: AdvancedComparisonExpression, context?: TContext): TReturn;
  visitUnaryExpression(expr: UnaryExpression, context?: TContext): TReturn;
  visitGroupingExpression(expr: GroupingExpression, context?: TContext): TReturn;
  visitArrayExpression(expr: ArrayExpression, context?: TContext): TReturn;
  visitFunctionExpression(expr: FunctionExpression, context?: TContext): TReturn;
  visitIntervalExpression(expr: IntervalExpression, context?: TContext): TReturn;
  visitGeometryExpression(expr: GeometryExpression, context?: TContext): TReturn;
  visitGeometryCollectionExpression(expr: GeometryCollectionExpression, context?: TContext): TReturn;
  visitBBoxExpression(expr: BBoxExpression, context?: TContext): TReturn;
  visitIsNullOperatorExpression(expr: IsNullOperatorExpression, context?: TContext): TReturn;
  visitOperatorExpression(expr: OperatorExpression, context?: TContext): TReturn;
}
```

**Serialisation:**
- Every `Expression` node has `toText(): string` and `toJSON(): object` methods
- This gives us CQL2 JSON serialisation for free

### Alternatives Considered
- **Build from scratch**: CQL2 parsing is non-trivial (operator precedence, multiple encodings, nested expressions). Writing a parser would be weeks of work for no additional value.
- **cql2-rs**: Rust with Python bindings only, no JS/TS support.
- **pygeofilter**: Python only, not usable in browser/Storybook context.

## R2: Evaluator Architecture

### Decision: Build a thin evaluator that does NOT use the visitor pattern

### Rationale
The `ogc-cql2-filters` visitor pattern is designed for AST traversal, but our primary use case is simpler: we build filter expressions programmatically (from UI state) and evaluate them against items. We don't need to parse CQL2 text at runtime — we only need to:

1. **Build** filter expressions from UI filter state (predicate objects)
2. **Evaluate** those expressions against STAC item arrays
3. **Serialise** the expression to CQL2 JSON (for persistence and future API calls)

The evaluator works on our own `FilterExpression` type (a simple AND/OR tree of typed predicates), not on the library's AST. The library's `toJSON()` is used only for serialisation.

### Alternatives Considered
- **Full visitor-based evaluator**: More complex, requires implementing all 14 visitor methods. Most methods would throw "not supported" since we only use a subset of CQL2. Adds coupling to the library's AST internals.
- **Direct CQL2 text parsing**: Would parse user-constructed CQL2 text back into an AST for evaluation. Unnecessary round-trip since we already have structured filter state.

## R3: Where to Place the Filter Engine

### Decision: `shared/components/src/filter-engine/`

### Rationale
The filter engine is consumed by:
- CatalogOverview component (already in shared/components)
- Future filter bar component (#127, will also be in shared/components)
- Storybook stories for filter testing

It fits naturally in `@debrief/components` as a non-visual utility alongside the visual components that use it. It has no backend dependencies and runs entirely in the browser.

### Alternatives Considered
- **New shared package** (`shared/filter-engine/`): Would require a new pnpm workspace package, build config, and cross-package dependency. Overkill for a single module.
- **`shared/utils/`**: Exists but is for generic utilities. The filter engine is domain-specific to STAC discovery.

## R4: Duration Bucket Semantics

### Decision: Buckets are exclusive upper bounds, item falls into the smallest qualifying bucket

### Rationale
The SRD defines five duration dropdowns: `<6H`, `<24H`, `<72H`, `<10D`, `>10D`. A 5-hour exercise should match `<6H` when that bucket is selected, and should also match `<24H`, `<72H`, `<10D` if those are selected. Each bucket means "duration is less than X" (or "greater than 10D" for the last).

This is range-check semantics, not category semantics. When a user selects `<24H`, they want all exercises shorter than 24 hours.

### Alternatives Considered
- **Mutually exclusive buckets** (0–6H, 6–24H, 24–72H, etc.): Would require "6–24H" label, not matching SRD's `<24H` notation.

## R5: Vessel Taxonomy Expansion

### Decision: Accept taxonomy tree as a constructor parameter, pre-compute descendant maps

### Rationale
When filtering on a parent node like "warship", the engine must match all items whose `debrief:vessel_classes` include any descendant (frigate, destroyer, etc.). Pre-computing a map from each node to its full descendant set at construction time means O(1) lookups during filtering.

The taxonomy tree structure is defined by #125. The filter engine receives it as data, not as a dependency on #125's code.

## R6: CQL2 JSON Mapping

### Decision: Build CQL2 JSON directly from FilterExpression, using library for validation only

### Rationale
Our `FilterExpression` maps cleanly to CQL2 JSON:
- Top-level AND → `{"op": "and", "args": [...]}`
- OR group → `{"op": "or", "args": [...]}`
- Property comparison → `{"op": "=", "args": [{"property": "name"}, value]}`
- Array contains → `{"op": "a_containedBy", "args": [...]}`
- LIKE → `{"op": "like", "args": [{"property": "title"}, "%search%"]}`

We can construct the CQL2 JSON object directly. The library's `parseCql2Json()` can validate our output if needed during testing.

### Alternatives Considered
- **Build library AST nodes, call toJSON()**: Requires constructing immutable Expression objects with OperatorExpression wrappers. More code than direct JSON construction for no benefit.
