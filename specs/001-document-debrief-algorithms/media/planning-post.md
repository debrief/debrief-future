---
layout: future-post
title: "Planning: Documenting Legacy Debrief Tools for Migration"
date: 2026-02-07
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, tool-migration, documentation]
excerpt: "Cataloguing 30+ years of maritime analysis tools so they can be re-implemented without the Java source"
---

## What We're Building

Legacy Debrief has somewhere between 30 and 50 tools built up over nearly three decades. CPA calculations, track interpolation, sensor bias correction, range-bearing analysis. Each one encodes domain knowledge from maritime analysts who understood what worked in practice.

That knowledge currently lives in Java classes spread across four Eclipse RCP plugin packages. If you want to know exactly how Debrief calculates a closest point of approach, you read the Java. That's fine when you have Java developers. It's a problem when you're rebuilding in Python and TypeScript.

We're systematically documenting every migrateable tool. Not just what each tool does, but how: precise enough that a developer who has never opened the Java source can produce a correct re-implementation. The output is three things. A discovery report cataloguing every tool with its complexity, trigger type, and selection context. Golden I/O JSON fixture pairs capturing the exact input and output behaviour. And a 9-section language-neutral specification with pseudocode for the algorithm.

## How It Fits

Features 049 and 050 built the infrastructure: a tool specification template with pseudocode conventions, four slash commands for the migration workflow, and a Java capture harness for recording golden examples. This feature is where we actually use all of that to produce deliverables.

Work happens in the legacy `debrief/debrief` repository because that's where the source is. Outputs are staged in a `_tool-migration/` directory, then transferred to `debrief-future/shared/tools/` via PR. Four tools already live there as proof-of-concept: set-track-color, apply-symbol-style, label-interval, and symbol-interval. Those set the tone for what follows.

## Key Decisions

- **Two-track golden I/O capture**: The preferred route runs each tool via a Java test harness that serialises input and output as JSON. But many legacy tools are tightly coupled to Eclipse RCP and can't run in isolation. For those, we construct examples manually by reading the source. Both approaches produce the same file format.

- **Low-complexity tools first**: Rather than try to document everything at once, we process tools in complexity order. Simple styling and measurement tools first — they validate the process pipeline. Complex analysis tools last, when the workflow is proven and we know what to expect.

- **11-item validation checklist**: Every spec passes a quality gate before it's considered done. Section count, pseudocode keyword compliance, naming patterns, golden example references, edge case coverage. Some items are machine-checkable; all are self-assessable.

- **UX trigger mapping**: Legacy Debrief has 10 ways to invoke a tool (context menu, toolbar button, drag-drop, wizard, and six more). Future Debrief has 4 surfaces. Most legacy triggers map cleanly. Two don't: drag-drop and wizard-based flows have no direct equivalent and need new UX design.

- **Categories are hypotheses**: We start with 9 tool categories (track/styling, track/analysis, sensor/calibration, etc.) but they're explicitly labelled as a starting taxonomy. Discovery will confirm, merge, or split them based on what we actually find.

## What We'd Love Feedback On

We know four tools well. We think there are 30 to 50 more. The actual count and distribution will emerge from the discovery scan.

Questions we're working through:

1. **Completeness threshold**: When is a discovery scan "done"? Four package roots is our starting scope. Are there tools hiding in utility classes or bundled into views that a class-name scan would miss?

2. **Manual construction confidence**: For tools we can't run in isolation, golden examples are built by reading the source and computing expected results by hand. How much should we worry about errors in hand-constructed examples? Is it better to have a potentially imperfect golden example or no example at all?

3. **Category granularity**: Nine starting categories for possibly 50 tools. Some categories might have one tool; others might have fifteen. At what point does a category with two tools get merged into a neighbour?

If you've documented legacy systems for migration before, we'd value your perspective on what we might be underestimating.

[Join the discussion](https://github.com/debrief/debrief-future/discussions)
