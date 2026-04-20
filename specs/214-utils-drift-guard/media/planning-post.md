---
layout: future-post
title: "Planning: Keeping the bounds-utility consolidation from drifting back"
date: 2026-04-20
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, developer-experience, lint, utils]
excerpt: "A small ESLint rule that reads @debrief/utils and refuses to let apps/* redeclare anything it already exports."
---

## What We're Building

Feature #200 pulled every copy of `calculateBounds` out of `apps/*` and left a single canonical version inside `@debrief/utils`. That was the point-in-time win. The problem is that point-in-time wins decay. The next contributor — porting something off an old branch, or simply unaware the consolidation happened — adds `apps/vscode/src/utils/bounds.ts` back, local tests pass, and the duplication silently reaches `main`.

The guard I'm planning is a small ESLint rule that sits in the existing `pnpm lint` step. It reads `shared/utils/src/index.ts` at lint time, notes every name that `@debrief/utils` exports, and then fails the build if any file under `apps/*/src/**` declares an *original* export with one of those names. Barrel re-exports (`export { calculateBounds } from '@debrief/utils'`) pass. Non-exported internal helpers pass. A fresh redeclaration fails with a message that names the file, names the symbol, and hands the contributor a copy-pasteable `import { calculateBounds } from '@debrief/utils'`.

## How It Fits

The rule follows the precedent set by `shared/eslint-rules/provenance-snake-case.cjs` — a `no-restricted-syntax` module wired into each `apps/*/.eslintrc.cjs`. Zero new dependencies. Zero new CI jobs. It inherits the "Before Pushing" enforcement path (`task verify` → `task lint`) that every other check already uses, which means the guard fails in the same place, in the same way, that contributors already look.

One design choice worth flagging. The forbidden-name set is *derived* from `shared/utils/src/index.ts` at lint time, not hand-maintained inside the rule. When someone adds a new export to `@debrief/utils`, the guard extends to cover it automatically on the next lint run, with no edits to the rule itself. That property is what keeps the rule honest over years — a hand-maintained list would rot within a quarter.

## Key Decisions

- **ESLint rule, not a shell script.** The repo does have a precedent for guard-style shell scripts under `scripts/` — `scripts/check-no-geojson-feature.sh` is the closest analogue. But a grep of `.github/`, `Taskfile.yml`, and `package.json` shows that script is not wired into CI. That precedent is instructive in the opposite direction from what it looks like: standalone scripts in this repo tend to get forgotten. The ESLint path plugs into an integration point that already exists and is already enforced.
- **Derive the forbidden set from source.** Parsing `shared/utils/src/index.ts` with TypeScript's AST (already a devDependency) catches both value exports and type-only exports, and updates itself when `@debrief/utils` grows. A regex would have been brittle across multi-line `export { … }` blocks and `type` modifiers. A runtime `require()` would have missed type exports entirely.
- **AST selectors, not visitor code.** Seven `no-restricted-syntax` selectors — one per declaration shape (function, const, class, type alias, interface, enum, default-named function) — cover every case the spec demands. Re-exports and `export *` are structurally different AST nodes, so they pass without any conditional logic.
- **Red squiggles, not just CI failures.** Because it's an ESLint rule, the VS Code ESLint extension surfaces the error on the line the contributor is typing, before they save. That's a much shorter feedback loop than a CI-only check.

## What We'd Love Feedback On

The guard as scoped covers `apps/* → @debrief/utils`. The same pattern — "derive the forbidden set from the package's own barrel; forbid redeclaration in downstream consumers" — could plausibly generalise to `@debrief/session-state`, `@debrief/schemas`, and `@debrief/components`. Each of those has the same decay risk: a canonical export, and downstream packages that could quietly grow parallel copies.

Is that worth doing as a policy, applied uniformly across the `@debrief/*` surface? Or is it the kind of rule that earns its keep one package at a time, reactively, after a specific drift has been noticed? I'd genuinely like to hear where readers have seen this sort of rule pay off, and where they've seen it ossify into a nuisance.

Out of scope for this feature, either way: `shared/*` enforcing against other `shared/*`, `contrib/*` (which doesn't exist yet), and cross-repository drift.

[See the spec](https://github.com/IanMayo/debrief-future/tree/main/specs/214-utils-drift-guard)
