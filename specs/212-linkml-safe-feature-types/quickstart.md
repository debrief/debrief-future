# Quickstart / Verification: #212

**Date**: 2026-06-01 | **Feature**: `212-linkml-safe-feature-types`

How to verify the migration is complete, behaviour-preserving, and Article II/IV.5/XV-compliant. Run from repo root.

## 1. The hand-written types are gone

```sh
# No definitions or exports of the Safe* family remain
grep -rn "interface Safe\(Feature\|Geometry\|FeatureCollection\)\b" apps/ shared/ services/ --include="*.ts" --exclude-dir=node_modules   # → no output
grep -rn "Safe\(Feature\|Geometry\|FeatureCollection\)" shared/utils/src/index.ts shared/utils/src/types.ts                              # → no output
```

## 2. Regression guard catches reintroduction (FR-007 / SC-001)

```sh
bash scripts/check-no-geojson-feature.sh          # → ✅ passes now
# Temporarily add `interface SafeFeature {}` under apps/ → guard exits 1; remove it → exits 0
```

## 3. No schema drift (FR-009 / SC-006)

```sh
task schema:generate && task schema:check-drift   # → generated/ unchanged (unions.ts is hand-maintained, not generator output)
git diff --stat shared/schemas/src/generated/      # → only unions.ts (+ index.ts re-export) touched, by hand
```

## 4. Strict typing & casts (Article XV.7 / SC-007)

```sh
pnpm -r typecheck     # tsc --noEmit across packages — must pass
pnpm lint             # ESLint: no new `as Record` / `as unknown` / inline-object casts; named-type casts OK
# Spot-check: the stacService `as number[]*` casts are gone (replaced by calculateBounds reuse)
grep -n "coordinates as number" apps/vscode/src/services/stacService.ts   # → no output
```

## 5. Type-level derivation tests (SC-005)

```sh
# Derivation invariant holds; bounds type-test updated to IngressFeature
pnpm --filter @debrief/schemas test    # runs ingress-feature.test-d.ts
pnpm --filter @debrief/utils  test     # runs updated bounds.types.test-d.ts
```

## 6. Behaviour preserved — null geometry & bbox (SC-004 / VR-1 / VR-3)

```sh
# Unit tests, incl. existing null-geometry fixtures (SYSTEM_RECORD / STORYBOARD / NarrativeEntry)
uv run pytest                                   # Python unaffected — green
pnpm --filter '!@debrief/web-shell' test        # TS unit tests — green
# New/updated unit test: calculateBounds over a MultiPolygon feature returns the correct bbox
#   (previously omitted by extractCoordinates — VR-3 fix)
```

## 7. Full workflow regression (US4 / SC-002)

```sh
# Web-shell E2E (cloud): load plot, run a tool, confirm result layer renders and a
# geometry:null feature survives the round-trip through the migrated boundaries.
cd apps/web-shell && node run-playwright.mjs <existing-spec> && cd ../..
```

## 8. One-command gate (what CI runs)

```sh
task verify    # lint + typecheck + test — all green before push
```

**Done when:** §1–§8 all pass, full CI is green, and PR review confirms any boundary cast carries a `// SAFETY:` note (none expected beyond retargeted named-type casts).
