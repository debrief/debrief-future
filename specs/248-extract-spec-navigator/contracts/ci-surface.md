# Contract: CI surface for the new `debrief/spec-navigator` repository

This document defines the CI workflows the new repository must provide, their triggers, their inputs, and the secrets they require.

## Workflow inventory

| Workflow file | Trigger | Purpose | Mode | Secret required |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | every PR + push to non-`main` branches | lint, typecheck, vitest, Playwright (bundled fixtures) | offline | none |
| `.github/workflows/live.yml` | nightly (`cron: 0 3 * * *`) + push to `main` | Playwright E2E in live-GitHub mode against debrief-future | live | `GITHUB_TOKEN` |
| `.github/workflows/deploy.yml` | push to `main` (after `live.yml` green) | build + publish to GitHub Pages | n/a | Pages permissions |
| `.github/workflows/lighthouse.yml` | every PR (light) + push to `main` (full budget) | Lighthouse CI per ADR-030 | offline | none |

## Inputs (all workflows)

| Variable | Source | Required by | Notes |
|---|---|---|---|
| `NODE_VERSION` | repository variable, default `"20.x"` | all | Single source of truth so Node bumps are one-line. |
| `LIVE_GITHUB` | env var, set to `"1"` | `live.yml` only | Switches Playwright fixtures from bundled to real network. Absent or any other value = offline mode. |
| `GITHUB_TOKEN` | secret | `live.yml` only | Fine-grained service-identity PAT, public-read on `debrief/debrief-future`. |

## Outputs

| Workflow | Outputs |
|---|---|
| `ci.yml` | Pass/fail check; coverage report uploaded as a job artefact. |
| `live.yml` | Pass/fail check; on failure, opens or updates an issue tagged `live-mode-failure` so flaky GitHub responses don't pile up unnoticed. |
| `deploy.yml` | Public Pages deployment at `https://debrief.github.io/spec-navigator/`. Run once per merge to `main`. |
| `lighthouse.yml` | Comment on PR with score deltas; on `main`, fails the build if budgets regressed. |

## Required gates for merge to `main`

The new repo's branch protection on `main` requires:

- ✅ `ci.yml / lint`
- ✅ `ci.yml / typecheck`
- ✅ `ci.yml / vitest`
- ✅ `ci.yml / playwright-bundled`
- ✅ `lighthouse.yml / pr` (advisory only — not blocking)

`live.yml` is **not** a merge gate (it runs against real GitHub and would let upstream hiccups block unrelated work). Failures in `live.yml` are visible as the `live-mode-failure` issue.

## Local-development equivalents

The README documents `pnpm` scripts that exactly mirror the CI jobs:

```
pnpm lint
pnpm typecheck
pnpm test                        # vitest, no GitHub network
pnpm test:e2e                    # Playwright, bundled fixtures (default)
LIVE_GITHUB=1 pnpm test:e2e:live # Playwright, live mode (requires GITHUB_TOKEN)
pnpm fixtures:record             # re-record bundled fixtures from live GitHub
```

`pnpm fixtures:record` is the maintenance entry point that keeps bundled fixtures from drifting; it requires a PAT and is documented as a maintainer-only command.

## Secret rotation

The `GITHUB_TOKEN` secret is owned by a service identity, not a human. Rotation policy (documented in the new repo's `SECURITY.md`):

| Event | Action |
|---|---|
| Service identity password reset | Generate new fine-grained PAT, update `GITHUB_TOKEN`, retire old PAT within 24h. |
| Suspected leak | Revoke immediately, regenerate, update; investigate scope of exposure. |
| Periodic rotation | Every 12 months. |

## Public-fork compatibility

Adopters who fork `debrief/spec-navigator` for their own deployment inherit these workflows. The README documents:

1. Set `GITHUB_TOKEN` to a PAT scoped to **their** repository (read-only on `metadata` and `contents`; `repo` if private).
2. Update `live.yml`'s test target from the hardcoded `debrief/debrief-future` to their own repo.
3. Adjust the `vite.config.ts` `base` value if they're hosting under a different path.

These three steps are the entirety of the adopter onboarding.
