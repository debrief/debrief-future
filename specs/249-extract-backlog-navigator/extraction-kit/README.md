# Backlog Navigator Extraction Kit

Self-contained tooling to extract `apps/backlog-navigator/` from the
debrief-future monorepo into a standalone GitHub repository. This kit
is the deliverable of [spec 249](../spec.md) (Phase 2).

The kit ships with all twelve fixes from #248's hand-off baked in — see
[`docs/lessons-from-248.md`](docs/lessons-from-248.md) for the rationale.

---

## Prerequisites

> **All four prerequisites must be satisfied before any script runs.**
> #248's hand-off lost 30 minutes to the GitHub App gap (Step 0a) and a
> second rework to the non-empty target repo (Step 0b). The kit detects
> both failure modes and prints actionable guidance, but the fastest
> path is to set them up correctly first.

### Step 0a — Install the GitHub App on the destination repo

The Claude code GitHub App (or whichever agent you're using to push) must
be authorised on the destination repo's parent organisation **and** on
the destination repo itself. Without this, the first `git push` from the
agent's environment returns **403 silently**. Resolve via the GitHub web
UI:

```
https://github.com/organizations/<ORG>/settings/installations
  → Configure (the Claude app)
  → Repository access
  → Add the destination repo
```

If you're pushing as a human via SSH/HTTPS with your own credentials,
skip this step — your org membership is sufficient.

### Step 0b — Create the destination repo EMPTY

Go to `https://github.com/organizations/<ORG>/repositories/new`. Set the
name. **Uncheck** all three init options:

- ✗ Add a README file
- ✗ Add .gitignore
- ✗ Choose a license

If any of those is left checked, the first push fails (non-empty target).
Step 0c describes the recovery path; ideally don't need it.

### Step 0c — (Fallback) If the target is already non-empty

The bootstrap script supports a `--merge-unrelated-histories` flag that
performs `git merge --allow-unrelated-histories` and an `--ours`/`--theirs`
resolution for the conflicting README. This produces a slightly noisier
history (one extra merge commit) but works.

### Step 0d — Decide the destination repo slug

The kit accepts `--destination <org>/<repo>` flags throughout. Recommended
default is `deepbluecltd/backlog-navigator`, but the kit treats the slug
as operator input — no hardcoded references.

Optionally, record your inputs in `kit-config.json` at the kit root
(see `kit-config.sample.json` for the worked example):

```json
{
  "destination": {
    "org": "deepbluecltd",
    "repo": "backlog-navigator"
  },
  "host": "deepbluecltd.github.io"
}
```

---

## The two-script workflow

```sh
# From a fresh clone of debrief-future (this repo):
cd specs/249-extract-backlog-navigator/extraction-kit/

# 1. Subtree split + regen lockfile + smoke build
./scripts/extract.sh --destination <org>/<repo>

# 2. Push to destination + apply templates + commit + push
./scripts/bootstrap-new-repo.sh --destination <org>/<repo> --host <org>.github.io
```

### What `extract.sh` does

1. Creates a clean working clone of debrief-future in a temp dir.
2. Runs `git subtree split --prefix=apps/backlog-navigator -b extracted`.
3. Checks out the `extracted` branch (now shaped like a standalone repo).
4. Sed-substitutes `vite.config.ts` `base` default from
   `/debrief-future/backlog-navigator/` to `/<repo>/` (R-009 /
   #248 Lesson 6 — automated, no manual patch step).
5. Runs `pnpm install --lockfile-only` to generate a standalone
   `pnpm-lock.yaml` (R-010 / #248 Lesson 1 — the monorepo lockfile
   does NOT travel with the split).
6. Commits the lockfile.
7. Runs a smoke `pnpm install && pnpm test && pnpm build` against the
   extracted tree. **Aborts on any failure.**

Flag: `--dry-run` performs all local steps but does NOT contact a remote.
Use this to verify the kit produces a sound tree before pointing at a
real repo.

### What `bootstrap-new-repo.sh` does

1. Detects whether the destination repo is empty via `git ls-remote`.
   Non-empty → prompts for `--merge-unrelated-histories` (Step 0c).
2. Pushes the `extracted` branch to `<destination>/main`. On 403,
   prints Step 0a's GitHub App authorisation instructions.
3. Copies `templates/*` into the working tree with `{{ORG}}`/`{{REPO}}`/
   `{{HOST}}` placeholders substituted from `--destination` and `--host`.
4. Copies `workflows/*.yml` into `.github/workflows/`.
5. Copies the bundled dummy dataset (`templates/specs-dummy/`,
   `templates/BACKLOG.dummy.md`) into the appropriate locations.
6. Commits + pushes.

Flag: `--dry-run` performs substitution in a temp dir but does NOT push.

---

## Placeholder substitution

Kit templates use three placeholders. `bootstrap-new-repo.sh` substitutes
all three from the `--destination` and `--host` flags:

| Placeholder | Substituted from | Example |
|---|---|---|
| `{{ORG}}` | The org segment of `--destination` | `deepbluecltd` |
| `{{REPO}}` | The repo segment of `--destination` | `backlog-navigator` |
| `{{HOST}}` | `--host` (defaults to `<ORG>.github.io`) | `deepbluecltd.github.io` |

No template should ever ship with `debrief`, `debrief-future`, or
`debrief.github.io` as literals (#248 Lesson 7 — checked by the dry-run
substitution verifier).

---

## One-time GitHub web-UI configuration

After the first successful workflow run on the new repo creates a
`gh-pages` branch, configure Pages:

```
Settings → Pages
  Source:  Deploy from a branch
  Branch:  gh-pages   (this only appears after the first deploy)
  Folder:  / (root)
```

The dropdown only lists branches that exist, so trigger the first
deploy (open a PR or push to main) **before** flipping the setting.
(R-003 / #248 Lesson 10.)

If `live.yml` is enabled (optional — see `workflows/live.yml.template`):
add a `LIVE_GITHUB_TOKEN` repository secret with a fine-grained PAT
that has read-only `contents` + `metadata` scopes on the target repo.

---

## Workflows shipped

| Workflow | Purpose | Required for merge? |
|---|---|---|
| `ci.yml` | lint, typecheck, vitest, playwright (in-process route mock) | ✅ |
| `lighthouse.yml` | PWA Lighthouse budget (ADR-030 carried) | ✅ |
| `deploy.yml` | main → `gh-pages` root via `JamesIves/github-pages-deploy-action@v4` with `clean-exclude: previews/` | ❌ (post-merge) |
| `pr-preview.yml` | per-PR → `gh-pages/previews/pr-<n>/` + sticky comment | ❌ (nice-to-have) |
| `pr-preview-cleanup.yml` | closed PR → rm preview folder | ❌ (best-effort) |
| `live.yml.template` | OPTIONAL drift detection against upstream GitHub | adopter opt-in |

See [`../contracts/ci-surface.md`](../contracts/ci-surface.md) for the
full contract each workflow enforces.

---

## Smoke-test the preview pipeline

After bootstrap, the recommended smoke sequence:

1. Open a trivial PR against the new repo (e.g., a typo fix in `README.md`).
2. Watch `pr-preview.yml` run; click the URL in the sticky comment.
3. Confirm the bundled dummy `BACKLOG.md` renders at the default URL
   (no query params). Click into a spec link; confirm the bundled
   `specs/<NNN>-<name>/` dataset renders.
4. Try the four URL forms in the sticky comment:
   - `?repo=<org>/<repo>&branch=<branch>` (this repo's other branches)
   - `?pr=<n>` (legacy form)
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
