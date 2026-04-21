Two copies of the same nine functions, in two different packages, with ~95 % identical code. That's what we're deleting this week in Debrief.

The bounds-calculation helpers inside `@debrief/components` and `@debrief/utils` have been gently drifting since we split them out. Individually harmless; collectively the kind of thing that eventually costs you a Friday afternoon when a bug fix lands in one copy and not the other.

The consolidation also absorbs a pending optimisation — use the pre-computed `bbox` on a GeoJSON feature when one is present, instead of walking every coordinate. Strictly additive: if the `bbox` is missing or malformed, we fall back to the coordinate walk and produce the same answer as before.

Nothing visible to users. Everything visible to the next contributor who has to touch this code. That's the trade we're making, and the backlog chain (#200 → #211 → #213) is the record of it.

Open questions — including whether a structural-minimum input type is the right long-term call — are on the post.

{{BLOG_POST_URL}}

#FutureDebrief #MaritimeAnalysis #OpenSource
