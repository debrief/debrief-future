When the log panel shipped in feature #176, it distinguished snapshot entries from tool entries by checking the tool's category enum at the render site. It worked, but it quietly welded two concerns together — "what is this entry?" and "how should it look?" — into a single field that was never meant to carry semantic weight.

Backlog #208 separates them. `TimelineEntry` gains a `kind` discriminator: `'snapshot' | 'tool' | 'tune'`, populated by the VS Code host. Consumers switch on `kind` instead of re-deriving semantics from a category enum. The interim populator is a two-row lookup that guarantees zero visual change.

The real payoff is the queue behind it: a manual snapshot button, tune markers, analyst rationale entries. Each now has a clean contract slot instead of piggy-backing on the category enum. An exhaustiveness guard means future additions force explicit handling at every consuming site.

It's a typed-contract refinement, not a marquee feature. Cleanup in aisle 176 — cheap while the author's context is fresh, compounding drift if deferred.

Planning post with the open questions: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
