---
layout: future-post
title: "Building Tolerant Plot Loading: Recovering an Orphaned Playhead"
date: 2026-05-29
tags: [session-state, validation, load-path, tolerant-import, playhead]
spec: 267-tolerant-playhead-import
track: [credibility]
author: Ian
reading_time: 5
excerpt: "Plots with an out-of-window saved playhead now open. The playhead clamps to the nearest window edge with a non-blocking notification, rather than refusing to load at all."
---

| Before | After |
|---|---|
| Saved playhead outside the time-window? The whole plot refuses to open — hard `SystemStateLoadError`. | The plot opens. The playhead clamps to the nearest window edge, and a non-blocking notification tells you what was adjusted. |
| A trimmed analytical window orphans a perfectly valid playhead — and locks you out of your own analysis. | The window is honoured; the orphaned playhead heals on next save. Re-opening before that simply re-clamps. |
| One recoverable mismatch is treated the same as a genuinely broken file. | An incoherent window (`start_time > end_time`) still fails fast — tolerance is granted only where recovery is real. |

## What We're Building

When you open a plot whose saved playhead position falls outside its saved analytical time-window, the plot now opens. The playhead clamps to the nearest window edge — start if it undershot, end if it overshot — and a notification explains the adjustment. You land in your colleague's analysis at a sensible moment instead of staring at a load failure.

This closes a sharp edge introduced when we moved the playhead position into the plot file. The realistic case: you scrub the playhead to a moment, later trim the analytical window to a tighter span, and save. The playhead is now orphaned outside the new window — the window itself is fine, only the playhead points past it. Under the old strict rule, the plot wouldn't open at all: a heavy penalty for a trivially recoverable mismatch on a non-critical, re-derivable field. The genuinely-broken case — a window where `start_time > end_time` — keeps its hard failure. Tolerance is granted only where recovery is real.

## How It Fits

This is the deliberate revisit our own Constitution asked for. Spec-261 put the playhead in the plot file and shipped strict-on-import validation under Article XIV.4 ("strict on import, fail fast") to keep the data contract clean during pre-release — but Article XIV's trigger note explicitly flagged that those clauses "should be revisited to introduce appropriate tolerance for real-world data ingestion." This is that revisit, kept honest by being maximally narrow: one field (`current_time`), one variant (`temporal`), one precondition (a coherent surrounding window). The clamp logic lives once in the shared `@debrief/session-state` load layer that both the VS Code extension and the browser-based web-shell consume; each host only decides how to render the resulting diagnostic. No schema change — the field already exists. This is a behavioural amendment to the load path, not a new contract.

## Key Decisions

- **A sanctioned relaxation, not a free-for-all.** Tolerance applies to exactly one field, one variant, and only when the window is coherent. The unrecoverable `start > end` case keeps its hard, structured load error as the guard rail. Tolerance never leaks into structurally-broken data.
- **Clamp to the nearest edge, don't discard.** Moving the playhead to the closer boundary preserves the analyst's intent — start if they undershot, end if they overshot — rather than dumping it back to the window start regardless of direction.
- **Never silent.** Article I.3 says users must always know the state of their data, so every clamp surfaces a non-blocking notification on every load until you save the corrected position. The relaxation makes the data issue loud while still letting you work.
- **Single-sourced rule, host-rendered UI.** The clamp decision is made once in the shared load layer; the VS Code host renders a warning notification and the web-shell renders a toast. Services emit data, frontends own presentation.
- **No dirty-on-open.** The clamp is in-memory only — it doesn't mark the plot modified or auto-save, preserving the predecessor's "scrubbing doesn't dirty the file" contract. The orphaned value heals in the file only when you next save; re-opening before that re-clamps idempotently.

## Screenshots

The tolerant recovery (US1): a plot with `current_time` past the window end opens successfully. The amber toast reports that the saved time-cursor was outside the time range and was moved to the window end. No modal, no blocking — the plot is already open and the playhead is already positioned on the nearest edge.

![Plot open with amber toast reading "The saved time-cursor was outside this plot's time range and was moved to the window end."](../evidence/screenshots/playhead-clamp-toast.png)

The preserved guard rail (US2): an incoherent window (`start_time > end_time`) still surfaces the red `cross-field-invariant` error banner. The plot does not open. The tolerant path was never reached.

![Red cross-field-invariant error banner; the plot did not open.](../evidence/screenshots/incoherent-window-blocked.png)

## By the Numbers

| | |
|---|---|
| `@debrief/session-state` (vitest) | 714 passed |
| `debrief-vscode` (vitest) | 850 passed |
| Web-shell E2E — tolerant load + guard rail | 2 passed |
| Schema adherence `shared/schemas` (pytest) | 1071 passed |
| Schema changes | 0 |
| New runtime dependencies | 0 |
| Lint (ruff + ESLint) | clean |
| Typecheck (pyright + tsc) | clean |

## Lessons Learned

The original integration plan used the web-shell's existing `LogPanel` transient — the `actionResultMessage` slot — as the notification surface for the clamp. The problem: `actionResultMessage` is rendered only while the Log tab is mounted. Setting it during load, before the analyst has navigated to that tab, means the notice fires into an unmounted component and silently disappears. The user opens a plot, a message is set, the Log panel is somewhere else in the layout, and nothing is ever shown.

The fix was a dedicated App-level toast, distinct from the error banner, rendered unconditionally at the application root. It is always visible in the context where the load event fires.

The general lesson: a "non-blocking notification" surface must be visible in the context where the event fires, not buried in a panel the user may not be looking at. A notification that requires the user to already be on the right tab is effectively silent.

## What's Next

Two items were deliberately deferred during review as YAGNI and captured in the backlog:

- **#275** — coalesce multiple clamp notifications into one summary if and when a batch or session-restore load path exists. Both hosts currently load plots one at a time, so at most one clamp fires per load. Coalescing would add complexity today for a path that doesn't exist.
- **#276** — generalise `PlayheadClampDiagnostic` into a reusable recoverable-load diagnostics channel once a second tolerant-import case is commissioned. The current type is specific enough to be clear; abstracting it prematurely would make the API harder to read and the contract harder to test.

→ [See the code](../../plan.md)
