---
layout: future-post
title: "Planning: Review Feedback on STAC Plots"
date: 2026-03-31
track: [momentum]
author: Ian
reading_time: 3
tags: [review-feedback, collaboration, stac, tracer-bullet]
excerpt: "Adding collaborative review feedback to maritime analysis plots — offline-first, with full provenance"
---

## What We're Building

Until now, every plot in Future Debrief has been a single-user artifact. You create it, you analyse it, nobody else leaves a mark on it. That's fine for personal work, but real maritime analysis involves review cycles — a second pair of eyes checking track solutions, questioning assumptions, flagging things that don't look right.

This week we're building review feedback: the ability for any user to attach notes to any STAC plot, mark them resolved, reopen them, edit or delete them, with the full provenance trail the Constitution demands. A reviewer opens a plot, writes "Track solution diverges after 14:30Z", and that note lives on the plot as a first-class property. The analyst sees it, addresses the concern, marks it resolved. If someone disagrees later, they reopen it. Every action — who did what, when — gets logged.

## How It Fits

This is Future Debrief's first multi-user workflow feature, and it had to work within our offline-first constraints. There's no server, no notification service, no WebSocket channel. Just a shared filesystem. Users discover pending feedback through visual badges (amber for unreviewed, muted grey for all-resolved) and a new review-status filter in the catalog browser. The review data itself lives directly in the STAC item's `item.json` under a `debrief:review` property — co-located with the plot, readable offline, and atomic with the item read.

The implementation touches most of the stack: a LinkML schema extension generates typed models for both Python and TypeScript. The Python `debrief-stac` service handles all CRUD operations via MCP tools. React components surface the data — a ReviewPanel for the detail view, badges on the ExerciseListView, and a new filter type in the CQL2 filter engine.

## Key Decisions

- **User identity from `DEBRIEF_USER` env var** — no auth server, consistent with offline-first. Falls back to OS username. VS Code populates it automatically when spawning the MCP server.
- **ULIDs for review item IDs** — lexicographically sortable (natural chronological ordering), collision-resistant, generated server-side by `debrief-stac`.
- **Optimistic locking via STAC `updated` timestamp** — clients must include the expected timestamp in write requests. If the item changed since they last read it, the operation is rejected with a conflict. No silent data loss.
- **Provenance logging in `debrief:review_log`** — edits and deletes are recorded as append-only events on the STAC item. Separate from feature-level provenance because review applies to the whole plot, not individual tracks.
- **No notifications** — users discover feedback through filter controls and visual badges. Keeps the architecture simple and avoids coupling to any delivery mechanism.

## What We'd Love Feedback On

- **Audit trail depth**: The current design records each resolve/reopen cycle with who and when, shown in a collapsible history on each feedback item. Is that the right level of detail, or would a simpler "last resolved by / last reopened by" suffice for most workflows?
- **Badge design**: Amber flag for pending, grey checkmark for all-reviewed, nothing for no-feedback. Are there established conventions in the defence analysis community we should follow instead?
- **Filter granularity**: We have four filter states (all, pending review, all reviewed, no feedback). Should "my pending reviews" (filtered by current user) be a fifth option, or is that overcomplicating the filter bar at this stage?

-> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
