---
layout: future-post
title: "Planning: Storyboarding — Edit Suite + Housekeeping"
date: 2026-04-23
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, storyboarding, vscode-extension, edit-suite, housekeeping]
excerpt: "The polish slice that closes out the Storyboarding epic — rename, describe, delete with undo, and the housekeeping that keeps thumbnails honest."
---

## What We're Building

It's the day after the briefing. The analyst is back at their desk with a plot that already carries twelve Scenes — captured live during the week, each one a frozen viewport, time, and set of visible features. The briefing went well. A few of the Scenes want better titles. One needs a paragraph of context underneath it so the next person reading the plot understands why that moment matters. Two Scenes were captured by accident and should go. And one of the early Scenes has a thumbnail that no longer matches what the underlying features now show, because the analyst refined a track since it was captured.

That's the shape of #218. The raw captures land in #216; the briefing delivery flow lands in #217. This slice is the in-between work — turning the captures into something a colleague could open cold and follow.

Click a Scene title, type, press Enter — it renames. Click the description area, write CommonMark, see it render live in the row. Delete a Scene and a toast offers Undo, backed by a session-scoped 50-entry buffer that holds the deleted Scene's payload until the plot closes. Hit *Update to current* on a Scene and it re-snapshots the viewport, timestamp, visible features, and thumbnail to match whatever the map is showing right now. Duplicate a Scene with an inline timestamp prompt. Copy a Scene to another Storyboard on the same plot, with a deep-copied thumbnail so the two Scenes are independent from that point on. On plot open, Scenes whose features have drifted since capture get flagged as stale, with a per-Scene Refresh action.

And every one of those edits — plus the Storyboard-level rename / describe / cascade-delete — emits a card to the Analysis Log Panel (#176) carrying the Scene thumbnail, the actor, and a one-line summary. The audit trail is no longer optional.

## How It Fits

Storyboarding (#024) is a four-slice epic. #215 landed the headless schema and CRUD core — shapes, ordering, canonicalisation, missing-data detection, compound-op atomicity. #216 landed capture — one keystroke, one frozen moment. #217 landed the panel and playback — Forward, Backward, scoped Left/Right, and the hard-block modal for missing data. #218 (this one) is the edit suite plus the data-integrity housekeeping around it.

After this slice, the Storyboarding MVP is in place. That scope boundary is deliberate. #217's *Open for editing* button on the hard-block modal has been sitting behind a stub that acknowledges the click and does nothing else — #218 replaces that stub with a real edit form, pre-filled with the unresolved feature IDs. Stale-thumbnail detection, which #217 couldn't expose because there was no way to act on it, now has a Refresh button to point at. The LogService gets one new recorder and the panel finally emits cards for the full edit surface, not just the playback-time missing-data events.

## Key Decisions

**Undo is session-scoped, in-memory, capped at 50 per plot.** The buffer is a simple Deque of `SceneFeature[]` snapshots, dropped on plot close. No cross-session persistence — partly for security (deleted Scenes shouldn't resurrect across sessions), partly for audit-trail cleanliness. FIFO eviction once the cap is hit; we don't warn the analyst on the 51st delete. The cap matches FR-EDIT-003; whether the eviction should be silent is one of the questions we want outside views on.

**The markdown editor lives in the webview.** A textarea paired with a `react-markdown` live preview, CommonMark only. No separate VS Code document per Scene, no editor-host round trip. Zero new runtime dependencies — react-markdown is already in the build via #176 log cards and #178 tabular results. The Scene description is a field on the Scene, same as its title; opening it in a second surface felt wrong for what amounts to a paragraph of context.

**A new LogService recorder, not a tool-result sentinel.** We're adding `LogService.recordStoryboardEdit` with sentinel `'debrief.storyboardEdit'` rather than piggybacking on `recordToolResult`. A storyboard edit isn't a tool run. Keeping the semantic model clean lets #176's card renderer branch cleanly on sentinel, the same pattern #178 already uses for `recordFileSaved`. One new recorder; nothing downstream changes.

**Stale-thumbnail detection runs once on plot open.** The check is cached in the extension and invalidated per-Scene on write. We're explicitly not running it lazily on panel render — the paint path stays free of domain logic (Article IV.1). Per-Scene Refresh is a one-click action on the Scene row; whether we also offer a bulk "Refresh all stale" on open is still open.

**Update-to-current captures the thumbnail before entering the #215 write path.** If the #174 thumbnail pipeline fails, the plot on disk is byte-identical — nothing was written. The rare collision-after-capture path produces an orphan thumbnail, which #174's existing gc reclaims. We considered a two-phase commit; the trade-off didn't look worth the complexity for a path that only bites if the pipeline fails mid-op.

**`debrief.storyboard.editScene` replaces #217's stub rather than shadowing it.** Same command id, same modal wire-up. The only change from a consumer's perspective is that the command now does something. Shadowing would have meant two command ids for one user-visible action, which is exactly the kind of surface cruft we've been trying not to accumulate.

## What We'd Love Feedback On

Three questions where we'd genuinely benefit from outside perspectives:

- **Silent FIFO eviction on the undo buffer.** 50 entries per plot, oldest dropped silently when the cap is hit. Is that the right shape for a polish-heavy session, or does an analyst deserve a warning — maybe a log card — when an undo slot gets evicted? The silent option is simpler and avoids a nag; the explicit option preserves the "nothing is lost quietly" invariant.

- **Per-Scene Refresh vs. bulk "Refresh all stale".** Right now every stale Scene gets an individual Refresh button on its row. The one-click option is obvious ergonomics, but it also hides the drift signal — if six Scenes went stale together, the analyst might want to see that as six distinct prompts rather than one sweep. Is the one-click version a convenience or a foot-gun?

- **One log card per edit vs. aggregated bursts.** A rename plus two describes plus a delete-and-undo currently emits five cards to the Analysis Log. On a polish-heavy session that can get noisy. Should the LogService collapse fast successive edits into a single aggregated card ("6 edits in the last 2 minutes") with a drill-down, or is the one-card-per-op rule more important than the noise?

## Added during review

A spec review midway through planning added three cross-cutting items we didn't originally scope, all of which land in this slice rather than a follow-up: a **bulk "Refresh all stale"** action at the Storyboard level (per-Scene refresh one-at-a-time gets tedious on long-lived plots — the per-Scene version stays, the bulk is a Storyboard-header overflow), an **orphan-thumbnail garbage-collection** pass on plot close (a belt-and-braces safety net against the rare edit sequence that could leave PNG assets unreferenced, plus a pre-flight collision check on update-to-current that closes the primary orphan-creation window), and a **consecutive-same-op collapse** in the Analysis Log Panel (a polish-heavy session that produces twenty rename cards in a row reads better as a single collapsed card with ×20 and an expand affordance, gated on a setting so power users can opt out). All three are reflected in the task list; the shipped post will tell the full story end-to-end.

→ [Join the discussion]({{DISCUSSION_URL}})
