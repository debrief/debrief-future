<!--
Cached opener for the feature post. Written during `/speckit.plan`, read
by `/speckit.pr` to assemble the top of `media/shipped-post.md`.
-->

## Hook

| Day-one of #248 spec-navigator extraction | Day-one of #249 backlog-navigator extraction |
|---|---|
| First push: every CI job failed in under ten seconds — monorepo lockfile didn't travel with the subtree split | `extract.sh` regenerates `pnpm-lock.yaml` inside the split tree before pushing |
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
