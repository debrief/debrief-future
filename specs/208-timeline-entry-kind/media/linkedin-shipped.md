---
layout: future-post
type: linkedin-shipped
date: 2026-04-22
feature: 208-timeline-entry-kind
---

We shipped a cleanup that's been sitting in the back of the inbox since feature #176 landed: replacing the category-as-semantics shortcut in the log panel with a proper discriminator field.

`TimelineEntry` (the UI projection the log panel consumes) now carries a `kind` field that tells you what type of entry you're looking at — snapshot, tool invocation, or tune marker. The VS Code host populates it when building each entry. Consumers switch on `kind` instead of re-deriving semantics from a category enum.

Zero visual regression (we proved it via DOM-equivalence assertions in the test suite). 13 new tests, all passing. The move unlocks what comes next: manual snapshot buttons and tune markers that need their own entry types, without overloading ToolCategory as a general-purpose semantic slot.

What surprised us: DOM-equivalence evidence was stronger than pixel-diff would have been — more reproducible, runs in CI, and can't silently drift.

[Read the full post](https://debrief.github.io/posts/shipped-timeline-entry-kind/)

#FutureDebrief #maritimeanalysis #opensource
