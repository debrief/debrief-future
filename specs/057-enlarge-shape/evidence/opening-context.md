## What We're Building

Three days ago we shipped the move-shape tool spec -- translating annotations across the Earth's surface using Vincenty math. The natural follow-up: scaling those same shapes bigger or smaller.

We're writing a language-neutral specification for an enlarge-shape tool. An analyst selects an annotation -- a circle marking an exercise area, a rectangle around a patrol zone, a vector indicating course -- and scales it by a multiplicative factor relative to an origin point. Factor of 3.0 triples the extent. Factor of 0.5 halves it. Factor of 1.0 leaves it untouched. The default origin is the shape's geometric centroid, but an analyst can pin the scaling to any point: a sensor location, a corner vertex, an arbitrary map coordinate.

Like its sibling, this is a spec-only deliverable. One markdown document following the #049 tool documentation model (all nine sections), plus three golden I/O JSON fixture pairs. No Python. No TypeScript. Just a precise description of what any implementation must do, with test fixtures to prove it.

## How It Fits

The spec drops into `shared/tools/shape/manipulation/` alongside `move-shape.1.0.md`. Together they form the first two tools in the shape manipulation category -- translation and scaling. Rotation is the obvious third, completing the family of affine-like transformations for annotation shapes.

Each tool spec follows the same #049 template: metadata, MCP descriptions, input/output schemas, pseudocode, edge cases, golden examples, changelog, references. Any future implementation in any language runs the golden input, compares the output, and either matches or doesn't. No ambiguity.

## Key Decisions

- **Linear interpolation, not great-circle math**: Move-shape needed Vincenty because it translates by bearing and distance -- inherently spherical parameters. Scaling is different. It multiplies the coordinate difference between each vertex and the origin. For annotation shapes spanning a few kilometres, the distortion from treating lat/lon as flat is under 0.1% at mid-latitudes. Simple and correct enough.

- **Arithmetic mean centroid, not area centroid**: The "true" centroid of a polygon comes from the shoelace formula over the enclosed area. But Debrief annotations are typically convex shapes with 4-8 vertices, where the arithmetic mean of the vertices is nearly identical. It's also consistent across geometry types -- polygons, lines, and points all compute the same way.

- **Scale factor of 0 is allowed**: Mathematically, scaling by 0 collapses every vertex to the origin point. The result is a degenerate geometry, but it's valid GeoJSON and the provenance records what happened. Undo still works. Treating 0 as an error felt overly restrictive.

- **`mutation/shape/scaled` result type**: Follows the naming convention from move-shape's `mutation/shape/translated`. We considered `enlarged` and `resized`, but "scaled" is the precise geometric term and covers both growing and shrinking.

- **Vectors: scale geometry and origin, preserve range and bearing**: A vector annotation's `range` and `bearing` define its semantic meaning -- course, wind direction, threat axis. Scaling repositions where the vector sits, but shouldn't change what it represents. Same approach move-shape takes with translation.

- **Latitude clamping, longitude wrapping**: Extreme scale factors near the poles could push latitude past 90 degrees. Latitude gets clamped to [-90, 90] because wrapping doesn't make geometric sense there. Longitude wraps normally via `((lon + 180) mod 360) - 180`, consistent with RFC 7946.
