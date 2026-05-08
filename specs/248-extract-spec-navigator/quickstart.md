# Quickstart: Extract spec-navigator into a Standalone Repository

**Feature**: 248-extract-spec-navigator
**Audience**: The engineer (or AI agent) starting Phase 1 of the migration
**Prerequisite reading**: [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

This document is a working entry point — what to do first, what to verify before each phase boundary, and where to find the contracts that govern the work. It is intentionally thin; the authoritative content lives in the artefacts above.

`/speckit.review` on 2026-05-08 simplified the plan via decisions 1A (URL backward compatibility), 2A (no new `Configuration` entity), 3A (`specFormatVersion` deferred), and 5A (cutover touch-set corrected). This quickstart reflects the simplified plan.

---

## Where the active feature is recorded

This work is being executed on the cloud-session branch `claude/bold-noether-wWKle`. The `.specify/.active-feature` file at the repo root contains:

```
248-extract-spec-navigator
```

So speckit commands resolve the active feature even though the branch name does not follow the `NNN-` convention. Do not delete this file mid-session.

---

## Phase 1 — Parameterise the existing seams (this repo)

**Goal**: replace every hardcoded debrief literal in `apps/spec-navigator/src/` by threading defaults through the existing `ApiOptions` typed seam in `useFeature.ts` and parameterising the three vendor strings in `strings.ts`. Default values reproduce today's behaviour byte-for-byte.

**Decision 2A** explicitly rejected the previous proposal to introduce a new `Configuration` entity, a `src/config/` module, a JSON Schema, a Zod boundary for the configuration, and a Zod-vs-JSON-Schema drift test. None of those are part of Phase 1.

### Where to start

1. Read [`docs/extraction-audit/spec-navigator/coupling-inventory.md`](../../docs/extraction-audit/spec-navigator/coupling-inventory.md) §2 ("Hardcoded debrief-isms") — the literals that must be removed.
2. In `apps/spec-navigator/src/api/useFeature.ts`: replace the inline default repo literal with a read from `import.meta.env.VITE_DEFAULT_REPO ?? "debrief/debrief-future"`. Confirm the existing `ApiOptions` type is unchanged in shape.
3. In `apps/spec-navigator/src/strings.ts` (create the file if it does not yet exist alongside the components): export three `const`s for the application title, repo display label, and releases-link host. Each is supplied from a `VITE_*` env var with a debrief-default fallback. Update the components that previously inlined these strings to import from `strings.ts`.
4. Run `pnpm test` and `pnpm test:e2e` against the default values; both must remain green.
5. Add a test fixture pointing at a different repository (e.g., `octocat/hello-world` via `VITE_DEFAULT_REPO`) and confirm the rendering smoke-test passes against it.

### Phase 1 done when

- [ ] `grep -ri 'debrief\|debrief-future\|debrief.github.io' apps/spec-navigator/src/` returns zero matches outside default-fallback expressions.
- [ ] All Vitest and Playwright suites pass against the default values.
- [ ] A non-default `VITE_DEFAULT_REPO` (pointing at any other public GitHub repo with a `specs/` directory) renders without error.
- [ ] No new module under `src/config/`. No new JSON Schema. No new Zod schema. No drift test.
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

Reproduce the workflow inventory in [`contracts/ci-surface.md`](./contracts/ci-surface.md) — `ci.yml`, `live.yml`, `deploy.yml`. Branch-protect `main` against the listed gates.

(There is no `lighthouse.yml`. ADR-030 / Lighthouse-PWA budgets are owned by the **Backlog Navigator** (#244), not by this app.)

Add the `GITHUB_TOKEN` Actions secret per R-007: a fine-grained service-identity PAT, read-only on the public `debrief/debrief-future` repository.

### Bundled fixtures (R-004)

Add `e2e/fixtures/` populated by running `pnpm fixtures:record` against live GitHub. Default `pnpm test:e2e` runs against fixtures; `LIVE_GITHUB=1 pnpm test:e2e:live` runs live mode.

### GitHub Pages (R-003)

```ts
// vite.config.ts
export default defineConfig({
  base: process.env.VITE_BASE ?? "/spec-navigator/",
  // ...
});
```

Enable Pages in repository settings → Pages → Source: GitHub Actions. Wire `actions/deploy-pages` in `deploy.yml`.

### URL backward-compatibility shim (decision 1A)

Implement the legacy `?pr=<n>` resolution path in the new repo's URL parser — see `contracts/hosted-url.md`. Without it, every URL emitted by debrief-future's existing `spec-navigator-comment.yml` since #191 would 404 on consumer specs.

### Smoke test before announcing the URL

1. Visit `https://debrief.github.io/spec-navigator/` — should render debrief-future specs (default values).
2. Visit `https://debrief.github.io/spec-navigator/?pr=<some-open-pr-number>` — **legacy form**, should resolve to that PR's branch and render its specs (validates the 1A compat shim).
3. Visit `https://debrief.github.io/spec-navigator/?repo=debrief/debrief-future&branch=claude/bold-noether-wWKle` — should render this branch's specs, including this spec dir.
4. Visit `?repo=octocat/hello-world` — should render their (likely empty) specs view without crashing.

### Phase 2 done when

- [ ] New repo exists and is public with the stated description and homepage.
- [ ] CI workflows match `contracts/ci-surface.md`.
- [ ] `https://debrief.github.io/spec-navigator/` is live and returns 200.
- [ ] All four smoke-test URLs above render correctly.
- [ ] A first-time contributor (not in the debrief org) can clone, install, and run `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` to a green result.

---

## Phase 3 — Cutover (this repo)

**Goal**: a single atomic PR that deletes `apps/spec-navigator/` and the two dedicated workflows that build/publish it, points the existing `spec-navigator-comment.yml` at the hosted instance, removes spec-navigator references from `ci.yml`, and adds ADR-031.

### What to delete or update (corrected per decision 5A)

| Path | Action |
|---|---|
| `apps/spec-navigator/` | delete entirely |
| `.github/workflows/spec-navigator-preview.yml` | delete |
| `.github/workflows/spec-navigator-publish.yml` | delete |
| `.github/workflows/spec-navigator-comment.yml` | keep; swap URL host to `https://debrief.github.io/spec-navigator/` (continues to emit `?pr=<n>` — the compat shim handles it; the comment template can flip to `?repo=&branch=` later, independently) |
| `.github/workflows/ci.yml` | remove the 2 spec-navigator references |
| `heroku.yml`, `app.json`, `Dockerfile.preview` | **UNCHANGED** — verified no spec-navigator references exist today |
| `package.json` (root, `devDependencies`) | **UNCHANGED** — no spec-navigator-only entries (every root devDep is shared with at least one other workspace) |
| `pnpm-workspace.yaml` | the `apps/spec-navigator` glob is implicitly resolved; no edit needed |
| `CLAUDE.md` "Before Pushing" Step 4 | remove the spec-navigator Playwright command |
| `CLAUDE.md` recent changes section | append a one-line note pointing at the new repo |
| `docs/project_notes/decisions.md` | add ADR-031 — Extraction of spec-navigator. **Do not** annotate ADR-030 — that ADR is owned by #244 (Backlog Navigator), not by this app |

### Pre-merge verification

1. Open a draft cutover PR. CI must pass without spec-navigator's Playwright suite.
2. The PR's review-app comment must include the new hosted URL parameterised with this PR's number (the existing `?pr=<n>` shape).
3. Click the link in the comment; verify the hosted instance renders this PR's specs via the 1A compat shim.
4. Only then mark the PR ready for review.

### Phase 3 done when

- [ ] `apps/spec-navigator/` does not exist.
- [ ] `.github/workflows/spec-navigator-preview.yml` and `spec-navigator-publish.yml` are deleted.
- [ ] `task verify` (or the four-step fallback) passes; total runtime measurably faster (SC-003).
- [ ] ADR-031 is committed.
- [ ] Subsequent PR's review-app comment links to the hosted instance and works end-to-end via the legacy `?pr=` form.
- [ ] `git grep -i 'apps/spec-navigator'` returns zero matches in tracked files.

---

## Rollback

If Phase 3 reveals a regression, `git revert` of the cutover PR restores `apps/spec-navigator/`, the two deleted workflows, and the docs in a single commit. The hosted instance can stay live — it does not depend on the in-monorepo path. No data loss path exists in this migration; it is purely structural.

---

## Where the open contracts live

| Concern | Document |
|---|---|
| Defaults via `ApiOptions` and `strings.ts` | [data-model.md](./data-model.md) |
| Hosted-URL query-string contract (incl. legacy `?pr=`) | [contracts/hosted-url.md](./contracts/hosted-url.md) |
| New-repo CI workflows | [contracts/ci-surface.md](./contracts/ci-surface.md) |
| Acceptance scenarios per phase | [spec.md](./spec.md) §"User Stories" |
| Audit input (the hardcoded literals etc.) | [docs/extraction-audit/spec-navigator/coupling-inventory.md](../../docs/extraction-audit/spec-navigator/coupling-inventory.md) |

`specFormatVersion` is deferred (decision 3A); when re-introduced, it gets its own contract document at that time. Backlog #255 tracks the trigger.
