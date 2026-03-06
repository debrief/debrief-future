# LinkedIn: Shipped — Schema-Validated GeoJSON

We just locked down GeoJSON validation at every service boundary in Debrief. Here's why that matters.

A few months back, we caught a gnarly bug: a styling tool wrote track symbols to one field while the renderer read from another. The feature rendered blank. No errors in dev, no warnings in the logs — just silent data loss. We fixed it, but the underlying problem stayed: untyped dictionaries flowing between services with no guardrails.

We've now added schema validation at all 5 critical points where GeoJSON moves between services: tool inputs, tool outputs, file parsing, catalog reads, catalog writes. Every feature kind — tracks, annotations, reference points, all 12 types — now validates against its schema the moment it enters or leaves a service boundary.

The payoff: field-name mismatches, missing required data, invalid enum values — all caught at dev time now, not production. We're replacing 50+ hardcoded enum sets with schema-derived values, so when the schema changes, the tools automatically know the valid options.

The evidence: 1538 tests pass. Zero failures. All 12 feature types have full provenance tracking. TypeScript coordinate types fixed. No performance regression — validation overhead under 10ms per feature, even for tracks with 10,000 positions.

Offline-first architecture means this validation runs entirely local. No network calls, no external dependencies. Pure Python schema dispatch on the kind discriminator.

This is the kind of infrastructure work that never makes headlines but prevents hours of debugging. It's not flashy, but it's solid.

#DebriffAnalysis #MaritimeAnalysis #EngineeringPractices #DataValidation
