---
feature: "206-audit-non-linkml-types"
captured_at: "2026-04-22T00:20:00Z"
git_sha: "01166d6e"
tests_passed: 18
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: [E11] Audit non-LinkML type declarations

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 18 |
| Passed | 18 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | n/a (fixture-based functional tests) |

Command: `pnpm exec vitest run --config scripts/audits/type-audit/vitest.config.ts`

Duration: 6.68s (5 test files, 18 test cases).

## Test Breakdown

### scan.enumerate.test.ts (5 tests)

| Test | Status |
|------|--------|
| emits one record per named interface/type/enum in the fixtures folder (no exclusions) | Pass |
| excludes .test.ts files when the `**/*.test.ts` glob is supplied | Pass |
| produces stable sorted output (by id) | Pass |
| records kind, lineNumber, and filePath correctly | Pass |
| rhsSummary is null for interface/enum and a string for type aliases | Pass |

### scan.autotag.test.ts (5 tests)

| Test | Status |
|------|--------|
| auto-tags boundary-candidate on aliases that bottom out in Record<string, unknown> | Pass |
| auto-tags boundary-candidate on aliases that bottom out in unknown | Pass |
| auto-tags schema-rooted-candidate on declarations in files that import @debrief/schemas | Pass |
| leaves autoTag=none for records that match no rule | Pass |
| auto-tags drift-shortlist on records that are members of a drift cluster | Pass |

### scan.drift.test.ts (4 tests)

| Test | Status |
|------|--------|
| groups same-name-different-shape declarations into a driftCluster | Pass |
| does NOT emit a cluster when same-name declarations share the same shape | Pass |
| does NOT emit a cluster when a declaration name appears only once | Pass |
| emits exactly one drift cluster for the fixtures folder (Platform) | Pass |

### scan.contract.test.ts (1 test)

| Test | Status |
|------|--------|
| output validates against scan-output.schema.json (transitively type-declaration-record.schema.json) via ajv (draft 2020-12) | Pass |

### scan.determinism.test.ts (3 tests)

| Test | Status |
|------|--------|
| two runs on identical inputs produce identical records + driftClusters | Pass |
| shapeHash is stable across runs for the same declaration text | Pass |
| shapeHash matches the SHA-1 hex pattern | Pass |

## Key Scenarios Verified

- **Enumeration**: scanner finds every top-level `interface` / `type` / `enum` declaration in the fixtures folder — 12 declarations across 11 files including one `.test.ts` that is excluded when the `**/*.test.ts` glob is supplied.
- **Exclusion rules**: honour the same glob patterns documented in the audit methodology (`shared/schemas/src/generated/**`, `**/__tests__/**`, `**/__fixtures__/**`, `**/*.test.ts`, `**/*.spec.ts`, `**/node_modules/**`, `**/dist/**`).
- **Auto-tagging**: each of the three hint rules (schema-rooted-candidate on `@debrief/schemas` import, boundary-candidate on `unknown` / `Record<string, unknown>` RHS, drift-shortlist on drift-cluster membership) fires as expected on purpose-built fixtures. Records matching no rule get `autoTag=none`.
- **Drift detection**: a deliberate same-name / different-shape pair (`Platform` in `f-drift-a.ts` vs `g-drift-b.ts`) forms exactly one cluster with two memberIds. A same-name / same-shape pair (`SameShape` in `i-` and `j-`) does NOT form a cluster. A single-site declaration (`ExportedUser`) does NOT form a cluster. The fixture set yields exactly one cluster.
- **Contract conformance**: the scanner's output validates against the committed JSON-Schema (`scan-output.schema.json` + `type-declaration-record.schema.json`) with Ajv 2020-12 strict mode.
- **Determinism**: two back-to-back runs on identical input produce identical records and driftClusters. Shape hashes are stable SHA-1 hex values.

## Known Issues

- None for the scanner itself. The `task verify` run surfaced a pre-existing Windows-platform pyright issue in `services/stac/tests/test_catalog.py` (`os.geteuid` not defined on Windows type stubs). CI runs on Linux where this passes. Unrelated to this feature.

## Live full-repo scan (belt-and-braces)

In addition to the fixture tests above, the committed scanner was run against
the real repo at the audit SHA (`01166d6e`):

```
Scanned 317 files, emitted 885 records, 25 drift clusters
[schema-rooted-candidate=260 boundary-candidate=5 drift-shortlist=106 none=514]
```

Runtime: ~4 seconds (well under the 30 s performance goal in plan.md).

The emitted JSON was validated against
`specs/206-audit-non-linkml-types/contracts/scan-output.schema.json` via
Ajv 2020-12 — see `evidence/ajv-validation.txt`.

## Environment

- Runner: vitest 1.6.1 (Node environment)
- Branch: `206-audit-non-linkml-types`
- Date: 2026-04-22
- Host: Windows 11 (scanner is cross-platform; CI runs on Linux)
