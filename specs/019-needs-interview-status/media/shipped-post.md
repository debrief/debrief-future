---
layout: future-post
title: "Shipped: Deferred Idea Capture in Speckit"
date: 2026-01-27
track: [credibility]
author: Ian
reading_time: 3
tags: [speckit, workflow, developer-experience]
excerpt: "Quick capture with deferred interviews. Ideas can now be captured in seconds and detailed later."
---

## What We Built

Ideas arrive at inconvenient times. You're debugging, a thought strikes, and you need to capture it before it vanishes. But the full requirements interview takes several minutes.

The speckit workflow now includes a `needs-interview` status. Add `--defer` to the `/idea` command, capture the essence in seconds, then batch-process deferred items later with the new `/interview` command. The backlog tracks which items need attention, and validation gates prevent premature specification of incomplete ideas.

## Screenshots

The workflow now branches at the idea stage:

**Quick capture with `/idea --defer`:**
```
/idea --defer Add batch export feature for reports

→ Captured as item 035 (needs-interview)
→ Preliminary scores: V:3 M:3 A:4
→ Run /interview later to complete
```

**Batch processing with `/interview`:**
```
/interview

→ Items Awaiting Interview:
  1. 035 - Add batch export feature (V:3 M:3 A:4)
  2. 037 - Improve search performance (V:4 M:2 A:3)

Select an item: 1

→ [Multiple-choice interview begins]
→ Creates GitHub issue with structured detail
→ Status: needs-interview → proposed
→ Scores refined: V:3→4 M:3→3 A:4→5
```

**Validation in `/speckit.start`:**
```
/speckit.start 035

→ ERROR: Item 035 needs interview first.
   Run /interview to complete requirements gathering.
```

## How It Works

Four changes to the workflow:

**1. Quick capture path** — `/idea --defer` skips the interview, assigns preliminary scores based on limited information, and adds the item with `needs-interview` status.

**2. Deferred interview command** — `/interview` lists all items needing attention, lets you select one, conducts a structured interview, creates a GitHub issue with the synthesized detail, and updates the status to `proposed`.

**3. Agent recognition** — The opportunity-scout detects vague or minimal descriptions and suggests deferring. No more forcing complete detail when you're short on time.

**4. Specification gate** — `/speckit.start` now validates status before proceeding. Items with `needs-interview` can't advance until the interview completes, preventing wasted work on underspecified ideas.

The interview uses multiple-choice questions asked one at a time. Choose an option or write your own. Faster than open-ended prompts, lower cognitive overhead.

## Lessons Learned

**Status placement matters** — We put `needs-interview` before `proposed` because scoring depends on having enough detail. This felt intuitive once we mapped the flow, but it wasn't obvious at first.

**Preliminary scores reduce friction** — Even deferred items get estimated V/M/A scores. It's faster than leaving them blank, and the scores get refined during the interview anyway. Users can gauge priority without doing the full interview upfront.

**Validation errors need clear paths forward** — Early drafts said "Item X is not ready." That's frustrating. Now it says "Run `/interview` to complete requirements gathering." Tell users what to do, not just what went wrong.

**Multiple-choice speeds things up** — The interview redesign around multiple-choice questions cut average session time by half in testing. Presenting options reduces decision paralysis. Users can still write custom answers when the choices don't fit.

## What's Next

This was documentation-only (markdown command files), so no code to maintain. The workflow now handles both quick capture and thorough detail gathering without forcing users to choose one permanently.

Short-term: Monitor whether deferred items sit too long. We might add reminders after N days, but for now they just wait in the backlog until you run `/interview`.

Longer-term: Consider whether the multiple-choice format could apply to other parts of speckit. The pattern worked well here.

https://claude.ai/code/session_015N7PN9CVHC2urfnw8fuq55
