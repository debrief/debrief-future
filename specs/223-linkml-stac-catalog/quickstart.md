# Quickstart — Verify the STAC catalog → LinkML migration

**Feature**: 223-linkml-stac-catalog
**Date**: 2026-05-19
**Audience**: reviewers, /speckit.tasks author, future maintainers
running a regression check against this cluster.

Walks a fresh checkout of the feature branch through the acceptance
gates. Total wall-clock time on a 2024-vintage workstation ≈ 6–8 minutes.

## Prerequisites

```sh
# From repo root, on branch 223-linkml-stac-catalog
git status                    # should be clean
uv sync                       # Python deps for schema-build + adherence tests
pnpm install --frozen-lockfile
```

## Step 1 — Build the schemas

```sh
task schemas:build
# (or, if `task` is not installed:
#   cd shared/schemas && make all && cd ../..  )
```

**Pass criterion**: command exits 0 in ≤ 120% of pre-feature baseline
(NFR-001). Generated artefacts present:

```sh
ls shared/schemas/src/generated/python/debrief_schemas/__init__.py   # updated
ls shared/schemas/src/generated/typescript/types.ts                   # updated
ls shared/schemas/src/generated/json-schema/stac.schema.json          # new
ls shared/schemas/src/typescript/aliases/stac-unions.ts               # new (TS-only union alias)
```

Inspect the generated TypeScript to confirm the 8 new exports exist:

```sh
grep -nE "^export (interface|type) (Stac(Item|ItemProperties|Catalog|Collection|Link|Asset|Extent|SpatialExtent|TemporalExtent|Summaries|Provider|TypeEnum|CatalogOrCollection))" \
  shared/schemas/src/generated/typescript/types.ts \
  shared/schemas/src/typescript/aliases/stac-unions.ts
# Expected: 11 export lines (12 classes/enums minus StacCatalogOrCollection in types.ts +
# StacCatalogOrCollection in stac-unions.ts = 11 unique names in types.ts +
# 1 in stac-unions.ts).
```

## Step 2 — Run schema-adherence tests

```sh
uv run pytest shared/schemas/tests/test_stac_roundtrip.py \
              shared/schemas/tests/test_stac_fixtures.py \
              shared/schemas/tests/test_stac_schema_compare.py -v
```

**Pass criterion**: all tests green. Includes (per FR-006):

- Round-trip: Py → JSON → TS → JSON → Py for each named class.
- Schema-compare: LinkML JSON Schema ≡ Pydantic
  `model_json_schema()` (with `extra='allow'` honoured on the three
  open-record classes).
- Golden + negative fixtures from
  `shared/schemas/tests/fixtures/stac/`.
- **Fixture corpus** (FR-006 / FR-011): every `item.json` under
  `preview/workspace/samples/local-store/` (73 files) loads as
  `StacItem`; both `catalog.json` files (preview = `StacCollection`
  v1.1, test-data = `StacCatalog` v1.0) load as their respective
  classes.

## Step 3 — Run the type-audit scanner

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

**Pass criterion** (SC-001 / SC-002):

```sh
# Zero §3.1 rows attributed to #223:
grep -c "Open #223" tmp/type-audit-report.md
# expected: 0

# Zero StacItem / StacCatalog rows in §3.2:
grep -cE 'drift cluster "(StacItem|StacCatalog)"' tmp/type-audit-report.md
# expected: 0
```

## Step 4 — Confirm no hand-types remain (SC-003)

```sh
# Hand-typed STAC interfaces in the cluster MUST only appear under
# shared/schemas/. Re-exports inside apps/vscode/src/types/stac.ts
# (using `export type { ... } from '@debrief/schemas'`) are OK.
git grep -nE "^[[:space:]]*(export[[:space:]]+)?interface (Stac(Item|ItemProperties|Catalog|Collection|Link|Asset|Extent|SpatialExtent|TemporalExtent|Summaries|Provider))" \
  -- apps shared services \
  | grep -v "shared/schemas/" \
  || echo "PASS — no hand-types remain"
```

**Pass criterion**: the `|| echo "PASS"` branch triggers.

```sh
# Inline open-record assets shape should also be gone:
git grep -n "interface StacItemAssets" -- services/ apps/ shared/
# expected: no matches
```

```sh
# JSON projection cast between local StacItem and @debrief/stac-writer.StacItem
# should also be gone (A-009 closure):
git grep -n "JSON.parse(JSON.stringify" apps/web-shell/src/mocks/stacService.ts
# expected: no matches (or matches only on lines not related to stac-writer projection)
```

## Step 5 — Run full project verify (SC-005)

```sh
task verify
# (or the four-step fallback in CLAUDE.md §Before Pushing)
```

**Pass criterion**: lint + typecheck + unit tests + Playwright E2E all
green. No new `// @ts-expect-error`, `# type: ignore`, `as any`, or
`Any` casts attributable to this migration — the diff
`git diff main...HEAD` should reveal only the three documented
open-record classes (`StacItemProperties`, `StacAsset`,
`StacSummaries`) carrying `additional_properties: true` in
`stac.yaml`.

## Step 6 — Spot-check a plot load from the STAC tree (SC-006)

Run the STAC-tree Playwright E2E (specific spec resolved during
/speckit.tasks per Research R-007 — candidates: `catalog.spec.ts`,
`plot-load.spec.ts`, `stac-browser.spec.ts`):

```sh
cd apps/web-shell && node run-playwright.mjs <stac-tree-test-name>
```

**Pass criterion**: same fixture catalogue (`preview/workspace/samples/
local-store/`), same number of items rendered in the tree, plot
loads successfully when an item is clicked, no new error in the
DevTools console.

If no suitable E2E exists, SC-006 relaxes to "Storybook + vitest
snapshot suite passes for `StacFileTree` + `StacBrowser` + the
catalog-overview-panel renders byte-identical screenshots" — these
already run as part of `task verify` in Step 5.

## Step 7 — Confirm Python writer alignment (FR-012)

```sh
# Pydantic constructions in the regeneration pipeline should now use
# the generated debrief_schemas classes — not raw dicts.
git grep -nE "(StacItem|StacCatalog|StacCollection)\(" \
  scripts/enrich-legacy-catalog.py services/stac/ \
  | head -20
# Expected: positive matches showing Pydantic class constructions.

# Conversely, raw `dict[str, Any]` constructions of STAC payloads
# should have been migrated:
git grep -nE 'dict\[str,\s*Any\].*"stac_version"' \
  scripts/enrich-legacy-catalog.py services/stac/
# Expected: no matches (or only in legacy/archived code paths).
```

**Pass criterion**: the regeneration pipeline constructs Pydantic
models, not dicts. Smoke test:

```sh
# Re-run the regeneration script against a sample input — must
# produce byte-identical output to the committed fixture (mod whitespace).
uv run python scripts/enrich-legacy-catalog.py \
  --input apps/vscode/test-data/source-files/boat1.rep \
  --output /tmp/regen-test/
diff -r /tmp/regen-test/ preview/workspace/samples/local-store/core--boat1/
# Expected: no semantic differences (file ordering / mtime ignored).
```

## Step 8 — Confirm changelog updates (FR-010, SC-007)

```sh
git diff main...HEAD -- docs/type-audit-2026.md
# expected: a new §5 changelog entry crediting this spec, the merge
# git-SHA, and before/after row counts (5→0 for §3.1; 5 drift
# members → 0 for §3.2 StacItem + StacCatalog).

git diff main...HEAD -- shared/schemas/README.md
# expected: a new worked-example section for the STAC catalog
# cluster (NFR-003).
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Step 1 fails: `gen-typescript` error on `any_of` for `StacItem.geometry` | Generator config doesn't handle nested any_of | Compare to `RawGeoJSONFeature.geometry` in `raw-geojson.yaml`; ensure same any_of indentation. |
| Step 2 fails: `test_stac_fixtures.py::test_item_<id>_loads` | A fixture carries a STAC field not in the schema | Widen the schema per FR-011; do NOT rewrite the fixture. Check Research R-005 (stac_extensions) and R-006 (providers / item_assets). |
| Step 2 fails: `test_stac_schema_compare.py::test_StacAsset` | Pydantic `extra` config mismatch | Verify the generator config sets `extra='allow'` on classes with `additional_properties: true`. |
| Step 3 still shows §3.1 row | A consumer site was missed | Re-read `data-model.md` §"Per-site migration plan" and check each line. |
| Step 4 prints a line under `apps/vscode/src/types/stac.ts` | A re-export forgot the `import type { ... } from '@debrief/schemas'` add | Confirm the file's first imports include the new STAC classes. |
| Step 5 `pnpm -r typecheck` fails on `stacService.ts` accessing `item.assets["custom-key"]` | Generated `StacItem.assets` is `Record<string, StacAsset>` but consumer expected `Record<string, StacAsset | undefined>` | TypeScript already permits undefined on arbitrary record reads with `noUncheckedIndexedAccess` on — verify project `tsconfig.json` setting. |
| Step 6 Playwright fails: tree shows fewer items than before | Schema validation rejecting one or more fixtures silently | Re-run Step 2 with `-v` and look for individual failures. Open-record slots should accept everything; if not, the cause is a STAC-core field. |
| Step 7 regeneration diff shows missing fields | Python writer not using `exclude_none=True` / `by_alias=True` | Check the `model_dump` call uses both flags so optional empty fields are omitted (matches current on-disk shape). |
