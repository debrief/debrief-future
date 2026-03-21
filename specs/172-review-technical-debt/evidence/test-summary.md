---
feature: "172-review-technical-debt"
captured_at: "2026-03-20T23:45:00Z"
git_sha: "6b87908"
tests_passed: 1458
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary: Review Technical Debt

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 1459 |
| Passed | 1458 |
| Failed | 0 |
| Skipped | 1 |
| Coverage | N/A (per-service thresholds set) |

## Test Breakdown

### Python (pytest) — 1123 passed, 1 skipped

| Suite | Tests | Status |
|-------|-------|--------|
| debrief-io | 203 | Pass |
| debrief-stac | 89 | Pass |
| debrief-config | 78 | Pass |
| debrief-calc | 446 | Pass |
| debrief-schemas | 157 | Pass |
| debrief-tools | 91 | Pass |
| session-state-py | 59 | Pass |

### TypeScript (vitest) — 335 passed

| Suite | Tests | Status |
|-------|-------|--------|
| @debrief/vscode (20 files) | 335 | Pass |
| annotation-types.test.ts | 15 | Pass |
| temporal.test.ts | 7 | Pass |
| store/session tests | 45 | Pass |

### Lint (ESLint + ruff)

| Package | Status |
|---------|--------|
| Python (ruff) | Pass — 0 errors |
| apps/vscode | Pass |
| apps/web-shell | Pass (warnings only) |
| apps/loader | Pass |
| shared/components | Pass |
| shared/utils | Pass (new) |
| shared/config-ts | Pass (new, warnings only) |
| services/session-state | Pass (new, warnings only) |

### Typecheck (pyright + tsc)

| Checker | Status |
|---------|--------|
| pyright | 0 errors, 0 warnings |
| tsc (all packages) | Pass |

## Key Scenarios Verified

- SchemaAnnotationFeature union validates against all 7 annotation fixture types
- TimeRange converter round-trip: ISO → epoch → ISO preserves values
- MCP type imports resolve correctly from @debrief/utils across vscode, web-shell, and components
- GeoJSONFeature regression guard script correctly blocks new local definitions
- Cross-layer imports eliminated: no @debrief/components imports in service files
- ESLint runs successfully on 4 previously uncovered packages
- Coverage thresholds enforce on debrief-config (80%) and debrief-calc (80%)

## Known Issues

- 1 Python test skipped (pre-existing, unrelated to this feature)
- T065-T076 (web-shell domain extraction) deferred — P3 priority, ~1000 lines across 5 files
- ESLint warnings in config-ts, session-state, web-shell for pre-existing unused vars and ban-types

## Environment

- Runner: pytest + vitest
- Branch: claude/speckit-technical-debt-9rBMj
- Date: 2026-03-20
