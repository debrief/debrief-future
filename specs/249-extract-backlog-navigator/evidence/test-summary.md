---
feature: "249-extract-backlog-navigator"
captured_at: "2026-05-12T06:55:00Z"
git_sha: "0d75fef"
tests_passed: 139
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Extract Backlog Navigator into a Standalone Repository

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 139 |
| Passed | 139 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | (not measured) |

## Test Breakdown

### Phase 1 — Configuration seam (apps/backlog-navigator/)

| Gate | Status |
|------|--------|
| `pnpm --filter @debrief/backlog-navigator lint` (T028) | Pass — 0 errors, 4 pre-existing warnings |
| `pnpm --filter @debrief/backlog-navigator typecheck` (T029) | Pass |
| `pnpm --filter @debrief/backlog-navigator test` (T030) | Pass — 139/139 Vitest tests across 19 files |
| Smoke build with non-default env vars (T032) | Pass — `VITE_DEFAULT_OWNER=octocat VITE_DEFAULT_REPO=hello-world pnpm build` bakes the foreign slug into `dist/assets/index-*.js` |
| Grep guard — no production debrief literals (T034) | Pass — remaining matches limited to comment prose in `defaults.ts`/`strings.ts` and the `vite.config.ts` base default (which `import-from-source.sh` sed-substitutes at extraction time) |
| Grep guard — no `@debrief` imports (T035) | Pass — only the package's own `name` field and prose comments remain |

### Phase 2 — Extraction kit (specs/249-extract-backlog-navigator/extraction-kit/)

The kit was refactored mid-PR from a two-script push-from-source flow
(operator's local machine pushes to destination) to a single-script
pull-from-source flow (destination's CC session pulls from
debrief-future). See `extraction-kit/docs/why-pull-not-push.md` for
rationale. The verification table below reflects the final flow.

| Gate | Status |
|------|--------|
| `bash -n import-from-source.sh` | Pass — syntax clean |
| `shellcheck` | Not installed in sandbox; recorded as environmental gap |
| `yamllint` / `actionlint` | Not installed in sandbox; recorded as environmental gap |
| Grep for debrief in templates/workflows/scripts | Pass — all matches are source-repo provenance refs (audit-allowed) |
| `import-from-source.sh --dry-run` against fresh empty destination | Pass — subtree split (278 commits), checkout-as-main, vite base sed, lockfile regen, placeholder check all green; 13 files rendered, 33 tokens replaced |
| `import-from-source.sh --dry-run` against non-empty destination, without `--merge-unrelated-histories` | Pass — aborts at Step 4 with explicit guidance to re-run with the flag |
| `import-from-source.sh --dry-run --merge-unrelated-histories` against non-empty destination | Pass — merges with init commits; same 13 files rendered, same zero placeholder leakage |

### Vitest detail (139 tests across 19 files)

| Suite | Tests | Status |
|---|---|---|
| `src/state/__tests__/push.test.ts` | 9 | Pass |
| `src/components/mobile/__tests__/CardList.test.tsx` | 9 | Pass |
| `src/editors/__tests__/EditorOverlayProvider.test.tsx` | 9 | Pass |
| `src/components/mobile/__tests__/byteParityBottomSheet.test.tsx` | 5 | Pass |
| `src/components/editors/__tests__/CellEditors.test.tsx` | 14 | Pass |
| `src/components/mobile/__tests__/ItemCard.test.tsx` | 11 | Pass |
| `src/__tests__/chunkErrorBoundary.test.tsx` | 11 | Pass |
| `src/components/mobile/__tests__/BottomSheet.test.tsx` | 10 | Pass |
| `src/components/mobile/__tests__/StickyPushBar.test.tsx` | 7 | Pass |
| `src/components/mobile/__tests__/byteParityDescription.test.tsx` | 4 | Pass |
| `src/state/__tests__/pendingEdits.test.ts` | 5 | Pass |
| `src/parser/__tests__/parseBacklog.test.ts` | 9 | Pass |
| `src/pwa/__tests__/registerSW.test.tsx` | 6 | Pass |
| `src/state/__tests__/speckitCommand.test.ts` | 11 | Pass |
| `src/__tests__/lazyBoundary.test.tsx` | 3 | Pass |
| `src/__tests__/types.test.ts` | 8 | Pass |
| `src/format/__tests__/summary.test.ts` | 2 | Pass |
| `src/parser/__tests__/liveBacklog.roundtrip.test.ts` | 2 | Pass |
| `src/state/__tests__/deploymentMode.test.ts` | 4 | Pass |

## Key Scenarios Verified

- **Phase 1 (config seam) is a byte-stable no-op for the existing build.**
  Every Vitest test passes after the rewire; `pnpm build` succeeds; with
  default env vars, the dist artefacts contain `debrief`/`debrief-future`
  exactly where they did before. (FR-006 / Acceptance Scenario 2.)
- **A foreign-repo build works without source edits.**
  `VITE_DEFAULT_OWNER=octocat VITE_DEFAULT_REPO=hello-world pnpm build`
  produces a bundle that references `octocat/hello-world` rather than
  the debrief defaults. (FR-007 / Acceptance Scenario 3.)
- **Workspace dep on `@debrief/components` is fully severed.**
  `git grep '@debrief' apps/backlog-navigator/{src,package.json}` returns
  only the package's own `name` field and provenance prose comments —
  no runtime imports remain. (R-007.)
- **`packageManager` field is present** so the post-extraction CI's
  `pnpm/action-setup@v4` step resolves a version. (FR-010 / #248 Lesson 2.)
- **Extraction kit produces a buildable standalone tree end-to-end.**
  `import-from-source.sh --dry-run` against a fresh empty destination
  completes subtree split → merge into destination → vite-base sed →
  template substitution → lockfile regen → placeholder-leakage check,
  all green; 13 files rendered, 33 tokens replaced, zero remaining
  `{{...}}` markers. The post-substitution tree has standalone tsconfig
  / eslintrc that no longer reference monorepo paths.
- **No hardcoded destination in the kit.** All kit templates, workflows,
  and scripts use `{{ORG}}`/`{{REPO}}`/`{{HOST}}` placeholders; the only
  `debrief` matches are source-repo provenance references (audit-allowed).
- **PR preview infrastructure is first-class.** `pr-preview.yml`,
  `pr-preview-cleanup.yml`, and the bundled dummy `BACKLOG.md` are
  committed kit files, not follow-up patches. (#248 Lesson 8 fixed.)

## Known Issues

- **`shellcheck`, `yamllint`, `actionlint` not present in the sandbox.**
  Bash syntax check (`bash -n`) was used as a fallback for script lint.
  In a contributor's local environment with these tools installed, the
  `T059`/`T060` gates run as written in the task list.
- **Lighthouse-PWA budget run (T033) deferred to the standalone repo.**
  The Phase 1 changes do not modify any PWA-budget-relevant code paths;
  the existing `apps/backlog-navigator/.lighthouserc.json` ships verbatim
  with the subtree split (R-008). The standalone repo's `lighthouse.yml`
  workflow is the gate going forward.
- **Repo-wide `pnpm lint` shows pre-existing failures in `apps/vscode`**
  (917 errors, unrelated to this work — `@typescript-eslint/no-unsafe-*`
  on existing geometry handlers). The backlog-navigator workspace itself
  is clean.
- **Phase 3 cutover is NOT executed from this branch.** The cutover
  runbook (`extraction-kit/PHASE3-RUNBOOK.md`) is shipped; execution is
  a separate PR after the standalone repo is live for ≥7 days.

## Environment

- Runner: vitest 1.6.1, Playwright (cloud — @sparticuz/chromium), bash 5.x
- Branch: `claude/implement-speckit-249-xKZX8`
- Date: 2026-05-12
- Node 20.x; pnpm 9.15.5 (pinned via `packageManager` field per FR-010)
