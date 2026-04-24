The Future Debrief filter bar now understands "British submarines" the way an analyst means it: a single platform that is *both* British and a submarine, not any British ship alongside any submarine anywhere in the plot.

The new Platform chip lets you pick any subset of nationality, domain, vessel role, type, or class, and serialises to one `array_filter` CQL2 node over the per-platform records. The engine evaluates the predicate per-platform, so the joined-query false positives we used to live with are gone.

Edit, negate, drag-to-OR-group, save, restore — the chip behaves like every other chip, and saved filters containing platform chips round-trip losslessly. Pre-feature saved filters load unchanged via a one-line coercion on restore.

The broader E10 arc (NL-assisted catalog discovery) is now half-lit — the analyst-facing UI, the CQL2 engine, and the data model are all in place. The natural-language query path and stakeholder demo are next.

[Read the full post: <link-placeholder>]

#FutureDebrief #MaritimeAnalysis #OpenSource
