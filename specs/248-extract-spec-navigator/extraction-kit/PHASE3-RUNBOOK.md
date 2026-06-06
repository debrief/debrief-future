# Phase 3 Runbook — Cutover (in `debrief-future`)

This runbook is executed **after** Phase 2 is complete: `https://debrief.github.io/spec-navigator/` is live, all four URL forms render correctly, and the `live.yml` nightly has been green at least once.

**Estimated effort**: 1–2 hours of edits + 1 review-app cycle for smoke-testing.

---

## Pre-flight checklist

Before opening the cutover PR, verify:

- [ ] `https://debrief.github.io/spec-navigator/` returns 200 and renders debrief-future specs by default.
- [ ] `https://debrief.github.io/spec-navigator/?pr=<known-open-pr>` resolves and renders that PR's specs (proves the legacy compat shim works).
- [ ] `live.yml` last run on `main` is ✅.
- [ ] At least one debrief-future PR has been used to read specs via the hosted instance, confirming the user experience is unchanged from the in-monorepo build.

If any of those is false, **stop**. Phase 3 deletes the in-monorepo fallback; do not delete it until the hosted replacement is proven.

---

## The cutover PR

Open a single PR on a fresh branch. The PR is atomic: every change below in one commit (or one stack of related commits, all merging together).

### Touch-set (corrected per `/speckit.review` decision 5A)

| Path | Action | Notes |
|---|---|---|
| `apps/spec-navigator/` | **delete entirely** | source, tests, build configs, scripts |
| `.github/workflows/spec-navigator-preview.yml` | **delete** | superseded by hosted Pages |
| `.github/workflows/spec-navigator-publish.yml` | **delete** | new repo owns publishing |
| `.github/workflows/spec-navigator-comment.yml` | **keep, edit URL** | swap host to `https://debrief.github.io/spec-navigator/`. Continues to emit `?pr=<n>` — the compat shim handles it. The comment template can be flipped to `?repo=&branch=` independently, later. |
| `.github/workflows/ci.yml` | remove 2 spec-navigator references | search for `@debrief/spec-navigator` and `apps/spec-navigator` |
| `heroku.yml`, `app.json`, `Dockerfile.preview` | **UNCHANGED** | verified no spec-navigator references exist today |
| `package.json` (root, `devDependencies`) | **UNCHANGED** | no spec-navigator-only entries — every root devDep is shared with at least one other workspace (verified) |
| `pnpm-workspace.yaml` | UNCHANGED | the `apps/*` glob resolves correctly post-deletion |
| `CLAUDE.md` "Before Pushing" Step 4 | remove the spec-navigator Playwright command | trims the `pnpm --filter @debrief/spec-navigator build && cd apps/spec-navigator && node run-playwright.mjs` line |
| `CLAUDE.md` "Recent Changes" / "Active Technologies" | append a one-line note pointing at the new repo | e.g. `// spec-navigator extracted to debrief/spec-navigator on YYYY-MM-DD; hosted at debrief.github.io/spec-navigator/` |
| `docs/project_notes/decisions.md` | **add ADR-031** | content below. **Do NOT** annotate ADR-030 — that ADR is owned by #244 (Backlog Navigator), not by this app. |

### ADR-031 content (drop into `docs/project_notes/decisions.md`)

```markdown
## ADR-031 — spec-navigator extracted to its own repository

**Date**: <YYYY-MM-DD of the cutover PR>
**Status**: Accepted
**Supersedes**: nothing
**Superseded by**: nothing

### Context

`apps/spec-navigator/` was a self-contained React+Vite SPA living in the
monorepo. Its CI ran on every PR (including PRs that only touched docs);
its build artefacts were published to a sub-path of the project's
GitHub Pages domain; its source had no `@debrief/*` imports. Maintaining
it inside the monorepo paid CI cost per PR for a feature that almost
never changed.

### Decision

Extracted to `debrief/spec-navigator` (public). New repo hosts at
`https://debrief.github.io/spec-navigator/` and renders any consumer's
specs via URL parameters (`?repo=&branch=` or legacy `?pr=`).

### Consequences

- Monorepo CI runs one fewer Playwright suite (SC-003).
- New repo's `live.yml` exercises the real GitHub API nightly, catching
  drift the in-monorepo build never touched.
- `spec-navigator-comment.yml` continues to emit `?pr=<n>` URLs (the
  permanent compat shim makes them work indefinitely).
- Adopters outside debrief can deploy a configured instance from the
  new repo's README in ~30 minutes (SC-001).

### References

- Spec: `specs/248-extract-spec-navigator/spec.md` (this repo, pre-cutover)
- Audit: `docs/extraction-audit/spec-navigator/coupling-inventory.md`
- New repo: <https://github.com/debrief/spec-navigator>
- Hosted instance: <https://debrief.github.io/spec-navigator/>
```

---

## Pre-merge verification

1. Open the PR as **draft**.
2. Confirm CI is green without the spec-navigator Playwright suite.
3. Confirm the PR's review-app comment includes the new hosted URL parameterised with this PR's number (the existing `?pr=<n>` shape).
4. Click the link. The hosted instance must render this PR's specs via the 1A compat shim.
5. Only then mark the PR ready for review.

## Done when

- [ ] `apps/spec-navigator/` does not exist on `main`.
- [ ] `.github/workflows/spec-navigator-preview.yml` and `spec-navigator-publish.yml` deleted.
- [ ] `task verify` (or the four-step fallback in `CLAUDE.md`) passes; total runtime measurably faster than before (SC-003).
- [ ] ADR-031 committed on `main`.
- [ ] `git grep -i 'apps/spec-navigator'` on `main` returns zero matches in tracked files.
- [ ] At least one subsequent PR's review-app comment links to the hosted instance and works end-to-end via `?pr=`.

---

## Rollback

If a regression is discovered after merge:

```sh
git revert <cutover-pr-merge-commit-sha>
git push origin main
```

This restores `apps/spec-navigator/`, the two deleted workflows, the `ci.yml` references, and the docs in a single revert commit. The hosted instance can stay live during a rollback — it does not depend on the in-monorepo path.

There is no data-loss path in this migration; it's purely structural. A revert is always safe.
