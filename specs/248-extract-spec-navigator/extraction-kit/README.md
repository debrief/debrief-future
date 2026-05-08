# spec-navigator Extraction Kit

This kit lifts `apps/spec-navigator/` out of `debrief/debrief-future` into a new standalone repository (`debrief/spec-navigator`) with preserved git history, CI, and GitHub Pages hosting.

It exists because the agent that authored Phase 1 of #248 (`claude/implement-speckit-248-ChSwl`) cannot create or push to the new repository — its tooling is restricted to `debrief/debrief-future`. The kit is a hand-off: a maintainer with the right GitHub permissions runs the scripts, applies the patches, and follows the runbook to bring the new repo to life.

**Prerequisite reading**: [../spec.md](../spec.md), [../research.md](../research.md), [../data-model.md](../data-model.md), [../contracts/hosted-url.md](../contracts/hosted-url.md), [../contracts/ci-surface.md](../contracts/ci-surface.md), [../quickstart.md](../quickstart.md).

---

## Operator prerequisites

You will need:

- Local checkouts of: `git`, `gh` (GitHub CLI, authenticated), `pnpm`, Node 20.x.
- A GitHub identity with permission to:
  - create a public repository under the `debrief` organisation,
  - configure GitHub Pages on it,
  - configure an Actions secret on it.
- A fine-grained personal access token (PAT) for the live-mode CI secret. The recommended setup is a service identity (not a human contributor) with **public-read** scopes on `debrief/debrief-future` (`metadata:read`, `contents:read`, `pull_requests:read`).

You will **not** need any debrief-future secrets — the kit is self-contained.

---

## Step ordering

The kit assumes you do these in order. Steps are idempotent where they can be; rerunning a step that is already complete is safe.

### Step 1 — Run the subtree split

```sh
cd specs/248-extract-spec-navigator/extraction-kit
./scripts/extract.sh
```

Produces `/tmp/spec-navigator-extract/` containing a fresh clone of `debrief/debrief-future` with a `spec-navigator-extracted` branch holding the history-preserved subtree.

The script validates: commit count, that no debrief production literal leaked through (the `defaults.ts` fallbacks are tolerated), and that `pnpm install && pnpm test` pass on the extracted source. **If any check fails, the script aborts and prints what to fix in `apps/spec-navigator/` first.**

### Step 2 — Create the empty repo on GitHub

```sh
gh repo create debrief/spec-navigator --public \
  --description "Browser-based viewer for speckit specifications" \
  --homepage https://debrief.github.io/spec-navigator/
```

Do this through `gh` or the web UI — the kit deliberately does not call `gh repo create` itself, so a typo in this step doesn't create an unrecoverable empty repo. The repo must be **empty** (no README, no .gitignore, no LICENSE) so the next step can push the extracted history as `main` cleanly.

### Step 3 — Bootstrap the new repo

```sh
./scripts/bootstrap-new-repo.sh
```

This:
1. Pushes `spec-navigator-extracted` from Step 1 to the new repo as `main`.
2. Applies the kit's CI workflows (`workflows/ci.yml`, `workflows/live.yml`, `workflows/deploy.yml`) onto the new repo's `main`.
3. Applies the templated docs (`templates/README.md`, `templates/CONFIGURATION.md`, `templates/SECURITY.md`).
4. Walks each patch under `patches/` interactively (vite base, URL compat shim, bundled fixtures, ESLint, tsconfig).
5. Prints next-step commands for enabling Pages and registering the `GITHUB_TOKEN` secret.

### Step 4 — Enable GitHub Pages

`gh api -X POST repos/debrief/spec-navigator/pages -f source.branch=main -f source.path=/` (or via the web UI: Settings → Pages → Source: GitHub Actions). The `deploy.yml` workflow installed in Step 3 expects Pages source = "GitHub Actions".

### Step 5 — Register the live-mode PAT

`gh secret set GITHUB_TOKEN --repo debrief/spec-navigator --body "<your-PAT>"` (or via the web UI: Settings → Secrets and variables → Actions → New repository secret). See `templates/SECURITY.md` for scope guidance.

### Step 6 — Trigger the first deploy

`gh workflow run deploy.yml --repo debrief/spec-navigator --ref main`. Watch the run; on success, visit `https://debrief.github.io/spec-navigator/` and confirm it renders debrief-future specs.

### Step 7 — Smoke-test all four URL forms

```
# Default — debrief-future, default branch
https://debrief.github.io/spec-navigator/

# Legacy form (current spec-navigator-comment.yml output)
https://debrief.github.io/spec-navigator/?pr=<some-open-pr-number>

# New form — non-debrief consumer
https://debrief.github.io/spec-navigator/?repo=octocat/hello-world

# Deep link
https://debrief.github.io/spec-navigator/?repo=debrief/debrief-future&branch=claude/implement-speckit-248-ChSwl
```

If all four render correctly, Phase 2 is complete. Announce the URL internally and proceed with the Phase 3 cutover (see `PHASE3-RUNBOOK.md`).

---

## Where to find each piece

| Concern | Location |
|---|---|
| Subtree-split script | `scripts/extract.sh` |
| New-repo bootstrap script | `scripts/bootstrap-new-repo.sh` |
| CI workflows for the new repo | `workflows/{ci,live,deploy}.yml` |
| New-repo README, CONFIGURATION.md, SECURITY.md | `templates/` |
| Code patches (vite base, URL shim, fixtures, ESLint, tsconfig) | `patches/` |
| Phase 3 cutover runbook | `PHASE3-RUNBOOK.md` |

---

## What this kit does **not** do

- It does not create the new GitHub repository (Step 2 is a manual `gh repo create`).
- It does not register secrets on the new repository (Step 5).
- It does not delete `apps/spec-navigator/` from this monorepo (that is Phase 3 — `PHASE3-RUNBOOK.md` covers it as a separate PR).
- It does not flip the `spec-navigator-comment.yml` URL host. Phase 3 does that, after the hosted instance is green.

The split is fully reversible up to Step 6 — if any step fails, no destructive action has been taken on the source repo.
