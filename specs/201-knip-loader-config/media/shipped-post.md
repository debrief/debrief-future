---
layout: future-post
title: "Shipped: Knip config for the Electron loader — a CI gate"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, tooling, loader, dev-experience, ci]
excerpt: "We shipped both refusals: the orphan is gone, the dependency is pinned, and the scanner is now a CI gate."
---

## What We Built

Three weeks ago we planned to set up an unused-code scanner for the Electron loader with a promise: twelve findings would become zero, and stay zero. We shipped exactly that.

The baseline was straightforward. Running `knip` across `apps/loader/src/main/` reported twelve findings. Eleven were false positives — knip can't infer where an Electron app starts, so every module in the main process looked unreachable. The twelfth, `updater.ts`, was real: a commented-out `electron-updater` import with zero call sites.

We could have quieted the scanner two ways. Both were shortcuts; both were wrong.

**Shortcut one:** add `ignore: [updater.ts]` to the config. Zero source changes, clean output, a codebase quietly hiding a true finding. Refused — a scanner that silences real findings is worse than no scanner.

**Shortcut two:** run knip ad-hoc via `pnpm dlx` instead of pinning it. One line lighter in `package.json`. Refused — the moment CI depends on a tool's output, its version has to be locked. A silent upgrade shouldn't turn a green build red.

Instead we shipped:

1. A fifteen-line `knip.json` at the repo root declaring three entry points for the loader: main (`src/main/index.ts`), preload (`src/preload/index.ts`), renderer (`src/main.tsx`). The eleven false positives are now gone.
2. Deletion of `updater.ts`. Auto-update is a real feature that belongs in its own spec (it needs code signing, an update server, proper testing). Until then, the module is weight.
3. A `task knip` target in the `Taskfile.yml` and a "Run knip" step in `.github/workflows/ci.yml` directly after lint. Knip is now a gate, not a diagnostic.
4. Knip pinned as a dev dependency at `^5` (resolved to 5.88.1 in the lockfile). No more `pnpm dlx`.
5. A JSON Schema under `specs/201-knip-loader-config/contracts/` that rejects `ignore` keys and extra workspace stanzas on `knip.json`. If someone tries to quiet a future finding by expanding the file, validation fails before review does.

## By the Numbers

| Metric | Result |
|--------|--------|
| Findings under `apps/loader/src/main/` | 12 → 0 |
| CI gate added | Yes |
| Genuine orphans deleted | 1 |
| Config file size | 15 lines |
| Pinned knip version | 5.88.1 |
| Pre-existing findings elsewhere | Visible, non-blocking |

## How It Fits

This is infrastructure and hygiene, not a capability. Nothing changes for users of Debrief. The audience is contributors — present and future — who run the scanner and want to trust its output.

The config sits at the repo root next to `pnpm-workspace.yaml`, the natural place for monorepo-wide tooling. Knip moves from ad-hoc to reproducible. That matters because once CI depends on a tool, its version has to be locked (Article I.4 and Article IX.2 of the constitution call this out).

## Lessons Learned

**Workspace-scoped, not full-tree.** The task targets `apps/loader` specifically. Full-tree knip is blocked by a pre-existing jiti-loader issue in `apps/spec-navigator/playwright.config.ts` — we documented that boundary clearly. Coverage for other workspaces is a future feature, not a reason to do partial work.

**Schema enforcement works.** The contract that rejects `ignore` entries actually prevented a shortcut during implementation. That's the signal that schema-enforced scope is worth the effort — it stops honest mistakes before review does.

**Evidence is in the PR.** Before/after knip transcripts and the first CI run log are in the `evidence/` directory. The next maintainer can audit the premise in under five minutes.

## What's Next

Backlog item #199 (code-quality cleanup) will extend the same `knip.json` next, adding `ignore: ["specs/**"]` to the config. We left a coordination note in the PR description so whoever picks it up knows the schema in `contracts/` needs updating alongside the config change.

→ [See the PR](https://github.com/debrief/debrief/pull/202)
→ [See the contract](https://github.com/debrief/debrief/blob/main/specs/201-knip-loader-config/contracts/knip-schema.json)
