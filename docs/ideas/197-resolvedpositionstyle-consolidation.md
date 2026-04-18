# Consolidate ResolvedPositionStyle and align with schema

## Problem
Two `ResolvedPositionStyle` interfaces exist with the same name but different shapes:

- `shared/utils/src/types.ts`: `symbol: 'circle' | 'square' | 'triangle'`, field name `label: string | null`
- `shared/components/src/utils/time.ts`: `symbol: 'circle' | 'square' | 'triangle' | 'diamond' | 'cross'`, field name `labelText: string | null`

The components version matches the LinkML-defined `PositionStyleSymbolEnum` (all 5 symbols); the utils version is out-of-date. Additionally, the symbol literal union is hand-typed on both sides — it will drift from the schema whenever a symbol is added or renamed in LinkML.

## Proposed Solution
1. Canonical definition lives in `shared/utils/src/types.ts`. The components-local definition (`shared/components/src/utils/time.ts`) is removed and the file imports from `@debrief/utils`.
2. The consolidated type uses `PositionStyleSymbolEnum` imported from `@debrief/schemas` rather than a hand-typed literal union — eliminates schema drift for the symbol field.
3. Field name: `labelText` (matches components' current vocabulary; most rendering call sites already use it).
4. Update any utils consumers currently reading `.label` to read `.labelText`.

## Success Criteria
- Only one `ResolvedPositionStyle` definition exists, in `@debrief/utils`
- The `symbol` field is typed as `PositionStyleSymbolEnum` from `@debrief/schemas` (not a hand-typed union)
- Every caller reads `.labelText`; no references to `.label` remain
- Full CI passes; no behaviour change in position rendering

## Dependencies
None (the `PositionStyleSymbolEnum` already exists in the generated schema types).

## Parallelisation
Fully parallel with #195, #196, #198, #202, E11, E12. Does not touch LinkML, so parallel with #199 / #200 / #201 as well.

## Complexity
Low

## Reference
Raised as part of the code-quality review pass; see PR #465 final report (Track 2 / Item 3) for discovery context.
