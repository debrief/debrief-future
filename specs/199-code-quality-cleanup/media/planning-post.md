---
layout: future-post
title: "Planning: Small-Bucket Code-Quality Cleanup"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, code-quality, tech-debt, backlog-199]
excerpt: "Bundling five small code-quality follow-ups from a recent review into a single PR — the kind of housekeeping that stops backlogs drowning in micro-tickets."
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

## What We'd Love Feedback On

The meta-question is whether this bundling pattern is a good habit. We think it is — the alternative is either a growing backlog of one-line tickets nobody prioritises, or seven micro-PRs that burn review time for no gain. But it does mean the PR's diff stat will be non-trivially wider than any single item warrants, and reviewers have to trust the scope statement.

If you've seen this go well (or badly) on other projects — particularly the heuristic for what qualifies as "small-bucket" and what should have been its own PR — we'd like to hear it. The checklist we're working with is: pure in one language, no schema touch, no public API change, no cross-package coupling, and independent of every other follow-up. It felt right. We'd like to know if it breaks somewhere.

→ [Spec](../spec.md)
→ [Research notes](../research.md)
