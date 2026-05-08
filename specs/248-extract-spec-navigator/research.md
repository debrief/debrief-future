# Phase 0 Research: Extract spec-navigator into a Standalone Repository

**Feature**: 248-extract-spec-navigator
**Date**: 2026-05-08 (revised post-`/speckit.review`)
**Inputs**: [spec.md](./spec.md), [docs/extraction-audit/spec-navigator/coupling-inventory.md](../../docs/extraction-audit/spec-navigator/coupling-inventory.md)

This document resolves all technical unknowns surfaced during planning. Every clarification from `/speckit.specify` was already answered (FR-015/016/017); this research records *how* we will execute on those decisions.

The `/speckit.review` pass on 2026-05-08 produced four follow-up decisions (1A, 2A, 3A, 5A) that materially simplify the plan — they're reflected throughout this document.

---

## R-001: History-preserving extraction mechanism

**Decision**: Use `git subtree split --prefix=apps/spec-navigator` against a fresh clone of debrief-future to produce an extraction-ready branch, then push that branch as the new repo's `main`.

**Rationale**:
- Preserves commit dates, authors, and per-file blame — all of which the spec artefacts in `specs/191-spec-navigator/` reference and which the team will want when reading historical PRs.
- Produces a clean linear history limited to commits that touched `apps/spec-navigator/`.
- Reversible: the source repo is untouched; the split branch can be re-generated if the migration aborts.
- The Phase 0 audit observed the app's history in this repo is essentially a single feature branch, so the split should be linear with no cross-cutting commits to triage.

**Alternatives considered**:
- `git filter-repo --path apps/spec-navigator/ --path-rename apps/spec-navigator/:` — equivalent end-state, but it requires a separate Python tool, mutates a clone destructively, and offers no advantage given the simple history shape.
- `git init` + copy — discards history. Rejected: the team values blame and PR linkage on this app.
- `git subtree push` to a fresh remote — same mechanism as `subtree split`, but coupled to remote bootstrap. The two-step (split locally, then push as `main`) is auditable and reproducible.

**Cross-cutting commit policy**: Any commit that touched both `apps/spec-navigator/` and unrelated paths is preserved by `subtree split` with the unrelated paths' diffs dropped. A pre-flight `git log --oneline apps/spec-navigator/ | wc -l` plus a `git log --diff-filter=AM --name-only` review of the largest commits identifies any commit whose intent is opaque without context; for those, the split commit body is annotated in the new repo via `git notes` (no rewrite). Audit observation: this app has effectively a single-commit lineage, so we expect zero such commits in practice.

---

## R-002: Parameterising the hardcoded debrief literals (decision 2A)

**Decision**: Use the seams that already exist. Two production files change:

1. `src/api/useFeature.ts` — the existing `ApiOptions` type already carries `repo` and `branch`. Today its defaults are hardcoded to `"debrief/debrief-future"` and the active branch resolution. Phase 1 threads those defaults through as values rather than literals, so a different deployment can supply different defaults at build time (env var) or request time (URL query string — see R-003).
2. `src/strings.ts` — three vendor strings (application title, repo display name, releases-link host) become constants exported from this module rather than inlined in components. Components read them via the existing import path; nothing else moves.

**No new module under `src/config/`. No new `Configuration` entity. No JSON Schema. No Zod boundary added.** The existing `ApiOptions` type is the boundary; URL-query parsing is a small parser function (existing pattern in `apps/spec-navigator/src/`) that returns a typed object accepted by `ApiOptions`.

**Rationale**:
- The review's design pass observed that the `Configuration` proposal in earlier drafts was a *new* abstraction layered on top of `ApiOptions` and `strings.ts`, not a replacement. Two seams for the same concern is worse than one. Decision 2A removes the duplication before it ships.
- Three production files touched is enough to delete every audit-identified literal.
- The contract for adopters is "fork the source and edit `strings.ts` + your `useFeature.ts` defaults", which is what most adopters of small SPAs do anyway.

**Resolution order** (build-time env vars > URL query string > bundled defaults) is preserved — it's simply enacted inside `useFeature.ts`'s defaults function rather than in a new `src/config/load.ts`.

**Alternatives considered**:
- A new `Configuration` entity with `src/config/schema.ts` + `default.ts` + `load.ts` + a JSON Schema mirror + a Zod-vs-JSON-Schema drift test — the previous design. Rejected (decision 2A): it duplicates the existing `ApiOptions` seam without earning its keep, adds a Zod boundary where one already exists for the GitHub REST surface, and obligates a drift test for a hand-mirrored pair.
- Runtime UI config switcher (mid-session repo change). Rejected as out of scope (Assumptions in spec).
- A separate `config.json` fetched at runtime. Rejected: extra round-trip, no benefit over query-string for the hosted-instance case.

---

## R-003: GitHub Pages deployment from a Vite SPA

**Decision**: Single GitHub Pages site at `https://debrief.github.io/spec-navigator/`. Deploy via the standard `actions/deploy-pages` GitHub Action on merge to `main`. Vite `base` set to `/spec-navigator/` (overridable via `VITE_BASE`) to keep asset paths correct.

**Rationale**:
- Free, zero infrastructure to manage, fits the static-SPA character.
- `actions/deploy-pages` is the official path; widely documented.
- The `base` path is the only Vite-specific gotcha; setting it via env var lets adopters re-host under different paths without rebuilding from a fork.

**Multi-consumer URL contract — accept BOTH shapes (decision 1A)**:

The hosted SPA accepts two URL contracts side-by-side:

| Form | Origin | Example |
|---|---|---|
| Legacy `?pr=<n>` | The shape `spec-navigator-comment.yml` has emitted on every PR comment since #191. Resolves the PR number → branch via the existing GitHub API call. | `…/spec-navigator/?pr=512` |
| New `?repo=<org>/<name>&branch=<branch>` | Added by this feature for non-debrief consumers. | `…/spec-navigator/?repo=acme/foo&branch=feat/x` |

A small compat shim at the top of the URL parser detects `?pr=<n>` (no `?repo=`) and resolves it through the existing PR-to-branch flow against `debrief/debrief-future`, then proceeds as if `?repo=debrief/debrief-future&branch=<resolved>` had been supplied.

`spec-navigator-comment.yml` is **not** modified in Phase 3 — its emitted URL form continues to work because of the compat shim. The comment template can be flipped to `?repo=&branch=` independently, later, with no time pressure.

**Single-deployment, multi-consumer model**: A single Pages deployment renders any consumer via either URL contract above. Per-PR previews on the *navigator* itself are not needed — the navigator is a static viewer; navigator PRs are previewed via local `vite preview` and the live-mode CI run. Per-PR previews of *consumer specs* are achieved through `?branch=…` (or `?pr=<n>` for debrief-future).

**Alternatives considered**:
- Cloudflare Pages / Vercel / Netlify — extra vendor account; no advantage.
- Heroku review apps — explicitly rejected by the spec.
- Replace `?pr=` with `?repo=&branch=` (no shim). Rejected (decision 1A): would break every comment historically posted by `spec-navigator-comment.yml`. The shim is a few lines; permanent backward compatibility is the better trade.

---

## R-004: Bundled-fixture E2E vs live mode

**Decision**: Playwright tests run against bundled HTTP fixtures by default, switched to live GitHub by setting `LIVE_GITHUB=1` and supplying `GITHUB_TOKEN`. Fixtures are recorded from real GitHub responses using Playwright's built-in route interception (`page.route(...)`) backed by JSON files under `e2e/fixtures/`.

**Rationale**:
- Playwright's native `page.route` + a small fixture-loader helper is enough; no MSW or Polly dependency needed (Article IX — minimal deps).
- Bundled fixtures are deterministic and offline-capable (Article I).
- Live mode is what catches real GitHub-API drift; running it on the new repo's `main` branch (and nightly) gives signal without slowing PR CI.
- A fixture re-record script (`pnpm fixtures:record`) regenerates fixtures by toggling `LIVE_GITHUB=1` and recording responses, so fixtures don't go stale.

**Alternatives considered**:
- MSW (Mock Service Worker) — common pattern, but extra runtime dep and Playwright's `page.route` is already in the project. Rejected on dependency-minimalism grounds.
- Polly.js — heavier; HAR-based recording is overkill for a thin GitHub-REST surface.
- Live-only — rejected by FR-013 (contributors without org access must produce green builds).
- Fully mocked TypeScript adapters (no HTTP at all) — fastest tests, but we lose realism on GitHub response shapes; fixtures balance speed and realism.

**CI matrix**:
| Job | Trigger | Mode | Secret? |
|---|---|---|---|
| `ci.yml` | every PR | bundled fixtures (default) | no |
| `live.yml` | nightly + push to `main` | `LIVE_GITHUB=1` | `GITHUB_TOKEN` (read-only public scopes) |
| `deploy.yml` | push to `main` (after `live.yml` green) | n/a (build only) | none beyond Pages permissions |

(No `lighthouse.yml`. Spec-navigator carries no Lighthouse-PWA commitment — that is ADR-030 / #244 territory, owned by the **Backlog Navigator**, not this app.)

---

## R-005: ~~`specFormatVersion` declaration and discovery~~

**Status**: **Deferred** (decision 3A — `/speckit.review` 2026-05-08).

The `specFormatVersion` contract introduced a 7-outcome behaviour matrix, a per-page-load GitHub Contents API call, a baked `SUPPORTED_FORMAT_RANGE` constant, and a UI surface (full-page errors and a non-blocking warning banner) — all to gate against drift between consumers' artefact format and the navigator's expectations. With debrief-future as the only consumer until a second one materialises, the contract has nothing to mediate.

Re-introduced when:
- A second consumer (e.g. backlog-navigator extraction per backlog #255, or any third-party adopter) ships, **and**
- That consumer's artefact format diverges meaningfully from debrief-future's.

Until then, the navigator simply renders whatever it finds. Captured as backlog item for re-spike when triggered.

---

## R-006: Cutover strategy in debrief-future (Phase 3)

**Decision**: A single atomic cutover PR. Before merge, the hosted instance is verified live and a smoke-test PR confirms the review-app comment renders correctly.

**Touch-set, corrected post-review (decision 5A)**:

| Path | Action | Notes |
|---|---|---|
| `apps/spec-navigator/` | delete entirely | |
| `.github/workflows/spec-navigator-preview.yml` | delete | Heroku review-app build for this app — superseded by hosted Pages instance |
| `.github/workflows/spec-navigator-publish.yml` | delete | Currently publishes the in-monorepo build target; the new repo owns publishing |
| `.github/workflows/spec-navigator-comment.yml` | keep, update URL | Continues to emit `?pr=<n>` (compat shim handles it). URL host swaps to `https://debrief.github.io/spec-navigator/`. Comment template can be flipped to `?repo=&branch=` independently, later. |
| `.github/workflows/ci.yml` | remove 2 spec-navigator references | |
| `heroku.yml`, `app.json`, `Dockerfile.preview` | **UNCHANGED** | Verified — no spec-navigator references exist today. The audit-derived plan claim that these need editing was wrong (corrected by 5A). |
| `package.json` (root, `devDependencies`) | **UNCHANGED** | Verified — no root devDep is spec-navigator-only. Every entry (`@playwright/test`, `@sparticuz/chromium`, `vitest`, `typescript`, `@lhci/cli`, `knip`, `tsx`, `ajv`, `@types/node`) is shared with at least one other workspace. (5A correction.) |
| `CLAUDE.md` "Before Pushing" Step 4 | remove the spec-navigator Playwright command | |
| `CLAUDE.md` recent changes section | append a one-line note pointing at the new repo | |
| `docs/project_notes/decisions.md` | add ADR-031 (extraction). **Do not** annotate ADR-030 — it belongs to the Backlog Navigator (#244), not spec-navigator. (5A correction.) | |

**Rationale**:
- A single PR avoids a "half-extracted" intermediate state where both the in-repo and hosted instances exist (violates SC-007).
- Atomic delete + workflow updates in one commit guarantees `git bisect` will never land on a broken state.
- Pre-merge smoke test ensures the hosted instance is healthy before the in-repo fallback is destroyed.

**In-flight PR handling**: PRs open at the moment of merge will see a one-time merge conflict against `apps/spec-navigator/` paths. The cutover PR description includes a one-line rebase instruction; for any PR that *modifies* `apps/spec-navigator/`, the author redirects their change to the new repo. The audit's single-commit history observation suggests few such PRs in flight at any time.

**Rollback path**: A `revert` of the cutover PR restores `apps/spec-navigator/`, the deleted workflows, and the doc state in one commit. The hosted instance can remain live during a rollback (it does not depend on the in-repo path).

**Alternatives considered**:
- Staged cutover (delete source first, swap docs in a follow-up). Rejected: produces a window where docs reference the deleted path.
- Tombstone with a redirect (keep `apps/spec-navigator/index.html` as a meta-refresh). Rejected: needs build pipeline kept alive; defeats the point.

---

## R-007: PAT scopes for the live-mode CI secret

**Decision**: A fine-grained personal access token scoped read-only to the public `debrief/debrief-future` repository, registered as `GITHUB_TOKEN` in the new repo's Actions secrets (or a fork-specific equivalent). The token is owned by a service identity, not a human contributor.

**Rationale**:
- Public-read is the minimum scope that exercises real GitHub responses against the canonical consumer.
- Fine-grained tokens are scoped per-repository, so leakage from this secret cannot affect any other debrief property.
- Service-identity ownership means contributor turnover doesn't silently break CI.

**Adopter guidance** (in new-repo README): adopters using private repositories must supply their own PAT with `metadata:read` and `contents:read` on their private repo, set as `GITHUB_TOKEN` in their Actions secrets. The navigator's CI layout ships the workflow as a template with this requirement documented.

**Alternatives considered**:
- A fully public-only mode (no PAT anywhere). Rejected: anonymous GitHub rate limits (60 req/hr) are too tight for a CI job that fetches multiple files per spec.
- A bot account's classic PAT with `repo` scope. Rejected: way over-scoped; modern fine-grained tokens are the right tool.

---

## R-008: ~~Configuration validation strategy~~

**Status**: **Withdrawn** (decision 2A — `/speckit.review` 2026-05-08).

There is no `Configuration` entity to validate; defaults are values flowing through the existing `ApiOptions` typed seam. The only untrusted input is the URL query string, which is parsed by a small typed parser in the existing pattern — the same Zod surface that already validates the GitHub REST boundary covers any new field that crosses an untrusted edge. No JSON Schema is published. No drift test is required.

---

## Summary table

| ID | Topic | Decision (one line) |
|---|---|---|
| R-001 | History extraction | `git subtree split --prefix=apps/spec-navigator/` from a fresh clone |
| R-002 | Parameterisation | Thread defaults through `useFeature.ts` `ApiOptions` + parameterise three strings in `strings.ts`; no new abstractions (decision 2A) |
| R-003 | Hosting | GitHub Pages, single deploy at `/spec-navigator/`, multi-consumer via query string; legacy `?pr=` and new `?repo=&branch=` both accepted (decision 1A) |
| R-004 | E2E mode | Bundled Playwright route fixtures by default; opt-in `LIVE_GITHUB=1` mode in CI |
| R-005 | Format version | **Deferred** (decision 3A — backlog #255 re-spike trigger) |
| R-006 | Cutover | Single atomic PR; touch-set corrected (no heroku/app.json/Dockerfile.preview/devDeps churn — none was needed) (decision 5A) |
| R-007 | PAT scopes | Fine-grained service-identity PAT, public-read on debrief-future, `GITHUB_TOKEN` secret |
| R-008 | Config validation | **Withdrawn** (decision 2A — no Configuration entity to validate) |

All NEEDS CLARIFICATION items are resolved. Ready for Phase 1.
