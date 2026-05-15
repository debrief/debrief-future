# Phase 3 Cutover Runbook

**Audience**: Maintainer of `debrief/debrief-future` cutting over to the
standalone backlog-navigator hosted instance after Phase 2 has been live
for ≥7 days.

**This is a separate, follow-up PR** in debrief-future. It does NOT
land in spec 249's PR. The kit ships the runbook; the runbook is
executed when the cutover gate (below) is reached.

---

## Cutover gate

**You may not start Phase 3 until one of the following is satisfied**
(R-013 / carried from #248 FR-018):

- ≥7 consecutive days of green `ci.yml` runs on the standalone repo, OR
- ≥7 consecutive green nightly `live.yml` runs on the standalone repo
  (if `live.yml` is enabled).

Earlier cutovers risk landing while the hosted instance is silently
broken in a way the local-monorepo build wouldn't catch.

---

## Touch-set (the complete edit list)

This is the exhaustive set of files Phase 3 changes. Anything else is
out of scope for this PR — file a separate ticket.

| Path | Action | Rationale |
|---|---|---|
| `apps/backlog-navigator/` | **DELETE the entire directory** | Source of truth moves to the standalone repo |
| `.github/workflows/backlog-navigator-preview.yml` | DELETE | New repo's `pr-preview.yml` replaces |
| `.github/workflows/backlog-navigator-publish.yml` | DELETE | New repo's `deploy.yml` replaces |
| `.github/workflows/backlog-navigator-lighthouse.yml` | DELETE | New repo's `lighthouse.yml` replaces (R-008) |
| `.github/workflows/backlog-navigator-comment.yml` | **KEEP**; swap URL host | Continues to emit `?pr=<n>`; works against the new hosted instance via the R-014 compat shim |
| `.github/workflows/ci.yml` (lines 143–144) | Remove the two `run_step backlog-nav-*` lines | The standalone repo runs its own CI |
| `heroku.yml`, `app.json`, `Dockerfile.preview` | **VERIFY clean** (pre-audit found no refs); edit only if a ref is discovered | Heroku review apps don't bundle the navigator |
| `package.json` (root, `devDependencies`) | Remove `@lhci/cli` | Verified only consumed by the deleted `backlog-navigator-lighthouse.yml` |
| `pnpm-workspace.yaml` | **Unchanged** | The `apps/backlog-navigator/` glob resolves implicitly to nothing |
| `CLAUDE.md` "Before Pushing" Step 4 | Remove the backlog-navigator Playwright command (and any Lighthouse note) | Suite moves to the standalone repo |
| `CLAUDE.md` "Recent Changes" | Append one-line note pointing at the new repo | Trail of breadcrumbs |
| `docs/project_notes/decisions.md` | **Add ADR-032** (extraction of backlog-navigator) | New decision record |
| `docs/project_notes/decisions.md` | **Amend ADR-030** with a closing annotation: "Owner moved to standalone repo `<org>/<repo>` as of #249. PWA tooling decision unchanged, executes there now." | Unlike #248's ADR-031 (which was self-contained), ADR-030 is *about* this app and needs the explicit owner-moved note |

---

## Pre-merge verification (R-013)

Run these checks before merging Phase 3:

1. **Standalone repo is healthy.** The cutover gate (≥7 days green) is met.
2. **Smoke-test the comment workflow.** Open a small test PR; confirm
   `backlog-navigator-comment.yml` posts the sticky comment with the
   new URL host; confirm the link resolves to the hosted instance and
   loads the PR's changes correctly via the legacy `?pr=` compat shim
   (R-014).
3. **Lighthouse on the new repo is green.** Confirm the new repo's
   `lighthouse.yml` is gating PRs against the same `.lighthouserc.json`
   thresholds. If the gate flipped to "advisory only" anywhere, fix
   that before Phase 3.
4. **No undeleted CI references.** `git grep -n backlog-nav .github/`
   in the cutover branch should return only `backlog-navigator-comment.yml`.
5. **Root devDep clean.** `git grep -n lhci package.json` returns nothing
   after the root `@lhci/cli` removal.

---

## Rollback path

A single `git revert` of the Phase 3 PR restores everything: the deleted
directory, the deleted workflows, the root devDep, the doc state. The
hosted instance is independent of debrief-future and stays live during
a rollback. No coordinated rollback is needed across repos.

If the cutover PR has already merged and you discover a regression:

```sh
git revert <cutover-sha>
git push
```

The PR description should call out this rollback path in plain text so
on-call engineers don't need to read the runbook to find it.

---

## ADR pair

Phase 3 lands two decision-record updates:

### ADR-032 — Backlog Navigator extraction (NEW)

Records:
- The three-phase extraction shape (carried from #248).
- The decision to use `gh-pages` branch + `JamesIves/github-pages-deploy-action@v4` from day one (R-003).
- The destination slug (auto-detected from the destination repo's `origin` by `import-from-source.sh`; recommended `deepbluecltd/backlog-navigator`).
- The cutover gate (≥7 days green CI).
- Cross-references to ADR-030, ADR-031 (#248's extraction ADR), and
  the relevant lessons-from-248 entries.

### ADR-030 — Vite-Plugin-PWA + Lighthouse (AMEND)

Append a closing annotation:

> **Owner moved (2026-XX-XX, spec #249)**: This PWA tooling decision now
> executes in `<org>/<repo>` rather than `debrief/debrief-future`. The
> `vite-plugin-pwa` + `@lhci/cli` choice is unchanged; only the executing
> repo moves. `.lighthouserc.json` ships verbatim with the subtree split;
> the `lighthouse.yml` workflow in the standalone repo runs the same
> assertions (`installable-manifest`, `service-worker`, `viewport`,
> `document-title`) on every PR. The root devDep `@lhci/cli` is removed
> from debrief-future in the same PR as this annotation; future PWA
> regressions are caught by the standalone repo's CI, not this one.

Unlike #248's ADR-031 (which was self-contained — the decision was
*about* the extraction itself), ADR-030 is *about backlog-navigator's
PWA*. The owner-moved annotation makes the trail navigable for future
readers searching ADRs in this repo. (Don't flip the status; the
decision itself is unchanged.)

---

## Order of operations (recommended)

1. Branch off main: `git checkout -b cutover-backlog-navigator`.
2. Delete the directory and three workflows (one commit).
3. Update `ci.yml`, `CLAUDE.md`, and the root `package.json` (one commit).
4. Update `backlog-navigator-comment.yml` URL (one commit).
5. Add ADR-032; amend ADR-030 (one commit).
6. Open the PR; run pre-merge verification (above).
7. After merge, watch a real BACKLOG.md PR exercise the new comment URL
   end-to-end. Confirm it works. If it doesn't, revert immediately
   (above) and file a follow-up ticket for fix-forward.

Each commit is reversible on its own; the final PR is a coherent atomic
change.
