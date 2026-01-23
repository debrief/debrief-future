---
layout: future-post
title: "Planning: REP File Special Comments Parser"
date: 2026-01-21
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, debrief-io, parser, annotations]
excerpt: "Extending our REP parser to extract annotations, narratives, and shapes — not just track positions."
---

## What We're Building

REP files are more than track data. Operators annotate their exercise recordings with narrative entries, search area circles, operational boundaries, and sensor contacts. Until now, our parser ignored these — treating them as comments. That changes this week.

We're extending the `debrief-io` REP handler to parse all special comment types: NARRATIVE entries that capture operator decisions, CIRCLE and RECT shapes that define search areas, LINE and VECTOR annotations for reference bearings, and even time-varying DYNAMIC shapes that move during replay. The parser will produce GeoJSON features conforming to our existing annotation schemas, ready for display alongside tracks.

## How It Fits

This completes a key gap in our tracer bullet. We can already parse REP track positions and store them in STAC catalogs. With annotation support, analysts get the full picture — the shapes and notes that make exercise replay meaningful, not just dots on a map.

The annotation schemas were completed in our recent styling work (PR #58). This parser will produce features that validate against those schemas, with proper styling properties so frontends can render them immediately.

## Key Decisions

- **Fail-fast on invalid data** — Unknown symbol codes or malformed syntax raise errors with filename, line number, and description. Analysts fix source data rather than wonder why shapes are missing.

- **Symbol codes mapped to CSS colors** — The Debrief symbology table (A-Q → colors like Blue, Red, Yellow) is applied during parsing. Features arrive with concrete `fill_color` and `color` values.

- **Legacy symbol names preserved** — We're adding a `legacyStyle` field to store symbol names like 'Aircraft' or 'torpedo'. We won't render these icons yet, but we won't lose the information either.

- **Local test fixtures** — The REP format is stable/legacy. We're snapshotting the canonical `shapes.rep` file locally rather than fetching from upstream.

## What We'd Love Feedback On

- **Error handling philosophy**: We chose fail-fast over warn-and-continue. Does this match how analysts work with REP files? Would a "strict mode" toggle be useful?

- **Annotation types to prioritize**: We've documented 20+ comment types. Which matter most for real analysis workflows? NARRATIVE and basic shapes are P1, but what about SENSOR, TMA, or DYNAMIC shapes?

- **Symbol rendering**: The `legacyStyle` field preserves symbol names for future icon support. Is this important enough to prioritize, or can we defer icon rendering indefinitely?

→ [See the specification](https://github.com/debrief/debrief-future/blob/main/specs/007-rep-special-comments/spec.md)
