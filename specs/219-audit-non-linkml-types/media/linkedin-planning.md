We have an architectural rule that says types crossing the Python–TypeScript boundary must be rooted in a single LinkML schema. We've never actually enumerated where we stand against it.

A recent review turned up a handful of hand-typed interfaces that had quietly drifted — a `Coordinate` here, a `ViewportPolygon` there, a couple of near-duplicate tool-result envelopes. Each has its own follow-up. What's missing is the inventory: a named list of every hand-typed declaration in the codebase, classified as either intentional exception or drift to be fixed.

So the next step is a one-off audit. TypeScript compiler API to enumerate, automated signals to flag candidates, human judgement to classify — with the justification for each call written down so a later reviewer can challenge the specific decision rather than the methodology. Raw output is byte-identical on re-run, which means future audits measure progress instead of producing another snapshot.

Turns an informal principle into a finite phase list for the schema-first boundary epic.

{BLOG_POST_URL}

#FutureDebrief #SoftwareArchitecture #OpenSource
