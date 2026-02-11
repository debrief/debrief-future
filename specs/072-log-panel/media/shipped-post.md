---
layout: future-post
title: "Shipped: Log Panel"
date: 2026-02-09
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, log-panel, prov, vs-code]
excerpt: "A VS Code activity panel displaying the analytical history of a plot. Chronological timeline, three presentation modes, filtering, and feature selection integration."
---

## What We Built

The Log Panel is now live. Analysts click the clock icon in the activity bar and get a full history of every operation performed on their plot — imports, calculations, property edits, exports. The entries appear in reverse chronological order (most recent first) and clicking one highlights the affected features on the map.

This is Phase 2 of E02. Phase 1 (#071) built the recording service — the plumbing that writes operations to disk. Phase 2 is where analysts actually *see* that history. We delivered 10+ React components, 6 message types, 3 presentation modes, and 2 view modes.

The panel operates as a distinct activity bar mode, separate from the main Activity Panel. Opening it signals "I'm reviewing history", not "I'm configuring features". This clarity shaped every interaction decision.

## Core Capabilities

**Timeline View** — All entries displayed chronologically. Click an entry, the affected features light up on the map. Click again to deselect and clear. The panel updates automatically when a new tool runs — no manual refresh needed.

**Three Presentation Modes** — Compact shows just tool name and feature. Normal adds parameter values. Detailed adds timestamp, duration, result ID. Analysts pick a mode once and it persists across sessions. No re-configuring every time.

**Filtering** — A collapsible filter row lets analysts narrow the timeline by text search (matching tool name, feature name, parameter values), tool type, or operation category (calculation, import, property-edit, export). Filters combine with AND logic. A "show N of M entries" indicator tells you how many are hidden.

**By-Feature Grouping** — An alternative view that groups entries under feature headings. Useful when investigating "what happened to this track?" instead of "what did I just do?" Multi-feature operations appear under each affected feature's group.

**Action Bar Placeholders** — Five buttons (Revert to Here, Revert This, Tune, Snapshot, Rationale) establish the layout and prepare for Phases 4-6. Clicking them in Phase 2 shows "not yet available" — they become functional as those phases ship.

## Lessons Learned

**Component Structure Matters** — Separating LogPanel (container), LogTimeline (list view), LogByFeature (grouped view), and LogFilterRow (controls) made switching between views effortless. Each component knows its job. The webview is just a thin wrapper passing messages.

**Storybook Stories as Test Coverage** — We built 11 Storybook stories covering every scenario: empty states, all three presentation modes, filtering, By-Feature grouping, action button behavior, and edge cases like deleted features. This forced us to think through the UI systematically before writing the extension code. The stories became the test suite.

**Selection Semantics Matter** — The planning post asked: should selecting a log entry replace the current feature selection, or maintain both? We went with replacement. When an analyst opens the Log Panel they've switched contexts from "building analysis" to "understanding history". Taking over the selection felt right semantically. It reuses the existing feature selection mechanism instead of introducing a second highlight layer.

**Snapshot Boundaries as Visual Anchors** — The panel can show snapshot boundaries (visual separators marking where a snapshot was taken). In Phase 2, if snapshots exist, the boundary appears. If not, the timeline flows seamlessly. Future phases can add lazy-loading ("Show earlier history") without breaking the current UI.

**Message-Driven Updates** — The extension host sends timeline updates, session changes, and mode initialization to the webview. The webview sends back entry selections and action invocations. This pattern is identical to Activity Panel (#044). Consistency across panels means analysts learn once.

## Component Breakdown

```
LogPanel
├── LogActionBar
│   ├── Action buttons (Revert, Tune, Snapshot, Rationale)
│   └── View/mode toggles (Timeline/By-Feature, Compact/Normal/Detailed)
├── LogFilterRow (collapsible)
│   ├── Text search input
│   ├── Tool type dropdown
│   └── Category filter
└── LogTimeline or LogByFeature
    ├── SnapshotBoundary (when applicable)
    └── LogEntry (one per operation)
        ├── Feature list (with "(deleted)" labels if needed)
        ├── Parameters (Normal/Detailed modes)
        └── Timestamps (Detailed mode)
```

Seven components, seven test stories, all passing.

## What's Next

Phases 4-6 activate the action buttons. Phase 4 (#074) implements Revert operations — analysts can revert to a historical point or revert a single operation, with the timeline updating to show the new state. Phase 5 (#075) adds branching — diverging from a historical point into a new analysis thread. Phase 6 (#076) enables Tune (parameter re-execution) and Rationale (free-text annotations).

The Log Panel layout and message contract are complete. Adding those features is additive — no UI restructuring required.

→ [See the spec](../spec.md)
→ [Test summary](../evidence/test-summary.md)
→ [Usage walkthrough](../evidence/usage-example.md)
