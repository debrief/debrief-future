# API Contract: CQL2 `array_filter` Extension

**Feature**: 185-cql2-array-filter
**Date**: 2026-04-13

## Type Definitions

### New Types (added to `types.ts`)

```typescript
/** Fields on PlatformRecord that can be compared within array_filter */
type PlatformField = "id" | "name" | "nationality" | "vessel_class" | "vessel_type" | "vessel_role" | "domain";

/** A recursive boolean expression tree for compound predicates */
type CompoundPredicate =
  | { readonly kind: "comparison"; readonly field: PlatformField; readonly value: string }
  | { readonly kind: "and"; readonly children: readonly CompoundPredicate[] }
  | { readonly kind: "or"; readonly children: readonly CompoundPredicate[] };

/** An array_filter() call — compound predicate evaluated per-element */
interface ArrayFilterPredicate {
  readonly array: "platforms";
  readonly predicate: CompoundPredicate;
  readonly negated?: boolean;
}
```

### Modified Types

```typescript
/** Extended FilterExpression (backward-compatible) */
interface FilterExpression {
  readonly predicates: readonly Predicate[];                     // unchanged
  readonly orGroups: readonly OrGroup[];                         // unchanged
  readonly arrayFilters?: readonly ArrayFilterPredicate[];       // NEW (optional)
}
```

### New Exports (added to `index.ts`)

```typescript
export type { PlatformField, CompoundPredicate, ArrayFilterPredicate } from "./types";
```

## Evaluation API

### `FilterEngine.matches()` — Extended Behavior

```
Input:  item: StacBrowserItem, expression: FilterExpression
Output: boolean

Behavior:
  1. Evaluate existing predicates (unchanged)
  2. Evaluate existing orGroups (unchanged)
  3. FOR EACH af IN expression.arrayFilters ?? []:
       result = item.platforms.some(p => evaluateCompound(p, af.predicate, descendantMap))
       IF af.negated: result = !result
       IF !result: return false
  4. return true
```

### `matchArrayFilter()` — New Matcher Function

```
Input:  item: StacBrowserItem, af: ArrayFilterPredicate, descendantMap: DescendantMap
Output: boolean

Behavior:
  platforms = item.platforms ?? []
  IF platforms.length === 0: return false
  result = platforms.some(p => evaluateCompound(p, af.predicate, descendantMap))
  return af.negated ? !result : result
```

### `evaluateCompound()` — New Internal Function

```
Input:  platform: PlatformRecord, pred: CompoundPredicate, descendantMap: DescendantMap
Output: boolean

Behavior:
  SWITCH pred.kind:
    "comparison":
      fieldValue = platform[pred.field]
      IF fieldValue == null: return false
      IF pred.field === "vessel_class":
        expandedPaths = descendantMap.get(pred.value)
        return expandedPaths != null && expandedPaths.has(fieldValue)
      IF pred.field === "id":
        return fieldValue === pred.value  (case-sensitive)
      ELSE:
        return fieldValue.toLowerCase() === pred.value.toLowerCase()
    "and":
      return pred.children.every(c => evaluateCompound(platform, c, descendantMap))
    "or":
      return pred.children.some(c => evaluateCompound(platform, c, descendantMap))
```

## CQL2 JSON Serialization API

### `arrayFilterToCql2()` — New Function

```
Input:  af: ArrayFilterPredicate
Output: Record<string, unknown>   (CQL2 JSON)

Behavior:
  innerPredicate = compoundPredicateToCql2(af.predicate)
  expr = {
    op: "array_filter",
    args: [
      { property: "debrief:platforms" },
      innerPredicate
    ]
  }
  IF af.negated: return { op: "not", args: [expr] }
  return expr
```

### `compoundPredicateToCql2()` — New Internal Function

```
Input:  pred: CompoundPredicate
Output: Record<string, unknown>   (CQL2 JSON)

Behavior:
  SWITCH pred.kind:
    "comparison":
      return { op: "=", args: [{ property: pred.field }, pred.value] }
    "and":
      IF children.length === 1: return compoundPredicateToCql2(children[0])
      return { op: "and", args: children.map(compoundPredicateToCql2) }
    "or":
      IF children.length === 1: return compoundPredicateToCql2(children[0])
      return { op: "or", args: children.map(compoundPredicateToCql2) }
```

**Example output** for `nationality = 'GB' AND domain = 'subsurface'`:

```json
{
  "op": "array_filter",
  "args": [
    { "property": "debrief:platforms" },
    {
      "op": "and",
      "args": [
        { "op": "=", "args": [{ "property": "nationality" }, "GB"] },
        { "op": "=", "args": [{ "property": "domain" }, "subsurface"] }
      ]
    }
  ]
}
```

## CQL2 JSON Deserialization API

### `cql2JsonToArrayFilters()` — New Exported Function

```
Input:  cql2: Record<string, unknown>   (CQL2 JSON root)
Output: ArrayFilterPredicate[]

Behavior:
  Walk the CQL2 JSON tree.
  For each node where op === "array_filter":
    Extract property reference from args[0]
    Convert args[1] to CompoundPredicate via parseCql2Predicate()
    Create ArrayFilterPredicate { array: "platforms", predicate, negated: false }
  For each node where op === "not" wrapping an array_filter:
    Same as above but negated: true
  Return all extracted ArrayFilterPredicate instances.
```

### `parseCql2Predicate()` — New Internal Function

```
Input:  node: Record<string, unknown>   (CQL2 JSON node)
Output: CompoundPredicate

Behavior:
  SWITCH node.op:
    "=":
      property = node.args[0].property  (string)
      value = node.args[1]              (string)
      return { kind: "comparison", field: property as PlatformField, value }
    "and":
      return { kind: "and", children: node.args.map(parseCql2Predicate) }
    "or":
      return { kind: "or", children: node.args.map(parseCql2Predicate) }
    default:
      throw Error("Unsupported CQL2 operator in array_filter: " + node.op)
```

## Integration with `filterExpressionToCql2Json()`

The existing serialization function is extended to include `array_filter` expressions:

```
Input:  expression: FilterExpression
Output: Record<string, unknown>   (CQL2 JSON)

Modified Behavior:
  allParts = []
  ... existing predicate serialization (unchanged) ...
  ... existing orGroup serialization (unchanged) ...
  FOR EACH af IN expression.arrayFilters ?? []:
    allParts.push(arrayFilterToCql2(af))
  ... existing combination logic (unchanged) ...
```
