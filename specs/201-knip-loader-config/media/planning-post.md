---
layout: future-post
title: "Planning: Knip config for the Electron loader"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, tooling, loader, dev-experience]
excerpt: "Twelve false positives are drowning one real finding. Fixing the scanner before fixing the code."
---

## What We're Building

Running `pnpm dlx knip` — our unused-code scanner — across the monorepo today reports twelve false positives under `apps/loader/src/main/**`. Knip can't infer where an Electron app starts, so from its point of view every main-process module looks like dead code. The signal-to-noise ratio for the loader is effectively zero.

The fix is small: a fifteen-line `knip.json` at the repo root that declares three entry points for `apps/loader` — the main process (`src/main/index.ts`), the preload script (`src/preload/index.ts`), and the renderer (`src/main.tsx`). Those three cover every way an Electron app can legitimately enter its own code.

## How It Fits

This is a hygiene task, not a capability task. Nothing ships to users. No runtime behaviour changes. The value is that the next time someone runs the scanner — looking for genuinely stale code before a cleanup pass — they see findings they can act on, instead of scrolling past a wall of known-good modules.

The config lives at the repo root next to `pnpm-workspace.yaml` so contributors find it where they'd expect monorepo tooling to live. Knip stays invoked via `pnpm dlx`; we're not pinning it as a dev dependency. Every dependency is a liability and an ad-hoc diagnostic tool doesn't earn a slot in the lockfile.

## Key Decisions

- **One top-level config, not per-workspace.** Discoverability beats locality for a tool that runs across the whole monorepo.
- **All three Electron entry categories in one pass.** Main, preload, renderer. Future contributors shouldn't hit a fresh cloud of false positives the moment they touch the loader.
- **Don't silence the real finding.** While auditing, we found `apps/loader/src/main/updater.ts` is a genuine orphan — nothing imports it. It stays flagged. Deleting it or wiring up auto-update is a separate (tiny) decision for another PR. Adding `updater.ts` to an ignore list would have made the scanner output clean and the codebase quietly dishonest. That's the trade the feature refuses to make.
- **Schema-enforced scope.** The `knip.json` contract under `specs/201-knip-loader-config/contracts/` rejects `ignore` patterns and extra workspace keys. If someone tries to quiet a future finding by expanding this file, validation fails before review does.
- **Evidence captured.** A before/after knip transcript goes in `evidence/` so the next maintainer can audit the whitelist's premise in under five minutes — not trust it on faith.

## What We'd Love Feedback On

- Is there a fourth Electron entry we're missing? Test files and build scripts resolve through other tooling, but if your Electron app has a category these three don't cover, say so.
- Should `updater.ts` be deleted or wired up? It's been sitting unreferenced; the call here affects whether the follow-up PR is a delete or a feature.
- Anyone running knip in a similar monorepo shape who's hit a pitfall this config will walk into?
