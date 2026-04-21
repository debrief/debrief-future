Eight translator sites, four hand-typed declarations, one vocabulary — that's the shape of the next Future Debrief consolidation.

Two small TypeScript enums — `DisplayMode` and `PlaybackState` — have been drifting across the codebase. The components package spells them one way (`full | trail`, two playback states); the session-state store spells the same concepts a different way (`normal | snailTrail`, three playback states). Wherever those two worlds meet, inline ternaries like `m === 'snailTrail' ? 'trail' : 'full'` paper over the gap.

This feature collapses all of it into a single pair generated from LinkML. The enum identifiers finally match the labels users already see on the toggle buttons. The `stopped ≡ paused` rendering rule lives in the schema description, so an IDE hover surfaces it on every call site. Zero `as` casts added. No visible UI change.

It's the third in a run of LinkML consolidations (#203, #204, #205) feeding a broader audit of non-LinkML type declarations. A tax we're paying down so the next change to these types costs less.

Full planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
