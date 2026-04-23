## What We're Building

When an analyst places a circle marking an exercise area on a maritime tactical map, then realises the position is off by a few kilometres, they need to shift it. That sounds trivial -- until you remember the map is draped over a sphere.

We're writing a language-neutral tool specification for translating shape annotations: circles, rectangles, lines, vectors, and text labels. The analyst provides a compass bearing and a distance in kilometres. Every coordinate in the shape shifts accordingly, using the Vincenty destination formula for great-circle accuracy. No planar shortcuts.

The spec covers five annotation kinds, each with its own wrinkles. A circle has a `center` property that must move with the polygon vertices. A vector has an `origin` that shifts, but its `range` and `bearing` stay fixed -- you're relocating the vector, not redefining it. These are the details that cause Python and TypeScript implementations to diverge if they're not written down precisely.

This is a spec-only feature. No code. One markdown document following our #049 tool documentation model (nine required sections), plus golden I/O JSON fixtures that any future implementation can test against.

## How It Fits

The spec lands in `shared/tools/shape/manipulation/`, a new category path parallel to the existing `track/styling/` and `track/analysis/` directories. The `shape` domain is new -- this is our first annotation manipulation tool. But the category structure leaves room for `rotate-shape` and `scale-shape` later.

The tool follows the documentation model we established in #049: metadata, MCP descriptions, formal input/output schemas, pseudocode algorithm, edge cases, golden examples, changelog, and references. Any implementation in any language runs the golden input through its code and compares the output byte-for-byte against the expected result.

## Key Decisions

- **`shape/manipulation` category path**: We considered `annotation/manipulation` and `geometry/translation`, but `shape/manipulation` ties to Debrief's domain vocabulary while grouping geometric transformations naturally.

- **Vincenty spherical, not ellipsoidal**: The ellipsoidal formula is more accurate but significantly more complex. For annotation repositioning at kilometre-scale distances, the spherical approximation (R = 6371 km) is more than adequate and keeps the pseudocode readable.

- **`mutation/shape/translated` result type**: Following the ToolResponse convention from #041. "Translated" is the correct geometric term -- more precise than "moved."

- **Skip non-annotation features silently**: If a mixed FeatureCollection contains tracks alongside annotations, the tool processes what it can and ignores the rest. Zero processable features returns an error.

- **Longitude normalisation at the antimeridian**: The destination formula can produce longitudes outside [-180, 180]. A simple `((lon + 180) mod 360) - 180` normalisation handles wrapping, consistent with RFC 7946.
