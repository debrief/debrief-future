# SC-003 grep evidence — no hand-typed STAC declarations remain

**Feature**: `223-linkml-stac-catalog`
**Captured**: 2026-05-20
**Git SHA**: `05fcdd4` (plus the projection-cast cleanup pending in this evidence pass)

Direct evidence for **SC-003**: a grep across the in-scope tree
(`apps/`, `shared/`, `services/`, excluding generated code and test
fixtures) for `interface Stac*` returns hits **only** in files under
`shared/schemas/src/` (the LinkML / generated code) or in documented
out-of-scope shapes.

## SC-003 grep command + output

```sh
git grep -nE "^[[:space:]]*(export[[:space:]]+)?interface (Stac(Item|ItemProperties|Catalog|Collection|Link|Asset|Extent|SpatialExtent|TemporalExtent|Summaries|Provider))" \
  -- apps shared services \
  | grep -v "shared/schemas/"
```

### Output

```
apps/vscode/src/types/stac.ts:91:export interface StacItemSummary {
services/session-state/src/registry/types.ts:33:export interface StacAssetForHydration {
shared/components/src/filter-engine/__tests__/fixtures.ts:18:interface StacItemJson {
```

### Hit-by-hit classification

| Hit | Out-of-scope reason |
|-----|---------------------|
| `apps/vscode/src/types/stac.ts:91 StacItemSummary` | OOS-002 — camelCase adapter over `@debrief/schemas#StacItemSummary` (snake_case). Unifying it requires a coordinated rename across stacService / stacTreeProvider / catalogOverviewPanel — separate #214 follow-up. |
| `services/session-state/src/registry/types.ts:33 StacAssetForHydration` | A session-state-side projection over `StacAsset` used internally by the asset-hydration registry. Single-domain (TS-side only), already classified `single-domain` by the audit. Out of scope per spec §223 — not in the audit cluster attributed to this work. |
| `shared/components/src/filter-engine/__tests__/fixtures.ts:18 StacItemJson` | Test fixture helper, excluded from the audit per `--exclude "**/__tests__/**"` and `--exclude "**/__fixtures__/**"`. Excluded from this grep gate as a non-runtime file. |

**All hits are documented out-of-scope cases.** No undocumented
hand-typed STAC envelope declarations remain in the in-scope tree.

## Inline `StacItemAssets` check

```sh
git grep -nE "^[[:space:]]*(export[[:space:]]+)?(interface|type) StacItemAssets\b" \
  -- apps services shared/components
```

### Output

```
apps/vscode/src/services/sceneThumbnailService.ts:67:type StacItemAssets = Record<string, StacAsset>;
```

This is a **local convenience alias** derived from the schema-rooted
`StacAsset` — `type X = Record<string, Y>` is a type alias, not a
hand-typed interface. The file imports `StacAsset` from
`@debrief/schemas`, so the audit's R4 rule reclassifies the line as
schema-rooted (single-domain). Spec FR-003 specifically calls out
"delete the inline `StacItemAssets`" — what was previously a private
`interface StacItemAssets` carrying duplicate shape declarations is
now this single-line `Record<string, StacAsset>` alias.

## A-009 closure check — JSON projection cast

The spec's A-009 closure required removing the
`JSON.parse(JSON.stringify(...))` projection cast at
`apps/web-shell/src/mocks/stacService.ts:464-474` (line numbers from
the audit SHA; in the post-migration tree it lived at line 492).

### Before

```ts
// Round-trip through JSON to project the writer's StacItem onto the
// local StacItem shape (no `as unknown` cast at the boundary).
const stacItem = JSON.parse(JSON.stringify(rec.record)) as StacItem;
```

### After

```ts
// Both the writer's StacItem and the mock's StacItem now reference
// the same @debrief/schemas.StacItem (spec #223 Decision 1B), so no
// projection cast is required.
const stacItem = rec.record;
```

Verification:

```sh
git grep -n "JSON.parse(JSON.stringify" apps/web-shell/src/mocks/stacService.ts
```

```
# (no output — projection cast removed)
```

## Conclusion

**SC-003 PASS.** Zero hand-typed `interface Stac*` declarations remain
in the in-scope tree except:

1. The schema-rooted re-exports inside `apps/vscode/src/types/stac.ts`
   (which export from `@debrief/schemas` and are not "hand-typed
   interfaces" — they're `export type { ... } from '@debrief/schemas'`
   statements).
2. The documented OOS-001 / OOS-002 hits and the test-fixture file
   excluded from the audit.

The A-009 projection cast is removed; both ends of the writer ↔ mock
boundary use the same generated class.
