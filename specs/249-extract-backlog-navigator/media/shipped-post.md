---
layout: post
title: "Building Backlog Navigator's standalone home (and what we learned the second time)"
date: 2026-05-12
categories: [features, infrastructure]
feature: 249-extract-backlog-navigator
tags: [backlog-navigator, extraction-kit, infrastructure, pwa]
excerpt: "Second SPA out of the monorepo. Same UI byte-for-byte; the kit knows twelve more things than it did last time."
---

## Hook

| Day-one of #248 spec-navigator extraction | Day-one of #249 backlog-navigator extraction |
|---|---|
| First push: every CI job failed in under ten seconds — monorepo lockfile didn't travel with the subtree split | The kit regenerates `pnpm-lock.yaml` inside the extracted tree before the first commit |
| `pnpm/action-setup@v3` refused to run — no `packageManager` field in the extracted `package.json` | `packageManager` field baked into the seam during Phase 1 |
| Per-PR previews bolted on a week later as a follow-up patch | `pr-preview.yml` and `pr-preview-cleanup.yml` ship from the first push, with a bundled dummy `BACKLOG.md` so the default URL renders |
| Kit hardcoded to `debrief/spec-navigator` — every adopter grep-replaced their way to a working repo | Kit scripts accept `--destination <org>/<repo>`; templates use `{{ORG}}`, `{{REPO}}`, `{{HOST}}` placeholders |
| Thirty minutes lost on day one to an undocumented GitHub App authorization gap | Operator runbook calls out the gap (and the "create the empty target repo first" gotcha) explicitly |
| Patch 03 — bundled fixtures + recorder tooling — added 90% maintainer overhead for zero test-quality dividend | Dropped. E2E sticks to in-process Playwright route mocks via the existing `mock-github.ts` pattern |

## What We're Building

This is the second SPA extracted out of the debrief-future monorepo into its own GitHub repository. The app — `backlog-navigator`, the mobile-friendly PWA that reads our `BACKLOG.md` and lets anyone with a phone triage the queue from anywhere — moves to `deepbluecltd/backlog-navigator` (slug parameterised at extraction time), with its own CI, its own GitHub Pages deployment, and its own per-PR preview infrastructure. The migration preserves the UI byte-for-byte; the storytelling surface is everywhere else.

The more interesting half is what the extraction *kit* learned between the two attempts. Spec-navigator's extraction in #248 went out the door, but its hand-off left twelve concrete failure modes in a lessons log. Each one — from the absent `packageManager` field, to the hardcoded org name, to the GitHub Pages source confusion, to the unhelpful fixture-recorder detour — has been folded back into the kit's defaults, scripts, and runbook. The headline isn't "another SPA in another repo". It's "the kit knows twelve more things than it did last time".

## How It Fits

Per-PR preview deployments are how external contributors get to *try* a change before reviewing it — the practical face of Article XII's community-feedback ambition. Inline-copying the one shared workspace dependency (`useIsMobile`) into the app before the split — rather than reaching back into `@debrief/components` from a separate repo — keeps Article IX (minimal dependencies, no cross-repo couplings) honest. And the Lighthouse-PWA performance budget that ADR-030 committed us to travels with the app to its new home as `lighthouse.yml`, so the mobile-first promise the navigator was built around doesn't get quietly dropped on the way out of the monorepo.

## Key Decisions

- **GitHub Pages from the `gh-pages` branch, not `actions/deploy-pages`.** The artifact-based action serves exactly one bundle per repo, which makes per-PR previews impossible. `JamesIves/github-pages-deploy-action@v4` writes each PR's build to its own subpath on the branch.
- **Inline-copy `useIsMobile` rather than publish it.** Backlog-navigator's only workspace import. Publishing a one-hook npm package for a single consumer would have been ceremony for its own sake; the inline copy carries a provenance comment back to the monorepo source.
- **Drop patch 03 (bundled fixtures + recorder).** The #248 experiment proved Playwright route mocks via `mock-github.ts` cover the same ground with a tenth of the maintenance.
- **`packageManager` field in `package.json`.** A two-line fix for a CI failure that ate hours of #248's hand-off window.
- **`--destination <org>/<repo>` flag with `{{ORG}}`/`{{REPO}}`/`{{HOST}}` placeholders.** The kit is now genuinely reusable — any project with a `BACKLOG.md` and speckit can adopt it without grepping for "debrief".
- **Bundle a dummy `BACKLOG.md` so the default URL renders.** The hosted SPA previously showed an empty state until you appended `?repo=…&branch=…`. The legacy `?pr=<n>` form (still emitted by `backlog-navigator-comment.yml`) keeps working unchanged.

## Shape, not screenshots

There are no screenshots in this post. The UI is unchanged byte-for-byte — the same virtualised card list, the same bottom-sheet editors, the same sticky push bar that shipped in #244. What moved is everything *around* the app. The interesting surface is the repo layout, the runbook, and the trail of lessons folded back into the kit.

```
apps/backlog-navigator/              →  deepbluecltd/backlog-navigator/
├── src/                                 ├── src/                  (unchanged)
├── public/                              ├── public/               (+ dummy BACKLOG.md)
├── package.json                         ├── package.json          (+ packageManager)
├── vite.config.ts                       ├── vite.config.ts        (base = '/{{REPO}}/')
└── (workspace dep: @debrief/components) ├── src/hooks/useIsMobile.ts   (inlined)
                                         ├── pnpm-lock.yaml        (regenerated in split)
                                         ├── .github/workflows/
                                         │   ├── ci.yml
                                         │   ├── lighthouse.yml
                                         │   ├── deploy.yml
                                         │   ├── pr-preview.yml
                                         │   ├── pr-preview-cleanup.yml
                                         │   └── live.yml.template
                                         └── ops/
                                             ├── README.md
                                             ├── CONFIGURATION.md
                                             ├── SECURITY.md
                                             └── import-from-source.sh
```

That right-hand column is what the kit produces. Every file in the kit's drop-in template directory is a fix-by-construction for something #248 found out the hard way.

## By the Numbers

| | |
|---|---|
| Production literals relocated from `src/` and `vite.config.ts` | 9 |
| Workspace deps severed (`useIsMobile` inlined, R-007) | 1 |
| Vitest tests passing unchanged after the rewire | 139 |
| Workflows shipped in the kit | 6 |
| Drop-in template files (replacing #248's markdown patches) | 7 |
| Bundled dummy `BACKLOG.md` content (items + epics + strikethrough row) | 8 + 3 + 1 |
| Files staged in a single `import-from-source.sh --dry-run` | 13 |
| Unsubstituted `{{ORG}}` / `{{REPO}}` / `{{HOST}}` placeholders after substitution | 0 |
| Enumerated lessons from #248's hand-off, each mapped to an FR / R-NNN | 12 |
| Commits processed by `git subtree split` in the dry-run | 275 |

The audit (§1 and §1b of `plan.md`) drove the relocation count. Nine literals — `gh-pages` branch refs, `/backlog-navigator/` base paths, the Vite `base` option, the manifest scope, two hardcoded `debrief/` strings inside scripts, and three doc-only mentions — became `{{ORG}}` / `{{REPO}}` / `{{HOST}}` placeholders before the seam was cut. After `import-from-source.sh` substitutes, the dry-run sweeps the staged tree for stragglers and exits non-zero if anything remains. Zero, every time.

## Lessons Learned

Twelve lessons came out of the #248 hand-off. The four below carried the most weight on day one of this extraction — both because they fail fast and because the fix is small enough to land in the kit rather than the runbook.

**Lockfile didn't travel with the subtree split (Lesson 1).** The first push of #248 died in under ten seconds: every CI job failed `pnpm install` because `pnpm-lock.yaml` was the monorepo's, not the extracted app's. The split tree had no lockfile of its own, and `pnpm` won't synthesise one inside CI on a frozen-lockfile install. Fix: the kit's `import-from-source.sh` runs `pnpm install --lockfile-only` against the split tree before the first commit, and CI asserts the lockfile is present and current. The extracted repo is push-ready, not "almost push-ready".

**`packageManager` field was missing (Lesson 2).** Compounding the above: even with a lockfile, `pnpm/action-setup@v3` refused to run because the extracted `package.json` had no `packageManager` field — that field lives in the monorepo root, not in `apps/backlog-navigator/package.json`. The kit now bakes `"packageManager": "pnpm@9.x.x"` into the seam during Phase 1, so the field exists before the subtree split, not after. Two lines of JSON; hours saved.

**`gh-pages` branch vs `actions/deploy-pages` (Lesson 4).** Set this from day one or per-PR previews are impossible. `actions/deploy-pages` is artifact-based and serves exactly one bundle per repo — there's nowhere for a PR's preview build to live alongside the main deployment. `JamesIves/github-pages-deploy-action@v4` writes to the `gh-pages` branch, and each PR's preview lands at its own subpath (`/pr-preview/pr-<n>/`). The operator runbook calls out the GitHub Pages source setting explicitly — set source to "Deploy from a branch" before the first deploy, or the action will fail with a misleading 404.

**Drop patch 03 (Lesson 12).** Patch 03 in the #248 extraction was a fixtures-and-recorder rig: capture real GitHub API responses to a JSON file, replay them under Playwright. In theory: deterministic, real-world-shaped. In practice: every schema drift required re-recording, every new test required curating fixtures, and the rig added roughly ninety percent maintainer overhead for zero test-quality dividend over the existing in-process route-mock approach. The kit drops it. E2E sticks to `mock-github.ts` and Playwright's `page.route()` — the same pattern that's caught every UI regression in this app to date.

The remaining eight lessons (config-file precedence, manifest scope vs base, the GitHub App authorization gap, the empty-target-repo gotcha, the `?repo=…&branch=…` URL ergonomics, the strict-CSP service-worker incantation, the Lighthouse-CI assertion-set hand-off, and the `gh-pages` first-deploy race) live in `extraction-kit/LESSONS.md` with each one cross-referenced to the FR or R-NNN that codifies the fix.

## What's Next

Phase 3 — the cutover PR that deletes `apps/backlog-navigator/` from the monorepo and switches the `?pr=<n>` comment template to the new host — is gated by at least seven consecutive days of green CI on `deepbluecltd/backlog-navigator`. That window catches the slow-burn failure modes: a Lighthouse regression on a real PR, a service-worker update path that goes wrong on a returning visitor, a per-PR preview cleanup that doesn't clean up. Until that window closes green, `apps/backlog-navigator/` stays in the monorepo and the extracted repo runs as a parallel deploy.

After that, the kit itself becomes the durable artefact. Two extractions in, three of the workflows (`ci`, `lighthouse`, `pr-preview`) are now identical between spec-navigator and backlog-navigator — the differences are entirely in placeholder substitution. Any speckit-based project with a `BACKLOG.md` can open a Claude Code session in their (empty) destination repo and run `import-from-source.sh` to get the same shape: own repo, own CI, own per-PR previews, Lighthouse budget enforced, runbook in `ops/`. Auto-detection of the destination from `origin` is what makes the kit reusable past the second time — and the second time was where the kit had to earn that. (The kit's design also flipped mid-PR from a local-operator push-from-source model to a destination-session pull-from-source model — see `why-pull-not-push.md` for the operator-experience rationale.)

→ [Spec](https://github.com/debrief/debrief-future/tree/main/specs/249-extract-backlog-navigator)
→ [Extraction kit](https://github.com/debrief/debrief-future/tree/main/specs/249-extract-backlog-navigator/extraction-kit)
→ [Target repo (when cutover lands)](https://github.com/deepbluecltd/backlog-navigator)
