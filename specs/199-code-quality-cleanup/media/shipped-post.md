---
layout: future-post
title: "Shipped: Small-Bucket Code-Quality Cleanup"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, code-quality, tech-debt, backlog-199]
excerpt: "Five small cleanups bundled into one PR: false-positive silencing, type consolidation, a regression test, and TODO promotion."
---

## What We Built

Five cleanups shipped in a single PR from a code-quality review pass (PR #465):

1. **Knip false-positive silencing** — added `knip.json` to the root with `"ignore": ["specs/**"]`, which silenced 57 specs-related entries that knip was reporting as "unused" (they're speckit contracts, not production code). Pinned `knip` to `5.88.1` as a root devDependency to close a reproducibility gap — `pnpm dlx knip@latest` was drifting between contributors depending on what was latest that morning.

2. **LogPanel prop consolidation** — merged `LogTimelineProps` and `LogByFeatureProps` into a single `LogPanelProps` interface. Three interfaces were effectively the same shape, slowly drifting. One canonical interface stops future reviewers second-guessing which one to use.

3. **ADR-019** — documented two `import type`-only cycles in the VS Code extension (`mapPanel ↔ activityPanelView ↔ calcService` and `activityPanelView ↔ resultsPanelService`). Both are erased at runtime. The cycles are deliberate for now — the eventual fix is interface extraction, which is a bigger job. The ADR ensures a future refactor doesn't waste a day "fixing" something already considered and accepted. ADR count grew from 18 to 19.

4. **Loader `plotName` fix** — replaced a `// TODO: Get actual name from plot list` placeholder in `useLoadWorkflow.ts` with a proper lookup that threads the plot's display name from the plot list instead of using its ID. The one-line fix is backed by a new vitest (`apps/loader/tests/unit/useLoadWorkflow.test.ts`) that fails if anyone reintroduces the placeholder. A revert-and-red sanity check proved the test was a real gate, not a tautology.

5. **TODO promotion** — filed two new GitHub issues (#472 "Manage Stores" tab, #473 "Create new store" button) and replaced bare `// TODO:` markers in the loader with `TODO(#472):` and `TODO(#473):` references. A pre-push grep guard (`grep "TODO(#NNN)"`) prevents shipping literal placeholders when someone forgets a step.

Bonus: removed `shared/components/diff/`, an orphaned staging artefact from April with zero consumers.

## By the Numbers

| | |
|---|---|
| False positives silenced | 57 (under `specs/**`) |
| Tests passing | 3930 |
| LogPanel tests still green | 1564 |
| Type consolidation: prop count change | 6 files, 45 insertions, 79 deletions |
| ADR count | 18 → 19 |
| GitHub issues filed for TODO promotion | 2 (#472, #473) |

## Key Lessons

**Knip drift trap → pinning + baseline methodology.** Running `pnpm dlx <tool>@latest` looks reproducible until two contributors get different tool versions and see conflicting reports. Pinning the version to root `devDependencies` and capturing a baseline diff is the antidote. Now `pnpm install` on a clean clone resolves to the same binary every time.

**Silent-failure pattern → pre-push grep guards.** When the workflow says "replace `TODO:` with `TODO(#NNN):`", a pre-push grep is what stops a literal placeholder shipping when someone forgets the final step. Guards beat process. A shell script running at pre-push time catches things that a checklist misses.

**Test-first for the one runtime change.** Even small bug fixes that touch user-visible behaviour earn a regression test. The revert-and-red sanity check — temporarily re-apply the placeholder, watch the test go red, then restore the fix and watch it go green — proved this test was a real gate, not a tautology. It's a gate we can trust.

## What's Next

Interface extraction for the two VS Code type-only cycles is named in ADR-019 as the eventual fix. Not in scope here — but the ADR ensures a future contributor doesn't burn a day re-deriving why the cycles are accepted, and the remediation path is documented so whoever picks it up doesn't have to start from scratch.

→ [Spec](../spec.md)
→ [See the code](https://github.com/debrief/debrief-future/pull/XXX)
