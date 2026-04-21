Four TypeScript type definitions in Debrief describe the same two concepts — and none of them agree.

`DisplayMode` exists twice, with different value sets: `'full' | 'trail'` in one package, `'normal' | 'snailTrail'` in another. Every time code crosses that boundary, something silently translates between them — or gets it quietly wrong. `PlaybackState` has the same problem, plus a missing value: one package doesn't know `stopped` is possible.

This week we're promoting both types into the LinkML master schema and generating them into Python and TypeScript. The hand-typed copies disappear. The translation layer disappears. One definition, one vocabulary, one source of truth.

No new capabilities. This is infrastructure: clearing three years of drift before it becomes a bug that matters.

The interesting technical wrinkle is that the TypeScript generator emits `string` for enum-ranged slots — a known upstream limitation we already work around for other types using template-literal aliases. `PlaybackState = \`${PlaybackStateEnum}\`` keeps string comparisons idiomatic while narrowing the type. Same established pattern, two more enums.

Full planning post on the Future Debrief blog: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
