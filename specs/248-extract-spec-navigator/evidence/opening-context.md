## Hook

| Before | After |
|---|---|
| spec-navigator lives at `apps/spec-navigator/` inside debrief-future | Lives in its own repo, `debrief/spec-navigator`, with its own CI and release cadence |
| Hardcoded `debrief` / `debrief-future` literals scattered across seven files in `src/` | One `Configuration` object, validated by Zod, populates everything from a single load step |
| One Playwright suite per push, hosted by debrief-future's review-app pipeline | One static bundle on GitHub Pages; consumers select a target repo via `?repo=org/name&branch=...` |
| Only debrief org members could produce a green build (live GitHub fixtures) | Any contributor can `clone && pnpm test` to green — bundled fixtures by default, opt-in `LIVE_GITHUB=1` mode in CI |
| spec-navigator changes were one of four things blocking debrief-future's "Before Pushing" check | debrief-future's check shrinks by one Playwright suite; one fewer thing to keep green |

## What We're Building

spec-navigator is a small static SPA that renders a repository's `specs/NNN-name/` directory — the artefacts produced by speckit, the spec-driven workflow we use to plan features. We're lifting it out of debrief-future and giving it its own repository, its own CI, and a single GitHub Pages deployment that any speckit-using project can point at their own repo via URL parameters. Nothing about the user-facing experience changes for anyone reading debrief-future specs; the app keeps its history, its blame, and its tests, and gains the ability to render any consumer's specs without a re-skin.

The work splits into three phases. Phase 1 (this PR) introduces a configuration seam in the existing codebase: every hardcoded `debrief-future` literal becomes a read from a single validated `Configuration` object whose default reproduces today's behaviour exactly. Phase 2 performs a history-preserving `git subtree split` into the new repo and stands up CI and hosting. Phase 3 deletes `apps/spec-navigator/` from debrief-future and points the per-PR review-app comment at the hosted instance.

## How It Fits

Debrief is built around thick services and thin frontends, with the rule that anything reusable should be reusable. spec-navigator is the most obvious candidate: it has zero `@debrief/*` workspace imports, zero domain knowledge, and a UI that any speckit-conformant project would benefit from. Keeping it in the monorepo was a convenience during its first months; keeping it there now would be a tax on every other team that follows our spec workflow and would also like a viewer.

There's a second, more selfish reason to split it out. The work captured in this very post — the spec, plan, research, and tasks you're reading via spec-navigator — was authored using the same speckit workflow that produced spec-navigator itself. A standalone navigator means the next project to adopt speckit gets the viewer for free, and feedback from those projects flows back without forcing them to fork debrief-future or run our review-app pipeline.

## Key Decisions

**One deployment, many consumers, configured by URL.** The hosted instance lives at `https://debrief.github.io/spec-navigator/` and reads its target repo from query-string parameters (`?repo=org/name&branch=...`). Resolution order is build-env → query-string → bundled debrief default, all flowing through a Zod schema. Adopters who want a fully branded fork can override at build time; adopters who just want to point at their own repo append two query parameters and they're done. We rejected a runtime config-switcher UI (out of scope) and a fetched `config.json` (extra round-trip on every load, extra deployment artefact).

**Consumers declare a `specFormatVersion` they expect.** A consumer drops `.speckit/spec-format-version.json` (`{ "version": "1.0.0" }`) at their repo root; the navigator bakes a supported SemVer range into its bundle and refuses to render — with a clear, branded error showing both versions — when they don't overlap. Absent file defaults to `"1.0.0"`, so debrief-future inherits compatibility with no upfront commit. This is the contract that lets the navigator and its consumers evolve independently without one repo's silent breakage taking down the other's preview pipeline.

**Bundled fixtures by default, live GitHub by opt-in.** Playwright tests run against HTTP fixtures recorded with the framework's own `page.route` helper — no MSW, no Polly, no extra runtime dep. Any contributor produces a green build with no credentials; the new repo's CI runs a separate `live.yml` job nightly and on merges to main against a fine-grained, public-read PAT to catch real GitHub-API drift. This is the FR-013 commitment: external contributors cannot be gated on a debrief-issued secret to test their own change.

**History preserved via `git subtree split`.** A fresh clone of debrief-future, `git subtree split --prefix=apps/spec-navigator`, push as the new repo's `main`. Commit dates, authors, and per-file blame all survive — which matters because the spec under `specs/191-spec-navigator/` references those commits, and so do the PR threads where the trickier UI decisions were argued out. We considered `filter-repo` (equivalent end-state, extra Python tool, destructive on a clone) and a fresh `git init` (rejected — discards everything that makes the history useful). The audit observed a near-linear history for this app, so cross-cutting commits should be near-zero in practice.

**Atomic cutover, not a staged dance.** Phase 3 is a single PR in debrief-future that deletes `apps/spec-navigator/`, updates docs, swaps the review-app comment template, and lands the extraction ADR. A pre-merge smoke test confirms the hosted instance is healthy, and a one-click revert restores the in-repo build if anything goes wrong. A staged cutover would produce a window where `CLAUDE.md` references a deleted path; we'd rather take the hit of a single conflicted rebase against in-flight PRs than ship a half-extracted repo state.
