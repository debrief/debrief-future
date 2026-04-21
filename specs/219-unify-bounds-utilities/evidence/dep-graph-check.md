# Dependency Graph Check (T006 / R-003)

## Objective

Verify that adding `@debrief/schemas` as a dependency of `@debrief/utils` does
not create a circular dependency.

## Finding

`@debrief/utils` already declared `@debrief/schemas` as a dependency in its
`package.json` **before this feature**. The dependency was introduced in an
earlier feature. This feature does not add a new dep-edge — it only begins
using the `ViewportPolygon` type that was already importable.

```json
// shared/utils/package.json (unchanged by this feature)
{
  "dependencies": {
    "@debrief/schemas": "workspace:*"
  }
}
```

## Dep direction

```
@debrief/utils → @debrief/schemas  (already existed)
@debrief/schemas → (no @debrief/utils dependency)
```

`@debrief/schemas` does not depend on `@debrief/utils`, so no cycle exists.

`pnpm why @debrief/utils` from `shared/schemas/` returns no output, confirming
`@debrief/schemas` does not transitively depend on `@debrief/utils`.

## Conclusion

✅ No cycle introduced. The `ViewportPolygon` type-only import in
`shared/utils/src/bounds.ts` is safe (R-003).
