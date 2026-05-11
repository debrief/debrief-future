# Contract: Standalone Repo CI / Hosting Surface

**Feature**: 249-extract-backlog-navigator
**Audience**: Operator standing up the new repo; future maintainer auditing
the CI shape; adopter porting the kit to a different destination.

This contract specifies the workflows the standalone repo ships with, the
secrets and Pages configuration they require, and the contracts each
workflow enforces.

It is **revised** from the corresponding contract in #248: per-PR previews
are first-class, Lighthouse-PWA is included (carried per ADR-030), and the
deploy mechanism is the branch-based `JamesIves/github-pages-deploy-action@v4`
rather than the artifact-based `actions/deploy-pages`.

---

## Workflow inventory

| Workflow | Trigger | Purpose | Gate? |
|---|---|---|---|
| `ci.yml` | every PR + push to main | lint, typecheck, vitest, playwright (in-process route mock) | **Required** for merge |
| `lighthouse.yml` | PR + workflow_dispatch | Lighthouse-PWA budget audit (installable-manifest, service-worker, viewport, document-title) | **Required** for merge |
| `deploy.yml` | push to `main` | Build + publish to `gh-pages` root (with `clean-exclude: previews/`) | Not a merge gate; runs post-merge |
| `pr-preview.yml` | `pull_request` (opened, synchronize, reopened) | Build with preview `VITE_BASE`, deploy to `gh-pages/previews/pr-<n>/`, upsert sticky comment | Optional; runs in parallel with `ci.yml` |
| `pr-preview-cleanup.yml` | `pull_request` (closed) | Remove `previews/pr-<n>/` from `gh-pages` | Best-effort; no merge gate |
| `live.yml` | **OPTIONAL — not shipped enabled** | nightly + manual: run Playwright in live-mode (`LIVE_GITHUB=1`) against the upstream GitHub API | Adopter opt-in |

(Compare: spec-navigator's #248 surface had `ci.yml`, `live.yml`, `deploy.yml`
only — no per-PR previews, no Lighthouse. Backlog navigator adds three
workflows compared to that baseline.)

---

## `ci.yml` — every-PR gate

**Trigger**: `pull_request` (any branch) + `push` to `main`.

**Jobs**:

| Job | Steps |
|---|---|
| `lint-typecheck-test` | `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test` (Vitest) |
| `e2e` | `pnpm install --frozen-lockfile` → `pnpm exec playwright install chromium` (or `@sparticuz/chromium` fetch) → `pnpm test:e2e` |

**Required secrets**: none. (Bundled tests use in-process route mocks per
R-006.)

**Concurrency**: per-PR concurrency group; in-flight runs cancelled on
re-push.

**Required for merge**: both jobs must be green.

---

## `lighthouse.yml` — PWA budget audit (ADR-030)

**Trigger**: `pull_request` (with path filter on `src/`, `public/`,
`vite.config.ts`, `.lighthouserc.json`, the workflow file itself) +
`workflow_dispatch`.

**Steps**:

1. Checkout, install pnpm, install dependencies.
2. Install Chrome via `browser-actions/setup-chrome@v1` (chrome-version:
   stable) — `@lhci/cli` shells out to Chrome.
3. Build with `VITE_BASE_URL=/` so the manifest scope matches the served
   path during audit.
4. Start `pnpm preview --port 5175 --host 0.0.0.0` in the background
   (nohup + disown pattern), with `VITE_BASE_URL=/`.
5. Wait for the server (60s timeout, dump log tail on failure).
6. `pnpm dlx @lhci/cli@0.13.0 autorun --config ./.lighthouserc.json`.
7. Stop preview server, upload report artifact.

**Required secrets**:
- `LHCI_GITHUB_APP_TOKEN` (optional — for PR status checks). If absent,
  the workflow still runs and uploads the report; just no PR-level Lighthouse
  status check.

**Required for merge**: yes. The `.lighthouserc.json` asserts (`installable-
manifest`, `service-worker`, `viewport`, `document-title`) are budget gates.

(`.lighthouserc.json` ships verbatim from `apps/backlog-navigator/
.lighthouserc.json` in debrief-future — see R-008.)

---

## `deploy.yml` — main → production

**Trigger**: `push` to `main`.

**Steps**:

1. Checkout, install pnpm, install dependencies.
2. `pnpm build` with `VITE_BASE=/{{REPO}}/` (the production base path).
3. `JamesIves/github-pages-deploy-action@v4` with:
   - `branch: gh-pages`
   - `folder: dist`
   - `target-folder: .` (root of `gh-pages`)
   - **`clean-exclude: previews/`** — preserves in-flight PR preview
     folders during production redeploys (FR-014).

**Required secrets**: none beyond the default `GITHUB_TOKEN` (which the
deploy action uses to push to `gh-pages`).

**One-time GitHub web-UI config** (R-003):
- Settings → Pages → Source: **Deploy from a branch** → branch
  `gh-pages` → folder `/ (root)`.
- The `gh-pages` branch only appears in the dropdown after the first
  successful workflow run that pushes to it. Operator must run the first
  workflow (or push an empty `gh-pages` branch manually) **before** the
  Pages dropdown is configurable.

---

## `pr-preview.yml` — per-PR preview deployment

**Trigger**: `pull_request` (`opened`, `synchronize`, `reopened`).

**Steps**:

1. Checkout, install pnpm, install dependencies.
2. `pnpm build` with:
   - `VITE_BASE=/{{REPO}}/previews/pr-${{ github.event.pull_request.number }}/`
   - `VITE_DEFAULT_OWNER={{ORG}}` (so preview renders the bundled dummy
     dataset, not a debrief proxy)
   - `VITE_DEFAULT_REPO={{REPO}}`
   - `VITE_BACKLOG_NAV_DRY_RUN=true` (push is a no-op on previews)
3. `JamesIves/github-pages-deploy-action@v4` with:
   - `branch: gh-pages`
   - `folder: dist`
   - `target-folder: previews/pr-${{ github.event.pull_request.number }}`
   - `clean-exclude: '!previews/pr-${{ github.event.pull_request.number }}/**'`
     (only clean *this* PR's folder)
4. `actions/github-script@v7` upserts the sticky comment.

**Sticky comment** (sentinel: `<!-- backlog-nav-preview -->`):

```markdown
<!-- backlog-nav-preview -->
🚀 **Backlog Navigator preview deployed**

- Default view: `https://{{HOST}}/{{REPO}}/previews/pr-<n>/`
- Same repo, branch: `https://{{HOST}}/{{REPO}}/previews/pr-<n>/?repo={{ORG}}/{{REPO}}&branch=<branch>`
- Legacy `?pr=` form (resolves against bundled default OWNER/REPO):
  `https://{{HOST}}/{{REPO}}/previews/pr-<n>/?pr=42`
- Third-party adopter form: `https://{{HOST}}/{{REPO}}/previews/pr-<n>/?repo=acme/foo&branch=main`

This preview runs in **dry-run mode** — "Push Changes" is a no-op.
```

**Required secrets**: none beyond `GITHUB_TOKEN` (used by the deploy action
and `github-script` to upsert the comment).

**Concurrency**: per-PR concurrency group.

---

## `pr-preview-cleanup.yml` — close → tidy

**Trigger**: `pull_request` (`closed`, regardless of merged/abandoned).

**Steps**:

1. Checkout `gh-pages` branch.
2. `rm -rf previews/pr-${{ github.event.pull_request.number }}`.
3. Commit + push (or no-op if the folder didn't exist).

**Required secrets**: none beyond `GITHUB_TOKEN`.

---

## `live.yml` — OPTIONAL drift-detection (FR-019)

**Status**: shipped in the kit as `workflows/live.yml.template`; NOT placed
in `.github/workflows/` by default. Adopter copies it in if they want
drift-detection.

**When to enable**: described in R-015.

**Required secrets** (if enabled): `GITHUB_TOKEN` (fine-grained PAT, read-
only on the target repo).

---

## GitHub Pages configuration

The **only** Pages setting the new repo needs is:

- **Source**: Deploy from a branch
- **Branch**: `gh-pages`
- **Folder**: `/ (root)`

Configured **once** via the web UI. The `JamesIves/github-pages-deploy-
action@v4` handles the rest from workflow files.

**Why not `actions/deploy-pages`** (#248's choice): the artifact-based
action serves exactly one bundle per repo. Per-PR previews require multiple
subpaths in the same Pages site. Switching to branch-based mid-flight is
not a config flip — it requires reworking `deploy.yml`. **Set this from
day one.** (R-003 / #248 Lesson 4.)

---

## Required Actions secrets summary

| Secret | Used by | Scope |
|---|---|---|
| `GITHUB_TOKEN` (auto-provided) | `deploy.yml`, `pr-preview.yml`, `pr-preview-cleanup.yml` | Default permissions sufficient for `gh-pages` write + PR comment write |
| `LHCI_GITHUB_APP_TOKEN` (optional) | `lighthouse.yml` | PR-level Lighthouse status checks |
| `LIVE_GITHUB_TOKEN` (optional) | `live.yml` (if enabled) | Fine-grained PAT, read-only on the target repo's contents + metadata |

No PAT is required for `ci.yml`. A first-time contributor with no debrief-
issued credentials can clone, install, and run the full test suite locally
to a green result (FR-013 from spec, mirroring #248 FR-013).

---

## Required branch protections on `main`

- Status checks required to pass before merge:
  - `ci.yml` / `lint-typecheck-test`
  - `ci.yml` / `e2e`
  - `lighthouse.yml` / `lighthouse`
- `pr-preview.yml` is **not** a required gate — preview deploys are nice-to-
  have, not merge blockers.

---

## Failure modes the workflows must handle

| Failure | Where caught | Behaviour |
|---|---|---|
| Lockfile missing or stale | `ci.yml` `pnpm install --frozen-lockfile` | Hard failure with the exact `pnpm install` error. (R-010 ensures this should never happen post-`extract.sh`.) |
| `packageManager` field missing | `pnpm/action-setup@v4` step | Hard failure with "ambiguous pnpm version". (R-002 / FR-010 ensures the field is in `package.json` before the split.) |
| Lighthouse threshold regression | `lighthouse.yml` step 6 | PR status check fails; report artifact uploaded for diagnosis. |
| Preview deploy collides with simultaneous main deploy | `clean-exclude: previews/` on `deploy.yml` | Production redeploy never wipes preview folders. |
| Stale preview folder lingers post-PR-close | `pr-preview-cleanup.yml` | Folder removed; if cleanup workflow itself fails, the folder is reclaimed on next `pr-preview-cleanup.yml` run for any PR (the rm is idempotent). |
| GitHub Pages source not yet configured | First `deploy.yml` run | Workflow succeeds in pushing to `gh-pages`; site doesn't serve until operator flips the web-UI setting (R-003). One-time. |

---

## Out of scope for this contract

- The **content** of the bundled dummy dataset (`specs-dummy/`,
  condensed `BACKLOG.md`) — see R-005.
- The shape of `.lighthouserc.json` thresholds — see ADR-030; thresholds
  travel unchanged.
- Adopter-specific secrets (theirs, not ours).
- Storage of historic preview reports — Lighthouse reports are 7-day
  artifacts on the workflow run; no permanent store.
