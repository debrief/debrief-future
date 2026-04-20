---
feature: "199-code-quality-cleanup"
captured_at: "2026-04-18T16:36:45Z"
git_sha: "6f3b0bd"
tests_passed: 3930
tests_failed: 1
tests_skipped: 5
coverage_pct: null
---

# Test Summary: Code-Quality Cleanup — Small-Bucket Consolidation

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 3936 |
| Passed | 3930 |
| Failed | 1 (pre-existing on `main` — environment-specific, not caused by this feature) |
| Skipped | 5 |
| Coverage | n/a (cleanup feature, no new behaviour module) |

## Test Breakdown

### Python (`uv run pytest`)

| Suite | Status |
|------|--------|
| 1746 tests across `services/`, `shared/`, root suites | Pass (1 skipped, 1 xfailed) |

### TypeScript — `@debrief/components` (`pnpm --filter @debrief/components test`)

| Suite | Status |
|------|--------|
| 1564 tests across LogPanel, MapView, ChartRenderer, StacBrowser, ToolMatch, etc. | Pass (4 skipped) |
| LogPanel rename verified (`__tests__/formatDuration.test.ts`, `__tests__/paramTypeInference.test.ts`, `__tests__/ParameterChip.test.tsx`) | Pass |

### TypeScript — `debrief-loader` (`pnpm --filter debrief-loader test`)

| Suite | Status |
|------|--------|
| `tests/unit/types.test.ts` (7 tests) | Pass |
| **`tests/unit/useLoadWorkflow.test.ts` (2 tests — NEW, FR-021)** | **Pass** |

### TypeScript — `services/session-state` (`pnpm --filter @debrief/session-state test`)

| Suite | Status |
|------|--------|
| 611 tests across log/, slices/, registry/, persistence, sse, performance | Pass |

### TypeScript — `apps/vscode` (`pnpm --filter debrief-vscode test`)

| Suite | Status |
|------|--------|
| 353 tests pass | Pass |
| 1 test fails: `tests/unit/stacService.updateItemMetadata.test.ts > T028: read-only filesystem throws ReadOnlyFilesystemError` | **Pre-existing on `main`** (sandbox / Docker container effective-uid bypasses `chmod 555` — confirmed by re-running on `/tmp/main-baseline` checkout of `main`@`130a52c`) |

### Static analysis

| Check | Status |
|------|--------|
| `uv run ruff check .` | Pass — all checks passed |
| `uv run pyright` | Pass — 0 errors, 0 warnings, 0 informations |
| `pnpm -r typecheck` (all 11 TS workspaces) | Pass — 0 errors |
| `pnpm --filter @debrief/components lint` | 34 warnings (0 errors), identical to `main` baseline |
| `pnpm --filter debrief-loader lint` | 0 errors, 0 warnings |
| `pnpm --filter debrief-vscode lint` | 125 problems (101 errors, 24 warnings), **identical to `main` baseline** |

## Key Scenarios Verified

- **FR-021 — `useLoadWorkflow.executeLoad` existing-plot branch returns display name, not id.**
  New `apps/loader/tests/unit/useLoadWorkflow.test.ts` mocks the IPC surface,
  passes a plot list with `id='plot-abc-123'` and `name='Alpha Exercise Run'`,
  invokes `executeLoad({mode: 'existing', existingPlotId: 'plot-abc-123', plots})`,
  and asserts `output.plotName === 'Alpha Exercise Run'` and
  `output.plotName !== 'plot-abc-123'`. **Sanity-checked** by reapplying the
  pre-fix `plotName = existingPlotId` placeholder on top of the green tree —
  test went RED with the exact assertion failure expected, then turned GREEN
  again on revert. Captured in `evidence/loader-plotname.md`.

- **FR-009 / SC-001 — knip silences `specs/**` without hiding other findings.**
  Baseline knip on `main` (with the same `playwright: false` workaround) reports
  119 unused files, 57 of which are under `specs/**`. After adding `knip.json`
  with `ignore: ["specs/**"]`, knip on the branch reports 62 unused files, zero
  under `specs/**`, and the non-`specs/**` set is byte-identical. Captured in
  `evidence/knip-report-diff.md`.

- **FR-004 — single `LogPanelProps` consumed by both child views.** TypeScript
  typecheck passes after `LogTimeline` and `LogByFeature` switch to
  `LogPanelProps`; existing 1564 vitest tests still pass; repo-wide
  `grep "LogTimelineProps|LogByFeatureProps"` returns zero matches across
  `shared/`, `apps/`, `services/`. Captured in `evidence/logpanel-consolidation.md`.

- **FR-001 / FR-002 / FR-003 — ADR-019 documents the accepted type-only cycles.**
  Both cycles confirmed still present at implementation time (`grep` of
  `import type` in `apps/vscode/src/`). Entry added with the words "cycle" and
  "type-only" both present. ADR count grew from 18 to 19. Captured in
  `evidence/adr-019.md`.

- **FR-013 / FR-020 — TODO promotion ships with real issue numbers.** Two new
  GitHub issues (`#472`, `#473`) filed via `mcp__github__issue_write`; in-source
  TODOs replaced with `TODO(#472):` and `TODO(#473):`. Pre-push guard:
  `grep "TODO(#NNN)" apps/ services/ shared/` returns zero matches; `grep "TODO:"`
  against the two target files returns zero matches. Captured in
  `evidence/todo-promotion.md`.

- **FR-007 / SC-003 — `shared/components/diff/` removed cleanly.** `git rm -r`
  removed all nine files (package.json, src/, tests/, tsconfig.json, vitest.config.ts).
  Sweep for stale references in `tsconfig*.json`, `pnpm-workspace.yaml`, build
  scripts, and `knip.json`: zero hits. `pnpm install` succeeds (lockfile
  unchanged — no workspace dep change). Doc-only references (in `BACKLOG.md`,
  `docs/ideas/`, `docs/technical-debt-*.md`) intentionally preserved as
  historical record.

## Known Issues

- **Pre-existing vscode test failure** — `stacService.updateItemMetadata.test.ts > T028`
  fails because the test asserts that `chmod 555` on a parent directory makes
  the child read-only, but the sandbox container runs as a uid that retains
  `CAP_DAC_OVERRIDE` (or is effectively root inside the container), so the
  write succeeds. This failure is **identical on `main` @ `130a52c`** and is
  not caused by anything in this PR.

- **Stale `TODO(#137)` audit** — `apps/vscode/src/services/stacService.ts:1119`
  carries a `TODO(#137)` marker. Audit (T050) finds: issue #137 is **closed**
  and unrelated (title: "Add feature proposal for loading REP files into new
  plots"). The marker is stale, but is a pre-existing condition not introduced
  by this PR; flagged here for future follow-up rather than fixed (out of scope
  for #199, which only promotes **untracked** TODOs).

- Playwright E2E suites (`apps/web-shell`, `apps/spec-navigator`) not run in
  this evidence capture — neither suite touches any code path modified by this
  PR (LogPanel internals are exercised by Storybook/vitest; the loader hook
  has its own vitest; ADR/diff/knip changes are configuration-only). Last
  green E2E run is the one CI executed for `main` @ `130a52c`.

## Environment

- Python: 3.11 via `uv`; pyright 1.1.x; ruff 0.7.x
- Node: v22.22.2; pnpm 9.15.5
- vitest: 1.6.1
- knip: 5.88.1 (newly pinned in this feature)
- Branch: `claude/implement-speckit-199-RvXLY`
- Spec branch: `199-code-quality-cleanup`
- Date: 2026-04-18
