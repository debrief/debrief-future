A mis-typed JSON import used to draw a circle on the map, and nobody knew. If a legacy file listed a marker symbol of `"star"`, the resolver quietly fell through to the default. The track rendered. No warning, no error, no hint that the data had been misread.

What started as a small type-consolidation job — two drifted `ResolvedPositionStyle` interfaces collapsed back to one, anchored to the LinkML schema — expanded under review. The drift was not one place, it was seven, all along the same axis: marker shapes, from schema to renderer to VS Code tool parameter.

The expanded scope fixes root causes. One resolver, not two. A typed error when an unknown symbol arrives (Constitution Article I.3 — no silent failure). Exhaustive-switch enforcement on every renderer. Schema-narrowed types at the generator boundary. A schema adherence test pinning two deliberately-separate enums to the same value-set.

The risky bit is post-processing generator output to narrow `string` to `PointShape`. Flagged as a research step; we will renegotiate scope before implementation if no tractable mechanism exists.

Open question: how many other LinkML enums have the same drift pattern brewing?

[LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
