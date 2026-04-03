Every analysis operation in Debrief leaves a provenance record -- which tool ran, what parameters were used, which tracks were affected. The Log Panel shows that audit trail, but until now it's been raw data: tool IDs, positional indices, ISO durations. Accurate, but not something you can scan quickly during an exercise review.

This week we're planning a redesign that turns those records into readable cards. Coloured category icons distinguish imports from calculations from style changes from filters. Parameter values get type-aware chips -- colour swatches for colour parameters, numeric prefixes, range indicators, boolean symbols -- so analysts can scan settings at a glance without expanding anything. A small marker flags parameters that were explicitly changed from defaults.

It's pure UI work within the existing shared component library, no changes to the underlying provenance model. The interesting design question: we're replacing a two-axis control (layout mode + detail level) with four flat tabs. Simpler to use, but we're curious whether that trade-off holds up in practice.

https://debrief.github.io/2026/04/02/planning-analysis-log-panel-rich-card-ux

#FutureDebrief #MaritimeAnalysis #UXDesign
