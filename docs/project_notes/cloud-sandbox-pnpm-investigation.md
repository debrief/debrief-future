# Investigate: pnpm Broken in Claude Code Cloud Sandbox

## Problem

In Claude Code cloud sessions on this repo, `pnpm` is broken. Every invocation fails with HTTP 403 from `registry.npmjs.org`, blocking all `task verify` / typecheck / lint / vitest / Storybook E2E runs. The 403 originates from the sandbox network policy, not from npm:

```
$ curl -sS -i https://registry.npmjs.org/pnpm
HTTP/2 403
x-deny-reason: host_not_allowed
Host not in allowlist
```

`registry.npmjs.org` is not on the cloud sandbox's allowlist. `corepack` hits the same wall (it also fetches from the registry to satisfy the `packageManager: "pnpm@9.15.5"` pin in `package.json`). There is no `.npmrc` redirecting traffic, and `node_modules/` does not exist in the cloud image, so the `pnpm install` step has nothing to fall back on.

Net effect: a Claude Code session can edit code, run git, run Python (uv works), and reach the GitHub MCP — but cannot run any TypeScript test, lint, or build. PRs from cloud sessions ship unverified locally.

## What to investigate

### 1. Is this a regression?

Check whether earlier cloud sessions had a working pnpm. Likely candidates:

- someone tightened the sandbox allowlist
- a pre-baked `node_modules/` was removed from the image
- a `.npmrc` redirecting to an internal mirror was deleted

Confirm timestamps against any recent infra changes to the cloud sandbox image:

- `ANT_IMAGE_REPOSITORY=sandbox-ccr-default`
- `CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE=cloud_default`

### 2. Find the allowlist owner

The sandbox is administered by Anthropic Claude Code infra (the same plumbing that runs the git proxy at `127.0.0.1:46101`). Identify who maintains the host allowlist for `cloud_default` sessions and whether the allowlist is per-account, per-repo, or global. Reach out via the standard internal Claude Code support channel.

### 3. Pick the cheapest viable fix and prototype it

Three candidates, in order of expected effort:

#### Option (a) — Add `registry.npmjs.org` to the allowlist

Lowest effort if Anthropic will allow it. Probably also needs:

- `*.npmmirror.com`
- `registry.yarnpkg.com`
- Playwright CDN (`playwright.azureedge.net`) for full parity with CI

#### Option (b) — Pre-warm `node_modules/` in the sandbox image

Bake `pnpm install --frozen-lockfile` output into the image at build time. Sessions start with deps available; only changes to `pnpm-lock.yaml` would need network. Cheaper than maintaining a mirror but couples the image to the lockfile and needs rebuilds when deps change.

#### Option (c) — Stand up a pull-through cache on an allowlisted host

Verdaccio or Sonatype Nexus running on infra that IS allowlisted, with a checked-in `.npmrc` pointing every repo at it. Most flexible long-term — survives lockfile churn and works for new repos automatically — but most setup work and a new service to operate.

### 4. Test the chosen fix end-to-end

Run against a fresh cloud session in this repo. Verification steps:

- [ ] `pnpm --version` resolves without 403
- [ ] `pnpm install` from a clean clone succeeds
- [ ] `task verify` (lint + typecheck + test) passes
- [ ] `pnpm --filter @debrief/components test:e2e FilterBar-nl` produces PNGs in `specs/198-nl-keyring-banner/evidence/screenshots/`

> The last bullet is the immediate use case — PR #551 is waiting on those captures.

### 5. Document it in the repo

Add a note to `CLAUDE.md` and `docs/project_notes/key_facts.md` describing:

- the cloud-sandbox network constraint
- the chosen fix
- how to recover if the registry is unreachable again

Cross-reference from `docs/project_notes/playwright-installation-research.md` since Playwright/`@sparticuz/chromium` shares the same plumbing.

## Constraints

- Don't disable the `packageManager` pin — CI relies on it.
- Don't commit credentials in `.npmrc` if option (c) is chosen — use environment variable interpolation:
  ```
  registry=https://npm.internal/...
  //npm.internal/:_authToken=${NPM_TOKEN}
  ```
- Solution must work for both Claude Code cloud sessions (where this hurts) and local dev (where it currently works fine via the public registry). A `.npmrc` change must be a no-op or strict improvement for local dev.

## Deliverable

A PR that lands the fix, plus a written confirmation in the PR description that a fresh cloud session can run `task verify` and `test:e2e` end-to-end.

**Time-box**: 1 day for investigation + chosen-fix prototype; up to 3 days if option (c) is picked.
