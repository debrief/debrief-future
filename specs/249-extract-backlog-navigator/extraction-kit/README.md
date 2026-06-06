# Backlog Navigator Extraction Kit

Self-contained tooling to extract `apps/backlog-navigator/` from the
debrief-future monorepo into a standalone GitHub repository. This kit
is the deliverable of [spec 249](../spec.md) (Phase 2).

The kit follows a **pull-from-source** model: the destination repo runs
a single script that fetches the app's history from debrief-future,
applies the standalone templates, smoke-builds, and pushes — all without
the script ever needing to push outside the repo it's running in. This
makes the kit safe to run from inside a Claude Code session (which is
scoped to one repo at a time) or any other sandboxed environment.

The kit ships with all twelve fixes from #248's hand-off baked in — see
[`docs/lessons-from-248.md`](docs/lessons-from-248.md) for the rationale.

---

## Prerequisites

> **All three prerequisites must be satisfied before the script runs.**

### Step 0a — Create the destination repo EMPTY

Go to `https://github.com/organizations/<ORG>/repositories/new`. Set the
name (recommended: `backlog-navigator`). **Uncheck** all three init
options:

- ✗ Add a README file
- ✗ Add .gitignore
- ✗ Choose a license

If any of those is left checked, the script aborts unless you re-run
with `--merge-unrelated-histories`. Empty is cleaner.

### Step 0b — Authorise the GitHub App on the destination repo

If you're going to run the kit inside a **Claude Code session** (or any
other GitHub App-driven agent), the app must be authorised on the
destination repo. Without this, the final push returns **403** and the
script aborts with auth instructions inline.

Resolve via the GitHub web UI:

```
https://github.com/organizations/<ORG>/settings/installations
  → Configure (the Claude code app)
  → Repository access
  → Add the destination repo
```

If you're running the kit as a human with your own SSH/HTTPS push
credentials, skip this step.

### Step 0c — Open a working tree in the destination repo

Either:

- **Cloud (Claude Code on the web)**: open a session in `<org>/<repo>`.
- **Local**: `git clone git@github.com:<org>/<repo>.git && cd <repo>`.

The script must run inside the destination repo's working tree —
that's how it knows where to commit and which `origin` to push to.

---

## The one-script workflow

From inside the destination repo's working tree, run:

```sh
# Option A — fetch the script via curl (script clones source itself):
curl -fsSL https://raw.githubusercontent.com/debrief/debrief-future/main/specs/249-extract-backlog-navigator/extraction-kit/scripts/import-from-source.sh -o /tmp/import.sh
bash /tmp/import.sh

# Option B — clone source first, then run the bundled script:
git clone --depth 100 https://github.com/debrief/debrief-future.git /tmp/debrief-source
bash /tmp/debrief-source/specs/249-extract-backlog-navigator/extraction-kit/scripts/import-from-source.sh
```

Both options produce the same result. Option B is faster if you have
the bandwidth — the script reuses the existing clone instead of
re-cloning. Option B is also easier to inspect: `cat` the script
first if you want to read it before running.

### What the script does

| Step | Action |
|---|---|
| 1 | Locate or clone the source repo (`debrief/debrief-future`). |
| 2 | `git subtree split --prefix=apps/backlog-navigator -b extracted` inside the source clone. |
| 3 | Scan the extracted tree for `.env*` files; abort if any found (rotate secrets first). |
| 4 | Merge the extracted branch into the destination repo. Empty destination → checkout-as-main. Non-empty → `--allow-unrelated-histories` merge with init-file conflicts auto-resolved in favour of the imported side (requires `--merge-unrelated-histories` flag). |
| 5 | Sed-rewrite `vite.config.ts` base path → `/<repo>/`. |
| 6 | Apply standalone templates (README, CONFIGURATION, SECURITY, eslintrc, tsconfig × 2, .gitignore, BACKLOG.dummy.md) with `{{ORG}}`/`{{REPO}}`/`{{HOST}}` substituted. |
| 7 | Install workflows (`ci`, `lighthouse`, `deploy`, `pr-preview`, `pr-preview-cleanup`); copy optional `live.yml` to `workflows-optional/`. |
| 8 | Copy bundled dummy spec dirs. |
| 9 | Regenerate `pnpm-lock.yaml`. |
| 10 | Run full smoke (`pnpm install && pnpm test && pnpm build`). Abort on failure. |
| 11 | Placeholder leakage check; commit. |
| 12 | `git push -u origin HEAD:main` (the only push the script ever makes, and only to the current repo's origin). |

Writes `import-report.json` at every step boundary for
machine-readable evidence:

```json
{
  "destination": "<org>/<repo>",
  "host": "<host>",
  "mode": "live",
  "filesRendered": 13,
  "tokensReplaced": 33,
  "placeholderCheck": "ok",
  "smokeTestExitCode": 0,
  "sourceRepo": "debrief/debrief-future"
}
```

### Flags

| Flag | Purpose |
|---|---|
| `--destination <org>/<repo>` | Override the auto-detected origin remote. |
| `--host <host>` | Hosting host. Defaults to `<org>.github.io`. |
| `--source-path <path>` | Use an existing local clone of `debrief-future`. |
| `--merge-unrelated-histories` | If the destination already has init commits, merge instead of aborting. |
| `--dry-run` | Apply everything locally; do NOT commit or push. |
| `--no-smoke` | Skip the full pnpm test+build (lockfile validation still runs). |

---

## One-time GitHub web-UI configuration (after first push)

The first `deploy.yml` run after merging the script's commit to `main`
creates the `gh-pages` branch. Once that branch exists:

```
Settings → Pages
  Source:  Deploy from a branch
  Branch:  gh-pages
  Folder:  / (root)
```

The dropdown only lists branches that exist, so the first deploy must
finish before you can flip this setting. (R-003 / #248 Lesson 10.)

If you enable `live.yml` later (from `.github/workflows-optional/`):
add a `LIVE_GITHUB_TOKEN` repository secret — a fine-grained PAT with
**read-only** access to `contents` + `metadata` on the target repo.

---

## Workflows shipped

| Workflow | Trigger | Purpose | Merge gate? |
|---|---|---|---|
| `ci.yml` | every PR + push to main | lint, typecheck, vitest, playwright (in-process route mock) | ✅ |
| `lighthouse.yml` | PR (paths-filtered) | PWA Lighthouse budget (ADR-030 carried) | ✅ |
| `deploy.yml` | push to main | publish to `gh-pages` root with `clean-exclude: previews/` | post-merge |
| `pr-preview.yml` | PR opened/synchronize/reopened | per-PR preview at `gh-pages/previews/pr-<n>/` + sticky comment | nice-to-have |
| `pr-preview-cleanup.yml` | PR closed | remove preview folder | best-effort |
| `live.yml.template` | OPTIONAL | nightly drift detection against the upstream GitHub API | adopter opt-in |

See [`../contracts/ci-surface.md`](../contracts/ci-surface.md) for the
full contract each workflow enforces.

---

## Smoke-test the preview pipeline

After the script completes, the recommended smoke sequence:

1. Open a trivial PR against the new repo (e.g., a typo fix in `README.md`).
2. Watch `pr-preview.yml` run; click the URL in the sticky comment.
3. Confirm the bundled dummy `BACKLOG.md` renders at the default URL
   (no query params). Click into a spec link; confirm the bundled
   `specs/<NNN>-<name>/` dataset renders.
4. Try the four URL forms in the sticky comment:
   - `?repo=<org>/<repo>&branch=<branch>` (this repo's other branches)
   - `?pr=<n>` (legacy form — resolves against the bundled default)
   - `?repo=<external>/<repo>&branch=<branch>` (third-party shape)
5. Merge the PR. Watch `deploy.yml` deploy to production.
6. Confirm production URL `https://<host>/<repo>/` serves; confirm
   `previews/pr-<n>/` is preserved (or run `pr-preview-cleanup.yml` to
   tidy it).

---

## After the new repo is live

Hold for **at least 7 days of green CI runs** (or 7 nightlies of
`live.yml` if enabled) before starting Phase 3 cutover in debrief-future.
See [`PHASE3-RUNBOOK.md`](PHASE3-RUNBOOK.md) for the cutover sequence.

---

## Why this kit looks the way it does

[`docs/lessons-from-248.md`](docs/lessons-from-248.md) enumerates the
twelve concrete failures and friction points from spec-navigator's
extraction (#248) and maps each to the FR / R-NNN that codifies the
fix in this kit.

[`docs/why-no-patch-03.md`](docs/why-no-patch-03.md) records the
rationale for dropping #248's `patches/03-bundled-fixtures.md` —
in-process Playwright route mocks provide the same coverage without
the maintainer overhead.

[`docs/why-pull-not-push.md`](docs/why-pull-not-push.md) records the
rationale for the pull-from-source model adopted in this kit (the
inversion of #248's push-from-source flow).
