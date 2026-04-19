---
layout: future-post
title: "Planning: Consolidating bounds utilities"
date: 2026-04-19
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, tech-debt, monorepo, code-health]
excerpt: "Two near-identical copies of calculateBounds have already drifted. Time to collapse them back to one."
---

## What We're Building

There are two copies of `calculateBounds` in the monorepo — one in `shared/utils/src/bounds.ts`, one in `apps/vscode/src/utils/bounds.ts`. They started life as the same function. They are no longer the same function: the VS Code copy carries a defensive null-geometry guard that the shared copy lacks. A bug fix landed in one place and not the other, which is the slow, quiet way that monorepos start to bite you.

Backlog item #200 collapses the two back into one. After this lands, `calculateBounds` and `mergeBounds` exist in exactly one location — `@debrief/utils` — and the VS Code map panel imports from there like every other consumer should. The user-visible impact is, deliberately, nothing. The "zoom to fit" button in the VS Code map will behave exactly as it does today. That is the gating guarantee.

## How It Fits

This is a small entry in the ongoing code-health cadence rather than a feature. It is the kind of work that does not show up in release notes but does show up, eventually, in how quickly new contributors can find the right answer to "where does this live?" Today, searching the monorepo for `calculateBounds` returns two answers. After this, one.

It also lifts a real bug fix into a place where every consumer benefits. The VS Code panel's null-guard was the right defensive code in the wrong location. Once it lives in the canonical utility, every future caller — the web shell, future panels, anything that reaches for `calculateBounds` — gets the same protection without having to remember to copy-paste it.

## Key Decisions

- **Widen the parameter, do not unify the types.** The two copies disagreed on what they accepted: one took `GeoJSONFeature[]`, the other a `SafeFeature`-derived alias. The smaller of two reconciliations is to widen `calculateBounds`'s parameter to a structural-minimum shape that both feature types satisfy. The deeper "two types describing one entity" smell is real, but it is a separate, larger refactor, and we are keeping this PR boring.
- **Lift the null-guard into the canonical utility, write the regression test first.** TDD per Constitution Article VII. The test is written against the shared utility today, fails (proving the gap is real), and passes once the guard is lifted. From then on the guarantee lives at the canonical location, not in one consumer's copy.
- **Import via the package root, not a deep path.** Consumers should depend on `@debrief/utils`'s public surface, never on its internal file layout. One import line in `mapPanel.ts` flips from a relative path to the package name.
- **No new packages, no new dependencies, no schema or API changes.** One file edited in `shared/utils/`, one test file extended, one import line changed in the VS Code extension, two files deleted. That is the whole change.

## What We'd Love Feedback On

Two open questions, both larger than this PR:

- **Other near-duplicates.** Are there other "two near-identical copies" you have spotted in the monorepo we should queue up next? `calculateBounds` is unlikely to be the only one — it is just the one that drifted visibly.
- **Preventing recurrence.** Would a lint rule help — for example, banning `apps/*/src/utils/*.ts` from re-exporting symbols that already live in `shared/utils`? Tooling that makes the wrong thing harder to do is usually cheaper than discipline.

If either of those resonates, the discussion thread linked below is the right place to land it.

→ [Spec and plan on GitHub](https://github.com/debrief/debrief-future/tree/200-bounds-consolidation/specs/200-bounds-consolidation)
