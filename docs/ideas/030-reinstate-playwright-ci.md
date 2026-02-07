# Reinstate Playwright E2E Testing in CI Pipeline

## Problem

Playwright E2E tests exist in the codebase but were removed from CI to unblock PR merges. This creates a testing gap where browser-based interactions are not validated automatically.

Current state:
- E2E tests exist: `shared/components/e2e/ToolMatchHarness.spec.ts` (12+ tests)
- CI runs `task test` → `pnpm test` → `vitest run` (unit tests only)
- Separate `test:e2e` script exists but isn't invoked in CI
- Tests cover Storybook component interactions and screenshot capture

## Proposed Solution

Wire Playwright E2E tests into the CI pipeline:

1. **Add Playwright CI step** to `.github/workflows/ci.yml` or create dedicated workflow
2. **Install Playwright browsers** in CI environment (`npx playwright install --with-deps`)
3. **Start Storybook server** before running E2E tests
4. **Configure CI-appropriate settings** (timeouts, retries, parallelism)

## Success Criteria

- [ ] Playwright E2E tests run on every PR
- [ ] E2E failures block PR merges
- [ ] CI completes in reasonable time (< 10 minutes additional)
- [ ] Screenshot artifacts uploaded on failure for debugging

## Constraints

- Must work on GitHub Actions Ubuntu runners
- Should not significantly increase CI time
- Must handle Storybook startup reliably

## Out of Scope

- Adding new E2E tests (existing tests are sufficient for this item)
- Cross-browser testing (Chromium-only is acceptable initially)
- Visual regression testing infrastructure
