---
layout: future-post
title: "Shipped: Replay and Parameter Tuning"
date: 2026-02-11
track: [credibility]
author: Ian
reading_time: 7
tags: [tracer-bullet, prov-logging, replay]
excerpt: "Edit a parameter, replay everything after it. Soft-delete a step, cascade recalculation. Full timeline control without losing work."
---

## What We Built

Parameter tuning is now live. You've run a chain of tools — import tracks, calculate range at 30-second intervals, compute bearing. Halfway through reviewing results, you realise the interval should have been 60 seconds. Until now: manually re-run every subsequent step, hoping you remember the parameters. Now: click the range calculation entry, edit the interval, hit enter. The system re-executes that operation with the new value, then automatically replays bearing and every step after it. The plot updates in place.

We also shipped two revert operations. "Revert to here" is a permanent timeline truncation — select an entry, discard everything after it, restore the plot to that exact point. For surgical corrections, "Revert this" soft-deletes a single operation and replays the rest. If a later step depended on the one you removed, the system halts and tells you. The deleted entry stays visible in the Log Panel (greyed out), recoverable with a single click.

The architecture keeps replay testable and framework-agnostic. The Replay Engine is a pure function in the session-state package. It takes a timeline, a target entry, parameter overrides, and two callbacks: a tool executor (we inject the real calc service) and a snapshot loader (for cross-snapshot tuning). Tests provide mocks. No VS Code, no browser coupling.

## How It Works

The replay flow is straightforward on the surface, complex underneath. When you edit a parameter:

1. The system validates the new value against type constraints (numeric ranges, enum options, duration format). If invalid, you see the error immediately — no wasted computation.

2. The engine builds a replay plan: the tuned entry with the new parameter, followed by every subsequent entry in the timeline. It snapshots the current plot state (deep clone) in case you cancel mid-replay.

3. It re-executes each operation in order using the exact tool name, version, and parameters from the original Log entry (except the tuned entry, which uses your new value). If the tool version has changed since the original run, replay halts immediately. We check exact version matches because silent re-runs with a different version could produce subtly different results. Reproducibility is non-negotiable.

4. Each tool execution updates the in-memory Zustand store, just like a normal run. The Log Panel's progress indicator shows which tool is executing and how many steps remain. If any step fails — a missing dependency, a version mismatch, an execution error — the entire plot state rolls back to the pre-replay snapshot.

5. When replay completes, the tuned entry gets a badge in the Log showing the parameter was changed, the old value, and the new value. If the tool produces artifacts (bearing plots, feature tables), new versioned artifacts are created. Previous versions stay archived. Open artifact views refresh automatically if you have auto-refresh enabled.

Cross-snapshot tuning works the same way but scales further back. If you load earlier history and tune a parameter from a previous snapshot segment, the engine loads that snapshot's clean state, replays from the tuned entry forward through all subsequent segments (crossing snapshot boundaries), and reconstructs your current working state. Same core logic, more I/O upfront.

## UI Additions

The Log Panel now shows three new actions on each entry (if applicable): a pencil icon to tune any parameter, "Revert to here" to truncate the timeline, and "Revert this" to soft-delete a single step. When you click a parameter value on a tunable entry, an inline editor appears — numeric input for floats and integers, a duration picker for time values, a dropdown for enums, a toggle for booleans, text input with inline validation for strings.

For "Revert to here," you get a confirmation dialog warning that the action is permanent. Once confirmed, all entries after the selected point vanish from the Log and the plot returns to that exact state.

When you "Revert this," the entry greyed out immediately and the system starts replay. A progress bar shows the current operation and count remaining. If replay succeeds, you're done — the rest of your timeline cascades correctly. If a dependent operation fails, you see which entry failed and why, with options to restore the deleted entry or remove the failing one too.

Cancelled replays are instant. You hit the X, the plot state snaps back to its pre-replay state, no partial changes left behind.

## What Surprised Us

Tool version mismatch detection is stricter than initial feedback suggested. Some team members asked whether patch-level differences (1.2.0 vs 1.2.1) should be tolerated with a warning. We went strict: exact string match, halt on mismatch, let the analyst decide. In practice, this is the right call. Even patch releases can change output slightly, and analysts need certainty that a replayed result will match the original. The halt message includes both versions and the entry that triggered the mismatch, so you're not left guessing.

Cross-snapshot replay adds real complexity. The snapshot service was already solid (from #074), but replaying across snapshot boundaries required careful sequencing: load snapshot, replay pre-snapshot entries with their original parameters, cross into the current segment, keep replaying. We added a "loading snapshot" phase to the progress indicator so you know what the system is doing during the I/O wait.

Soft-delete was simpler than permanent removal. We could have physically removed entries from the provenance arrays, but soft-deleting (just flipping a `deleted: true` flag) means the Log Panel can still display the entry greyed out, and restoring it is free — no replay needed to resurrect a soft-deleted entry, just remove the flag and replay forward from there.

## Tests

56 new unit tests, all passing. The Replay Engine tests use a mock tool executor that returns predetermined results, so every replay scenario can be verified in isolation: version mismatch halts, dependency failures halt, successful cascades complete, cancellations roll back cleanly. Parameter validation tests confirm that type constraints are enforced before any replay begins. LogService tests verify that tune annotations are recorded correctly, that soft-deletes are marked properly, and that restores work as expected.

We added integration scenarios too: tuning a parameter in one snapshot segment and verifying the replay correctly crosses into subsequent segments; reverting a step that other steps depend on and checking that the system halts with the right error; cancelling a long replay mid-execution and confirming rollback is complete.

## What's Next

Replay is now the backbone of interactive analysis refinement. Next up is the ability to storyboard your analysis — capture key points in the timeline as named snapshots that analysts can return to and branch from. Snapshots already exist in the system (#074), but they're automatic checkpoints. Named snapshots let you intentionally mark "this was a good analysis direction" or "this was the point where I changed my hypothesis." From there, you can branch to explore alternative parameters without losing your main line of work.

After that, we're looking at Python-side analysis tools that analysts can write themselves — custom calculations that slot into the replay and tuning system the same way built-in tools do. That's where the reproducibility guarantees we've built here pay real dividends: every operation recorded, every parameter logged, every version tracked, so custom analysis can be tuned and replayed with the same confidence as the platform's own tools.

→ [See the code changes](https://github.com/debrief/debrief-future/pull/076)
→ [Replay Engine types](https://github.com/debrief/debrief-future/blob/main/services/session-state/src/log/types.ts)
