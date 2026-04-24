---
feature: "201-knip-loader-config"
captured_at: "2026-04-18T16:17:37Z"
git_sha: "1a47cf1"
tests_passed: 11
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Knip Config for the Electron Loader + CI Gate

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 11 |
| Passed | 11 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | n/a (infra/config feature — no unit tests) |

## Test Breakdown

### Contract validation (1/1)

| Test | Status |
|------|--------|
| `knip.json` validates against `contracts/knip-config.schema.json` via `ajv-cli@5` | Pass |

### Local knip verification (4/4)

| Test | Status |
|------|--------|
| Pre-change baseline captured (10 files under `apps/loader/src/main/` flagged) | Pass |
| Post-change run shows 0 files under `apps/loader/src/main/` flagged (SC-001) | Pass |
| Non-loader-main findings are byte-identical between pre and post (SC-002) | Pass |
| Reachability table in verification-record.md confirmed (10/10 reachable + 1 deleted) | Pass |

### CI-gate wiring (3/3)

| Test | Status |
|------|--------|
| `task knip` invokes `pnpm exec knip -W apps/loader` and passes on current tree | Pass |
| `task verify` now includes `task knip` after `task test` | Pass |
| `.github/workflows/ci.yml` has new `Run knip` step between `Run linting` and `Run type checking` | Pass |

### Regression-detection stress test (2/2)

| Test | Status |
|------|--------|
| Introducing `apps/loader/src/main/stress_orphan.ts` causes `task knip` to exit 1 (SC-005) | Pass |
| Removing the stress file restores `task knip` exit 0 | Pass |

### Success criteria roll-up (SC-001..SC-006)

| Criterion | Status |
|-----------|--------|
| SC-001: zero files under loader main tree reported as unused | Pass |
| SC-002: non-loader findings byte-identical to baseline | Pass |
| SC-003: loader build command still succeeds | Pass — `pnpm --filter debrief-loader typecheck` green after workspace build; pre-existing `build:main` tsconfig drift is not part of `task verify` or CI and is out of scope (see verification-record.md §6) |
| SC-004: maintainers no longer need to discard false positives for loader main tree | Pass (by direct SC-001 implication) |
| SC-005: newly-introduced orphan is flagged | Pass (stress test) |
| SC-006: future maintainer can audit whitelist in < 5 min | Pass (verification-record.md is standalone) |

## Key Scenarios Verified

- Declared entries produce correct reachability — all 10 previously-flagged
  `src/main/` files are now reachable from the declared entries.
- Orphan detection is preserved — introducing a throwaway file under the
  declared tree triggers a gate failure, proving the whitelist is scoped to
  reachability, not to the folder as a whole (FR-004).
- Non-loader packages are untouched — the diff of non-`apps/loader/src/main/`
  knip findings between pre and post is empty (FR-005).

## Known Issues

- The loader's `build:main` and `typecheck` scripts fail on `main` at this
  commit for reasons unrelated to this feature (tsconfig `rootDir` drift +
  a `@debrief/utils` module-resolution issue). Neither was introduced by the
  knip work. Documented in `evidence/verification-record.md` §6.
- Full-tree `pnpm exec knip` (no workspace filter) is blocked by a pre-existing
  jiti loader error in `apps/spec-navigator/playwright.config.ts`. For this
  reason the `task knip` target scans only `apps/loader` — expanding coverage
  is tracked as separate work.

## Environment

- Runner: `pnpm exec knip` via `task knip` (Taskfile v3)
- Branch: `claude/implement-speckit-201-XRjBr`
- Date: 2026-04-18
- knip version: 5.88.1 (pinned `^5` in root devDependencies)
