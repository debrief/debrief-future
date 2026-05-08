# Quickstart: Extract spec-navigator into a Standalone Repository

**Feature**: 248-extract-spec-navigator
**Audience**: The engineer (or AI agent) starting Phase 1 of the migration
**Prerequisite reading**: [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

This document is a working entry point — what to do first, what to verify before each phase boundary, and where to find the contracts that govern the work. It is intentionally thin; the authoritative content lives in the artefacts above.

---

## Where the active feature is recorded

This work is being executed on the cloud-session branch `claude/bold-noether-wWKle`. The `.specify/.active-feature` file at the repo root contains:

```
248-extract-spec-navigator
```

So speckit commands resolve the active feature even though the branch name does not follow the `NNN-` convention. Do not delete this file mid-session.

---

## Phase 1 — Configuration seam (this repo)

**Goal**: replace every hardcoded debrief literal in `apps/spec-navigator/src/` with a read from a single validated `Configuration` object. Default config = today's behaviour, byte-for-byte.

### Where to start

1. Read [`docs/extraction-audit/spec-navigator/coupling-inventory.md`](../../docs/extraction-audit/spec-navigator/coupling-inventory.md) §2 ("Hardcoded debrief-isms") — the seven literals that must be removed.
2. Create `apps/spec-navigator/src/config/`:
   - `schema.ts` — Zod schema mirroring [`contracts/configuration.schema.json`](./contracts/configuration.schema.json).
   - `default.ts` — the bundled debrief default values (matches `Configuration` defaults in [data-model.md](./data-model.md) Entity 1).
   - `load.ts` — resolution: build-env → query-string → default; runs Zod parse; returns the typed `Configuration` (no `unknown` escapes).
3. Replace each of the seven hardcoded literals with a `config.<field>` access. Run `pnpm test` and `pnpm test:e2e` against the default config; both must remain green.
4. Add a test fixture pointing at a different repository (e.g., `octocat/hello-world`) and confirm the rendering smoke-test passes against it.

### Verifying the JSON Schema ↔ Zod drift test

Per R-008, a Vitest test loads `contracts/configuration.schema.json` and a small set of accept/reject fixtures and confirms both the Zod schema and the JSON Schema produce the same accepted/rejected verdicts. Add this test before merging the seam.

### Phase 1 done when

- [ ] `grep -ri 'debrief\|debrief-future\|debrief.github.io' apps/spec-navigator/src/` returns zero matches.
- [ ] All Vitest and Playwright suites pass against the default `Configuration`.
- [ ] A non-default `Configuration` (pointing at any other public GitHub repo with a `specs/` directory) renders without error.
- [ ] Drift test (R-008) is in CI and green.
- [ ] PR description references this spec dir (`specs/248-extract-spec-navigator/`).

---

## Phase 2 — Standalone repository (new repo)

**Goal**: lift `apps/spec-navigator/` into `debrief/spec-navigator` with preserved history, working CI, and live GitHub Pages hosting.

### History extraction (R-001)

```sh
# In a fresh clone of debrief-future
git clone https://github.com/debrief/debrief-future debrief-future-extract
cd debrief-future-extract
git switch main
git subtree split --prefix=apps/spec-navigator -b spec-navigator-extracted
```

The branch `spec-navigator-extracted` now contains only commits that touched `apps/spec-navigator/`, with the `apps/spec-navigator/` prefix stripped from every path.

### Push as the new repo's `main`

```sh
gh repo create debrief/spec-navigator --public \
  --description "Browser-based viewer for speckit specifications" \
  --homepage https://debrief.github.io/spec-navigator/

git remote add new-repo git@github.com:debrief/spec-navigator.git
git push new-repo spec-navigator-extracted:main
```

### Stand up CI

Reproduce the workflow inventory in [`contracts/ci-surface.md`](./contracts/ci-surface.md) — `ci.yml`, `live.yml`, `deploy.yml`, `lighthouse.yml`. Branch-protect `main` against the listed gates.

Add the `GITHUB_TOKEN` Actions secret per R-007: a fine-grained service-identity PAT, read-only on the public `debrief/debrief-future` repository.

### Bundled fixtures (R-004)

Add `e2e/fixtures/` populated by running `pnpm fixtures:record` against live GitHub. Default `pnpm test:e2e` runs against fixtures; `LIVE_GITHUB=1 pnpm test:e2e:live` runs live mode.

### GitHub Pages (R-003)

```yaml
# vite.config.ts
export default defineConfig({
  base: process.env.VITE_BASE ?? "/spec-navigator/",
  // ...
});
```

Enable Pages in repository settings → Pages → Source: GitHub Actions. Wire `actions/deploy-pages` in `deploy.yml`.

### Smoke test before announcing the URL

1. Visit `https://debrief.github.io/spec-navigator/` — should render debrief-future specs (default config).
2. Visit `https://debrief.github.io/spec-navigator/?repo=debrief/debrief-future&branch=claude/bold-noether-wWKle` — should render this branch's specs, including this spec dir.
3. Visit `?repo=octocat/hello-world` — should render their (likely empty) specs view without crashing.

### Phase 2 done when

- [ ] New repo exists and is public with the stated description and homepage.
- [ ] CI workflows match `contracts/ci-surface.md`.
- [ ] `https://debrief.github.io/spec-navigator/` is live and returns 200.
- [ ] All three smoke-test URLs above render correctly.
- [ ] A first-time contributor (not in the debrief org) can clone, install, and run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` to a green result.

---

## Phase 3 — Cutover (this repo)

**Goal**: a single atomic PR that deletes `apps/spec-navigator/`, removes its CI jobs, swaps the review-app comment to link the hosted instance, drops root devDeps used only by it, and adds ADR-031.

### What to delete or update

Use the audit inventory to drive a checklist. Concretely, the cutover PR touches:

| Path | Action |
|---|---|
| `apps/spec-navigator/` | delete entirely |
| `.github/workflows/*.yml` | remove every job that references `apps/spec-navigator/` |
| `heroku.yml` | remove the spec-navigator preview build target |
| `app.json` | remove the spec-navigator preview entry |
| `Dockerfile.preview` | remove spec-navigator-only stages if any |
| `CLAUDE.md` "Before Pushing" Step 4 | remove the spec-navigator Playwright command |
| `CLAUDE.md` recent changes section | append a one-line note pointing at the new repo |
| `package.json` (root, `devDependencies`) | remove deps used only by spec-navigator (audit §7 lists these) |
| `pnpm-workspace.yaml` | the `apps/spec-navigator` glob is implicitly resolved; no edit needed |
| `docs/project_notes/decisions.md` | add ADR-031 — Extraction of spec-navigator. Annotate ADR-030 (vite-plugin-pwa) with a "now owned by `debrief/spec-navigator`" note |
| Heroku review-app comment template (in `.github/workflows/`) | update to render the URL form from `contracts/hosted-url.md` |

### Pre-merge verification

1. Open a draft cutover PR. CI must pass without spec-navigator's Playwright suite.
2. The PR's review-app comment must include the new hosted URL parameterised with this PR's branch.
3. Click the link in the comment; verify the hosted instance renders this PR's specs.
4. Only then mark the PR ready for review.

### Phase 3 done when

- [ ] `apps/spec-navigator/` does not exist.
- [ ] `task verify` (or the four-step fallback) passes; total runtime measurably faster (SC-003).
- [ ] ADR-031 is committed.
- [ ] Subsequent PR's review-app comment links to the hosted instance and works end-to-end.
- [ ] `git grep -i 'apps/spec-navigator'` returns zero matches in tracked files.

---

## Rollback

If Phase 3 reveals a regression, `git revert` of the cutover PR restores `apps/spec-navigator/`, the CI jobs, and the docs in a single commit. The hosted instance can stay live — it does not depend on the in-monorepo path. No data loss path exists in this migration; it is purely structural.

---

## Where the open contracts live

| Concern | Document |
|---|---|
| Configuration shape and validation | [data-model.md](./data-model.md), [contracts/configuration.schema.json](./contracts/configuration.schema.json) |
| Hosted-URL query-string contract | [contracts/hosted-url.md](./contracts/hosted-url.md) |
| `specFormatVersion` declaration & compatibility | [contracts/spec-format-version.md](./contracts/spec-format-version.md) |
| New-repo CI workflows | [contracts/ci-surface.md](./contracts/ci-surface.md) |
| Acceptance scenarios per phase | [spec.md](./spec.md) §"User Stories" |
| Audit input (the 7 literals etc.) | [docs/extraction-audit/spec-navigator/coupling-inventory.md](../../docs/extraction-audit/spec-navigator/coupling-inventory.md) |
