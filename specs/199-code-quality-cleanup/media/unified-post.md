---
title: "Building Small-Bucket Code-Quality Cleanup"
date: 2026-04-18
layout: future-post
author: Ian
track: momentum
excerpt: "Five small cleanups bundled into one PR: false-positive silencing, type consolidation, a regression test, and TODO promotion."
tags:
  - backlog-199
  - code-quality
---

## What We're Building

A recent code-quality review (PR #465) surfaced roughly a dozen follow-ups. The heavier ones — each worth its own spec and review cycle — are already tracked as #200–#206, E11, and E12. What's left is a pile of small stuff: one-line fixes, a doc entry, a config tweak, a tidy-up of some prop types. Individually, each is too small to justify a spec and a PR. Collectively, they're the sort of thing that gets forgotten or, worse, gets opened as seven separate micro-PRs and exhausts everyone's review budget.

Backlog item #199 bundles five of those follow-ups into a single PR. They all share the same profile — pure TypeScript, docs, or config; no schema work; no cross-package API changes — and none of them depends on any of the heavier follow-ups landing first.

The five items:

1. **Record two surviving `import type` cycles in the VS Code extension** as an ADR entry in `docs/project_notes/decisions.md`. The cycles (`mapPanel → activityPanelView → calcService → mapPanel` and `activityPanelView ↔ resultsPanelService`) are type-only and erased at runtime. They're deliberate for now — the real fix is interface extraction, which is a much bigger job. The ADR stops a future refactor wasting a day "fixing" something already considered and accepted.
2. **Merge `LogTimelineProps` and `LogByFeatureProps` onto `LogPanelProps`** in `shared/components/src/LogPanel/types.ts`. Three interfaces, effectively the same shape, slowly drifting. Collapsing to one prevents reviewer footguns.
3. **Delete `shared/components/diff/`** — an orphaned sub-package added as a staging artefact in April and never wired into `pnpm-workspace.yaml`. Zero consumers, restorable from git. It's currently a trap for contributors who find it, assume it's load-bearing, and waste time reading it.
4. **Add a minimal `knip.json` at the repo root** with `"ignore": ["specs/**"]`. We run knip via `pnpm dlx` during review; it currently drowns its own report with speckit contract files that will never be imported by production code. Silencing those false positives restores signal to a channel reviewers actually read.
5. **Fix a placeholder `plotName` in `apps/loader/src/renderer/hooks/useLoadWorkflow.ts`** (line 73 — it's assigning the plot's ID where the display name should go), and promote two surviving `TODO` comments in `apps/loader/src/main/ipc/config.ts` and `apps/loader/src/renderer/components/StoreSelector/index.tsx` into tracked GitHub issues, replacing each in-source comment with `TODO(#NNN): <summary>`. A third TODO in `stacService.ts` is already properly tracked — we'll audit it and move on.

## How It Fits

This is debt-repayment cadence, not feature work. The theory of the operation is simple: any substantial code-quality review *should* produce a long tail of small follow-ups, because that's what "thorough" looks like. The risk isn't the findings, it's what you do with them. If the small stuff gets its own PR each, the backlog bloats and reviewer time drains on trivia. If it gets bundled carelessly, the PR becomes a grab-bag that's hard to review and easy to reject.

#199 is the middle path. One PR, five items, a single scope banner that says "these are cleanups from PR #465, here's the list, each one has a one-sentence justification". Reviewers can read it in one sitting. Any item that turns out to be contentious can be lifted into its own ticket without blocking the others.

## Key Decisions

- **`LogPanelProps` stays canonical.** The two child interfaces are absorbed into it with new optional fields rather than the other way round — imports outside `shared/components/` don't need to change.
- **`knip.json` stays minimal.** The only rule is `"ignore": ["specs/**"]`. Anything broader would risk hiding real findings, which is the opposite of the point. We'll revisit if knip grows more false-positive categories.
- **`plotName` is threaded, not re-fetched.** The plot list is already loaded by `usePlots.ts` elsewhere in the loader. `executeLoad` gains a new parameter rather than opening a second IPC call from inside the hook.
- **TODO promotion keeps the breadcrumb.** The in-source comment doesn't disappear — it becomes `TODO(#NNN): <summary>`. You can still grep `TODO` and find it, but now each one also exists on the backlog where it can be prioritised.
- **ADR scope is whatever remains at merge time.** We verified the cycles on 2026-04-18, but if the intervening work on #100/#101 unwinds one of them, the ADR will record only the cycles that actually still exist.

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
