# Phase 0 Research: Extract backlog-navigator into a Standalone Repository

**Feature**: 249-extract-backlog-navigator
**Date**: 2026-05-11
**Inputs**: [spec.md](./spec.md), [specs/248-extract-spec-navigator/research.md](../248-extract-spec-navigator/research.md) (parent template)

This document resolves every technical unknown surfaced during planning. The spec
is explicit that #248 is the **operational template**: where #248's research
landed a working answer, this research adopts it verbatim and notes "carried
from #248"; where #248's hand-off exposed a failure or friction point, this
research records the revised decision.

Twelve concrete lessons from the #248 hand-off (enumerated in spec §"Lessons
from #248") drive most of the deltas below. Cross-reference: each lesson's
fix lands in the R-NNN that owns it.

---

## R-001: History-preserving extraction mechanism (carried from #248)

**Decision**: `git subtree split --prefix=apps/backlog-navigator` against a fresh
clone of debrief-future to produce an extraction-ready branch, then push that
branch as the new repo's `main`.

**Rationale** (unchanged from #248 R-001):
- Preserves commit dates, authors, and per-file blame — important for the
  spec linkage trail back to `specs/242-backlog-navigator/`,
  `specs/244-navigator-mobile-pwa/`, `specs/245-navigator-e2e-fixture/`, and
  `specs/247-lazy-mobile-bundle/` (every prior backlog-navigator feature).
- Reversible: the source repo is untouched until Phase 3 cutover.
- The split branch can be regenerated on demand.

**Cross-cutting commit policy**: Same as #248. The pre-flight check is
`git log --oneline -- apps/backlog-navigator/ | wc -l`; the audit (FR-001)
flags any commit that mixes backlog-navigator changes with unrelated paths so
the operator can decide whether to annotate via `git notes` on the split
commit (no rewrite). Five backlog-navigator feature branches (#242, #244,
#245, #247, plus dependent fixes) have shipped; expect a small handful of
cross-cutting commits.

**Delta from #248**: None mechanically. The pre-condition that the working
tree is **lockfile-ready and `packageManager`-tagged** (R-002 below) is new —
without it the post-split first push reproduces #248 Lessons 1 & 2 (sub-10-
second CI failure).

---

## R-002: Configuration seam in Phase 1 (revised — uses existing seams)

**Decision**: Use the existing module-scope constants in
`apps/backlog-navigator/src/github/api.ts` (`DEFAULT_OWNER`,
`DEFAULT_REPO`) and `apps/backlog-navigator/src/strings.ts` (already a
centralised string table) as the seams. Replace inlined literals with reads
from `import.meta.env.VITE_DEFAULT_OWNER`, `VITE_DEFAULT_REPO`,
`VITE_BASE_URL` (already env-driven), plus a new `defaults.ts` module that
collects the PWA manifest fields currently hardcoded in `vite.config.ts`
(name, short_name, description, theme_color, background_color, icon paths).

**Files Phase 1 touches** (a complete list, deliberately small):

| File | Change |
|---|---|
| `apps/backlog-navigator/src/github/api.ts` | `DEFAULT_OWNER = import.meta.env.VITE_DEFAULT_OWNER ?? 'debrief'`; `DEFAULT_REPO = import.meta.env.VITE_DEFAULT_REPO ?? 'debrief-future'` |
| `apps/backlog-navigator/src/defaults.ts` *(new — analogous to #248's pattern)* | Exports build-time defaults: `appTitle`, `appShortName`, `appDescription`, `themeColor`, `bgColor`, `iconPaths`, `host`, `repoSlug`. All take `VITE_*` env-var input with debrief-default fallbacks. |
| `apps/backlog-navigator/vite.config.ts` | PWA manifest reads from `./src/defaults.ts` (already runs at build time, so an `import.meta.env`-free pattern is needed; use `process.env` reads in `vite.config.ts` for the manifest, mirroring `VITE_BASE_URL`). |
| `apps/backlog-navigator/src/strings.ts` | One additional exported `const` for the production-URL host string (`debrief.github.io`), env-overridable. Existing user-facing strings unchanged. |
| `apps/backlog-navigator/package.json` | **FR-010**: add `"packageManager": "pnpm@10.33.0"` (or current pinned version). Prevents #248 Lesson 2. |

**Critical**: the audit (FR-001) is the input. The list above is the
*expected* touch-set based on a pre-audit scan — if the audit surfaces
additional literals (e.g., issue-label conventions like `value-`, `epic-`),
those are added to `defaults.ts` too. The plan does not predict the audit;
it commits to the *shape* of Phase 1: a single `defaults.ts` module + tiny
edits to the existing consts + `packageManager` field.

**Rationale**:
- Mirrors #248 decision 2A: the seams already exist; the work is to use
  them. No new `Configuration` entity, no new JSON Schema, no Zod boundary.
- The vite.config.ts manifest fields are an *additional* surface compared
  to spec-navigator (which had no PWA). They must become env-driven so an
  adopter can change app name / theme without source edits.
- `packageManager` field is *the single most preventable failure mode* from
  #248 — it must be in the source PR, not added in Phase 2.

**Alternatives considered**:
- New `Configuration` entity with `src/config/` module — rejected for the same
  reasons #248 decision 2A rejected it: duplicates existing seams.
- Inline-only env-var reads, no `defaults.ts` module — rejected: the PWA
  manifest needs `process.env` reads at vite config evaluation time, which
  is most cleanly done by importing a single defaults module.
- Defer `packageManager` to Phase 2 — rejected by FR-010. The whole point
  of #248 Lesson 2 is that this field must land in the source repo so it
  ships with the subtree split.

---

## R-003: Hosting — `gh-pages` branch + `JamesIves/github-pages-deploy-action@v4` (#248 Lesson 4)

**Decision**: New repo's GitHub Pages source is the `gh-pages` branch
(`Deploy from a branch → gh-pages → / (root)`), populated by
`JamesIves/github-pages-deploy-action@v4` from `deploy.yml` (main →
`gh-pages` root) and from `pr-preview.yml` (PR → `gh-pages/previews/pr-<n>/`).
The Vite `base` default matches the destination repo slug.

**Why not `actions/deploy-pages`** (#248's choice): the artifact-based action
serves exactly one bundle per repo; per-PR previews need multiple subpaths in
the same Pages site. Switching mid-flight (as #248 had to) is not "flip the
config" — it requires reworking `deploy.yml` away from artifacts to a branch-
based publisher and reconfiguring Pages source. **Set this from day one.**

**Operational gotcha**: GitHub Pages settings are configured via the web UI,
not via repo files. The kit's prerequisites step explicitly says:
"Settings → Pages → Source: Deploy from a branch → branch: gh-pages → folder:
/ (root). Wait for the first workflow to create the `gh-pages` branch before
flipping this — the dropdown only lists branches that exist." This is
**Lesson 10** from #248's hand-off.

**`clean-exclude: previews/`** is required on the deploy action so a `main`
push does not wipe in-flight `previews/pr-<n>/` folders (FR-014).

**Alternatives considered**:
- Keep `actions/deploy-pages` + serve previews from a separate repo. Rejected:
  unnecessary infrastructure split; the `gh-pages` branch model is the
  textbook pattern.
- Cloudflare Pages / Netlify. Rejected: extra vendor account; no benefit.

---

## R-004: Per-PR preview workflow (new — not in #248 v1)

**Decision**: Ship `pr-preview.yml` and `pr-preview-cleanup.yml` as first-
class kit components from day one. (#248 Lesson 8 — these were a bolted-on
follow-up in #248 and must be designed in here.)

**`pr-preview.yml`** triggers on `pull_request` (`opened`, `synchronize`,
`reopened`):

1. Builds with `VITE_BASE=/{{REPO}}/previews/pr-<n>/`,
   `VITE_DEFAULT_OWNER={{ORG}}`, `VITE_DEFAULT_REPO={{REPO}}` (so the
   preview, with no query params, renders the bundled dummy speckit dataset
   from R-005 — a self-contained preview, not a debrief proxy).
2. Deploys to `gh-pages` under `previews/pr-<n>/` via
   `JamesIves/github-pages-deploy-action@v4` with `clean-exclude: '!previews/pr-<n>'`.
3. Upserts a single sticky PR comment marked with an HTML-comment sentinel
   (`<!-- backlog-nav-preview -->`). Comment body includes the preview URL
   plus at least four sample URL shapes:
   - default view (renders bundled dummy)
   - `?repo={{ORG}}/{{REPO}}&branch=<branch>` (this repo's other branches)
   - `?pr=<n>` (legacy form — emits today's debrief comment shape)
   - `?repo=<external>/<repo>&branch=<branch>` (third-party adopter shape)

**`pr-preview-cleanup.yml`** triggers on `pull_request closed`: removes
`previews/pr-<n>/` from `gh-pages` using a small git checkout/rm/commit step.

**Sticky-comment implementation**: `actions/github-script@v7` with a search
for the sentinel and `update-comment`/`create-comment` API calls. Same
pattern as `.github/workflows/backlog-navigator-comment.yml` in this repo.

**Alternatives considered**:
- Run previews against external Heroku review apps. Rejected: extra vendor;
  the static-site nature of the SPA makes Pages previews the natural fit.
- Build preview into `ci.yml`. Rejected: previews need different `VITE_BASE`,
  different deploy target, and different cleanup lifecycle; separating into
  its own workflow keeps each readable.

---

## R-005: Bundled dummy speckit dataset (new)

**Decision**: Bundle one stable, narrative-rich spec from debrief-future into
the new repo under `specs/<NNN>-<name>/` (recommendation: `specs/249-extract-
backlog-navigator/` itself, **or** copy `BACKLOG.md` excerpt + one or two
representative spec dirs — final choice deferred to the kit author).

For backlog-navigator specifically, the bundled dataset is a *condensed
`BACKLOG.md`* (the app's primary data shape) plus a small set of linked spec
directories so the linking surface is exercised. The dataset lives at
`specs-dummy/` in the kit and is copied into `specs/` at bootstrap time.

**Rationale**:
- Without it, opening the preview with no query params shows an empty state
  or an error (depending on whether the in-repo default OWNER/REPO resolves
  against an unauthenticated GitHub API call — which it would, at 60 req/hr).
- Reviewers without local dev tooling need *something* coherent to look at.
- A static bundled file means previews render offline-first.

**#248 picked `237-active-storyboard-persistence`** as its dummy because it
was narrative-rich and stable. For backlog-navigator the natural dummy is
`BACKLOG.md` itself (the app's primary data file). The dummy `BACKLOG.md`
is a stripped-down version: 6–10 items spanning multiple epics, multiple
statuses, multiple V·M·A scores — enough to exercise sort, filter, group,
description expand, and lozenge rendering.

**Alternatives considered**:
- No bundled dataset; rely on `?repo=...` query params. Rejected by FR-016
  and #248 Lesson 8.
- A fully synthetic `BACKLOG.md` with no real links. Rejected: links to
  spec dirs are part of the rendered surface and must be exercised.

---

## R-006: E2E test strategy — in-process route mock only (FR-019, #248 Lesson 12)

**Decision**: The standalone repo's Playwright suite uses **in-process route
interception** (`page.route(...)`) backed by the existing `e2e/mock-github.ts`
pattern, which moves with the subtree split. No fixture corpus, no recorder
script. **Patch 03 from #248 is dropped from the required path.**

If at some point drift detection against the real GitHub API becomes
desirable (e.g., a third-party adopter reports a schema change), a separate
`live.yml` workflow can be added; that path is optional and out-of-scope for
the initial extraction.

**Rationale** (echoes #248 Lesson 12):
- The `e2e/mock-github.ts` route mock provides full offline test coverage
  today. It runs in this repo's CI on every PR; it will run identically in
  the standalone repo.
- The fixture-corpus + recorder approach (#248's `patch 03`) was 90%
  maintainer-tooling with no test-quality dividend. It also requires
  beforeEach wiring in every test, fixture corpus maintenance, and a PAT-
  authenticated recorder script — substantial cost for zero new coverage.
- Article IX (minimal deps): the in-process mock uses Playwright APIs
  already in the project. Fixtures would add JSON file management. Choose
  the simpler tool.

**Adopter guidance** (in new-repo README): adopters who *want* drift
detection can opt in to `live.yml` via a documented snippet; the kit
provides a template at `workflows/live.yml` (commented "optional — only
enable if you need drift detection against the upstream API").

**Alternatives considered**:
- MSW (Mock Service Worker). Rejected: extra runtime dep; Playwright's
  route mock is already adequate.
- Live-only Playwright. Rejected: contributors without org-issued PATs
  cannot produce a green build (FR-013 / #248 FR-013).
- HAR-recording approach. Rejected: overkill for the small GitHub-REST
  surface; deterministic JSON is easier to review in PR diffs.

---

## R-007: Workspace dependency on `@debrief/components/hooks/useIsMobile` (NEW — not present in #248)

**Decision**: **Inline-copy** `useIsMobile` into the backlog-navigator source
tree in Phase 1, with provenance comment, *before* the subtree split. The
copy lives at `apps/backlog-navigator/src/hooks/useIsMobile.ts`; consumers
update their imports from `@debrief/components/hooks/useIsMobile` to
`../hooks/useIsMobile` (or matching relative path).

**Why this matters**: spec-navigator had **zero** workspace dependencies and
the subtree split therefore needed no upstream untangling. backlog-navigator
depends on a single hook from `@debrief/components`. That hook does not
travel with `git subtree split --prefix=apps/backlog-navigator` (the split
sees only files under that prefix), so without intervention the post-split
repo would fail to typecheck on the first push.

**Why inline-copy over alternatives**:
- The hook is ~40 lines of pure React with no @debrief peer deps. Copying it
  is mechanical, reviewable, and self-documenting (provenance comment cites
  the source spec #246-hooks-workspace-package).
- The alternative — wait for a published `@debrief/hooks` npm package and
  depend on that — couples the extraction timeline to a separate publication
  schedule. The spec is explicit (lesson 12 reasoning) that simpler is
  better.
- Article IX (minimal deps): one local file beats one external dependency
  unless reuse is real. After Phase 3, the source `useIsMobile` in
  `@debrief/components` is unchanged; this app simply no longer consumes it.

**Provenance comment** (top of the copied file):
```ts
/**
 * Inlined from @debrief/components/hooks/useIsMobile (debrief-future #246).
 * Kept in-repo to avoid a runtime dependency on the debrief monorepo.
 * If divergence is needed, edit freely; if the upstream version improves,
 * pull the change manually.
 */
```

**Audit gate**: FR-003 explicitly requires the coupling-inventory to flag
*every* `@debrief/*` import. The audit's findings determine whether
additional inlining (or vendoring) is needed beyond `useIsMobile`. A pre-
audit scan finds **only** `useIsMobile`; the audit re-confirms.

**Alternatives considered**:
- Wait for `@debrief/hooks` package to publish to npm, depend on it.
  Rejected: timeline coupling, plus the package would need to publish under
  a non-`@debrief` scope to avoid pulling in the monorepo namespace contract.
- Re-implement `useIsMobile` from scratch. Rejected: the upstream
  implementation is correct and tested; copy preserves provenance.
- Carry a copy in the kit's `templates/` and have bootstrap insert it.
  Rejected: this is a Phase 1 (in-repo) edit, not a Phase 2 bootstrap
  concern. Doing it in Phase 1 means the subtree split already carries the
  file.

---

## R-008: Lighthouse-PWA budget in the standalone repo (#244 / ADR-030 commitment)

**Decision**: Carry the existing Lighthouse PWA gate into the standalone
repo as a top-level `lighthouse.yml` workflow. The existing
`apps/backlog-navigator/.lighthouserc.json` is already self-contained and
moves with the subtree split unchanged. The standalone `lighthouse.yml`
runs the same `pnpm dlx @lhci/cli@0.13.0 autorun --config ./.lighthouserc.json`
command against a `vite preview` instance, mirroring the current
`backlog-navigator-lighthouse.yml`.

Because Lighthouse is owned by ADR-030 — *specifically* the Backlog
Navigator's PWA commitment — it travels with the app to its new home. After
Phase 3, the root devDep `@lhci/cli` in debrief-future is removable (no
other workspace consumes it; verified).

**Why include this in the kit**:
- The PWA installable-manifest / service-worker / viewport gates exist
  because the spec set them as quality criteria. Skipping them in the new
  repo would silently regress.
- `.lighthouserc.json` is a single file; no additional kit complexity.

**Alternatives considered**:
- Drop the Lighthouse gate entirely on extraction. Rejected: regression
  risk on the PWA-installable contract.
- Run Lighthouse only nightly. Rejected: PR-time signal catches regressions
  before merge; nightly catches them after.
- Move Lighthouse to a separate optional workflow (`lighthouse.yml`)
  triggered manually. Rejected: PR-time is the right time to enforce a PWA
  budget that's part of the app's identity.

---

## R-009: Destination repo slug — placeholders, not hardcoded (#248 Lesson 3, FR-017)

**Decision**: The kit's scripts (`extract.sh`, `bootstrap-new-repo.sh`)
accept `--destination <org>/<repo>` and `--host <org>.github.io` flags (or
read them from a `kit-config.json` produced by a one-time wizard). Templates
under `kit/templates/` use `{{ORG}}`, `{{REPO}}`, `{{HOST}}` placeholders;
`bootstrap` substitutes from the destination flag.

**Recommended default**: `deepbluecltd/backlog-navigator`
(`https://deepbluecltd.github.io/backlog-navigator/`), per spec User Story 2,
but the kit treats the slug as an operator input, not a hardcoded constant.

**Why this matters** (#248 Lesson 3): #248's kit had `debrief/spec-navigator`
hardcoded across `extract.sh`, `bootstrap-new-repo.sh`, README templates,
CONFIGURATION templates, and SECURITY templates. For a destination of
`deepbluecltd/speckit-navigator`, every line had to be hand-patched. The
fix is mechanical substitution at bootstrap time using a single source of
truth (the `--destination` flag).

**Special handling of the Vite base flip** (#248 Lesson 6): the kit's
`extract.sh` performs the sed replacement for `vite.config.ts`'s `base`
default using the `--destination` repo slug. No manual patch step.

**Special handling of debrief.github.io literals in templates** (#248
Lesson 7): kit templates use `{{HOST}}` everywhere; bootstrap substitutes.
No `debrief.github.io` ever ships as a literal in a kit template.

**Alternatives considered**:
- Hardcode destination, document a "find/replace" recipe. Rejected: that's
  exactly what #248 did and it caused friction at every adopter site.
- Single `--destination` flag, derive everything from it. Adopted (this
  decision).

---

## R-010: `pnpm-lock.yaml` regeneration on extract (#248 Lesson 1, FR-015)

**Decision**: `extract.sh` regenerates `pnpm-lock.yaml` in the post-split
working tree *before* pushing to the destination repo. Mechanism:

1. `git subtree split --prefix=apps/backlog-navigator -b <branch>`
2. `git checkout <branch>` (now in a tree shaped like a standalone repo)
3. `pnpm install --lockfile-only` (creates a fresh lockfile keyed only to
   `apps/backlog-navigator/package.json`)
4. `git add pnpm-lock.yaml && git commit -m 'chore: regenerate lockfile for
   standalone repo'`
5. (Optional smoke: `pnpm install && pnpm test && pnpm build` to verify the
   lockfile produces a working build before pushing)
6. `git push <destination> <branch>:main`

**Why this matters**: the monorepo's lockfile lives at the repo root; the
subtree split sees only files under `apps/backlog-navigator/`, so the
extracted branch carries no lockfile. CI uses `pnpm install --frozen-lockfile`
and dies in <10 seconds when the file is absent. (#248 Lesson 1, observed.)

**Smoke-test step** (recommended): run `pnpm install && pnpm test && pnpm
build` against the extracted tree before pushing. If anything fails, abort
the bootstrap and fix locally — don't push a broken first commit. The kit's
`extract.sh` includes this smoke step with an `--abort-on-smoke-failure`
default.

**Alternatives considered**:
- Carry the monorepo lockfile and let `pnpm install` ignore irrelevant
  workspaces. Rejected: the monorepo lockfile references workspace deps
  (`@debrief/components`) that don't exist in the standalone repo.
- Generate the lockfile after the first CI run. Rejected: the first CI run
  *is* where the failure surfaces. Pre-generate.
- Use `pnpm install` (full) instead of `--lockfile-only`. Acceptable, but
  `--lockfile-only` is faster and matches the intent (we want the lockfile
  committed; the install itself is a smoke step, not the primary action).

---

## R-011: GitHub App authorization + empty target repo (#248 Lessons 9 & 10, FR-020)

**Decision**: The kit's `README.md` prerequisites section opens with two
explicit steps before any script runs:

> **Step 0a — Install the GitHub App on the destination repo.**
> The Claude code GitHub App (or whichever agent is being used) must be
> authorised on the destination repo's parent organisation *and* on the
> destination repo itself. Without this, the first `git push` from the
> agent's environment returns 403 silently. Resolve via the GitHub web UI:
> https://github.com/organizations/<ORG>/settings/installations →
> Configure → Repository access → Add the destination repo.
>
> **Step 0b — Create the destination repo EMPTY.**
> Go to https://github.com/organizations/<ORG>/repositories/new. Set the
> name. **Uncheck** "Add a README", **uncheck** ".gitignore", **uncheck**
> "Choose a license". If any of those are left checked, the first push
> fails (non-empty target) and you need the merge fallback (Step 0c).
>
> **Step 0c — (Fallback) If the target is already non-empty…**
> `bootstrap-new-repo.sh --merge-unrelated-histories` performs the
> `git merge --allow-unrelated-histories` and the `--ours`/`--theirs`
> resolution path for the conflicting README. This produces a noisier
> history (an extra merge commit) but works.

**Why this matters**: both gotchas blocked #248's hand-off — the GitHub App
gap cost ~30 minutes; the non-empty target cost another rework. Calling them
out as **prerequisites**, with screenshots in the README, prevents the same
loss of time.

**`bootstrap-new-repo.sh` enhancements** (vs #248):
- Detects a non-empty target via `git ls-remote <destination> HEAD` and
  offers `--merge-unrelated-histories` rather than aborting.
- Detects 403 on first push and prints the GitHub App authorization
  instructions inline rather than re-printing the raw git error.

**Alternatives considered**:
- Require the operator to run `gh repo create --public --no-readme` as a
  prereq. Rejected: web-UI creation is the more common operator path; meet
  them where they are.
- Auto-install the GitHub App via API. Rejected: requires owner-level
  credentials that the agent doesn't have.

---

## R-012: Kit shape — files, not patch recipes (#248 Lessons 5 & 6)

**Decision**: The kit `templates/` directory ships **drop-in files**, not
markdown patches:

- `templates/.eslintrc.cjs` — standalone ESLint config; no `shared/eslint-
  rules/*` references; rules inlined verbatim from this repo's `apps/backlog-
  navigator` resolution.
- `templates/tsconfig.json` and `templates/tsconfig.node.json` — standalone
  TS configs; no `tsconfig.base.json` inheritance; the relevant compilerOptions
  inlined.
- `templates/README.md`, `templates/CONFIGURATION.md`, `templates/SECURITY.md`
  — placeholder-bearing docs (`{{ORG}}`, `{{REPO}}`, `{{HOST}}`).
- `templates/.gitignore` — standalone; adds `playwright-report/`,
  `test-results/`, `.chromium-path` (the `@sparticuz/chromium` cache path).

The patch-markdown form (#248's `patches/04-eslint.md`,
`patches/05-tsconfig.md`) is **gone**. Each rationale doc lives at
`kit/docs/why-X.md` for the curious adopter; the implementation is the
drop-in file.

**`extract.sh` performs**:
1. Subtree split.
2. Lockfile regen (R-010).
3. Sed-based vite-base flip using `--destination` slug (#248 Lesson 6).
4. Smoke-test build (`pnpm install && pnpm test && pnpm build`).
5. Abort on any failure with an actionable error.

**`bootstrap-new-repo.sh` performs**:
1. Push extracted branch to destination as `main` (or merge-unrelated-
   histories fallback per R-011).
2. Copy `templates/*` into the working tree with `{{ORG}}`, `{{REPO}}`,
   `{{HOST}}` substituted from `--destination` and `--host` flags.
3. Copy `workflows/*.yml` into `.github/workflows/`.
4. Commit + push.

**Alternatives considered**:
- Keep markdown patches; ship files alongside. Rejected: two sources of
  truth invite drift; the file *is* the spec.
- Convert all patches to a single setup script. Rejected: opaque; the file-
  by-file drop-in is reviewable.

---

## R-013: Cutover (Phase 3) — touch-set in debrief-future (FR-018 via #248 FR-018–FR-023, FR-024–FR-026)

**Decision**: Single atomic PR. Touch-set, corrected for backlog-navigator
specifics:

| Path | Action | Notes |
|---|---|---|
| `apps/backlog-navigator/` | delete entirely | |
| `.github/workflows/backlog-navigator-preview.yml` | delete | |
| `.github/workflows/backlog-navigator-publish.yml` | delete | New repo owns publishing |
| `.github/workflows/backlog-navigator-lighthouse.yml` | delete | Lighthouse gate moves to new repo (R-008) |
| `.github/workflows/backlog-navigator-comment.yml` | keep, update URL | Continues to emit `?pr=<n>`; URL host swaps to `https://{{HOST}}/{{REPO}}/`. The legacy form continues to work because the new repo's URL parser accepts both `?pr=` (compat shim) and `?repo=&branch=`. |
| `.github/workflows/ci.yml` | remove 2 backlog-navigator references | lines 143–144 (the `run_step backlog-nav-build` / `run_step backlog-nav-pw` steps) |
| `heroku.yml`, `app.json`, `Dockerfile.preview` | **verify clean, edit only if audit finds refs** | Pre-audit grep finds no backlog-navigator references; the audit (FR-001) confirms. |
| `package.json` (root, `devDependencies`) | remove `@lhci/cli` | Verified: only `backlog-navigator-lighthouse.yml` consumes it. |
| `pnpm-workspace.yaml` | unchanged | The `apps/backlog-navigator/` glob resolves implicitly to nothing once the dir is deleted. |
| `CLAUDE.md` "Before Pushing" Step 4 | remove backlog-navigator Playwright command (and the comment about Lighthouse, if present) | |
| `CLAUDE.md` "Recent Changes" section | append one-line note pointing at the new repo | |
| `docs/project_notes/decisions.md` | add ADR-032 (extraction of backlog-navigator). **Update ADR-030** with a closing note: "Owner moved to standalone repo {{ORG}}/{{REPO}} as of #249. PWA tooling decision unchanged, executes there now." (Unlike ADR-031 for #248 where the original ADR was self-contained, ADR-030 is *about* backlog-navigator and therefore needs the owner-moved annotation.) | |

**Pre-merge verification** (#248 R-006 pattern):
1. Hosted instance is live and serves `?pr=<n>` correctly via the compat
   shim (R-014).
2. A smoke-test PR confirms the updated comment workflow emits the new URL
   form and the link resolves correctly.
3. `live.yml` (if enabled) has been green for ≥7 consecutive nights, **or**
   `ci.yml` has been green for ≥7 days. (#248 FR-018 cutover gate.)

**Rollback path**: `git revert` of the cutover PR restores the deleted dir
and workflows. The hosted instance is independent and can remain live during
a rollback.

**Alternatives considered**:
- Staged cutover (delete src first, swap comment URL later). Rejected:
  creates a window where the in-repo path is gone but reviewer comments
  still point at it.
- Tombstone with HTML meta-refresh redirect. Rejected: pulls forward the
  deletion without doing the work.

---

## R-014: URL contract — accept legacy `?pr=` and new `?repo=&branch=` (carried from #248 R-003, decision 1A)

**Decision**: The hosted SPA accepts both URL contracts, identically to
#248's decision 1A:

| Form | Origin | Example |
|---|---|---|
| Legacy `?pr=<n>` | `backlog-navigator-comment.yml` has emitted this since #242 | `…/backlog-navigator/?pr=512` |
| New `?repo=<org>/<name>&branch=<branch>` | Added for non-debrief consumers | `…/backlog-navigator/?repo=acme/foo&branch=feat/x` |

A compat shim at the top of the URL parser detects `?pr=<n>` (with no
`?repo=`) and resolves it through the existing PR-to-branch flow against
the bundled defaults (`debrief/debrief-future` in the debrief build;
adopter-specific in adopter builds).

The `backlog-navigator-comment.yml` workflow is **not** modified in Phase 3
beyond swapping the URL host — its emitted form (`?pr=<n>`) continues to
work indefinitely. The comment template can be flipped to `?repo=&branch=`
independently, later, with no time pressure.

**Rationale** (echoes #248 1A): permanent backward compatibility is a few
lines of parser code; breaking every comment historically posted by
`backlog-navigator-comment.yml` since #242 is not worth it.

**Validation rules**:
- `repo` MUST match `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`.
- `pr` MUST match `^[0-9]+$`.
- `branch` is taken as-is (URL-decoded).
- Bad values fall back to defaults with a non-blocking warning banner;
  malformed input never crashes the app.

---

## R-015: PAT scopes / `LIVE_GITHUB` / drift detection (deferred — FR-019)

**Decision**: **Deferred**. The initial extraction does not ship `live.yml`.
The kit's `workflows/live.yml` is provided as a commented-out optional
template; adopters who need drift detection can enable it later.

**Rationale**: spec FR-019 is explicit — "patch 03 from #248 is optional".
The in-process route mock (R-006) provides full offline coverage. Live mode
is maintainer tooling for the case where the upstream GitHub API surface
changes — useful, but not on the critical path.

**When to re-introduce**: if any of the following becomes true, file a
follow-up issue in the standalone repo to enable `live.yml`:
- A schema drift is observed in production that the mocked tests missed.
- A third-party adopter reports their use of the SPA breaking due to an
  unmocked API change.
- The team adopts a "live API contract" policy across all extracted SPAs
  (in which case #248's `live.yml` becomes the template for both).

**Adopter guidance**: documented in `templates/CONFIGURATION.md` — "If you
want drift-detection CI, copy `workflows/live.yml` into `.github/workflows/`
and supply a fine-grained read-only PAT as the `GITHUB_TOKEN` Actions
secret. Otherwise, omit."

---

## Summary table

| ID | Topic | Decision (one line) | Source |
|---|---|---|---|
| R-001 | History extraction | `git subtree split --prefix=apps/backlog-navigator` | Carried from #248 |
| R-002 | Phase 1 seam | Existing consts + new `defaults.ts` module + `packageManager` field (FR-010) | Carried + FR-010 fix |
| R-003 | Hosting | `gh-pages` branch + `JamesIves/github-pages-deploy-action@v4`, NOT `actions/deploy-pages` | **Revised** (#248 Lesson 4) |
| R-004 | PR previews | `pr-preview.yml` + `pr-preview-cleanup.yml` from day one | **New** (#248 Lesson 8) |
| R-005 | Bundled dummy dataset | Condensed `BACKLOG.md` + linked spec dirs at `specs-dummy/` | **New** (#248 Lesson 8) |
| R-006 | E2E | In-process Playwright route mock only; drop patch 03 | **Revised** (FR-019, #248 Lesson 12) |
| R-007 | Workspace dep `useIsMobile` | Inline-copy with provenance comment in Phase 1 | **New** (no #248 analogue) |
| R-008 | Lighthouse | Carry `lighthouse.yml` + existing `.lighthouserc.json` to new repo | **New** (ADR-030 commitment) |
| R-009 | Destination slug | `--destination <org>/<repo>` flag + `{{ORG}}`/`{{REPO}}`/`{{HOST}}` placeholders | **Revised** (#248 Lesson 3) |
| R-010 | Lockfile regen | `pnpm install --lockfile-only` in `extract.sh` post-split, pre-push | **Revised** (#248 Lesson 1) |
| R-011 | GitHub App + empty target | Prereq Step 0a/0b/0c with web-UI walkthroughs; `--merge-unrelated-histories` fallback | **Revised** (#248 Lessons 9, 10) |
| R-012 | Kit shape | Drop-in template files, not patch recipes; `extract.sh` automates the vite-base sed | **Revised** (#248 Lessons 5, 6) |
| R-013 | Cutover touch-set | Delete 3 dedicated workflows + ci.yml refs + remove `@lhci/cli` root devDep; update ADR-030 + add ADR-032 | Carried from #248 R-006 |
| R-014 | URL contract | Accept both `?pr=` and `?repo=&branch=` (compat shim) | Carried from #248 1A |
| R-015 | Live drift detection | **Deferred** — `live.yml` shipped as optional template only | **Revised** (FR-019, #248 Lesson 12) |

All NEEDS CLARIFICATION items are resolved. Ready for Phase 1.
