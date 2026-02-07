Somewhere between 30 and 50 maritime analysis tools are buried in Debrief's Java codebase, built up over nearly three decades. CPA calculations, track interpolation, sensor bias correction. Each one encodes real domain knowledge. None of it is documented precisely enough to re-implement without reading the Java.

We're changing that. Systematically scanning the legacy codebase to produce language-neutral specifications with pseudocode algorithms and golden input/output JSON pairs — test oracles that any re-implementation in any language must match.

The interesting constraint: many legacy tools are tightly coupled to Eclipse RCP and can't run in isolation. So we have two tracks for capturing behaviour. A Java test harness for tools that cooperate, and manual construction from source analysis for tools that don't. Both produce the same deliverable. Low-complexity tools first, to validate the process before tackling the harder ones.

Four tools already documented as proof-of-concept. Thirty to fifty more to go.

[Read the full planning post](https://debrief.github.io/future/2026/02/07/planning-documenting-legacy-debrief-tools.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
