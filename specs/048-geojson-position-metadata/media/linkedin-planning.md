# LinkedIn Summary: Per-Position Styling

"Contact first detected here." A simple annotation that maritime analysts have relied on for decades.

Legacy Debrief let users mark individual positions along a track — custom symbols, labels at specific moments, automated markers every five minutes. The kind of fine-grained control that matters when your analysis goes into briefing documents.

We're adding this to Future Debrief, but cleaning up the data model while we're at it. Coordinates now live in one place (not two). Position metadata stays separate from geometry. And the styling system uses a cascade: defaults, then interval rules, then explicit overrides.

Curious about the technical decisions? The full plan is on GitHub.

[Read the planning post →](https://debrief.github.io/debrief-future/planning-per-position-styling)

#FutureDebrief #MaritimeAnalysis #OpenSource
