---
layout: future-post
title: "Shipped: Move Shape Tool"
date: 2026-02-11
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, tool-spec, shape-manipulation, great-circle]
excerpt: "First annotation manipulation tool: spec, Python, TypeScript, 18 tests, two golden fixtures, three frontends"
---

## What We Built

Moving a circle annotation 5 km east sounds simple until you remember the map is draped over a sphere. The move-shape tool translates annotation shapes -- circles, rectangles, lines, vectors, text labels -- using the Vincenty destination formula for great-circle accuracy. Standard library math only, no geo libraries.

The tool exists in three forms: a language-neutral specification at `shared/tools/shape/manipulation/move-shape.1.0.md`, a Python implementation using the `@tool` decorator, and a TypeScript implementation mirroring Python line-for-line. All three frontends -- VS Code (via MCP subprocess), web-shell (in-browser), and Storybook (via ToolMatchService) -- can run it.

Each annotation kind has its own wrinkles. A circle has a `center` property that must move with its polygon vertices. A vector has an `origin` that shifts, but `range` and `bearing` stay fixed -- you are relocating the vector, not redefining it. These distinctions were exactly why writing the spec first mattered.

## How It Works

Every coordinate passes through the same destination formula:

```
lat2 = asin(sin(lat1) * cos(d/R) + cos(lat1) * sin(d/R) * cos(bearing))
lon2 = lon1 + atan2(sin(bearing) * sin(d/R) * cos(lat1), cos(d/R) - sin(lat1) * sin(lat2))
```

R = 6371 km. Longitude normalises to [-180, 180] after the calculation, handling antimeridian wrapping. The result type is `mutation/shape/translated`, following our ToolResponse convention from #041.

Two golden I/O examples serve as cross-language contracts. A circle translated 5 km east: center shifts from [0.0, 50.0] to [0.06995, 49.99998], all nine polygon vertices shift accordingly. A vector translated 10 km north: origin updates, range and bearing preserved exactly. Both Python and TypeScript produce identical output to IEEE 754 double precision.

18 pytest tests cover all five annotation kinds plus edge cases: zero-distance no-op, antimeridian wrapping, empty input rejection, non-annotation feature skipping. All passing in 0.37 seconds.

## Lessons Learned

Writing the spec first -- with language-neutral pseudocode and golden fixtures -- made the implementations nearly identical. The Python code reads like a transliteration of the spec. The TypeScript reads like a transliteration of the Python. When the spec is precise enough, there is not much room for the implementations to diverge.

The `@tool` decorator continues to prove its worth. Adding move-shape to the calc service meant writing the function and adding the decorator. No MCP definition files, no UI changes. The tool appeared in `tools/list`, ToolMatchService picked it up, and all three frontends offered it automatically.

The spherical Vincenty approximation is more than adequate for this use case. At annotation-scale distances (5-50 km), the error versus ellipsoidal is sub-metre. We considered adding a precision tier for larger distances but decided against the complexity. If someone needs to translate an annotation 500 km, we can revisit.

## What's Next

This is our first `shape/manipulation` tool. The category path leaves room for `rotate-shape` and `scale-shape`, which are the next geometric transformations analysts would expect. The spec-first workflow is now well-tested enough that those should follow the same pattern: write the spec, capture golden examples, implement in both languages, verify parity.

> [See the spec](https://github.com/debrief/debrief-future/tree/main/shared/tools/shape/manipulation/move-shape.1.0.md)
> [Test summary](https://github.com/debrief/debrief-future/tree/main/specs/056-move-shape/evidence/test-summary.md)
