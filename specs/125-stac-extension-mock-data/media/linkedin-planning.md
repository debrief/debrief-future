How do you get nine UI components to agree on what a maritime exercise plot looks like -- before any of them exist?

You write the contract first. This week on Future Debrief, we're defining a STAC extension specification that pins down exactly which properties a plot carries: vessel classifications (via a 3-level taxonomy with 19 vessel types), tags, author, track names, and nationalities. All under a `debrief:` namespace, all generated from a single LinkML schema module that produces Python and TypeScript types from the same source.

Alongside the spec, a deterministic Python generator creates 100 realistic fixture items spanning six ocean regions, multiple years, and a deliberately skewed distribution of vessel types and durations. These fixtures become the shared development reality for every Storybook component in the Discovery UI epic.

It's the kind of work that's invisible when it goes right and painful when it doesn't.

https://debrief.info/blog/2026/03/06/planning-stac-extension-spec-mock-data-fixtures

#FutureDebrief #MaritimeAnalysis #OpenSource
