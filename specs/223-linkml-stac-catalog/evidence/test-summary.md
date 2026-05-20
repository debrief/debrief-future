---
feature: "223-linkml-stac-catalog"
captured_at: "2026-05-20T07:15:00Z"
git_sha: "05fcdd4"
tests_passed: 1247
tests_failed: 0
tests_skipped: 6
coverage_pct: null
---

# Test Summary: Promote STAC catalog hand-types to LinkML

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 1253 |
| Passed | 1247 |
| Failed | 0 |
| Skipped | 6 (1 xfailed pre-existing, 5 platform-specific in services/stac) |
| Coverage | not measured (schema migration — no new business logic) |

## Test Breakdown

### Schema layer — `shared/schemas/tests/`

| Suite | Tests | Result |
|-------|------:|--------|
| `test_stac_roundtrip.py` (NEW) | 36 | ✅ All pass |
| `test_stac_schema_compare.py` (NEW) | 16 | ✅ All pass |
| `test_stac_fixtures.py` (NEW) | 77 | ✅ All pass |
| pre-existing schema tests | 870 | ✅ All pass |
| **Schema total** | **999** | **0 failures, 1 xfailed, 1 skipped** |

**STAC test highlights:**

- **Round-trip (FR-006)** — Py → JSON → Py for 13 fixtures across
  every named class (StacItem, StacCatalog, StacCollection, StacLink,
  StacAsset, StacItemAssetDefinition, StacExtent, StacSpatialExtent,
  StacTemporalExtent, StacSummaries, StacProvider). Extension keys
  (`debrief:*`, `file:*`, `proj:*`) survive the round-trip via the
  Article XV.2 open-record exception (Pydantic `extra='allow'`).
- **Schema comparison** — `model_json_schema()` per class reports the
  expected required-slot sets, the type discriminators emit as
  literals (`"Feature"`, `"Catalog"`, `"Collection"`), and the
  post-processed nested-array slots (`bbox`, `interval`) carry the
  correct `items: { type: array, ... }` shape.
- **Fixture corpus (FR-011)** — every committed `item.json` and
  `catalog.json` under both stores loads without coercion:
  - `preview/workspace/samples/local-store/` — 73 STAC 1.1 items + 1
    STAC 1.1 Collection root ✅
  - `apps/vscode/test-data/local-store/` — 2 STAC 1.0 items + 1 STAC
    1.0 Catalog root ✅
- **Golden round-trip** — 2 golden items + 1 golden Collection
  round-trip byte-equivalent (sorted-keys-recursive equality).

### Persistence layer — `services/stac/tests/`

| Result | Count |
|--------|------:|
| Passed | 226 |
| Skipped (pre-existing, platform-specific) | 5 |

No regressions from the wire-boundary Pydantic validation gate added
to `scripts/enrich-legacy-catalog.py` (FR-012).

### Writer layer — `shared/stac-writer/tests/`

| Result | Count |
|--------|------:|
| Passed | 22 |
| Failed | 0 |

`@debrief/stac-writer.StacItem` and `StacAsset` now re-export from
`@debrief/schemas` (Decision 1B). Overlay-merge + path-guard +
errors unit tests pass unchanged — the type swap is structurally
compatible at runtime.

### TypeScript typecheck (`pnpm -r typecheck`)

| Package | Result |
|---------|--------|
| `@debrief/schemas` | ✅ Clean |
| `@debrief/utils` | ✅ Clean |
| `@debrief/components` | ✅ Clean |
| `@debrief/session-state` | ✅ Clean |
| `@debrief/stac-writer` | ✅ Clean |
| `@debrief/web-shell` | ✅ Clean |
| `debrief-vscode` (manual `tsc --noEmit`) | ✅ Clean |
| `apps/loader`, `apps/backlog-navigator`, `apps/spec-navigator` | ✅ Clean |

### Lint (`pnpm lint`)

| Package | Result |
|---------|--------|
| `@debrief/web-shell` | ✅ Clean |
| `debrief-vscode` | ✅ Clean (4 pre-existing warnings unrelated to STAC) |
| `@debrief/components`, `@debrief/utils`, `@debrief/session-state`, others | ✅ Clean |

## Key scenarios verified

1. **Spec US1 acceptance** — a developer searching for `interface
   StacItem` or `interface StacCatalog` outside `shared/schemas/` finds
   no matches; both shapes are imported from `@debrief/schemas`.
2. **Spec US2 acceptance** — `interface StacLink` / `interface StacAsset` are gone from `apps/`, `services/`, `shared/components/`;
   the inline `StacItemAssets` alias in `sceneThumbnailService.ts` is replaced with `Record<string, StacAsset>`.
3. **Spec US3 acceptance** — `StacCollection`, `StacExtent`,
   `StacSummaries` re-exported from `@debrief/schemas`;
   `StacCatalogOrCollection` lives at
   `shared/schemas/src/typescript/aliases/stac-unions.ts` and narrows
   via `if (root.type === 'Collection')` without `as unknown` casts.
4. **SC-001 (audit §3.1)** — see `audit-before-after.md`.
5. **SC-002 (audit §3.2)** — see `audit-before-after.md`.
6. **SC-003 (no hand-types remain)** — see `no-handtype-grep.md`.
7. **SC-006 (no consumer regression)** — the STAC-tree
   `catalogReadView` / `stacWriterIdb` / `stacWriterFs` unit suites
   pass; the Storybook + vitest snapshot suite for `StacBrowser` /
   `StacFileTree` is unchanged (no UI shapes were modified). The
   web-shell Playwright STAC-tree spec is the relax-fallback per
   Research R-007 — recorded in `playwright-reuse-note.md`.

## Known issues

None attributable to this work.

**Pre-existing failures unrelated to #223 (confirmed via `git stash` on the pre-change tree):**

- `apps/web-shell/src/services/__tests__/toolService.test.ts` — 2
  tool-registration tests fail (expected tool ID list out of date).
- `apps/web-shell/src/services/__tests__/toolResponse.test.ts` — 1
  test fails on the Python-only tool ID rejection path.

These three failures exist on `main` and are out of scope for #223.
