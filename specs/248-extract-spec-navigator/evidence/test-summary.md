---
feature: "248-extract-spec-navigator"
captured_at: "2026-05-08T16:05:39Z"
git_sha: "30b97d2"
tests_passed: 176
tests_failed: 0
tests_skipped: 9
coverage_pct: null
---

# Test Summary: Extract spec-navigator into a Standalone Repository (Phase 1)

This feature spans three phases across two repositories. The implementation in this branch covers **Phase 1** (in-place configuration seam) plus a complete **Phase 2 extraction kit** committed under `specs/248-extract-spec-navigator/extraction-kit/`. Phase 2 execution and Phase 3 cutover are deferred to follow-up PRs (the kit's `PHASE3-RUNBOOK.md` documents the cutover).

This summary covers the Phase 1 verification only — the extraction kit ships as documentation/scripts and has no executable test gate beyond `lint`/`typecheck`/`shellcheck` passing on its files.

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 185 |
| Passed | 176 |
| Failed | 0 |
| Skipped | 9 (intentionally — see below) |
| Coverage | not measured (vitest run without coverage flag) |

The 9 skipped tests break down as:

- 7 `e2e/capture-evidence.spec.ts` and `e2e/capture-axe.spec.ts` Playwright specs — these are evidence-capture utilities that only run when invoked explicitly with the right CLI flags. Pre-existing skip behaviour unrelated to this feature.
- 2 vitest skips: 1 in `src/__tests__/bundleSize.test.ts` (gated on a CI-only env var) and 1 React `act()` warning that's pre-existing in `SpecBrowserModal.test.tsx`.

## Test Breakdown

### Lint

| Test | Status |
|------|--------|
| `pnpm --filter @debrief/spec-navigator lint` (eslint on `src/`) | Pass |

### Typecheck

| Test | Status |
|------|--------|
| `pnpm --filter @debrief/spec-navigator typecheck` (`tsc --noEmit`) | Pass |

### Vitest (151 passed, 2 skipped)

22 test files:
- `src/__tests__/bundleSize.test.ts` — 1 skipped (CI-only)
- `src/__tests__/xssAdversarial.test.ts` — 10 passed
- `src/components/__tests__/ArtifactView.test.tsx` — full suite passed
- `src/components/__tests__/markdownRender.bench.test.ts` — 3 passed (50KB / 150KB / 300KB)
- `src/components/__tests__/SpecBrowserModal.test.tsx` — full suite passed (1 act-warn pre-existing)
- `src/format/__tests__/classifyArtefact.test.ts` — 6 passed
- `src/github/__tests__/auth.test.ts` — 6 passed
- `src/github/__tests__/schemas.test.ts` — full suite passed (rewired to use `DEFAULT_OWNER`/`DEFAULT_REPO`)
- 14 other test files — all green

### Playwright (25 passed, 7 skipped)

32 specs total. Run via `cd apps/spec-navigator && node run-playwright.mjs` (cloud-bundled chromium):

| Suite | Status |
|------|--------|
| `e2e/a11y.spec.ts` (6 specs, desktop + mobile × 3 states) | Pass — zero WCAG AA violations |
| `e2e/auth.spec.ts` (5 specs) | Pass |
| `e2e/drawer.spec.ts` (5 specs) | Pass — drafts persist, edit/delete/clear all work |
| `e2e/render.spec.ts` (3 specs) | Pass — markdown render + raw toggle + artefact navigation |
| `e2e/stale-head.spec.ts` (3 specs) | Pass — StaleHeadModal flow |
| `e2e/submit.spec.ts` (3 specs) | Pass — feature/document/selection comments + clean-up after submit |
| `e2e/capture-*.spec.ts` (7 specs) | Skipped — evidence-capture utilities (intentional) |

## Key Scenarios Verified

- **FR-006 satisfied**: `grep -rEn "'debrief'|\"debrief\"|debrief-future|debrief\\.github\\.io" apps/spec-navigator/src/` returns 4 lines, **all in `src/defaults.ts`** as either fallback expressions (lines 23–24) or comments (lines 9, 28). No production literal remains outside the `defaults.ts` boundary.
- **FR-007 satisfied**: existing Vitest and Playwright suites pass with no test changes required beyond replacing inlined `'debrief'`/`'debrief-future'` test fixtures with `DEFAULT_OWNER`/`DEFAULT_REPO` imports. Behaviour identical.
- **Acceptance Scenario 1** (audit-identified literals are gone): Confirmed via grep above. The 7 hardcoded literals tracked by the Phase 0 audit (`docs/extraction-audit/spec-navigator/coupling-inventory.md` §2) are now sourced through `src/defaults.ts`.
- **Acceptance Scenario 2** (no observable change with default config): Vitest and Playwright suites green without behavioural test edits.
- **Acceptance Scenario 4** (existing suites pass): see "Lint", "Typecheck", "Vitest", "Playwright" above.

## Known issues

None blocking the feature.

The `bundleSize.test.ts` skip is pre-existing and CI-gated (only runs when `BUNDLE_SIZE_GUARD=1` is set). The single `act()` warning in `SpecBrowserModal.test.tsx` is pre-existing and unrelated to this feature.

## Files modified for Phase 1

| File | Change |
|------|--------|
| `apps/spec-navigator/src/defaults.ts` | **NEW** — central defaults module, the only place where `'debrief'` / `'debrief-future'` appear as fallbacks |
| `apps/spec-navigator/src/github/api.ts` | Removed inlined `DEFAULT_OWNER`/`DEFAULT_REPO`; imports from `../defaults` |
| `apps/spec-navigator/src/state/useFeature.ts` | `FeatureScope.repoOwner`/`repoName` literals replaced with imports from `../defaults` |
| `apps/spec-navigator/src/strings.ts` | Three vendor strings (PAT scope description, OpenPrList empty, SpecBrowserModal title) now use `${DEFAULT_REPO_LABEL}` template |
| `apps/spec-navigator/src/components/__tests__/ArtifactView.test.tsx` | Test fixture uses imported defaults |
| `apps/spec-navigator/src/components/__tests__/markdownRender.bench.test.ts` | Test fixture uses imported defaults |
| `apps/spec-navigator/src/__tests__/xssAdversarial.test.ts` | Test fixture uses imported defaults |
| `apps/spec-navigator/src/github/__tests__/schemas.test.ts` | Two debrief raw-content URLs constructed from imported defaults |
