# Audit before / after — SC-001 + SC-002 evidence

**Feature**: `223-linkml-stac-catalog`
**Captured**: 2026-05-20
**Audit scanner**: `scripts/audits/type-audit/scan.ts` +
                  `scripts/audits/type-audit/generate-report.ts`

This document reports the type-audit re-run on the merged feature
branch — direct evidence for **SC-001** (zero §3.1 rows attributed to
#223) and **SC-002** (zero StacItem / StacCatalog drift clusters).

## Reproducer

```sh
mkdir -p tmp
pnpm tsx scripts/audits/type-audit/scan.ts \
  --roots apps shared services \
  --exclude "shared/schemas/src/generated/**" \
  --exclude "**/__tests__/**" \
  --exclude "**/__fixtures__/**" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --exclude "**/node_modules/**" \
  --exclude "**/dist/**" \
  --out tmp/type-audit.json
pnpm tsx scripts/audits/type-audit/generate-report.ts \
  --in tmp/type-audit.json \
  --out tmp/type-audit-report.md
```

## Before (baseline on `main`)

```
Scanned 407 files, emitted 1226 records, 38 drift clusters
[schema-rooted-candidate=370 boundary-candidate=5
 drift-shortlist=135 none=716]

§3.1 cross-domain-hand-typed total:   25 rows
§3.1 rows attributed to #223:          8 rows
§3.2 drift cluster "StacItem":         3 members
§3.2 drift cluster "StacCatalog":      2 members
```

### Verbatim §3.1 rows attributed to #223 (baseline)

| # | Package | Site | Type | Action |
|---|---------|------|------|--------|
| 69 | @debrief/stac-writer | `shared/stac-writer/src/interface.ts:27` | `StacAsset` | Open #223 — drift cluster "StacAsset" aligns with this E11 phase |
| 70 | @debrief/stac-writer | `shared/stac-writer/src/interface.ts:38` | `StacItem` | Open #223 — drift cluster "StacItem" aligns with this E11 phase |
| 76 | @debrief/web-shell | `apps/web-shell/src/mocks/stacService.ts:24` | `StacItem` | Open #223 — drift cluster "StacItem" aligns with this E11 phase |
| 77 | @debrief/web-shell | `apps/web-shell/src/mocks/stacService.ts:40` | `StacCatalog` | Open #223 — drift cluster "StacCatalog" aligns with this E11 phase |
| 101 | debrief-vscode | `apps/vscode/src/services/sceneThumbnailService.ts:73` | `StacItem` | Open #223 — drift cluster "StacItem" aligns with this E11 phase |
| 111 | debrief-vscode | `apps/vscode/src/types/stac.ts:127` | `StacItem` | Open #223 — drift cluster "StacItem" aligns with this E11 phase |
| 112 | debrief-vscode | `apps/vscode/src/types/stac.ts:156` | `StacAsset` | Open #223 — drift cluster "StacAsset" aligns with this E11 phase |
| 113 | debrief-vscode | `apps/vscode/src/types/stac.ts:166` | `StacCatalog` | Open #223 — drift cluster "StacCatalog" aligns with this E11 phase |

**8 rows total** — the 5 audit-flagged sites from spec §Background +
3 R4-masked siblings (`shared/stac-writer.StacAsset`,
`shared/stac-writer.StacItem`, `apps/vscode/src/types/stac.ts:StacAsset`).
The spec called for 5; the migration resolves all 8 because Decision
1B (writer-package surgery) was in scope.

## After (this PR)

```
Scanned 407 files, emitted 1213 records, 35 drift clusters
[schema-rooted-candidate=386 boundary-candidate=5
 drift-shortlist=127 none=695]

§3.1 cross-domain-hand-typed total:    4 rows  (was 25)
§3.1 rows attributed to #223:          0 rows  (was 8)        ✅ SC-001
§3.2 drift cluster "StacItem":         0 members (was 3)      ✅ SC-002
§3.2 drift cluster "StacCatalog":      0 members (was 2)      ✅ SC-002
```

### Grep gate evidence

```sh
grep -c "Open #223" tmp/type-audit-report-after.md
# 0

grep -cE 'drift cluster "(StacItem|StacCatalog)"' tmp/type-audit-report-after.md
# 0
```

## Cluster delta summary

| Cluster | Members before | Members after | Delta |
|---------|---------------:|--------------:|------:|
| §3.1 rows for #223 | 8 | 0 | **-8** |
| §3.2 `StacItem` drift | 3 | 0 | **-3** |
| §3.2 `StacCatalog` drift | 2 | 0 | **-2** |
| §3.2 `StacAsset` drift¹ | 2 | 0 | **-2** |

¹ The audit's `StacAsset` drift cluster was R4-masked in the spec's
opening tally but visible in the §3.1 list. Decision 1B (writer
surgery) collapsed both members onto the same generated class, so
the cluster is gone from §3.2 as well.

## Resolution mechanism

| Site | Resolution |
|------|------------|
| `apps/vscode/src/types/stac.ts` | Converted from declaration module to re-export module. 7 hand-typed interfaces (`StacItem`, `StacCatalog`, `StacCollection`, `StacLink`, `StacAsset`, `StacExtent`, `StacSummaries`) + 1 type alias (`StacCatalogOrCollection`) deleted; replaced with `export type { ... } from '@debrief/schemas'`. UI-only shapes (`StoreStatus`, `StacStore`, `Catalog`, `StacItemSummary`) retained per OOS-001 / OOS-002. |
| `apps/vscode/src/services/sceneThumbnailService.ts` | Private `interface StacItem` (line 73) and `interface StacItemAssets` (line 63) deleted. `StacItemAssets` replaced with `Record<string, StacAsset>` via a typed alias derived from the schema. |
| `apps/web-shell/src/mocks/stacService.ts` | Private `interface StacItem` (line 23) and `interface StacCatalog` (line 39) deleted; both imported from `@debrief/schemas`. The JSON projection cast at lines 464-474 (the A-009 closure) removed — both ends of the writer ↔ mock boundary now reference the same generated class. |
| `shared/stac-writer/src/interface.ts` | Local `StacItem` and `StacAsset` declarations deleted. Re-exports from `@debrief/schemas` preserve the existing public API surface of the package. `@debrief/schemas` added to `package.json` dependencies. |

## Remaining STAC mentions in the audit report

The post-migration report still contains the strings "StacItem",
"StacCatalog", etc. in these expected places:

1. **`shared/schemas/src/typescript/aliases/stac-unions.ts:31`** —
   `StacCatalogOrCollection` is a schema-rooted TS-only alias
   (LinkML cannot emit unions of named classes natively).
   Classified `single-domain`.
2. **`apps/vscode/src/types/stac.ts:60` (`Catalog`)** — UI-only
   Debrief-specific catalog summary, NOT a STAC Catalog.
   Out of scope per OOS-001.
3. **`apps/vscode/src/types/stac.ts:91` (`StacItemSummary`)** —
   camelCase adapter over `@debrief/schemas#StacItemSummary` (snake_case);
   unifying them is a separate #214 follow-up. Out of scope per OOS-002.
4. **`apps/vscode/src/providers/stacTreeProvider.ts:12`
   (`TreeItemData = StacStore | Catalog | StacItemSummary`)** —
   UI-only union over the projection types above.
5. **`apps/vscode/src/services/sceneThumbnailService.ts:67`
   (`StacItemAssets = Record<string, StacAsset>`)** — local convenience
   alias; the file imports from `@debrief/schemas` so R4 reclassifies
   it as schema-rooted.

All of these are correctly classified as out-of-scope per spec.md
**§OOS-001** (UI-only projections) and **§OOS-002** (the
`StacItemSummary` camelCase rename deferral).

## Conclusion

**SC-001 PASS** — zero §3.1 rows attributed to #223 (down from 8).
**SC-002 PASS** — zero §3.2 rows for `StacItem` or `StacCatalog`
drift clusters (down from 5 members across two clusters).

The audit re-run is reproducible from `tmp/type-audit-report-before.md`
and `tmp/type-audit-report-after.md` produced via the reproducer
above on the feature branch.
